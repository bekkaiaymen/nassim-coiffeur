require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionPlan = require('./models/SubscriptionPlan');
const Business = require('./models/Business');
const User = require('./models/User');
const Service = require('./models/Service');
const Customer = require('./models/Customer');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ متصل بقاعدة البيانات');

        // Clear existing data
        await SubscriptionPlan.deleteMany({});
        await Business.deleteMany({});
        await User.deleteMany({});
        await Service.deleteMany({});
        await Customer.deleteMany({});
        console.log('🗑️ تم حذف البيانات القديمة');

        // Create Subscription Plans
        const plans = await SubscriptionPlan.create([
            {
                planId: 'free',
                planName: 'مجاني',
                description: 'خطة تجريبية للبدء',
                pricing: {
                    monthly: 0,
                    yearly: 0,
                    trialDays: 14
                },
                features: {
                    maxEmployees: 1,
                    maxAppointmentsPerMonth: 50,
                    maxCustomers: 100,
                    maxServices: 10,
                    canUseAI: false,
                    canUseLoyalty: false,
                    canUseAnalytics: false,
                    canUseNotifications: false,
                    canUseCustomBranding: false
                },
                platformCommission: 0,
                featureList: [
                    'موظف واحد',
                    '50 حجز شهرياً',
                    '100 عميل',
                    '10 خدمات',
                    'دعم أساسي'
                ]
            },
            {
                planId: 'basic',
                planName: 'أساسي',
                description: 'مثالي للمحلات الصغيرة',
                pricing: {
                    monthly: 99,
                    yearly: 990,
                    trialDays: 7
                },
                features: {
                    maxEmployees: 3,
                    maxAppointmentsPerMonth: 200,
                    maxCustomers: 500,
                    maxServices: 30,
                    canUseAI: true,
                    canUseLoyalty: true,
                    canUseAnalytics: true,
                    canUseNotifications: true,
                    canUseCustomBranding: false
                },
                platformCommission: 5,
                featureList: [
                    '3 موظفين',
                    '200 حجز شهرياً',
                    '500 عميل',
                    '30 خدمة',
                    'مساعد ذكاء اصطناعي',
                    'نظام نقاط الولاء',
                    'تقارير وتحليلات',
                    'إشعارات واتساب',
                    'دعم فني 24/7'
                ]
            },
            {
                planId: 'professional',
                planName: 'احترافي',
                description: 'للمحلات المتنامية',
                pricing: {
                    monthly: 249,
                    yearly: 2490,
                    trialDays: 7
                },
                features: {
                    maxEmployees: 10,
                    maxAppointmentsPerMonth: 1000,
                    maxCustomers: 2000,
                    maxServices: 100,
                    canUseAI: true,
                    canUseLoyalty: true,
                    canUseAnalytics: true,
                    canUseNotifications: true,
                    canUseCustomBranding: true
                },
                platformCommission: 3,
                featureList: [
                    '10 موظفين',
                    '1000 حجز شهرياً',
                    '2000 عميل',
                    '100 خدمة',
                    'مساعد ذكاء اصطناعي متقدم',
                    'نظام ولاء مخصص بالكامل',
                    'تقارير تحليلية متقدمة',
                    'إشعارات واتساب وSMS',
                    'علامة تجارية مخصصة',
                    'تطبيق موبايل للعملاء',
                    'دعم فني مخصص',
                    'تدريب مجاني'
                ]
            },
            {
                planId: 'enterprise',
                planName: 'مؤسسات',
                description: 'حلول مخصصة للسلاسل',
                pricing: {
                    monthly: 599,
                    yearly: 5990,
                    trialDays: 14
                },
                features: {
                    maxEmployees: -1, // Unlimited
                    maxAppointmentsPerMonth: -1,
                    maxCustomers: -1,
                    maxServices: -1,
                    canUseAI: true,
                    canUseLoyalty: true,
                    canUseAnalytics: true,
                    canUseNotifications: true,
                    canUseCustomBranding: true
                },
                platformCommission: 2,
                featureList: [
                    'موظفين غير محدود',
                    'حجوزات غير محدودة',
                    'عملاء غير محدود',
                    'خدمات غير محدودة',
                    'كل ميزات الخطة الاحترافية',
                    'تكامل API مخصص',
                    'إدارة فروع متعددة',
                    'لوحة تحكم مركزية',
                    'تقارير مخصصة',
                    'مدير حساب مخصص',
                    'SLA مضمون 99.9%',
                    'نسخ احتياطي يومي'
                ]
            }
        ]);

        console.log('✅ تم إنشاء خطط الاشتراك');

        // Create Super Admin
        const superAdmin = await User.create({
            name: 'مدير المنصة',
            email: 'admin@smartbiz.com',
            password: 'admin123',
            phone: '0500000000',
            role: 'super_admin'
        });

        console.log('✅ تم إنشاء حساب المدير الرئيسي');

        // Create Sample Business 1 - Barbershop
        const barberOwner = await User.create({
            name: 'أحمد محمد',
            email: 'ahmed@barber.com',
            password: '123456',
            phone: '0501234567',
            role: 'business_owner'
        });

        const barbershop = await Business.create({
            businessName: 'صالون الأناقة',
            businessType: 'barbershop',
            email: 'info@barber.com',
            phone: '0501234567',
            address: 'شارع الملك فهد، الرياض',
            subdomain: 'elegance',
            owner: barberOwner._id,
            subscription: {
                plan: 'professional',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                price: 249,
                billingCycle: 'monthly',
                nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            },
            limits: {
                maxEmployees: 10,
                maxAppointmentsPerMonth: 1000,
                maxCustomers: 2000,
                maxServices: 100,
                canUseAI: true,
                canUseLoyalty: true,
                canUseAnalytics: true,
                canUseNotifications: true,
                canUseCustomBranding: true
            },
            loyaltyProgram: {
                enabled: true,
                pointsPerCurrency: 10,
                pointsValue: 0.01,
                minPointsToRedeem: 100,
                expiryDays: 365,
                tiers: [
                    { name: 'برونزي', minPoints: 0, discount: 5, color: '#CD7F32' },
                    { name: 'فضي', minPoints: 500, discount: 10, color: '#C0C0C0' },
                    { name: 'ذهبي', minPoints: 1000, discount: 15, color: '#FFD700' },
                    { name: 'بلاتيني', minPoints: 2000, discount: 20, color: '#E5E4E2' }
                ],
                bonusRules: [
                    { condition: 'birthday', points: 100, description: 'نقاط عيد ميلاد' },
                    { condition: 'referral', points: 50, description: 'نقاط دعوة صديق' }
                ]
            },
            settings: {
                workingHours: {
                    start: '09:00',
                    end: '22:00'
                },
                workingDays: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
                timezone: 'Asia/Riyadh',
                currency: 'SAR',
                language: 'ar'
            }
        });

        barberOwner.business = barbershop._id;
        await barberOwner.save();

        // Create services for barbershop
        await Service.create([
            {
                name: 'قص شعر عادي',
                price: 30,
                duration: 30,
                business: barbershop._id,
                isActive: true
            },
            {
                name: 'قص شعر وتشذيب لحية',
                price: 50,
                duration: 45,
                business: barbershop._id,
                isActive: true
            },
            {
                name: 'صبغة شعر',
                price: 80,
                duration: 60,
                business: barbershop._id,
                isActive: true
            }
        ]);

        console.log('✅ تم إنشاء محل الحلاقة النموذجي');

        // Create Sample Business 2 - Restaurant
        const restaurantOwner = await User.create({
            name: 'فاطمة علي',
            email: 'fatima@restaurant.com',
            password: '123456',
            phone: '0507654321',
            role: 'business_owner'
        });

        const restaurant = await Business.create({
            businessName: 'مطعم الذوق الأصيل',
            businessType: 'restaurant',
            email: 'info@restaurant.com',
            phone: '0507654321',
            address: 'طريق الملك عبدالله، جدة',
            subdomain: 'authentic-taste',
            owner: restaurantOwner._id,
            subscription: {
                plan: 'basic',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                price: 99,
                billingCycle: 'monthly',
                nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            },
            limits: {
                maxEmployees: 3,
                maxAppointmentsPerMonth: 200,
                maxCustomers: 500,
                maxServices: 30,
                canUseAI: true,
                canUseLoyalty: true,
                canUseAnalytics: true,
                canUseNotifications: true,
                canUseCustomBranding: false
            },
            loyaltyProgram: {
                enabled: true,
                pointsPerCurrency: 5,
                pointsValue: 0.02,
                minPointsToRedeem: 50,
                expiryDays: 180,
                tiers: [
                    { name: 'عادي', minPoints: 0, discount: 0, color: '#808080' },
                    { name: 'VIP', minPoints: 300, discount: 10, color: '#FFD700' }
                ]
            },
            settings: {
                workingHours: {
                    start: '11:00',
                    end: '23:00'
                },
                workingDays: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
                timezone: 'Asia/Riyadh',
                currency: 'SAR',
                language: 'ar'
            }
        });

        restaurantOwner.business = restaurant._id;
        await restaurantOwner.save();

        await Service.create([
            {
                name: 'وجبة مندي',
                price: 45,
                duration: 30,
                business: restaurant._id,
                isActive: true
            },
            {
                name: 'وجبة كبسة',
                price: 40,
                duration: 30,
                business: restaurant._id,
                isActive: true
            }
        ]);

        console.log('✅ تم إنشاء المطعم النموذجي');

        // Create Sample Business 3 - Workshop (Trial)
        const workshopOwner = await User.create({
            name: 'خالد سعيد',
            email: 'khaled@workshop.com',
            password: '123456',
            phone: '0509876543',
            role: 'business_owner'
        });

        const workshop = await Business.create({
            businessName: 'ورشة السيارات المتقدمة',
            businessType: 'workshop',
            email: 'info@workshop.com',
            phone: '0509876543',
            address: 'الطريق الدائري، الدمام',
            subdomain: 'advanced-cars',
            owner: workshopOwner._id,
            subscription: {
                plan: 'free',
                status: 'trial',
                startDate: new Date(),
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                price: 0,
                billingCycle: 'monthly'
            },
            limits: {
                maxEmployees: 1,
                maxAppointmentsPerMonth: 50,
                maxCustomers: 100,
                maxServices: 10,
                canUseAI: false,
                canUseLoyalty: false,
                canUseAnalytics: false,
                canUseNotifications: false,
                canUseCustomBranding: false
            },
            loyaltyProgram: {
                enabled: false
            }
        });

        workshopOwner.business = workshop._id;
        await workshopOwner.save();

        await Service.create([
            {
                name: 'تغيير زيت',
                price: 150,
                duration: 60,
                business: workshop._id,
                isActive: true
            },
            {
                name: 'فحص شامل',
                price: 200,
                duration: 120,
                business: workshop._id,
                isActive: true
            }
        ]);

        console.log('✅ تم إنشاء الورشة النموذجية');

        // Create sample customers
        const customer1 = await Customer.create({
            name: 'عبدالله محمود',
            email: 'abdullah@example.com',
            phone: '0551234567',
            business: barbershop._id,
            loyaltyPoints: 250,
            loyaltyTier: 'برونزي',
            totalVisits: 5,
            totalSpent: 250,
            pointsHistory: [
                { points: 250, type: 'earned', description: 'نقاط من المشتريات', date: new Date() }
            ]
        });

        const customer2 = await Customer.create({
            name: 'سارة أحمد',
            email: 'sara@example.com',
            phone: '0557654321',
            business: restaurant._id,
            loyaltyPoints: 100,
            loyaltyTier: 'عادي',
            totalVisits: 3,
            totalSpent: 135
        });

        console.log('✅ تم إنشاء عملاء نموذجيين');

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✨ تم تهيئة قاعدة البيانات بنجاح!');
        console.log('═══════════════════════════════════════════════════════');
        console.log('\n📊 البيانات المنشأة:');
        console.log(`   • ${plans.length} خطط اشتراك`);
        console.log(`   • 1 مدير رئيسي (Super Admin)`);
        console.log(`   • 3 محلات تجارية`);
        console.log(`   • 3 أصحاب محلات`);
        console.log(`   • 2 عملاء\n`);
        
        console.log('🔐 بيانات الدخول:');
        console.log('┌─────────────────────────────────────────────────────┐');
        console.log('│ المدير الرئيسي (Super Admin):                     │');
        console.log('│   البريد: admin@smartbiz.com                       │');
        console.log('│   كلمة المرور: admin123                            │');
        console.log('├─────────────────────────────────────────────────────┤');
        console.log('│ صالون الأناقة (خطة احترافية):                    │');
        console.log('│   البريد: ahmed@barber.com                         │');
        console.log('│   كلمة المرور: 123456                              │');
        console.log('│   النطاق: elegance                                 │');
        console.log('├─────────────────────────────────────────────────────┤');
        console.log('│ مطعم الذوق الأصيل (خطة أساسية):                  │');
        console.log('│   البريد: fatima@restaurant.com                    │');
        console.log('│   كلمة المرور: 123456                              │');
        console.log('│   النطاق: authentic-taste                          │');
        console.log('├─────────────────────────────────────────────────────┤');
        console.log('│ ورشة السيارات (فترة تجريبية):                    │');
        console.log('│   البريد: khaled@workshop.com                      │');
        console.log('│   كلمة المرور: 123456                              │');
        console.log('│   النطاق: advanced-cars                            │');
        console.log('└─────────────────────────────────────────────────────┘\n');

        mongoose.connection.close();
        console.log('✅ تم إغلاق الاتصال بقاعدة البيانات');

    } catch (error) {
        console.error('❌ خطأ:', error);
        mongoose.connection.close();
    }
};

seedData();