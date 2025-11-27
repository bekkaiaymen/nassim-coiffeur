const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

async function checkUserPassword() {
    try {
        const email = 'aymenbekkai177@gmail.com';
        const user = await User.findOne({ email });
        if (!user) {
            console.log('❌ المستخدم غير موجود:', email);
            process.exit(1);
        }
        console.log('✅ تم العثور على المستخدم:', email);
        console.log('🔒 Hash:', user.password.substring(0, 30) + '...');
        const testPasswords = ['nassim', 'Nassim', '123456', 'password', 'admin', 'test', 'aymen', 'owner'];
        for (const pwd of testPasswords) {
            const match = await bcrypt.compare(pwd, user.password);
            if (match) {
                console.log(`✅ كلمة المرور الصحيحة: "${pwd}"`);
                process.exit(0);
            }
        }
        console.log('❌ لم يتم العثور على كلمة مرور معروفة');
        process.exit(1);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

checkUserPassword();
