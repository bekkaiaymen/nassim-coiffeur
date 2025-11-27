const express = require('express');
const router = express.Router();
const axios = require('axios');

// DeepSeek AI Configuration
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Business context for AI
const getBusinessContext = (business) => {
    return `
أنت مساعد ذكي لصالون حلاقة "${business.name}".

معلومات الصالون:
- الاسم: ${business.name}
- الموقع: ${business.location || 'غير محدد'}
- ساعات العمل: ${business.workingHours || 'من 9 صباحاً إلى 9 مساءً'}

الخدمات المتوفرة:
${business.services?.map(s => `- ${s.name}: ${s.price} ريال (${s.duration} دقيقة)`).join('\n') || '- لا توجد خدمات محددة'}

الموظفين:
${business.employees?.map(e => `- ${e.name}: ${e.specialty || 'حلاق'}`).join('\n') || '- لا يوجد موظفين محددين'}

أسلوب التواصل:
- كن ودوداً ومحترماً
- استخدم اللغة العربية الفصحى المبسطة
- قدم إجابات واضحة ومباشرة
- اقترح أوقات محددة للحجز
- اذكر الأسعار بوضوح
- شجع العملاء على زيارة الصالون

مهامك:
1. الرد على استفسارات العملاء عن الخدمات والأسعار
2. المساعدة في حجز المواعيد
3. تقديم نصائح للعناية بالشعر واللحية
4. الترويج للعروض الخاصة
5. الإجابة عن أسئلة متعلقة بالصالون

لا تقم بـ:
- إعطاء معلومات طبية متخصصة
- تقديم خدمات غير متوفرة في الصالون
- مشاركة معلومات شخصية عن العملاء
`;
};

// System prompt for owner assistance
const getOwnerAssistantContext = (business, stats) => {
    return `
أنت مستشار أعمال ذكي لصاحب صالون حلاقة "${business.name}".

إحصائيات العمل الحالية:
- عدد المواعيد هذا الشهر: ${stats.totalAppointments || 0}
- الإيرادات الشهرية: ${stats.monthlyRevenue || 0} ريال
- عدد العملاء: ${stats.totalCustomers || 0}
- متوسط التقييم: ${stats.averageRating || 'غير متوفر'}

مهامك:
1. تحليل أداء العمل وتقديم توصيات
2. اقتراح استراتيجيات لزيادة الإيرادات
3. المساعدة في إدارة الموظفين والجداول
4. تقديم أفكار للعروض والحملات التسويقية
5. تحليل سلوك العملاء واقتراح تحسينات

أسلوب التواصل:
- كن احترافياً وموجهاً نحو النتائج
- قدم نصائح عملية قابلة للتطبيق
- استخدم الأرقام والبيانات في التحليل
- كن إيجابياً ومحفزاً
`;
};

