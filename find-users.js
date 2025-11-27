// البحث عن المستخدمين
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function findUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ متصل بقاعدة البيانات\n');

        // البحث عن جميع المستخدمين
        const users = await User.find({}).select('name email phone role');
        
        console.log(`📋 عدد المستخدمين: ${users.length}\n`);
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name}`);
            console.log(`   📧 البريد: ${user.email}`);
            console.log(`   📱 الجوال: ${user.phone}`);
            console.log(`   👤 الدور: ${user.role}`);
            console.log('');
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

findUsers();
