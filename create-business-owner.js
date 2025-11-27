// إنشاء user مرتبط بـ business anaka
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Business = require('./models/Business');

async function createBusinessOwner() {
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

        // التحقق من وجود المستخدم
        let owner = await User.findById(business.owner);
        
        if (owner) {
            console.log('✅ المالك موجود بالفعل');
            console.log(`   الاسم: ${owner.name}`);
            console.log(`   البريد: ${owner.email}`);
            process.exit(0);
        }

        // التحقق من وجود مستخدم بنفس البريد
        const existingUser = await User.findOne({ email: business.email });
        if (existingUser) {
            console.log('⚠️  مستخدم موجود بنفس البريد لكن ID مختلف');
            console.log(`   ID الحالي: ${existingUser._id}`);
            console.log(`   ID المطلوب: ${business.owner}`);
            
            // تحديث business.owner
            business.owner = existingUser._id;
            await business.save();
            
            console.log('✅ تم تحديث owner في business');
            process.exit(0);
        }

        // إنشاء المستخدم
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        owner = new User({
            _id: business.owner, // استخدام نفس ID
            name: 'AYMEN',
            email: business.email,
            phone: business.phone,
            password: hashedPassword,
            role: 'business_owner',
            business: business._id
        });

        await owner.save();

        console.log('✅ تم إنشاء المستخدم بنجاح:');
        console.log(`   الاسم: ${owner.name}`);
        console.log(`   البريد: ${owner.email}`);
        console.log(`   الجوال: ${owner.phone}`);
        console.log(`   كلمة المرور: 123456`);

        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        console.error(error);
        process.exit(1);
    }
}

createBusinessOwner();
