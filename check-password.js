const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb+srv://smartbiz_user:SmartBiz2025@cluster0.s7pwvtq.mongodb.net/smartbiz?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function checkPassword() {
    try {
        const user = await User.findOne({ email: 'aymenbekkai179@gmail.com' });
        
        if (user) {
            console.log('\n✅ تم العثور على الحساب:');
            console.log('الإيميل:', user.email);
            console.log('الاسم:', user.name);
            console.log('الدور:', user.role);
            console.log('Business ID:', user.business);
            console.log('\n🔐 كلمة المرور المشفرة:', user.password);
            console.log('\n💡 لتسجيل الدخول استخدم:');
            console.log('الإيميل: aymenbekkai179@gmail.com');
            console.log('كلمة المرور: nassim');
            
            // Test password
            const bcrypt = require('bcryptjs');
            const isMatch = await bcrypt.compare('nassim', user.password);
            console.log('\n✓ اختبار كلمة المرور "nassim":', isMatch ? '✅ صحيحة' : '❌ خاطئة');
            
            // Try other common passwords
            const testPasswords = ['nassim', 'Nassim', '123456', 'password', 'admin'];
            console.log('\n🔍 جاري اختبار كلمات مرور شائعة...');
            for (const pwd of testPasswords) {
                const match = await bcrypt.compare(pwd, user.password);
                if (match) {
                    console.log(`✅ كلمة المرور الصحيحة: "${pwd}"`);
                    break;
                }
            }
        } else {
            console.log('❌ لم يتم العثور على الحساب');
            
            // Search all users
            console.log('\n📋 جميع المستخدمين في قاعدة البيانات:');
            const allUsers = await User.find({});
            allUsers.forEach(u => {
                console.log(`- ${u.email} (${u.role}) - ${u.name}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('خطأ:', error);
        process.exit(1);
    }
}

checkPassword();
