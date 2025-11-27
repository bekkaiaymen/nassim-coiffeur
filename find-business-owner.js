// البحث عن المستخدم المرتبط بالـ business
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Business = require('./models/Business');

async function findBusinessOwner() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ متصل بقاعدة البيانات\n');

        // البحث عن business anaka
        const business = await Business.findOne({ subdomain: 'anaka' });
        
        if (!business) {
            console.log('❌ المحل غير موجود');
            process.exit(1);
        }

        console.log('📋 معلومات المحل:');
        console.log(`   الاسم: ${business.businessName}`);
        console.log(`   البريد: ${business.email}`);
        console.log(`   owner ID: ${business.owner}`);
        console.log('');

        // البحث عن المستخدم المالك
        const owner = await User.findById(business.owner);
        
        if (owner) {
            console.log('👤 معلومات المالك:');
            console.log(`   الاسم: ${owner.name}`);
            console.log(`   البريد: ${owner.email}`);
            console.log(`   الجوال: ${owner.phone}`);
            console.log(`   الدور: ${owner.role}`);
            console.log(`   لديه كلمة مرور: ${!!owner.password ? 'نعم' : 'لا'}`);
        } else {
            console.log('❌ المالك غير موجود في جدول Users');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

findBusinessOwner();
