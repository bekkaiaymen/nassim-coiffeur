const mongoose = require('mongoose');
const User = require('./models/User');

// الاتصال بقاعدة البيانات
mongoose.connect('mongodb://localhost:27017/smartbiz', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB متصل'))
.catch(err => console.error('خطأ في الاتصال:', err));

async function deleteOldAccounts() {
    try {
        // البحث عن جميع المستخدمين بدون كلمة مرور
        const usersWithoutPassword = await User.find({ password: { $exists: false } }).select('+password');
        
        console.log(`\nعدد الحسابات القديمة بدون كلمة مرور: ${usersWithoutPassword.length}`);
        
        if (usersWithoutPassword.length > 0) {
            console.log('\nالحسابات التي سيتم حذفها:');
            usersWithoutPassword.forEach((user, index) => {
                console.log(`${index + 1}. الاسم: ${user.name}, الجوال: ${user.phone}, البريد: ${user.email || 'غير محدد'}`);
            });
            
            // حذف الحسابات
            const result = await User.deleteMany({ password: { $exists: false } });
            console.log(`\n✅ تم حذف ${result.deletedCount} حساب قديم بنجاح`);
        } else {
            console.log('\n✅ لا توجد حسابات قديمة بدون كلمة مرور');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

deleteOldAccounts();
