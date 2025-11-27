const mongoose = require('mongoose');
require('dotenv').config();

const Business = require('./models/Business');
const Service = require('./models/Service');

async function createNassimServices() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ متصل بقاعدة البيانات\n');

        const business = await Business.findOne({ businessName: /nassim/i });
        
        if (!business) {
            console.log('❌ لم يتم العثور على محل nassim');
            process.exit(1);
        }

        console.log(`🏪 محل: ${business.businessName} (${business._id})\n`);

        const services = [
            {
                name: 'قص شعر عادي',
                description: 'قص شعر كلاسيكي بالمقص والماكينة',
                price: 40,
                duration: 30,
                category: 'haircut',
                tenant: business._id,
                business: business._id,
                isActive: true
            },
            {
                name: 'قص شعر + لحية',
                description: 'قص شعر وتشذيب اللحية بشكل احترافي',
                price: 60,
                duration: 45,
                category: 'haircut',
                tenant: business._id,
                business: business._id,
                isActive: true
            },
            {
                name: 'حلاقة ملكية',
                description: 'قص شعر + لحية + ماسك + تدليك',
                price: 100,
                duration: 60,
                category: 'spa',
                tenant: business._id,
                business: business._id,
                isActive: true
            },
            {
                name: 'تشذيب اللحية',
                description: 'تشذيب وتنظيف اللحية فقط',
                price: 25,
                duration: 20,
                category: 'beard',
                tenant: business._id,
                business: business._id,
                isActive: true
            },
            {
                name: 'صبغة شعر',
                description: 'صبغة شعر كاملة باللون المطلوب',
                price: 80,
                duration: 90,
                category: 'coloring',
                tenant: business._id,
                business: business._id,
                isActive: true
            },
            {
                name: 'حلاقة أطفال',
                description: 'قص شعر مخصص للأطفال',
                price: 30,
                duration: 25,
                category: 'haircut',
                tenant: business._id,
                business: business._id,
                isActive: true
            }
        ];

        // Delete old service with price 400
        await Service.deleteMany({ business: business._id, price: 400 });
        console.log('🗑️  تم حذف الخدمات القديمة\n');

        for (const serviceData of services) {
            const existing = await Service.findOne({ 
                name: serviceData.name, 
                business: business._id 
            });
            if (existing) {
                console.log(`⏭️  ${serviceData.name} موجودة بالفعل`);
            } else {
                const service = await Service.create(serviceData);
                console.log(`✅ تم إضافة: ${service.name} - ${service.price} ر.س`);
            }
        }

        console.log('\n✨ تم بنجاح!');
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

createNassimServices();
