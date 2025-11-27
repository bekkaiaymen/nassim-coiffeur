// البحث عن محل nassim وبيانات المالك
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Business = require('./models/Business');

async function findNassimBusiness() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ متصل بقاعدة البيانات\n');

        // البحث عن محل nassim
        const business = await Business.findOne({ 
            $or: [
                { businessName: /nassim/i },
                { subdomain: /nassim/i }
            ]
        });
        
        if (!business) {
            console.log('❌ لم يتم العثور على محل nassim');
            console.log('\n📋 المحلات المتاحة:');
            const allBusinesses = await Business.find().select('businessName subdomain email');
            allBusinesses.forEach(b => {
                console.log(`   - ${b.businessName} (${b.subdomain})`);
            });
            process.exit(1);
        }

        console.log('🏪 معلومات المحل:');
        console.log(`   🆔 Business ID: ${business._id}`);
        console.log(`   الاسم: ${business.businessName}`);
        console.log(`   النطاق: ${business.subdomain}`);
        console.log(`   البريد: ${business.email}`);
        console.log(`   الجوال: ${business.phone}`);
        console.log(`   owner ID: ${business.owner}`);
        console.log('');

        // البحث عن المالك
        const owner = await User.findById(business.owner);
        
        if (owner) {
            console.log('👤 بيانات تسجيل الدخول:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📧 البريد: ${owner.email}`);
            console.log(`📱 الجوال: ${owner.phone}`);
            console.log(`🔑 كلمة المرور: 123456`);
            console.log(`👤 الاسم: ${owner.name}`);
            console.log(`🎭 الدور: ${owner.role}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('\n🌐 للدخول:');
            console.log(`   صفحة تسجيل الدخول: http://localhost:3000/login`);
            console.log(`   لوحة التحكم: http://localhost:3000/dashboard`);
        } else {
            console.log('❌ المالك غير موجود في جدول Users');
            console.log('\n💡 يمكن إنشاء المستخدم بتشغيل:');
            console.log(`   node create-business-owner.js`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

findNassimBusiness();
