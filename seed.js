const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Customer = require('./models/Customer');
const Service = require('./models/Service');
const Appointment = require('./models/Appointment');
const Invoice = require('./models/Invoice');
const Tenant = require('./models/Tenant');
const SubscriptionPlan = require('./models/SubscriptionPlan');
const Subscription = require('./models/Subscription');
const RewardProgram = require('./models/RewardProgram');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbiz', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const seedData = async () => {
    try {
        console.log('🗑️  جاري حذف البيانات القديمة...');
        
        await User.deleteMany();
        await Customer.deleteMany();
        await Service.deleteMany();
        await Appointment.deleteMany();
        await Invoice.deleteMany();
        await Tenant.deleteMany();
        await SubscriptionPlan.deleteMany();
        await Subscription.deleteMany();
        await RewardProgram.deleteMany();

        console.log('💎 إنشاء خطط الاشتراك...');
        
        const plans = await SubscriptionPlan.create([
            {
                name: 'Basic',
                nameAr: 'الباقة الأساسية',
                slug: 'basic',
                description: 'Perfect for small businesses just getting started',
                descriptionAr: 'مثالية للأعمال الصغيرة التي بدأت للتو',
                pricing: {
                    monthly: 99,
                    yearly: 990,
                    currency: 'SAR',
                    trialDays: 14
                },
                stripe_price_id: null, // سيتم إضافته عند تفعيل Stripe
                features: {
                    maxEmployees: 3,
                    maxAppointmentsPerMonth: 200,
                    maxCustomers: 500,
                    maxServices: 20,
                    aiAssistant: true,
                    whatsappIntegration: false,
                    smsNotifications: false,
                    emailNotifications: true,
                    loyaltyProgram: true,
                    advancedReports: false,
                    multipleLocations: false,
                    customDomain: false,
                    apiAccess: false,
                    prioritySupport: false,
                    removeWatermark: false,
                    customBranding: false
                },
                platformCommission: 5,
                displayOrder: 1,
                popular: false,
                active: true,
                featureList: [
                    { feature: 'حتى 3 موظفين', included: true },
                    { feature: '200 موعد شهرياً', included: true },
                    { feature: '500 عميل', included: true },
                    { feature: 'ذكاء اصطناعي للرد', included: true },
                    { feature: 'برنامج ولاء أساسي', included: true },
                    { feature: 'إشعارات البريد', included: true },
                    { feature: 'دعم فني', included: true }
                ]
            },
            {
                name: 'Pro',
                nameAr: 'الباقة الاحترافية',
                slug: 'pro',
                description: 'For growing businesses that need more features',
                descriptionAr: 'للأعمال المتنامية التي تحتاج المزيد من الميزات',
                pricing: {
                    monthly: 249,
                    yearly: 2490,
                    currency: 'SAR',
                    trialDays: 14
                },
                stripe_price_id: null,
                features: {
                    maxEmployees: 10,
                    maxAppointmentsPerMonth: 1000,
                    maxCustomers: 2000,
                    maxServices: -1,
                    aiAssistant: true,
                    whatsappIntegration: true,
                    smsNotifications: true,
                    emailNotifications: true,
                    loyaltyProgram: true,
                    advancedReports: true,
                    multipleLocations: false,
                    customDomain: false,
                    apiAccess: false,
                    prioritySupport: true,
                    removeWatermark: true,
                    customBranding: false
                },
                platformCommission: 3,
                displayOrder: 2,
                popular: true,
                active: true,
                featureList: [
                    { feature: 'حتى 10 موظفين', included: true },
                    { feature: '1000 موعد شهرياً', included: true },
                    { feature: '2000 عميل', included: true },
                    { feature: 'ذكاء اصطناعي متقدم', included: true },
                    { feature: 'برنامج ولاء متقدم', included: true },
                    { feature: 'واتساب + SMS', included: true },
                    { feature: 'تقارير تفصيلية', included: true },
                    { feature: 'دعم أولوية', included: true },
                    { feature: 'إزالة العلامة المائية', included: true }
                ]
            },
            {
                name: 'Enterprise',
                nameAr: 'باقة الأعمال',
                slug: 'enterprise',
                description: 'For large businesses with multiple locations',
                descriptionAr: 'للأعمال الكبيرة مع عدة فروع',
                pricing: {
                    monthly: 599,
                    yearly: 5990,
                    currency: 'SAR',
                    trialDays: 30
                },
                stripe_price_id: null,
                features: {
                    maxEmployees: -1,
                    maxAppointmentsPerMonth: -1,
                    maxCustomers: -1,
                    maxServices: -1,
                    aiAssistant: true,
                    whatsappIntegration: true,
                    smsNotifications: true,
                    emailNotifications: true,
                    loyaltyProgram: true,
                    advancedReports: true,
                    multipleLocations: true,
                    customDomain: true,
                    apiAccess: true,
                    prioritySupport: true,
                    removeWatermark: true,
                    customBranding: true
                },
                platformCommission: 2,
                displayOrder: 3,
                popular: false,
                active: true,
                featureList: [
                    { feature: 'موظفين غير محدود', included: true },
                    { feature: 'مواعيد غير محدودة', included: true },
                    { feature: 'عملاء غير محدود', included: true },
                    { feature: 'ذكاء اصطناعي متقدم', included: true },
                    { feature: 'برنامج ولاء مخصص', included: true },
                    { feature: 'جميع وسائل التواصل', included: true },
                    { feature: 'تقارير شاملة', included: true },
                    { feature: 'عدة فروع', included: true },
                    { feature: 'نطاق مخصص', included: true },
                    { feature: 'API كامل', included: true },
                    { feature: 'دعم مخصص 24/7', included: true },
                    { feature: 'علامة تجارية مخصصة', included: true }
                ]
            }
        ]);

        console.log('🏢 إنشاء المتاجر التجريبية...');
        
        // Demo Tenant 1: Basic Plan
        const tenant_basic = await Tenant.create({
            name: 'صالون النجوم',
            slug: 'salon-alnujoom',
            owner: null,
            plan: plans[0]._id, // Basic plan
            billingEmail: 'owner@alnujoom.com',
            settings: {
                rewardsEnabled: true,
                rewardsConfig: {
                    pointsPerRiyal: 1,
                    riyalPerPoint: 0.1
                }
            },
            status: 'active'
        });

        // Demo Tenant 2: Pro Plan
        const tenant_pro = await Tenant.create({
            name: 'صالون الأناقة',
            slug: 'salon-alanaka',
            owner: null,
            plan: plans[1]._id, // Pro plan
            billingEmail: 'owner@alanaka.com',
            settings: {
                rewardsEnabled: true,
                rewardsConfig: {
                    pointsPerRiyal: 1,
                    riyalPerPoint: 0.1
                }
            },
            status: 'active'
        });

        // Demo Tenant 3: Enterprise Plan
        const tenant_enterprise = await Tenant.create({
            name: 'مجموعة صالونات الفخامة',
            slug: 'salon-alfakhamah',
            owner: null,
            plan: plans[2]._id, // Enterprise plan
            billingEmail: 'owner@alfakhamah.com',
            settings: {
                rewardsEnabled: true,
                rewardsConfig: {
                    pointsPerRiyal: 2,
                    riyalPerPoint: 0.05
                }
            },
            status: 'active'
        });
        
        const demoTenant = tenant_pro; // للتوافق مع الكود القديم

        console.log('🔄 إنشاء اشتراكات المتاجر...');
        
        await Subscription.create([
            {
                tenant: tenant_basic._id,
                plan: plans[0]._id,
                status: 'active',
                startedAt: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                autoRenew: true
            },
            {
                tenant: tenant_pro._id,
                plan: plans[1]._id,
                status: 'active',
                startedAt: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                autoRenew: true
            },
            {
                tenant: tenant_enterprise._id,
                plan: plans[2]._id,
                status: 'active',
                startedAt: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                autoRenew: true
            }
        ]);

        console.log('🎁 إنشاء برامج المكافآت...');
        
        await RewardProgram.create([
            {
                tenant: tenant_basic._id,
                name: 'برنامج نقاط الولاء - الأساسي',
                enabled: true,
                config: {
                    pointsPerCurrency: 1,
                    redemptionRate: 0.1,
                    tiers: [
                        { name: 'برونزي', minPoints: 0, multiplier: 1 },
                        { name: 'فضي', minPoints: 50, multiplier: 1.2 }
                    ],
                    expirationDays: 180
                }
            },
            {
                tenant: tenant_pro._id,
                name: 'برنامج نقاط الولاء - الاحترافي',
                enabled: true,
                config: {
                    pointsPerCurrency: 1,
                    redemptionRate: 0.1,
                    tiers: [
                        { name: 'برونزي', minPoints: 0, multiplier: 1 },
                        { name: 'فضي', minPoints: 100, multiplier: 1.25 },
                        { name: 'ذهبي', minPoints: 300, multiplier: 1.5 },
                        { name: 'بلاتيني', minPoints: 500, multiplier: 2 }
                    ],
                    expirationDays: 365
                }
            },
            {
                tenant: tenant_enterprise._id,
                name: 'برنامج VIP الفخامة',
                enabled: true,
                config: {
                    pointsPerCurrency: 2,
                    redemptionRate: 0.05,
                    tiers: [
                        { name: 'برونزي', minPoints: 0, multiplier: 1.5 },
                        { name: 'فضي', minPoints: 200, multiplier: 2 },
                        { name: 'ذهبي', minPoints: 500, multiplier: 2.5 },
                        { name: 'بلاتيني', minPoints: 1000, multiplier: 3 },
                        { name: 'ماسي', minPoints: 2000, multiplier: 4 }
                    ],
                    expirationDays: 730
                }
            }
        ]);

        console.log('👥 إنشاء المستخدمين...');
        
        const users = await User.create([
            // Super Admin
            {
                name: 'Super Admin',
                email: 'superadmin@smartbiz.com',
                password: '123456',
                phone: '0500000000',
                role: 'super_admin'
            },
            // Tenant Basic - Owner + 1 Employee
            {
                name: 'أحمد النجم',
                email: 'owner@alnujoom.com',
                password: '123456',
                phone: '0501111111',
                role: 'business_owner',
                tenant: tenant_basic._id
            },
            {
                name: 'سالم',
                email: 'salem@alnujoom.com',
                password: '123456',
                phone: '0501111112',
                role: 'employee',
                tenant: tenant_basic._id,
                specialties: ['حلاقة كاملة'],
                rating: 4.5
            },
            // Tenant Pro - Owner + 3 Employees
            {
                name: 'عبدالله الأنيق',
                email: 'owner@alanaka.com',
                password: '123456',
                phone: '0502222221',
                role: 'business_owner',
                tenant: tenant_pro._id
            },
            {
                name: 'محمد',
                email: 'mohammed@alanaka.com',
                password: '123456',
                phone: '0502222222',
                role: 'employee',
                tenant: tenant_pro._id,
                specialties: ['حلاقة كاملة', 'تشذيب لحية'],
                rating: 4.8
            },
            {
                name: 'خالد',
                email: 'khaled@alanaka.com',
                password: '123456',
                phone: '0502222223',
                role: 'employee',
                tenant: tenant_pro._id,
                specialties: ['صبغة', 'حلاقة'],
                rating: 4.9
            },
            {
                name: 'علي',
                email: 'ali@alanaka.com',
                password: '123456',
                phone: '0502222224',
                role: 'employee',
                tenant: tenant_pro._id,
                specialties: ['حلاقة كاملة', 'حلاقة أطفال'],
                rating: 4.7
            },
            // Tenant Enterprise - Owner + Manager + 5 Employees
            {
                name: 'فهد الفخم',
                email: 'owner@alfakhamah.com',
                password: '123456',
                phone: '0503333331',
                role: 'business_owner',
                tenant: tenant_enterprise._id
            },
            {
                name: 'ماجد المدير',
                email: 'manager@alfakhamah.com',
                password: '123456',
                phone: '0503333332',
                role: 'manager',
                tenant: tenant_enterprise._id
            },
            {
                name: 'عمر',
                email: 'omar@alfakhamah.com',
                password: '123456',
                phone: '0503333333',
                role: 'employee',
                tenant: tenant_enterprise._id,
                specialties: ['حلاقة VIP', 'صبغة فاخرة'],
                rating: 5.0
            },
            {
                name: 'يوسف',
                email: 'yousef@alfakhamah.com',
                password: '123456',
                phone: '0503333334',
                role: 'employee',
                tenant: tenant_enterprise._id,
                specialties: ['حلاقة كاملة', 'لحية'],
                rating: 4.9
            },
            {
                name: 'راشد',
                email: 'rashed@alfakhamah.com',
                password: '123456',
                phone: '0503333335',
                role: 'employee',
                tenant: tenant_enterprise._id,
                specialties: ['صبغة', 'تسريحة'],
                rating: 4.8
            },
            {
                name: 'سعود',
                email: 'saud@alfakhamah.com',
                password: '123456',
                phone: '0503333336',
                role: 'employee',
                tenant: tenant_enterprise._id,
                specialties: ['حلاقة أطفال'],
                rating: 4.7
            },
            {
                name: 'طارق',
                email: 'tareq@alfakhamah.com',
                password: '123456',
                phone: '0503333337',
                role: 'employee',
                tenant: tenant_enterprise._id,
                specialties: ['حلاقة كاملة'],
                rating: 4.6
            }
        ]);

        // Update tenant owners
        tenant_basic.owner = users[1]._id;
        await tenant_basic.save();
        
        tenant_pro.owner = users[3]._id;
        await tenant_pro.save();
        
        tenant_enterprise.owner = users[7]._id;
        await tenant_enterprise.save();

        console.log('💇 إنشاء الخدمات...');
        
        const services = await Service.create([
            // Basic Tenant Services (أساسية فقط)
            {
                tenant: tenant_basic._id,
                name: 'حلاقة كاملة',
                nameEn: 'Full Haircut',
                description: 'حلاقة احترافية',
                category: 'haircut',
                price: 40,
                duration: 30,
                popularityScore: 100
            },
            {
                tenant: tenant_basic._id,
                name: 'تشذيب لحية',
                nameEn: 'Beard Trim',
                description: 'تشذيب اللحية',
                category: 'beard',
                price: 25,
                duration: 20,
                popularityScore: 70
            },
            // Pro Tenant Services (متنوعة)
            {
                tenant: tenant_pro._id,
                name: 'حلاقة كاملة',
                nameEn: 'Full Haircut',
                description: 'حلاقة احترافية بأحدث التقنيات',
                category: 'haircut',
                price: 50,
                duration: 30,
                popularityScore: 100
            },
            {
                tenant: tenant_pro._id,
                name: 'حلاقة + لحية',
                nameEn: 'Haircut + Beard',
                description: 'حلاقة كاملة مع تشذيب وتصفيف اللحية',
                category: 'haircut',
                price: 70,
                duration: 45,
                popularityScore: 85
            },
            {
                tenant: tenant_pro._id,
                name: 'تشذيب لحية',
                nameEn: 'Beard Trim',
                description: 'تشذيب وتهذيب اللحية بدقة',
                category: 'beard',
                price: 30,
                duration: 20,
                popularityScore: 70
            },
            {
                tenant: tenant_pro._id,
                name: 'صبغة',
                nameEn: 'Hair Color',
                description: 'صبغة شعر احترافية بألوان متنوعة',
                category: 'coloring',
                price: 100,
                duration: 60,
                popularityScore: 50
            },
            {
                tenant: tenant_pro._id,
                name: 'حلاقة أطفال',
                nameEn: 'Kids Haircut',
                description: 'حلاقة مخصصة للأطفال في جو مريح',
                category: 'haircut',
                price: 40,
                duration: 25,
                popularityScore: 60
            },
            // Enterprise Tenant Services (فاخرة)
            {
                tenant: tenant_enterprise._id,
                name: 'حلاقة VIP',
                nameEn: 'VIP Haircut',
                description: 'حلاقة فاخرة في جناح خاص',
                category: 'haircut',
                price: 150,
                duration: 60,
                popularityScore: 100
            },
            {
                tenant: tenant_enterprise._id,
                name: 'باقة العريس',
                nameEn: 'Groom Package',
                description: 'باقة شاملة للعريس',
                category: 'haircut',
                price: 500,
                duration: 120,
                popularityScore: 90
            },
            {
                tenant: tenant_enterprise._id,
                name: 'صبغة فاخرة',
                nameEn: 'Premium Coloring',
                description: 'صبغة بمواد إيطالية فاخرة',
                category: 'coloring',
                price: 250,
                duration: 90,
                popularityScore: 80
            },
            {
                tenant: tenant_enterprise._id,
                name: 'حلاقة كاملة',
                nameEn: 'Full Haircut',
                description: 'حلاقة احترافية',
                category: 'haircut',
                price: 80,
                duration: 45,
                popularityScore: 95
            },
            {
                tenant: tenant_enterprise._id,
                name: 'لحية ملكية',
                nameEn: 'Royal Beard',
                description: 'تشذيب وتصفيف ملكي للحية',
                category: 'beard',
                price: 100,
                duration: 40,
                popularityScore: 85
            }
        ]);

        console.log('👤 إنشاء العملاء...');
        
        const customers = await Customer.create([
            // Basic Tenant Customers
            {
                tenant: tenant_basic._id,
                name: 'خالد السعيد',
                phone: '0551111111',
                loyaltyPoints: 40,
                totalVisits: 4,
                totalSpent: 160,
                lastVisit: new Date(),
                status: 'active',
                rating: 4
            },
            {
                tenant: tenant_basic._id,
                name: 'سالم الحربي',
                phone: '0551111112',
                loyaltyPoints: 25,
                totalVisits: 2,
                totalSpent: 80,
                lastVisit: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                status: 'active',
                rating: 5
            },
            // Pro Tenant Customers
            {
                tenant: tenant_pro._id,
                name: 'أحمد محمد',
                phone: '0552222221',
                email: 'ahmed@example.com',
                loyaltyPoints: 150,
                totalVisits: 12,
                totalSpent: 840,
                lastVisit: new Date(),
                status: 'vip',
                rating: 5,
                preferences: {
                    favoriteService: 'حلاقة كاملة',
                    favoriteBarber: 'محمد',
                    preferredTime: '3:00 مساءً'
                }
            },
            {
                tenant: tenant_pro._id,
                name: 'سعيد أحمد',
                phone: '0552222222',
                loyaltyPoints: 80,
                totalVisits: 8,
                totalSpent: 560,
                lastVisit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                status: 'active',
                rating: 5
            },
            {
                tenant: tenant_pro._id,
                name: 'عبدالله خالد',
                phone: '0552222223',
                loyaltyPoints: 120,
                totalVisits: 10,
                totalSpent: 700,
                lastVisit: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                status: 'active',
                rating: 4
            },
            {
                tenant: tenant_pro._id,
                name: 'فهد علي',
                phone: '0552222224',
                loyaltyPoints: 200,
                totalVisits: 15,
                totalSpent: 1050,
                lastVisit: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                status: 'vip',
                rating: 5
            },
            // Enterprise Tenant Customers (VIP)
            {
                tenant: tenant_enterprise._id,
                name: 'الأمير سلطان',
                phone: '0553333331',
                email: 'prince@vip.com',
                loyaltyPoints: 1000,
                totalVisits: 30,
                totalSpent: 15000,
                lastVisit: new Date(),
                status: 'vip',
                rating: 5,
                preferences: {
                    favoriteService: 'حلاقة VIP',
                    favoriteBarber: 'عمر',
                    preferredTime: '10:00 صباحاً'
                }
            },
            {
                tenant: tenant_enterprise._id,
                name: 'رجل الأعمال عبدالعزيز',
                phone: '0553333332',
                email: 'abdulaziz@business.com',
                loyaltyPoints: 800,
                totalVisits: 25,
                totalSpent: 12000,
                lastVisit: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                status: 'vip',
                rating: 5
            },
            {
                tenant: tenant_enterprise._id,
                name: 'الدكتور ماجد',
                phone: '0553333333',
                loyaltyPoints: 500,
                totalVisits: 18,
                totalSpent: 7500,
                lastVisit: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                status: 'vip',
                rating: 5
            }
        ]);

        console.log('📅 إنشاء المواعيد...');
        
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        await Appointment.create([
            // Basic Tenant Appointments
            {
                tenant: tenant_basic._id,
                customerName: customers[0].name,
                customerPhone: customers[0].phone,
                customerId: customers[0]._id,
                service: 'حلاقة كاملة',
                serviceId: services[0]._id,
                date: today,
                time: '10:00',
                barber: 'سالم',
                barberId: users[2]._id,
                status: 'completed'
            },
            {
                tenant: tenant_basic._id,
                customerName: customers[1].name,
                customerPhone: customers[1].phone,
                customerId: customers[1]._id,
                service: 'تشذيب لحية',
                serviceId: services[1]._id,
                date: tomorrow,
                time: '11:00',
                barber: 'سالم',
                barberId: users[2]._id,
                status: 'fully_confirmed'
            },
            // Pro Tenant Appointments
            {
                tenant: tenant_pro._id,
                customerName: customers[2].name,
                customerPhone: customers[2].phone,
                customerId: customers[2]._id,
                service: 'حلاقة كاملة',
                serviceId: services[2]._id,
                date: today,
                time: '10:00',
                barber: 'محمد',
                barberId: users[4]._id,
                status: 'completed'
            },
            {
                tenant: tenant_pro._id,
                customerName: customers[3].name,
                customerPhone: customers[3].phone,
                customerId: customers[3]._id,
                service: 'حلاقة + لحية',
                serviceId: services[3]._id,
                date: today,
                time: '11:30',
                barber: 'خالد',
                barberId: users[5]._id,
                status: 'completed'
            },
            {
                tenant: tenant_pro._id,
                customerName: customers[4].name,
                customerPhone: customers[4].phone,
                customerId: customers[4]._id,
                service: 'تشذيب لحية',
                serviceId: services[4]._id,
                date: today,
                time: '14:00',
                barber: 'محمد',
                barberId: users[4]._id,
                status: 'fully_confirmed'
            },
            {
                tenant: tenant_pro._id,
                customerName: customers[5].name,
                customerPhone: customers[5].phone,
                customerId: customers[5]._id,
                service: 'صبغة',
                serviceId: services[5]._id,
                date: tomorrow,
                time: '10:00',
                barber: 'خالد',
                barberId: users[5]._id,
                status: 'fully_confirmed'
            },
            // Enterprise Tenant Appointments (VIP)
            {
                tenant: tenant_enterprise._id,
                customerName: customers[6].name,
                customerPhone: customers[6].phone,
                customerId: customers[6]._id,
                service: 'حلاقة VIP',
                serviceId: services[7]._id,
                date: today,
                time: '10:00',
                barber: 'عمر',
                barberId: users[9]._id,
                status: 'completed'
            },
            {
                tenant: tenant_enterprise._id,
                customerName: customers[7].name,
                customerPhone: customers[7].phone,
                customerId: customers[7]._id,
                service: 'باقة العريس',
                serviceId: services[8]._id,
                date: tomorrow,
                time: '09:00',
                barber: 'عمر',
                barberId: users[9]._id,
                status: 'fully_confirmed'
            },
            {
                tenant: tenant_enterprise._id,
                customerName: customers[8].name,
                customerPhone: customers[8].phone,
                customerId: customers[8]._id,
                service: 'صبغة فاخرة',
                serviceId: services[9]._id,
                date: tomorrow,
                time: '14:00',
                barber: 'راشد',
                barberId: users[11]._id,
                status: 'fully_confirmed'
            }
        ]);

        console.log('💰 إنشاء الفواتير...');
        
        await Invoice.create([
            // Basic Tenant Invoice
            {
                tenant: tenant_basic._id,
                invoiceNumber: 'INV-001',
                customerName: customers[0].name,
                customerPhone: customers[0].phone,
                customerId: customers[0]._id,
                items: [
                    { service: 'حلاقة كاملة', serviceId: services[0]._id, price: 40, quantity: 1 }
                ],
                subtotal: 40,
                tax: 6,
                total: 46,
                paymentMethod: 'cash',
                paymentStatus: 'paid',
                paidAmount: 46
            },
            // Pro Tenant Invoices
            {
                tenant: tenant_pro._id,
                invoiceNumber: 'INV-002',
                customerName: customers[2].name,
                customerPhone: customers[2].phone,
                customerId: customers[2]._id,
                items: [
                    { service: 'حلاقة كاملة', serviceId: services[2]._id, price: 50, quantity: 1 }
                ],
                subtotal: 50,
                tax: 7.5,
                total: 57.5,
                paymentMethod: 'cash',
                paymentStatus: 'paid',
                paidAmount: 57.5
            },
            {
                tenant: tenant_pro._id,
                invoiceNumber: 'INV-003',
                customerName: customers[3].name,
                customerPhone: customers[3].phone,
                customerId: customers[3]._id,
                items: [
                    { service: 'حلاقة + لحية', serviceId: services[3]._id, price: 70, quantity: 1 }
                ],
                subtotal: 70,
                tax: 10.5,
                total: 80.5,
                paymentMethod: 'card',
                paymentStatus: 'paid',
                paidAmount: 80.5
            },
            // Enterprise Tenant Invoice (VIP)
            {
                tenant: tenant_enterprise._id,
                invoiceNumber: 'INV-004',
                customerName: customers[6].name,
                customerPhone: customers[6].phone,
                customerId: customers[6]._id,
                items: [
                    { service: 'حلاقة VIP', serviceId: services[7]._id, price: 150, quantity: 1 },
                    { service: 'لحية ملكية', serviceId: services[11]._id, price: 100, quantity: 1 }
                ],
                subtotal: 250,
                tax: 37.5,
                total: 287.5,
                paymentMethod: 'card',
                paymentStatus: 'paid',
                paidAmount: 287.5
            }
        ]);

        console.log('✅ تم تعبئة قاعدة البيانات بنجاح!');
        console.log(`
📊 الإحصائيات:
   - خطط الاشتراك: ${plans.length}
   - المتاجر: 3 (Basic, Pro, Enterprise)
   - المستخدمين: ${users.length}
   - الخدمات: ${services.length}
   - العملاء: ${customers.length}
   - المواعيد: 9
   - الفواتير: 4

🔑 بيانات تسجيل الدخول:
   
   🔴 Super Admin (مدير المنصة):
   البريد: superadmin@smartbiz.com
   كلمة المرور: 123456
   
   🟡 Basic Tenant Owner (صالون النجوم):
   البريد: owner@alnujoom.com
   كلمة المرور: 123456
   خطة: Basic - 99 ريال/شهر
   
   🟢 Pro Tenant Owner (صالون الأناقة):
   البريد: owner@alanaka.com
   كلمة المرور: 123456
   خطة: Pro - 249 ريال/شهر
   
   🔵 Enterprise Tenant Owner (صالونات الفخامة):
   البريد: owner@alfakhamah.com
   كلمة المرور: 123456
   خطة: Enterprise - 599 ريال/شهر

💎 خطط الاشتراك:
   - Basic: 99 ريال/شهر (موظف واحد، 50 موعد/شهر)
   - Pro: 249 ريال/شهر (3 موظفين، 200 موعد/شهر) ⭐
   - Enterprise: 599 ريال/شهر (غير محدود) 👑
        `);

        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
};

seedData();
