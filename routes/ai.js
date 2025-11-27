const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Customer = require('../models/Customer');
const { protect, ensureTenant, addTenantFilter } = require('../middleware/auth');

// Apply middleware to all routes
router.use(protect);
router.use(ensureTenant);

// AI Chat endpoint
router.post('/chat', async (req, res) => {
    try {
        const { message, customerPhone } = req.body;

        // Simple AI response logic (can be enhanced with real AI/ML)
        const response = await generateAIResponse(message, customerPhone, req.tenantId);

        res.json({
            success: true,
            data: {
                message: response.message,
                action: response.action,
                data: response.data
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Generate AI response
async function generateAIResponse(message, customerPhone, tenantId) {
    const msg = message.toLowerCase().trim();

    // Greeting
    if (msg.includes('سلام') || msg.includes('مرحبا') || msg.includes('هلا')) {
        return {
            message: 'وعليكم السلام! أهلاً وسهلاً بك في SmartBiz AI. كيف يمكنني مساعدتك اليوم؟',
            action: 'greeting'
        };
    }

    // Booking request
    if (msg.includes('حجز') || msg.includes('موعد') || msg.includes('احجز')) {
        // Check if customer exists
        let customer = null;
        if (customerPhone) {
            customer = await Customer.findOne({ tenant: tenantId, phone: customerPhone });
        }

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get available times for tomorrow
        const appointments = await Appointment.find({
            tenant: tenantId,
            date: { $gte: tomorrow, $lt: new Date(tomorrow.getTime() + 24*60*60*1000) },
            status: { $ne: 'cancelled' }
        });

        const bookedTimes = appointments.map(a => a.time);
        const availableTimes = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00']
            .filter(time => !bookedTimes.includes(time));

        return {
            message: customer 
                ? `أهلاً ${customer.name}! يسعدني مساعدتك في حجز موعد. لدينا مواعيد متاحة غداً في الأوقات التالية: ${availableTimes.slice(0, 3).join('، ')}. متى تفضل الحجز؟`
                : 'يسعدني مساعدتك في حجز موعد! لدينا مواعيد متاحة غداً. ما هو الوقت المناسب لك؟',
            action: 'booking',
            data: { availableTimes: availableTimes.slice(0, 5) }
        };
    }

    // Service inquiry
    if (msg.includes('خدمة') || msg.includes('خدمات') || msg.includes('سعر') || msg.includes('أسعار')) {
        return {
            message: 'لدينا خدمات متنوعة:\n• حلاقة كاملة: 50 ريال\n• حلاقة + لحية: 70 ريال\n• تشذيب لحية: 30 ريال\n• صبغة: 100 ريال\n\nأي خدمة تهمك؟',
            action: 'services'
        };
    }

    // Hours inquiry
    if (msg.includes('ساعات') || msg.includes('مواعيد عمل') || msg.includes('متى تفتح') || msg.includes('دوام')) {
        return {
            message: 'نحن نعمل يومياً من الساعة 9:00 صباحاً حتى 9:00 مساءً. نستقبل حجوزات المواعيد على مدار الساعة عبر الموقع!',
            action: 'hours'
        };
    }

    // Location inquiry
    if (msg.includes('موقع') || msg.includes('عنوان') || msg.includes('مكان') || msg.includes('وين')) {
        return {
            message: 'يمكنك العثور علينا في الرياض. للحصول على العنوان الدقيق والموقع على الخريطة، يرجى الاتصال على: +966500000000',
            action: 'location'
        };
    }

    // Cancel appointment
    if (msg.includes('إلغاء') || msg.includes('الغاء') || msg.includes('حذف موعد')) {
        if (customerPhone) {
            const customer = await Customer.findOne({ tenant: tenantId, phone: customerPhone });
            if (customer) {
                const upcomingAppt = await Appointment.findOne({
                    tenant: tenantId,
                    customerId: customer._id,
                    date: { $gte: new Date() },
                    status: { $in: ['pending', 'confirmed'] }
                }).sort({ date: 1 });

                if (upcomingAppt) {
                    return {
                        message: `لديك موعد في ${upcomingAppt.date.toLocaleDateString('ar-SA')} الساعة ${upcomingAppt.time}. هل تريد إلغاءه؟`,
                        action: 'cancel_confirm',
                        data: { appointmentId: upcomingAppt._id }
                    };
                }
            }
        }
        return {
            message: 'لم أجد موعداً قادماً لك. يمكنك التواصل معنا مباشرة للمساعدة.',
            action: 'no_appointment'
        };
    }

    // Check appointment status
    if (msg.includes('موعدي') || msg.includes('حجزي') || msg.includes('متى موعدي')) {
        if (customerPhone) {
            const customer = await Customer.findOne({ tenant: tenantId, phone: customerPhone });
            if (customer) {
                const upcomingAppt = await Appointment.findOne({
                    tenant: tenantId,
                    customerId: customer._id,
                    date: { $gte: new Date() },
                    status: { $in: ['pending', 'confirmed'] }
                }).sort({ date: 1 });

                if (upcomingAppt) {
                    return {
                        message: `موعدك القادم في ${upcomingAppt.date.toLocaleDateString('ar-SA')} الساعة ${upcomingAppt.time} - ${upcomingAppt.service} مع ${upcomingAppt.barber}`,
                        action: 'appointment_status',
                        data: upcomingAppt
                    };
                }
            }
        }
        return {
            message: 'ليس لديك مواعيد قادمة حالياً. هل تريد حجز موعد جديد؟',
            action: 'no_appointment'
        };
    }

    // Thank you
    if (msg.includes('شكرا') || msg.includes('شكراً') || msg.includes('مشكور')) {
        return {
            message: 'العفو! سعدنا بخدمتك. لا تتردد في التواصل معنا في أي وقت!',
            action: 'thanks'
        };
    }

    // Default response
    return {
        message: 'شكراً على تواصلك! يمكنني مساعدتك في:\n• حجز موعد\n• الاستفسار عن الخدمات والأسعار\n• التحقق من موعدك\n• إلغاء أو تعديل موعد\n\nكيف يمكنني مساعدتك؟',
        action: 'help'
    };
}

// Book appointment via AI
router.post('/book', async (req, res) => {
    try {
        const { customerName, customerPhone, service, date, time, barber } = req.body;

        // Check for conflicts
        const conflict = await Appointment.findOne({
            tenant: req.tenantId,
            date: new Date(date),
            time: time,
            barber: barber,
            status: { $ne: 'cancelled' }
        });

        if (conflict) {
            return res.status(400).json({
                success: false,
                message: 'عذراً، هذا الموعد محجوز. اختر وقتاً آخر.'
            });
        }

        // Find or create customer
        let customer = await Customer.findOne({ tenant: req.tenantId, phone: customerPhone });
        if (!customer) {
            customer = await Customer.create({
                tenant: req.tenantId,
                name: customerName,
                phone: customerPhone
            });
        }

        const appointment = await Appointment.create({
            tenant: req.tenantId,
            customerName,
            customerPhone,
            customerId: customer._id,
            service,
            date: new Date(date),
            time,
            barber,
            status: 'confirmed'
        });

        customer.totalVisits += 1;
        customer.lastVisit = new Date();
        await customer.save();

        res.json({
            success: true,
            message: `تم حجز موعدك بنجاح! سنراك في ${new Date(date).toLocaleDateString('ar-SA')} الساعة ${time}. سنرسل لك تذكيراً قبل الموعد.`,
            data: appointment
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Get AI suggestions
router.get('/suggestions', async (req, res) => {
    try {
        const { customerPhone } = req.query;

        let suggestions = [
            'حجز موعد جديد',
            'الاستفسار عن الخدمات',
            'الاستفسار عن الأسعار',
            'مواعيد العمل'
        ];

        if (customerPhone) {
            const customer = await Customer.findOne({ tenant: req.tenantId, phone: customerPhone });
            if (customer) {
                const hasUpcoming = await Appointment.findOne({
                    tenant: req.tenantId,
                    customerId: customer._id,
                    date: { $gte: new Date() },
                    status: { $in: ['pending', 'confirmed'] }
                });

                if (hasUpcoming) {
                    suggestions.unshift('التحقق من موعدي', 'تعديل موعدي', 'إلغاء موعدي');
                }

                if (customer.preferences?.favoriteService) {
                    suggestions.unshift(`حجز ${customer.preferences.favoriteService}`);
                }
            }
        }

        res.json({ success: true, data: suggestions.slice(0, 6) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;