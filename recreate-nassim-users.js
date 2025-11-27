// Recreate nassim users
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Customer = require('./models/Customer');
const Business = require('./models/Business');

async function recreateUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbiz');
        console.log('✅ Connected to MongoDB\n');

        const nassimBusinessId = '69259331651b1babc1eb83dc';
        const password = 'nassim';

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log('🏪 Creating users for nassim business...\n');

        // Create owner
        console.log('👤 Creating owner...');
        const owner = await User.create({
            name: 'Nassim Owner',
            email: 'aymenbekkai179@gmail.com',
            phone: '0500000179',
            password: hashedPassword,
            role: 'business_owner',
            business: nassimBusinessId,
            tenant: nassimBusinessId,
            isActive: true
        });
        console.log('✅ Owner created:', owner.email);

        // Create customer user
        console.log('\n👤 Creating customer user...');
        const customerUser = await User.create({
            name: 'Aymen Bekkai 177',
            email: 'aymenbekkai177@gmail.com',
            phone: '0500000177',
            password: hashedPassword,
            role: 'customer',
            business: nassimBusinessId,
            tenant: nassimBusinessId,
            isActive: true
        });
        console.log('✅ Customer user created:', customerUser.email);

        // Create customer profile
        console.log('\n👤 Creating customer profile...');
        const customer = await Customer.create({
            name: 'Aymen Bekkai 177',
            phone: '0500000177',
            email: 'aymenbekkai177@gmail.com',
            business: nassimBusinessId,
            tenant: nassimBusinessId,
            user: customerUser._id,
            loyaltyPoints: 150,
            loyaltyTier: 'برونزي',
            totalVisits: 3,
            isActive: true
        });
        console.log('✅ Customer profile created');

        // Test login
        console.log('\n🧪 Testing logins...');
        
        const ownerTest = await User.findOne({ email: 'aymenbekkai179@gmail.com' });
        const ownerMatch = await bcrypt.compare(password, ownerTest.password);
        console.log('Owner login:', ownerMatch ? '✅ SUCCESS' : '❌ FAILED');

        const customerTest = await User.findOne({ email: 'aymenbekkai177@gmail.com' });
        const customerMatch = await bcrypt.compare(password, customerTest.password);
        console.log('Customer login:', customerMatch ? '✅ SUCCESS' : '❌ FAILED');

        console.log('\n✅ All users created successfully!\n');
        console.log('📝 Login Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Owner (Dashboard):');
        console.log('  Email: aymenbekkai179@gmail.com');
        console.log('  Password: nassim');
        console.log('  URL: http://localhost:3000/login');
        console.log('');
        console.log('Customer (Portal):');
        console.log('  Email: aymenbekkai177@gmail.com');
        console.log('  Password: nassim');
        console.log('  URL: http://localhost:3000/customer-login');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

recreateUsers();
