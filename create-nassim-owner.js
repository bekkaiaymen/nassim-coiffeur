const mongoose = require('mongoose');
const User = require('./models/User');
const Business = require('./models/Business');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb+srv://smartbiz_user:SmartBiz2025@cluster0.s7pwvtq.mongodb.net/smartbiz?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function createNassimOwner() {
    try {
        // Check if user already exists
        let user = await User.findOne({ email: 'aymenbekkai179@gmail.com' });
        
        if (user) {
            console.log('✅ المستخدم موجود بالفعل:', user.email);
            console.log('Business ID:', user.business);
            
            // Update password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('nassim', salt);
            user.password = hashedPassword;
            await user.save();
            console.log('✅ تم تحديث كلمة المرور إلى: nassim');
        } else {
            // Find nassim business
            const business = await Business.findOne({ slug: 'nassim' });
            
            if (!business) {
                console.log('❌ لم يتم العثور على محل nassim');
                process.exit(1);
            }
            
            console.log('✅ تم العثور على محل nassim:', business._id);
            
            // Create new user
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('nassim', salt);
            
            user = await User.create({
                name: 'Nassim Owner',
                email: 'aymenbekkai179@gmail.com',
                password: hashedPassword,
                phone: '0500000000',
                role: 'business_owner',
                business: business._id
            });
            
            console.log('✅ تم إنشاء حساب صاحب المحل:');
            console.log('الإيميل: aymenbekkai179@gmail.com');
            console.log('كلمة المرور: nassim');
            console.log('Business ID:', business._id);
        }
        
        console.log('\n🎯 معلومات تسجيل الدخول:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('الإيميل: aymenbekkai179@gmail.com');
        console.log('كلمة المرور: nassim');
        console.log('الرابط: http://localhost:3000/login');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

createNassimOwner();
