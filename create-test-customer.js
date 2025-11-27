// إنشاء حساب زبون تجريبي
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

async function createTestCustomer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbiz-ai');
        console.log('✅ متصل بقاعدة البيانات');

        // حذف الزبون التجريبي إن وجد
        await User.deleteOne({ phone: '0500000001' });

        // إنشاء كلمة مرور مشفرة
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        // إنشاء زبون جديد
        const customer = await User.create({
            name: 'زبون تجريبي',
            phone: '0500000001',
            email: 'customer@test.com',
            password: hashedPassword,
            role: 'customer'
        });

        console.log('✅ تم إنشاء حساب الزبون التجريبي:');
        console.log('📱 رقم الجوال: 0500000001');
        console.log('📧 البريد: customer@test.com');
        console.log('🔑 كلمة المرور: 123456');

        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

createTestCustomer();
