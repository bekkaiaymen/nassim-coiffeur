const mongoose = require('mongoose');
const User = require('./models/User');
const Customer = require('./models/Customer');

mongoose.connect('mongodb://localhost:27017/smartbiz')
.then(async () => {
    console.log('✅ MongoDB متصل');
    
    const phone = '0564021595';
    const email = 'aymenbekkai175@gmail.com';
    
    // حذف المستخدم
    const user = await User.findOne({ $or: [{ phone }, { email }] });
    if (user) {
        console.log('🔍 وجدت المستخدم:', { name: user.name, phone: user.phone, email: user.email });
        
        // حذف جميع customer profiles المرتبطة
        const customers = await Customer.deleteMany({ user: user._id });
        console.log(`🗑️  تم حذف ${customers.deletedCount} customer profiles`);
        
        // حذف المستخدم
        await User.deleteOne({ _id: user._id });
        console.log('✅ تم حذف المستخدم بنجاح');
    } else {
        console.log('❌ لم يتم العثور على المستخدم');
    }
    
    process.exit(0);
})
.catch(err => {
    console.error('❌ خطأ:', err);
    process.exit(1);
});
