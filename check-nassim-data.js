const mongoose = require('mongoose');
require('dotenv').config();

const Business = require('./models/Business');
const Employee = require('./models/Employee');
const Service = require('./models/Service');

async function checkNassimData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ متصل بقاعدة البيانات\n');

        const business = await Business.findOne({ businessName: /nassim/i });
        
        if (!business) {
            console.log('❌ لم يتم العثور على محل nassim');
            process.exit(1);
        }

        console.log(`🏪 محل: ${business.businessName} (${business._id})\n`);

        // Check services
        const services = await Service.find({ business: business._id });
        console.log(`📋 الخدمات (${services.length}):`);
        if (services.length === 0) {
            console.log('   ❌ لا توجد خدمات');
        } else {
            services.forEach(s => {
                console.log(`   ✅ ${s.name} - ${s.price} ر.س - ${s.duration} دقيقة`);
            });
        }
        console.log('');

        // Check employees
        const employees = await Employee.find({ business: business._id });
        console.log(`👥 الموظفين (${employees.length}):`);
        if (employees.length === 0) {
            console.log('   ❌ لا يوجد موظفين');
        } else {
            employees.forEach(e => {
                console.log(`   ✅ ${e.name} - ${e.phone}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

checkNassimData();
