const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, ensureTenant, addTenantFilter, checkLimit } = require('../middleware/auth');

// Get customer appointments
router.get('/customer', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find customer by user ID
        const customer = await Customer.findOne({ user: userId });
        
        if (!customer) {
            return res.status(404).json({ 
                success: false, 
                message: 'Customer not found' 
            });
        }
        
        const appointments = await Appointment.find({ customerId: customer._id })
            .populate('business', 'name')
            .populate('service', 'name price duration')
            .populate('employee', 'name photo')
            .sort({ dateTime: -1 });

        res.json({ 
            success: true, 
            data: appointments 
        });
    } catch (error) {
        console.error('Error fetching customer appointments:', error);
        res.status(500).json({ 
            success: false, 
            error: 'حدث خطأ في جلب المواعيد' 
        });
    }
});

// Get all appointments for a business (owner dashboard)
router.get('/business/:businessId', protect, async (req, res) => {
    try {
        const { businessId } = req.params;
        
        const appointments = await Appointment.find({ business: businessId })
            .populate('customerId', 'name email phone')
            .populate('serviceId', 'name price duration')
            .populate('employee', 'name photo')
            .sort({ date: -1, time: -1 });

        res.json({ success: true, data: appointments });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ success: false, error: 'حدث خطأ في جلب المواعيد' });
    }
});

// Public route - Create appointment from customer portal
router.post('/public/book', async (req, res) => {
    try {
        const { business, customer, customerName, customerPhone, service, employee, date, time, dateTime, notes } = req.body;
        
        console.log('📥 Booking request:', req.body);
        
        if (!business || !customer || !service || !date || !time) {
            return res.status(400).json({
                success: false,
                message: 'بيانات الحجز غير كاملة'
            });
        }

        // Check for conflicts
        const conflict = await Appointment.findOne({
            business,
            employee,
            dateTime: new Date(dateTime),
            status: { $nin: ['cancelled', 'no-show'] }
        });

        if (conflict) {
            return res.status(400).json({ 
                success: false, 
                message: 'هذا الموعد محجوز بالفعل. يرجى اختيار وقت آخر' 
            });
        }

        const appointment = await Appointment.create({
            tenant: business,
            business,
            customerId: customer,
            customerName,
            customerPhone,
            serviceId: service,
            service: customerName, // Service name for display
            employee,
            date: new Date(date),
            time,
            notes,
            status: 'pending'
        });

        res.status(201).json({ 
            success: true, 
            message: 'تم حجز الموعد بنجاح',
            data: appointment 
        });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ في حجز الموعد' 
        });
    }
});

// Helper function to create notification
async function createNotification(customerId, type, title, message, icon, data = {}) {
    try {
        // Find user account for this customer (if registered)
        const user = await User.findOne({ phone: data.customerPhone });
        
        if (user) {
            // Create notification for registered user
            await Notification.create({
                user: user._id,
                customer: customerId,
                business: data.business,
                type,
                title,
                message,
                icon,
                data
            });
            console.log(`✅ Notification sent to registered user: ${user.phone}`);
        } else {
            // Log for non-registered users (future SMS/WhatsApp integration)
            console.log(`📱 SMS/WhatsApp notification needed for: ${data.customerPhone}`);
            console.log(`   Type: ${type}, Message: ${message}`);
        }
    } catch (error) {
        console.error('❌ Error creating notification:', error.message);
    }
}

