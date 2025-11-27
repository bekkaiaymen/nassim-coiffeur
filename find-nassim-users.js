// Find nassim users
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function findNassimUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbiz');
        console.log('✅ Connected to MongoDB\n');

        console.log('🔍 Searching for nassim users...\n');

        // Search by email
        const owner = await User.findOne({ email: 'aymenbekkai179@gmail.com' });
        const customer = await User.findOne({ email: 'aymenbekkai177@gmail.com' });

        if (owner) {
            console.log('👤 Owner found:');
            console.log('   ID:', owner._id);
            console.log('   Name:', owner.name);
            console.log('   Email:', owner.email);
            console.log('   Role:', owner.role);
            console.log('   Business:', owner.business);
            console.log('   Has password:', owner.password ? 'YES' : 'NO');
            console.log('   Password hash length:', owner.password?.length);
        } else {
            console.log('❌ Owner not found');
        }

        console.log('');

        if (customer) {
            console.log('👤 Customer found:');
            console.log('   ID:', customer._id);
            console.log('   Name:', customer.name);
            console.log('   Email:', customer.email);
            console.log('   Role:', customer.role);
            console.log('   Business:', customer.business);
            console.log('   Has password:', customer.password ? 'YES' : 'NO');
            console.log('   Password hash length:', customer.password?.length);
        } else {
            console.log('❌ Customer not found');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

findNassimUsers();
