const mongoose = require('mongoose');
const User = require('./models/User');
const Business = require('./models/Business');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb+srv://smartbiz_user:SmartBiz2025@cluster0.s7pwvtq.mongodb.net/smartbiz?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function testLogin() {
    try {
        const email = 'aymenbekkai177@gmail.com';
        const password = 'nassim';
        
        console.log('🔍 محاولة تسجيل الدخول...');
        console.log('الإيميل:', email);
        console.log('كلمة المرور:', password);
        console.log('');
        
        // Find user
        const user = await User.findOne({ email }).populate('business');
        
        if (!user) {
            console.log('❌ المستخدم غير موجود');
            
            // List all users
            const allUsers = await User.find({});
            console.log('\n📋 المستخدمون في قاعدة البيانات:');
            allUsers.forEach(u => {
                console.log(`- ${u.email} (${u.role})`);
            });
            
            process.exit(1);
        }
        
        console.log('✅ تم العثور على المستخدم');
        console.log('الاسم:', user.name);
        console.log('الدور:', user.role);
        console.log('Business:', user.business);
        console.log('');
        
        // Test password
        console.log('🔐 اختبار كلمة المرور...');
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
            console.log('✅ كلمة المرور صحيحة!');
            console.log('');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('✨ يمكنك تسجيل الدخول الآن:');
            console.log('الإيميل: aymenbekkai179@gmail.com');
            console.log('كلمة المرور: nassim');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
            console.log('❌ كلمة المرور خاطئة!');
            console.log('');
            
            // Try to reset password
            console.log('🔄 إعادة تعيين كلمة المرور...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('nassim', salt);
            
            // Use updateOne to bypass pre-save hook
            await User.updateOne(
                { _id: user._id },
                { $set: { password: hashedPassword } }
            );
            
            console.log('✅ تم إعادة تعيين كلمة المرور إلى: nassim');
            
            // Test again
            const updatedUser = await User.findById(user._id);
            const isMatchNow = await bcrypt.compare('nassim', updatedUser.password);
            console.log('اختبار جديد:', isMatchNow ? '✅ ناجح' : '❌ فشل');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

testLogin();