// Public route to get customer appointments (no auth required)
router.get('/public/customer/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        
        // Find customer by phone
        const customer = await Customer.findOne({ phone });
        
        if (!customer) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        // Get all appointments for this customer
        const appointments = await Appointment.find({ customerId: customer._id })
            .sort({ date: -1, time: -1 });

        res.json({ success: true, count: appointments.length, data: appointments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Public route to get available time slots (no auth required)
router.get('/available-slots', async (req, res) => {
    try {
        const { business, date, barber } = req.query;
        
        if (!business || !date) {
            return res.status(400).json({ 
                success: false, 
                message: 'Business ID and date are required' 
            });
        }
        
        const query = {
            business: business,
            date: new Date(date),
            status: { $ne: 'cancelled' }
        };
        
        if (barber) {
            query.barber = barber;
        }
        
        const appointments = await Appointment.find(query).select('time');
        const bookedTimes = appointments.map(apt => apt.time);
        
        // Generate all time slots (9 AM to 9 PM, every 30 mins)
        const allSlots = [];
        for (let hour = 9; hour <= 21; hour++) {
            const hourStr = hour.toString().padStart(2, '0');
            allSlots.push({ time: `${hourStr}:00`, available: true });
            if (hour < 21) {
                allSlots.push({ time: `${hourStr}:30`, available: true });
            }
        }

        // Mark booked slots as unavailable
        allSlots.forEach(slot => {
            if (bookedTimes.includes(slot.time)) {
                slot.available = false;
            }
        });

        res.json({ success: true, data: allSlots });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Public route to create appointment (for customers)
router.post('/public/book', async (req, res) => {
    try {
        const { business, service, barber, customer, customerName, customerPhone, date, time, notes } = req.body;

        if (!business || !service || !customerPhone || !date || !time) {
            return res.status(400).json({ 
                success: false, 
                message: 'جميع الحقول مطلوبة' 
            });
        }

        // Check for conflicts
        const conflict = await Appointment.findOne({
            business: business,
            date: new Date(date),
            time: time,
            status: { $ne: 'cancelled' }
        });

        if (conflict) {
            return res.status(400).json({ 
                success: false, 
                message: 'هذا الموعد محجوز بالفعل' 
            });
        }

        // Find or create customer
        let customerDoc = await Customer.findOne({ phone: customerPhone });
        if (!customerDoc && customer) {
            customerDoc = await Customer.findById(customer);
        }
        if (!customerDoc) {
            customerDoc = await Customer.create({
                tenant: business,
                business: business,
                name: customerName,
                phone: customerPhone
            });
        }

        const appointment = await Appointment.create({
            tenant: business,
            business: business,
            customerName: customerName || customerDoc.name,
            customerPhone: customerPhone,
            customerId: customerDoc._id,
            service,
            barber: barber || null,
            date: new Date(date),
            time,
            notes: notes || '',
            status: 'pending'
        });

        // Update customer stats
        customerDoc.totalVisits += 1;
        customerDoc.lastVisit = new Date();
        
        // Determine points based on customer type (new vs returning)
        // Check if customer has any completed appointments
        const completedAppointments = await Appointment.find({
            customerId: customer,
            status: 'completed'
        }).countDocuments();
        
        // New customer (no completed appointments): 100 points
        // Returning customer (has completed appointments): 50 points
        const pendingPoints = completedAppointments === 0 ? 100 : 50;
        customerDoc.pendingPoints = (customerDoc.pendingPoints || 0) + pendingPoints;
        customerDoc.pointsHistory = customerDoc.pointsHistory || [];
        customerDoc.pointsHistory.push({
            points: pendingPoints,
            type: 'pending',
            description: `مكافأة حجز موعد - ${customerName || customerDoc.name}`,
            date: new Date(),
            appointmentId: appointment._id,
            status: 'pending'
        });
        customerDoc.pendingRewards = customerDoc.pendingRewards || [];
        customerDoc.pendingRewards.push({
            appointmentId: appointment._id,
            points: pendingPoints,
            description: `مكافأة حجز موعد - ${customerName || customerDoc.name}`,
            createdAt: new Date()
        });
        
        await customerDoc.save();

        // ✨ تحديث إحصائيات استخدام صاحب المحل
        try {
            const Business = require('../models/Business');
            const businessDoc = await Business.findById(business);
            
            if (businessDoc) {
                // تهيئة الكائنات إذا لم تكن موجودة
                if (!businessDoc.stats) businessDoc.stats = {};
                if (!businessDoc.usage) businessDoc.usage = {};
                if (!businessDoc.limits) businessDoc.limits = {};
                
                // زيادة عدد المواعيد الإجمالي
                businessDoc.stats.totalAppointments = (businessDoc.stats.totalAppointments || 0) + 1;
                
                // تحديث عداد المواعيد الشهري
                const now = new Date();
                const lastReset = new Date(businessDoc.usage.lastResetDate || 0);
                
                // إذا كان شهر جديد، إعادة تعيين العداد
                if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
                    businessDoc.usage.appointmentsThisMonth = 1;
                    businessDoc.usage.lastResetDate = now;
                    console.log(`📅 New month detected - Reset appointment counter for ${businessDoc.businessName}`);
                } else {
                    businessDoc.usage.appointmentsThisMonth = (businessDoc.usage.appointmentsThisMonth || 0) + 1;
                }
                
                // التحقق من الحدود
                const limit = businessDoc.limits?.maxAppointmentsPerMonth || -1;
                if (limit !== -1 && businessDoc.usage.appointmentsThisMonth > limit) {
                    console.warn(`⚠️  Business ${businessDoc.businessName} exceeded appointment limit: ${businessDoc.usage.appointmentsThisMonth}/${limit}`);
                }
                
                await businessDoc.save();
                
                console.log(`✅ Usage updated for ${businessDoc.businessName}:`);
                console.log(`   - Total: ${businessDoc.stats.totalAppointments}`);
                console.log(`   - This Month: ${businessDoc.usage.appointmentsThisMonth}/${limit === -1 ? '∞' : limit}`);
            } else {
                console.error(`❌ Business not found: ${business}`);
            }
        } catch (usageError) {
            // لا نوقف عملية الحجز إذا فشل تحديث الإحصائيات
            console.error('❌ Failed to update business usage stats:', usageError);
        }

        // Return appointment with pending points info
        res.status(201).json({ 
            success: true, 
            message: 'تم حجز الموعد بنجاح',
            data: appointment,
            pendingPoints: pendingPoints
        });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Apply middleware to all protected routes
router.use(protect);
router.use(ensureTenant);

// Get all appointments
router.get('/', protect, ensureTenant, async (req, res) => {
    try {
        const { date, status, barber, filter, phone } = req.query;
        const tenantId = req.tenantId;
        let query = { tenant: tenantId };

        // Handle phone search
        if (phone) {
            query.customerPhone = phone;
        }

        // Handle filter=today
        if (filter === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            query.date = {
                $gte: today,
                $lt: tomorrow
            };
        } else if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            query.date = { $gte: startDate, $lt: endDate };
        }
        if (status) query.status = status;
        if (barber) query.barber = barber;

        const appointments = await Appointment.find(query)
            .populate('customerId', 'name phone')
            .sort({ date: 1, time: 1 });

        res.json({ success: true, count: appointments.length, data: appointments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get appointment by ID
router.get('/:id', protect, ensureTenant, async (req, res) => {
    try {
        const query = { tenant: req.tenantId, _id: req.params.id };
        const appointment = await Appointment.findOne(query)
            .populate('customerId', 'name phone email');

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
        }

        res.json({ success: true, data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create new appointment
router.post('/', protect, ensureTenant, checkLimit('appointments'), async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            service,
            serviceId,
            serviceName,
            date,
            time,
            barber,
            employee,
            employeeId,
            employeeName,
            notes
        } = req.body;
        
        const tenantId = req.tenantId || req.user.tenant || req.user.business;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'المستخدم غير مرتبط بمتجر'
            });
        }

        const resolvedEmployeeId = employeeId || employee;
        const resolvedEmployeeName = employeeName || req.body.employeeName;
        const resolvedBarberName = barber || req.body.barberName || resolvedEmployeeName;
        const appointmentDate = new Date(date);

        if (Number.isNaN(appointmentDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'صيغة التاريخ غير صحيحة'
            });
        }

        const serviceLabel = serviceName || (typeof service === 'string' ? service : service?.name);
        const serviceObjectId = serviceId || service?._id || req.body.serviceId;

        if (!customerName || !customerPhone || !serviceLabel || !date || !time) {
            return res.status(400).json({
                success: false,
                message: 'يرجى تعبئة جميع الحقول المطلوبة للموعد'
            });
        }

        // Check for conflicts within tenant
        const query = {
            tenant: tenantId,
            date: appointmentDate,
            time: time,
            status: { $ne: 'cancelled' }
        };

        if (resolvedEmployeeId) {
            query.employee = resolvedEmployeeId;
        } else if (resolvedBarberName) {
            query.barber = resolvedBarberName;
        }

        const conflict = await Appointment.findOne(query);

        if (conflict) {
            return res.status(400).json({ 
                success: false, 
                message: 'هذا الموعد محجوز بالفعل لهذا الموظف' 
            });
        }

        // Find or create customer within tenant
        let customer = await Customer.findOne({ tenant: tenantId, phone: customerPhone });
        if (!customer) {
            customer = await Customer.create({
                tenant: tenantId,
                name: customerName,
                phone: customerPhone
            });
        }

        const appointment = await Appointment.create({
            tenant: tenantId,
            customerName,
            customerPhone,
            customerId: customer._id,
            service: serviceLabel,
            serviceId: serviceObjectId,
            date: appointmentDate,
            time,
            barber: resolvedBarberName,
            employee: resolvedEmployeeId,
            employeeName: resolvedEmployeeName,
            notes,
            status: 'confirmed'
            completion: {
                performedBy: resolvedEmployeeId || undefined,
                performedByName: resolvedEmployeeName || undefined
            }
        });

        // Update customer stats
        customer.totalVisits = (customer.totalVisits || 0) + 1;
        customer.lastVisit = appointmentDate;
        await customer.save();

        // ✨ تحديث إحصائيات استخدام صاحب المحل
        try {
            const Business = require('../models/Business');
            const businessDoc = await Business.findById(tenantId);
            
            if (businessDoc) {
                // تهيئة الكائنات إذا لم تكن موجودة
                if (!businessDoc.stats) businessDoc.stats = {};
                if (!businessDoc.usage) businessDoc.usage = {};
                if (!businessDoc.limits) businessDoc.limits = {};
                
                // زيادة عدد المواعيد الإجمالي
                businessDoc.stats.totalAppointments = (businessDoc.stats.totalAppointments || 0) + 1;
                
                // تحديث عداد المواعيد الشهري
                const now = new Date();
                const lastReset = new Date(businessDoc.usage.lastResetDate || 0);
                
                // إذا كان شهر جديد، إعادة تعيين العداد
                if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
                    businessDoc.usage.appointmentsThisMonth = 1;
                    businessDoc.usage.lastResetDate = now;
                } else {
                    businessDoc.usage.appointmentsThisMonth = (businessDoc.usage.appointmentsThisMonth || 0) + 1;
                }
                
                await businessDoc.save();
                console.log(`✅ Usage updated (protected): ${businessDoc.businessName} - ${businessDoc.usage.appointmentsThisMonth} appointments this month`);
            }
        } catch (usageError) {
            console.error('❌ Failed to update business usage stats:', usageError);
        }

        res.status(201).json({ 
            success: true, 
            message: 'تم حجز الموعد بنجاح',
            data: appointment 
        });
    } catch (error) {
        console.error('Create appointment error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Update appointment
router.put('/:id', protect, ensureTenant, async (req, res) => {
    try {
        const query = { tenant: req.tenantId, _id: req.params.id };
        const appointment = await Appointment.findOneAndUpdate(
            query,
            req.body,
            { new: true, runValidators: true }
        );

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
        }

        res.json({ 
            success: true, 
            message: 'تم تحديث الموعد بنجاح',
            data: appointment 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Cancel appointment
router.patch('/:id/cancel', protect, ensureTenant, async (req, res) => {
    try {
        const query = { tenant: req.tenantId, _id: req.params.id };
        const appointment = await Appointment.findOneAndUpdate(
            query,
            { status: 'cancelled' },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
        }

        res.json({ 
            success: true, 
            message: 'تم إلغاء الموعد بنجاح',
            data: appointment 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Confirm appointment (first confirmation)
router.patch('/:id/confirm-appointment', protect, ensureTenant, async (req, res) => {
    try {
        const query = addTenantFilter(req, { _id: req.params.id });
        const appointment = await Appointment.findOne(query);

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
        }

        appointment.confirmations = appointment.confirmations || {};
        appointment.confirmations.appointmentConfirmed = true;
        appointment.confirmations.appointmentConfirmedAt = new Date();
        appointment.confirmations.appointmentConfirmedBy = req.user._id;
        appointment.status = 'appointment_confirmed';

        await appointment.save();

        // Send notification to customer
        await createNotification(
            appointment.customerId,
            'booking_confirmed',
            '✅ تم تأكيد موعدك',
            `تم تأكيد موعدك بتاريخ ${new Date(appointment.date).toLocaleDateString('ar-SA')} الساعة ${appointment.time}`,
            '✅',
            {
                customerPhone: appointment.customerPhone,
                business: appointment.business,
                appointmentId: appointment._id,
                date: appointment.date,
                time: appointment.time
            }
        );

        res.json({ 
            success: true, 
            message: 'تم تأكيد الطلب بنجاح',
            data: appointment 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Change barber for appointment
router.patch('/:id/change-barber', protect, ensureTenant, async (req, res) => {
    try {
        const { barber } = req.body;
        const query = addTenantFilter(req, { _id: req.params.id });
        const appointment = await Appointment.findOne(query).populate('customerId');

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
        }

        const oldBarber = appointment.barber;
        appointment.barber = barber;
        appointment.status = 'confirmed';
        await appointment.save();

        // Get barber details
        const Employee = require('../models/Employee');
        const newBarber = await Employee.findById(barber);

        // Send notification to customer
        await createNotification(
            appointment.customerId,
            'barber_changed',
            '🔄 تم تغيير الحلاق',
            `تم تعيين ${newBarber ? newBarber.name : 'حلاق جديد'} لموعدك بتاريخ ${new Date(appointment.date).toLocaleDateString('ar-SA')}`,
            '🔄',
            {
                customerPhone: appointment.customerPhone,
                business: appointment.business,
                appointmentId: appointment._id,
                oldBarber: oldBarber,
                newBarber: barber,
                barberName: newBarber ? newBarber.name : ''
            }
        );

        res.json({ 
            success: true, 
            message: 'تم تغيير الحلاق وإرسال إشعار للعميل',
            data: appointment 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Confirm employee availability (second confirmation)
router.patch('/:id/confirm-employee', protect, ensureTenant, async (req, res) => {
    try {
        const query = addTenantFilter(req, { _id: req.params.id });
        const appointment = await Appointment.findOne(query);

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
        }

        if (!appointment.confirmations?.appointmentConfirmed) {
            return res.status(400).json({ 
                success: false, 
                message: 'يجب تأكيد الطلب أولاً' 
            });
        }

        appointment.confirmations.employeeConfirmed = true;
        appointment.confirmations.employeeConfirmedAt = new Date();
        appointment.confirmations.employeeConfirmedBy = req.user._id;
        appointment.status = 'fully_confirmed';

        await appointment.save();

        // Get barber details
        const Employee = require('../models/Employee');
        const barber = await Employee.findById(appointment.barber);

        // Send notification to customer
        await createNotification(
            appointment.customerId,
            'barber_confirmed',
            '✅ تم تأكيد حضور الحلاق',
            `${barber ? barber.name : 'الحلاق'} جاهز لموعدك بتاريخ ${new Date(appointment.date).toLocaleDateString('ar-SA')} الساعة ${appointment.time}`,
            '👨‍🦰',
            {
                customerPhone: appointment.customerPhone,
                business: appointment.business,
                appointmentId: appointment._id,
                barber: appointment.barber,
                barberName: barber ? barber.name : ''
            }
        );

        res.json({ 
            success: true, 
            message: 'تم تأكيد توفر الموظف بنجاح',
            data: appointment 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Complete appointment and activate pending points
router.patch('/:id/complete', protect, ensureTenant, async (req, res) => {
    try {
        const query = addTenantFilter(req, { _id: req.params.id });
        const appointment = await Appointment.findOne(query)
            .populate('customerId');

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
        }

        // Update appointment status
        appointment.status = 'completed';
        await appointment.save();

        // Activate pending points for this appointment
        if (appointment.customerId) {
            const customer = await Customer.findById(appointment.customerId);
            if (customer && customer.pendingRewards && customer.pendingRewards.length > 0) {
                // Find pending reward for this appointment
                const pendingReward = customer.pendingRewards.find(
                    r => r.appointmentId && r.appointmentId.toString() === appointment._id.toString()
                );

                if (pendingReward) {
                    // Activate points
                    const pointsToActivate = pendingReward.points;
                    customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointsToActivate;
                    customer.pendingPoints = Math.max(0, (customer.pendingPoints || 0) - pointsToActivate);

                    // Update points history
                    const historyEntry = customer.pointsHistory.find(
                        h => h.appointmentId && h.appointmentId.toString() === appointment._id.toString() && h.status === 'pending'
                    );
                    if (historyEntry) {
                        historyEntry.status = 'confirmed';
                        historyEntry.type = 'earned';
                    }

                    // Remove from pending rewards
                    customer.pendingRewards = customer.pendingRewards.filter(
                        r => !(r.appointmentId && r.appointmentId.toString() === appointment._id.toString())
                    );

                    // Update loyalty tier
                    if (customer.loyaltyPoints >= 500) {
                        customer.loyaltyTier = 'ذهبي';
                    } else if (customer.loyaltyPoints >= 200) {
                        customer.loyaltyTier = 'فضي';
                    } else {
                        customer.loyaltyTier = 'برونزي';
                    }

                    await customer.save();

                    // Create notification for customer
                    try {
                        const Notification = require('../models/Notification');
                        const User = require('../models/User');
                        const user = await User.findById(customer.user);
                        if (user) {
                            await Notification.create({
                                user: user._id,
                                type: 'reward',
                                title: '🎉 تم تفعيل مكافأتك!',
                                message: `تم تفعيل ${pointsToActivate} نقطة (ما يعادل ${pointsToActivate} دينار جزائري)`,
                                icon: '🎁',
                                data: { points: pointsToActivate, appointmentId: appointment._id }
                            });
                        }
                    } catch (notifError) {
                        console.error('Error creating notification:', notifError);
                    }
                }
            }
        }

        res.json({ 
            success: true, 
            message: 'تم تأكيد اكتمال الموعد وتفعيل المكافأة',
            data: appointment 
        });
    } catch (error) {
        console.error('Complete appointment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete appointment
router.delete('/:id', async (req, res) => {
    try {
        const query = addTenantFilter(req, { _id: req.params.id });
        const appointment = await Appointment.findOneAndDelete(query);

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
        }

        res.json({ success: true, message: 'تم حذف الموعد بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Submit customer rating
router.post('/:id/customer-rating', async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ 
                success: false, 
                message: 'التقييم يجب أن يكون بين 1 و 5' 
            });
        }

        const appointment = await Appointment.findById(id);
        
        if (!appointment) {
            return res.status(404).json({ 
                success: false, 
                message: 'الموعد غير موجود' 
            });
        }

        appointment.customerRating = {
            rating,
            comment: comment || '',
            createdAt: new Date()
        };

        await appointment.save();

        res.json({ 
            success: true, 
            message: 'تم إرسال التقييم بنجاح',
            data: appointment 
        });
    } catch (error) {
        console.error('Customer rating error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Submit employee rating
router.post('/:id/employee-rating', async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ 
                success: false, 
                message: 'التقييم يجب أن يكون بين 1 و 5' 
            });
        }

        const appointment = await Appointment.findById(id);
        
        if (!appointment) {
            return res.status(404).json({ 
                success: false, 
                message: 'الموعد غير موجود' 
            });
        }

        appointment.employeeRating = {
            rating,
            comment: comment || '',
            createdAt: new Date()
        };

        await appointment.save();

        res.json({ 
            success: true, 
            message: 'تم إرسال التقييم بنجاح',
            data: appointment 
        });
    } catch (error) {
        console.error('Employee rating error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;