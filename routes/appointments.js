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
        const { business, date, barber, employee } = req.query;
        
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
        
        const targetEmployee = barber || employee;
        if (targetEmployee) {
            query.$or = [{ barber: targetEmployee }, { employee: targetEmployee }];
        }
        
        const appointments = await Appointment.find(query).select('time duration');
        
        // Generate all time slots (9 AM to 9 PM, every 30 mins)
        const allSlots = [];
        for (let hour = 9; hour <= 21; hour++) {
            const hourStr = hour.toString().padStart(2, '0');
            allSlots.push({ time: `${hourStr}:00`, available: true });
            if (hour < 21) {
                allSlots.push({ time: `${hourStr}:30`, available: true });
            }
        }

        // Mark booked slots as unavailable based on duration overlap
        allSlots.forEach(slot => {
            const [slotH, slotM] = slot.time.split(':').map(Number);
            const slotStart = slotH * 60 + slotM;
            const slotEnd = slotStart + 30; // Assuming 30 min slots

            const isBlocked = appointments.some(apt => {
                const [aptH, aptM] = apt.time.split(':').map(Number);
                const aptStart = aptH * 60 + aptM;
                const aptDuration = apt.duration || 30;
                const aptEnd = aptStart + aptDuration;

                // Check overlap: (StartA < EndB) and (EndA > StartB)
                return (slotStart < aptEnd) && (slotEnd > aptStart);
            });

            if (isBlocked) {
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
        const { business, service, services, serviceName, barber, employee, isFlexibleEmployee, customer, customerName, customerPhone, date, time, notes, extraCharge, isVIPSlot, totalDuration, totalPrice } = req.body;

        if (!business || (!service && (!services || services.length === 0)) || !customerPhone || !date || !time) {
            return res.status(400).json({ 
                success: false, 
                message: 'جميع الحقول مطلوبة (business, service/services, customerPhone, date, time)' 
            });
        }

        // --- Dynamic Pricing & Duration Logic ---
        const Service = require('../models/Service');
        let serviceDuration = 30; // Default duration
        let basePrice = 50; // Default price

        // Fetch service details
        if (service) {
            try {
                const serviceDoc = await Service.findById(service);
                if (serviceDoc) {
                    serviceDuration = serviceDoc.duration || 30;
                    basePrice = serviceDoc.price || 50;
                }
            } catch (err) {
                console.error('Error fetching service:', err);
            }
        }

        // Calculate End Time
        const [hours, minutes] = time.split(':').map(Number);
        const startTimeInMinutes = hours * 60 + minutes;
        const endTimeInMinutes = startTimeInMinutes + serviceDuration;
        
        // Critical Time Check (Surge Pricing)
        const isCriticalTime = (d, t) => {
            const dateObj = new Date(d);
            const day = dateObj.getDay(); // 0=Sun, 4=Thu, 5=Fri
            const [h, m] = t.split(':').map(Number);
            const mins = h * 60 + m;
            
            // Thursday Evening (17:00 - 23:00)
            if (day === 4 && mins >= 1020 && mins <= 1380) return true;
            // Friday (09:00 - 23:00)
            if (day === 5 && mins >= 540 && mins <= 1380) return true;
            // Daily Peak (18:00 - 22:00)
            if (mins >= 1080 && mins <= 1320) return true;
            
            return false;
        };

        let finalPrice = basePrice;
        if (isCriticalTime(date, time)) {
            finalPrice = 100; // Surge price as requested
        }

        // Advanced Conflict Check (Overlap) - Check for specific employee
        const conflictQuery = {
            business: business,
            date: new Date(date),
            status: { $nin: ['cancelled', 'no-show'] }
        };
        
        // If employee is specified, check only their schedule
        if (employee) {
            conflictQuery.employee = employee;
        } else if (barber) {
            conflictQuery.barber = barber;
        }
        // If isFlexibleEmployee is true, we don't check conflicts (will be handled after confirmation)

        const dayAppointments = await Appointment.find(conflictQuery);

        const hasConflict = dayAppointments.some(appt => {
            const [apptH, apptM] = appt.time.split(':').map(Number);
            const apptStart = apptH * 60 + apptM;
            const apptDuration = appt.duration || 30; // Use stored duration or default
            const apptEnd = apptStart + apptDuration;

            // Check overlap
            return (startTimeInMinutes < apptEnd) && (endTimeInMinutes > apptStart);
        });

        if (hasConflict && !isFlexibleEmployee) {
            return res.status(400).json({ 
                success: false, 
                message: 'هذا الموعد محجوز بالفعل لدى هذا الحلاق. يرجى اختيار وقت آخر أو حلاق آخر' 
            });
        }

        // Find or create customer
        let customerDoc = await Customer.findOne({ phone: customerPhone });
        if (!customerDoc && customer) {
            customerDoc = await Customer.findById(customer);
        }
        if (!customerDoc) {
            // Check if user exists for this phone
            const User = require('../models/User');
            let user = await User.findOne({ phone: customerPhone });
            
            if (!user) {
                // Create new user for this customer
                user = await User.create({
                    name: customerName,
                    phone: customerPhone,
                    email: `${customerPhone}@nassim.local`, // Dummy email
                    password: customerPhone, // Default password is phone number
                    role: 'customer',
                    business: business,
                    tenant: business
                });
            }

            customerDoc = await Customer.create({
                tenant: business,
                business: business,
                user: user._id,
                name: customerName,
                phone: customerPhone
            });
        }

        // Ensure customer has a user account for login
        if (!customerDoc.user) {
            const User = require('../models/User');
            let user = await User.findOne({ phone: customerPhone });
            if (!user) {
                user = await User.create({
                    name: customerName || customerDoc.name,
                    phone: customerPhone,
                    email: `${customerPhone}@nassim.local`, // Dummy email
                    password: customerPhone,
                    role: 'customer',
                    business: business,
                    tenant: business
                });
            }
            customerDoc.user = user._id;
            await customerDoc.save();
        }

        // Generate token for auto-login
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: customerDoc.user }, process.env.JWT_SECRET || 'secret', {
            expiresIn: process.env.JWT_EXPIRE || '30d'
        });

        // Get service name if not provided
        let finalServiceName = serviceName;
        let finalServiceId = service;
        
        // Handle multiple services
        if (services && services.length > 0) {
            finalServiceId = services[0]; // Primary service ID
            if (!finalServiceName) {
                try {
                    const Service = require('../models/Service');
                    const serviceDocs = await Service.find({ _id: { $in: services } });
                    finalServiceName = serviceDocs.map(s => s.name).join(' + ');
                } catch (err) {
                    console.warn('Could not fetch service names:', err);
                }
            }
        } else if (!finalServiceName) {
            try {
                const Service = require('../models/Service');
                const serviceDoc = await Service.findById(service);
                if (serviceDoc) finalServiceName = serviceDoc.name;
            } catch (err) {
                console.warn('Could not fetch service name:', err);
            }
        }

        const appointment = await Appointment.create({
            tenant: business,
            business: business,
            customerName: customerName || customerDoc.name,
            customerPhone: customerPhone,
            customerId: customerDoc._id,
            service: finalServiceName || 'خدمة عامة',
            serviceId: finalServiceId,
            services: services || [service], // Store all service IDs
            barber: barber || null,
            employee: employee || null,
            isFlexibleEmployee: isFlexibleEmployee || false,
            date: new Date(date),
            time,
            duration: serviceDuration,
            price: finalPrice,
            notes: notes || '',
            extraCharge: extraCharge || 0,
            isVIPSlot: isVIPSlot || false,
            status: 'pending'
        });

        // Update customer stats
        customerDoc.totalVisits += 1;
        customerDoc.lastVisit = new Date();
        
        // New Points System Logic
        // 1. Check if customer is new (no completed appointments)
        const completedAppointments = await Appointment.find({
            customerId: customerDoc._id,
            status: 'completed'
        }).countDocuments();

        // 2. Check for Referrer
        let referrerDoc = null;
        let isReferred = false;
        
        // Try to find referrer from notes or body
        // Note: Frontend sends referrer name in notes or we can add a field
        // For now, we'll check if 'referrer' field exists in body (we will add it to frontend)
        // or parse from notes if needed.
        const referrerName = req.body.referrer;
        
        if (referrerName) {
            // Find referrer by name (approximate) - In a real app, use ID or Code
            // We search for a customer with this name in the same business
            referrerDoc = await Customer.findOne({ 
                name: referrerName,
                business: business
            });
            
            if (referrerDoc && referrerDoc._id.toString() !== customerDoc._id.toString()) {
                isReferred = true;
                
                // Add pending points to REFERRER (100 points)
                // These points are pending until THIS appointment is completed
                referrerDoc.pendingPoints = (referrerDoc.pendingPoints || 0) + 100;
                referrerDoc.pointsHistory = referrerDoc.pointsHistory || [];
                referrerDoc.pointsHistory.push({
                    points: 100,
                    type: 'pending',
                    description: `مكافأة إحالة صديق (${customerName || customerDoc.name})`,
                    date: new Date(),
                    appointmentId: appointment._id, // Link to this appointment
                    status: 'pending'
                });
                
                // We also need to track this in pendingRewards for the referrer to easily find it later
                referrerDoc.pendingRewards = referrerDoc.pendingRewards || [];
                referrerDoc.pendingRewards.push({
                    appointmentId: appointment._id,
                    points: 100,
                    description: `مكافأة إحالة صديق (${customerName || customerDoc.name})`,
                    createdAt: new Date()
                });
                
                await referrerDoc.save();
                console.log(`✅ Referral tracked: ${referrerName} referred ${customerName}`);
            }
        }

        // 3. Points for the Customer (Referee)
        // Rule: New Customer = 100 points. Referred Customer = 0 points.
        // If customer is new AND NOT referred -> 100 points
        // If customer is new AND referred -> 0 points (as per user request)
        
        let pendingPoints = 0;
        
        if (completedAppointments === 0 && !isReferred) {
            pendingPoints = 100;
        }
        
        if (pendingPoints > 0) {
            customerDoc.pendingPoints = (customerDoc.pendingPoints || 0) + pendingPoints;
            customerDoc.pointsHistory = customerDoc.pointsHistory || [];
            customerDoc.pointsHistory.push({
                points: pendingPoints,
                type: 'pending',
                description: `مكافأة عميل جديد`,
                date: new Date(),
                appointmentId: appointment._id,
                status: 'pending'
            });
            customerDoc.pendingRewards = customerDoc.pendingRewards || [];
            customerDoc.pendingRewards.push({
                appointmentId: appointment._id,
                points: pendingPoints,
                description: `مكافأة عميل جديد`,
                createdAt: new Date()
            });
        }
        
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
            pendingPoints: pendingPoints,
            token: token,
            customer: {
                _id: customerDoc._id,
                name: customerDoc.name,
                phone: customerDoc.phone,
                email: customerDoc.email,
                loyaltyPoints: customerDoc.loyaltyPoints || 0
            }
        });
    } catch (error) {
        console.error('Booking error:', error);
        console.error('Request body:', req.body);
        res.status(400).json({ 
            success: false, 
            message: error.message || 'حدث خطأ أثناء الحجز',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Public route for customers to view appointments (no auth required)
router.get('/public', async (req, res) => {
    try {
        const { date, status, phone } = req.query;
        const tenantId = '69259331651b1babc1eb83dc'; // Nassim tenant ID
        const query = { tenant: tenantId };

        if (phone) {
            query.customerPhone = phone;
        }

        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            query.date = { $gte: startDate, $lt: endDate };
        }

        if (status) {
            query.status = status;
        }

        const appointments = await Appointment.find(query)
            .select('-__v')
            .populate('serviceId', 'name duration')
            .populate('employee', 'name')
            .sort({ date: 1, time: 1 });

        res.json({ success: true, count: appointments.length, data: appointments });
    } catch (error) {
        console.error('Public appointments error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/', protect, ensureTenant, async (req, res) => {
    try {
        const { date, status, barber, filter, phone, isFlexibleEmployee } = req.query;
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
        if (req.query.employee) query.employee = req.query.employee;
        if (isFlexibleEmployee === 'true') query.isFlexibleEmployee = true;

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
            status: req.body.status || 'confirmed',
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
        const appointment = await Appointment.findOne(query);

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
        }

        const oldStatus = appointment.status;
        const newStatus = req.body.status;

        // Update fields
        appointment.set(req.body);
        await appointment.save();

        // Check if status changed to completed
        if (newStatus === 'completed' && oldStatus !== 'completed') {
            console.log(`✅ Appointment ${appointment._id} completed via PUT. Activating points...`);
            
            // 1. Check for Customer's own points (New Customer Bonus)
            if (appointment.customerId) {
                const customer = await Customer.findById(appointment.customerId);
                if (customer && customer.pendingRewards && customer.pendingRewards.length > 0) {
                    // Find pending reward for this appointment (Self Reward)
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

            // 2. Check for Referrer's points (Referral Bonus)
            console.log(`🔍 Checking for referral rewards for appointment: ${appointment._id}`);
            
            const referrers = await Customer.find({
                'pendingRewards.appointmentId': appointment._id
            });
            
            console.log(`Found ${referrers.length} potential referrers`);

            for (const referrer of referrers) {
                // Skip if it's the customer themselves (already handled above)
                if (appointment.customerId && referrer._id.toString() === appointment.customerId.toString()) {
                    console.log('Skipping referrer as it is the customer themselves');
                    continue;
                }

                const pendingReward = referrer.pendingRewards.find(
                    r => r.appointmentId && r.appointmentId.toString() === appointment._id.toString()
                );

                if (pendingReward) {
                    const pointsToActivate = pendingReward.points;
                    referrer.loyaltyPoints = (referrer.loyaltyPoints || 0) + pointsToActivate;
                    referrer.pendingPoints = Math.max(0, (referrer.pendingPoints || 0) - pointsToActivate);

                    // Update history
                    const historyEntry = referrer.pointsHistory.find(
                        h => h.appointmentId && h.appointmentId.toString() === appointment._id.toString() && h.status === 'pending'
                    );
                    if (historyEntry) {
                        historyEntry.status = 'confirmed';
                        historyEntry.type = 'earned';
                    }

                    // Remove from pending
                    referrer.pendingRewards = referrer.pendingRewards.filter(
                        r => !(r.appointmentId && r.appointmentId.toString() === appointment._id.toString())
                    );

                    await referrer.save();
                    console.log(`✅ Referral reward activated for ${referrer.name}: ${pointsToActivate} points`);

                    // Create notification for referrer
                    try {
                        const Notification = require('../models/Notification');
                        const User = require('../models/User');
                        if (referrer.user) {
                            const user = await User.findById(referrer.user);
                            if (user) {
                                await Notification.create({
                                    user: user._id,
                                    type: 'reward',
                                    title: '🎉 مكافأة إحالة صديق!',
                                    message: `تم تفعيل ${pointsToActivate} نقطة لأن صديقك أكمل موعده`,
                                    icon: '🎁',
                                    data: { points: pointsToActivate, appointmentId: appointment._id }
                                });
                            }
                        }
                    } catch (notifError) {
                        console.error('Error creating referral notification:', notifError);
                    }
                } else {
                    console.log(`⚠️ Referrer found but no matching pending reward in array for ${referrer.name}`);
                }
            }
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
        // 1. Check for Customer's own points (New Customer Bonus)
        if (appointment.customerId) {
            const customer = await Customer.findById(appointment.customerId);
            if (customer && customer.pendingRewards && customer.pendingRewards.length > 0) {
                // Find pending reward for this appointment (Self Reward)
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

        // 2. Check for Referrer's points (Referral Bonus)
        console.log(`🔍 Checking for referral rewards for appointment: ${appointment._id}`);
        
        const referrers = await Customer.find({
            'pendingRewards.appointmentId': appointment._id
        });
        
        console.log(`Found ${referrers.length} potential referrers`);

        for (const referrer of referrers) {
            // Skip if it's the customer themselves (already handled above)
            if (appointment.customerId && referrer._id.toString() === appointment.customerId.toString()) {
                console.log('Skipping referrer as it is the customer themselves');
                continue;
            }

            const pendingReward = referrer.pendingRewards.find(
                r => r.appointmentId && r.appointmentId.toString() === appointment._id.toString()
            );

            if (pendingReward) {
                const pointsToActivate = pendingReward.points;
                referrer.loyaltyPoints = (referrer.loyaltyPoints || 0) + pointsToActivate;
                referrer.pendingPoints = Math.max(0, (referrer.pendingPoints || 0) - pointsToActivate);

                // Update history
                const historyEntry = referrer.pointsHistory.find(
                    h => h.appointmentId && h.appointmentId.toString() === appointment._id.toString() && h.status === 'pending'
                );
                if (historyEntry) {
                    historyEntry.status = 'confirmed';
                    historyEntry.type = 'earned';
                }

                // Remove from pending
                referrer.pendingRewards = referrer.pendingRewards.filter(
                    r => !(r.appointmentId && r.appointmentId.toString() === appointment._id.toString())
                );

                await referrer.save();
                console.log(`✅ Referral reward activated for ${referrer.name}: ${pointsToActivate} points`);

                // Create notification for referrer
                try {
                    const Notification = require('../models/Notification');
                    const User = require('../models/User');
                    if (referrer.user) {
                        const user = await User.findById(referrer.user);
                        if (user) {
                            await Notification.create({
                                user: user._id,
                                type: 'reward',
                                title: '🎉 مكافأة إحالة صديق!',
                                message: `تم تفعيل ${pointsToActivate} نقطة لأن صديقك أكمل موعده`,
                                icon: '🎁',
                                data: { points: pointsToActivate, appointmentId: appointment._id }
                            });
                        }
                    }
                } catch (notifError) {
                    console.error('Error creating referral notification:', notifError);
                }
            } else {
                console.log(`⚠️ Referrer found but no matching pending reward in array for ${referrer.name}`);
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