const mongoose = require('mongoose');
const Business = require('./models/Business');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb+srv://smartbiz_user:SmartBiz2025@cluster0.s7pwvtq.mongodb.net/smartbiz?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function setupNassim() {
    try {
        const nassimId = '69259331651b1babc1eb83dc';
        
        // Update business info
        const business = await Business.findByIdAndUpdate(
            nassimId,
            {
                name: 'Nassim Barber',
                slug: 'nassim',
                businessType: 'barber',
                phone: '0500000000',
                address: 'الرياض، السعودية',
                description: 'صالون حلاقة عصري ومميز',
                settings: {
                    currency: 'SAR',
                    timezone: 'Asia/Riyadh',
                    language: 'ar'
                }
            },
            { new: true }
        );
        
        console.log('✅ تم تحديث معلومات المحل:', business.name);
        
        // Check if user exists
        let user = await User.findOne({ email: 'aymenbekkai179@gmail.com' });
        
        if (user) {
            console.log('✅ المستخدم موجود، تحديث البيانات...');
            
            // Update user
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('nassim', salt);
            
            user.password = hashedPassword;
            user.business = business._id;
            user.role = 'business_owner';
            user.name = 'Aymen Bekkai';
            await user.save();
            
            console.log('✅ تم تحديث الحساب');
        } else {
            console.log('📝 إنشاء حساب جديد...');
            
            // Create new user
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('nassim', salt);
            
            user = await User.create({
                name: 'Aymen Bekkai',
                email: 'aymenbekkai179@gmail.com',
                password: hashedPassword,
                phone: '0500000000',
                role: 'business_owner',
                business: business._id
            });
            
            console.log('✅ تم إنشاء الحساب');
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✨ تم إعداد حساب nassim بنجاح!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🏪 اسم المحل: Nassim Barber');
        console.log('🆔 Business ID:', business._id.toString());
        console.log('');
        console.log('👤 معلومات تسجيل الدخول:');
        console.log('   📧 الإيميل: aymenbekkai179@gmail.com');
        console.log('   🔑 كلمة المرور: nassim');
        console.log('   🔗 رابط تسجيل الدخول: http://localhost:3000/login');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

setupNassim();
