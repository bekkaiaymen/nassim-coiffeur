const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    phone: String,
    role: String,
    business: mongoose.Schema.Types.ObjectId
});

const User = mongoose.model('User', userSchema);

mongoose.connect('mongodb+srv://smartbiz_user:SmartBiz2025@cluster0.s7pwvtq.mongodb.net/smartbiz?retryWrites=true&w=majority&appName=Cluster0');

async function fixPassword() {
    try {
        console.log('🔧 إصلاح كلمة المرور...\n');
        
        const user = await User.findOne({ email: 'aymenbekkai179@gmail.com' });
        
        if (!user) {
            console.log('❌ المستخدم غير موجود');
            process.exit(1);
        }
        
        console.log('✅ تم العثور على المستخدم:', user.email);
        
        // Hash password properly
        const password = 'nassim';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        console.log('🔐 كلمة المرور الجديدة:', password);
        console.log('🔒 Hash:', hashedPassword.substring(0, 30) + '...');
        
        // Update using direct MongoDB update
        await User.updateOne(
            { email: 'aymenbekkai179@gmail.com' },
            { $set: { password: hashedPassword } }
        );
        
        console.log('✅ تم تحديث كلمة المرور');
        
        // Verify
        const updatedUser = await User.findOne({ email: 'aymenbekkai179@gmail.com' });
        const isMatch = await bcrypt.compare(password, updatedUser.password);
        
        console.log('\n🧪 اختبار كلمة المرور:', isMatch ? '✅ نجح' : '❌ فشل');
        
        if (isMatch) {
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('✨ يمكنك الآن تسجيل الدخول:');
            console.log('📧 الإيميل: aymenbekkai179@gmail.com');
            console.log('🔑 كلمة المرور: nassim');
            console.log('🔗 الرابط: http://localhost:3000/login');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

fixPassword();
