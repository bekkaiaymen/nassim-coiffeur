const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    phone: String,
    role: String,
    business: mongoose.Schema.Types.ObjectId,
    tenant: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

mongoose.connect('mongodb+srv://smartbiz_user:SmartBiz2025@cluster0.s7pwvtq.mongodb.net/smartbiz?retryWrites=true&w=majority&appName=Cluster0');

async function listAllUsers() {
    try {
        console.log('🔍 جاري فحص جميع المستخدمين في قاعدة البيانات...\n');
        
        const users = await User.find({}).sort({ createdAt: -1 });
        
        console.log(`📊 إجمالي المستخدمين: ${users.length}\n`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name || 'بدون اسم'}`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   📱 Phone: ${user.phone || 'لا يوجد'}`);
            console.log(`   👤 Role: ${user.role}`);
            console.log(`   🏢 Business ID: ${user.business || 'لا يوجد'}`);
            console.log(`   🏪 Tenant ID: ${user.tenant || 'لا يوجد'}`);
            console.log(`   📅 تاريخ الإنشاء: ${user.createdAt ? user.createdAt.toLocaleString('ar-SA') : 'غير معروف'}`);
            console.log('');
        });
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Check for aymenbekkai emails
        console.log('\n🔎 البحث عن حسابات aymenbekkai...\n');
        const aymenAccounts = users.filter(u => u.email && u.email.includes('aymenbekkai'));
        
        if (aymenAccounts.length > 0) {
            aymenAccounts.forEach(user => {
                console.log(`✅ ${user.email} - ${user.role} - تم الإنشاء: ${user.createdAt ? user.createdAt.toLocaleString('ar-SA') : 'غير معروف'}`);
            });
        } else {
            console.log('❌ لا توجد حسابات aymenbekkai في قاعدة البيانات');
        }
        
        // Create missing user if needed
        if (!aymenAccounts.find(u => u.email === 'aymenbekkai177@gmail.com')) {
            console.log('\n📝 إنشاء حساب aymenbekkai177@gmail.com...');
            
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('nassim', salt);
            
            const newUser = await User.create({
                name: 'Aymen Bekkai 177',
                email: 'aymenbekkai177@gmail.com',
                password: hashedPassword,
                phone: '0500000177',
                role: 'customer',
                business: new mongoose.Types.ObjectId('69259331651b1babc1eb83dc')
            });
            
            console.log('✅ تم إنشاء المستخدم بنجاح!');
            console.log('📧 Email: aymenbekkai177@gmail.com');
            console.log('🔑 Password: nassim');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

listAllUsers();