// Chat with AI - Customer Assistant
router.post('/chat/customer', async (req, res) => {
    try {
        // Check if API key exists
        if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your-deepseek-api-key-here') {
            return res.status(500).json({
                success: false,
                message: 'مفتاح DeepSeek API غير موجود. يرجى إضافته في ملف .env'
            });
        }

        const { message, businessId, conversationHistory = [] } = req.body;

        if (!message || !businessId) {
            return res.status(400).json({
                success: false,
                message: 'الرسالة ومعرف المحل مطلوبان'
            });
        }

        // Get business info
        const Business = require('../models/Business');
        const Service = require('../models/Service');
        const Employee = require('../models/Employee');

        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({
                success: false,
                message: 'المحل غير موجود'
            });
        }

        const services = await Service.find({ business: businessId, available: true });
        const employees = await Employee.find({ business: businessId, status: 'active' });

        business.services = services;
        business.employees = employees;

        // Prepare messages for AI
        const messages = [
            {
                role: 'system',
                content: getBusinessContext(business)
            },
            ...conversationHistory,
            {
                role: 'user',
                // منطق الحجز الذكي
                const bookingKeywords = [
                    'حجز موعد',
                    'احجز لي موعد',
                    'أريد حجز',
                    'موعد جديد',
                    'booking',
                    'reserve'
                ];
                const isBookingRequest = bookingKeywords.some(k => message.includes(k));

                if (isBookingRequest) {
                    // حجز افتراضي: اليوم التالي الساعة 4 عصراً
                    const Appointment = require('../models/Appointment');
                    const Customer = require('../models/Customer');
                    // ابحث عن أول عميل مسجل (أو أنشئ عميل وهمي)
                    let customer = await Customer.findOne({ followedBusinesses: businessId });
                    if (!customer) {
                        customer = await Customer.create({
                            name: 'زائر من الذكاء الاصطناعي',
                            phone: '0000000000',
                            followedBusinesses: [businessId]
                        });
                    }
                    // ابحث عن أول خدمة متوفرة
                    const service = services[0];
                    // احجز الموعد غداً الساعة 16:00
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(16, 0, 0, 0);
                    const appointment = await Appointment.create({
                        business: businessId,
                        customer: customer._id,
                        service: service?._id,
                        date: tomorrow,
                        status: 'pending',
                        notes: 'تم الحجز عبر مساعد الذكاء الاصطناعي wassim'
                    });
                    const aiResponse = `✅ تم حجز موعدك بنجاح!
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Chat with AI - Owner Assistant
                    return res.json({
                        success: true,
                        data: {
                            response: aiResponse,
                            conversationHistory: [
                                ...conversationHistory,
                                { role: 'user', content: message },
                                { role: 'assistant', content: aiResponse }
                            ]
                        }
                    });
                }

                // إذا لم يكن طلب حجز، استخدم الذكاء الاصطناعي العادي
                const messages = [
                    {
                        role: 'system',
                        content: getBusinessContext(business)
                    },
                    ...conversationHistory,
                    {
                        role: 'user',
                        content: message
                    }
                ];

                // Call DeepSeek API
                const response = await axios.post(
                    DEEPSEEK_API_URL,
                    {
                        model: 'deepseek-chat',
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 500,
                        stream: false
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const aiResponse = response.data.choices[0].message.content;

                res.json({
                    success: true,
                    data: {
                        response: aiResponse,
                        conversationHistory: [
                            ...conversationHistory,
                            { role: 'user', content: message },
                            { role: 'assistant', content: aiResponse }
                        ]
                    }
                });
router.post('/chat/owner', async (req, res) => {
    try {
        // Check if API key exists
        if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your-deepseek-api-key-here') {
            return res.status(500).json({
                success: false,
                message: 'مفتاح DeepSeek API غير موجود. يرجى إضافته في ملف .env'
            });
        }

        const { message, businessId, conversationHistory = [] } = req.body;

        if (!message || !businessId) {
            return res.status(400).json({
                success: false,
                message: 'الرسالة ومعرف المحل مطلوبان'
            });
        }

        // Get business info and stats
        const Business = require('../models/Business');
        const Appointment = require('../models/Appointment');
        const Customer = require('../models/Customer');

        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({
                success: false,
                message: 'المحل غير موجود'
            });
        }

        // Calculate stats
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const totalAppointments = await Appointment.countDocuments({
            business: businessId,
            createdAt: { $gte: startOfMonth }
        });

        const appointments = await Appointment.find({
            business: businessId,
            status: 'completed',
            createdAt: { $gte: startOfMonth }
        }).populate('service');

        const monthlyRevenue = appointments.reduce((sum, apt) => 
            sum + (apt.service?.price || 0), 0
        );

        const totalCustomers = await Customer.countDocuments({
            followedBusinesses: businessId
        });

        const stats = {
            totalAppointments,
            monthlyRevenue,
            totalCustomers,
            averageRating: business.rating || 0
        };

        // Prepare messages for AI
        const messages = [
            {
                role: 'system',
                content: getOwnerAssistantContext(business, stats)
            },
            ...conversationHistory,
            {
                role: 'user',
                content: message
            }
        ];

        // Call DeepSeek API
        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: 'deepseek-chat',
                messages: messages,
                temperature: 0.7,
                max_tokens: 800,
                stream: false
            },
            {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const aiResponse = response.data.choices[0].message.content;

        res.json({
            success: true,
            data: {
                response: aiResponse,
                stats: stats,
                conversationHistory: [
                    ...conversationHistory,
                    { role: 'user', content: message },
                    { role: 'assistant', content: aiResponse }
                ]
            }
        });

    } catch (error) {
        console.error('AI Owner Chat Error:', error.response?.data || error.message);
        console.error('Full error:', error);
        console.error('API Key present:', !!DEEPSEEK_API_KEY);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في الذكاء الاصطناعي',
            error: error.response?.data?.error?.message || error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get AI Suggestions for Business Improvement
router.get('/suggestions/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;

        const Business = require('../models/Business');
        const Appointment = require('../models/Appointment');
        const Service = require('../models/Service');

        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({
                success: false,
                message: 'المحل غير موجود'
            });
        }

        // Get recent data
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const appointments = await Appointment.find({
            business: businessId,
            createdAt: { $gte: thirtyDaysAgo }
        }).populate('service');

        const services = await Service.find({ business: businessId });

        // Analyze data
        const totalRevenue = appointments
            .filter(apt => apt.status === 'completed')
            .reduce((sum, apt) => sum + (apt.service?.price || 0), 0);

        const serviceCount = {};
        appointments.forEach(apt => {
            const serviceName = apt.service?.name || 'غير محدد';
            serviceCount[serviceName] = (serviceCount[serviceName] || 0) + 1;
        });

        const mostPopularService = Object.entries(serviceCount)
            .sort((a, b) => b[1] - a[1])[0];

        const prompt = `
بناءً على بيانات صالون "${business.name}" خلال آخر 30 يوم:
- عدد المواعيد: ${appointments.length}
- الإيرادات: ${totalRevenue} ريال
- الخدمة الأكثر طلباً: ${mostPopularService?.[0] || 'لا توجد'} (${mostPopularService?.[1] || 0} مرات)
- عدد الخدمات المتوفرة: ${services.length}

قدم 5 توصيات محددة وقابلة للتطبيق لتحسين الأداء وزيادة الإيرادات. كن مباشراً ومحدداً في كل توصية.
`;

        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'أنت مستشار أعمال خبير في مجال صالونات الحلاقة والتجميل.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 800
            },
            {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const suggestions = response.data.choices[0].message.content;

        res.json({
            success: true,
            data: {
                suggestions,
                stats: {
                    totalAppointments: appointments.length,
                    totalRevenue,
                    mostPopularService: mostPopularService?.[0] || 'لا توجد',
                    servicesCount: services.length
                }
            }
        });

    } catch (error) {
        console.error('AI Suggestions Error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في الحصول على الاقتراحات'
        });
    }
});

module.exports = router;
