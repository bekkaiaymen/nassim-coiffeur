// Check all users in database
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Customer = require('./models/Customer');
const Business = require('./models/Business');

async function checkDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbiz');
        console.log('✅ Connected to MongoDB\n');

        // Check businesses
        const businesses = await Business.find({});
        console.log(`📊 Businesses: ${businesses.length}`);
        businesses.forEach(b => {
            console.log(`   - ${b.name} (${b._id})`);
        });

        // Check users
        console.log('\n📊 Users:');
        const users = await User.find({});
        console.log(`   Total: ${users.length}`);
        users.forEach(u => {
            console.log(`   - ${u.name} (${u.email || u.phone})`);
            console.log(`     Role: ${u.role}, Business: ${u.business}`);
        });

        // Check customers
        console.log('\n📊 Customers:');
        const customers = await Customer.find({});
        console.log(`   Total: ${customers.length}`);
        customers.forEach(c => {
            console.log(`   - ${c.name} (${c.phone})`);
            console.log(`     Business: ${c.business}, Points: ${c.loyaltyPoints || 0}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkDatabase();
