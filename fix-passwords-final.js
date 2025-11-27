// Fix both users passwords
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

async function fixBothPasswords() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbiz');
        console.log('✅ Connected to MongoDB\n');

        const password = 'nassim';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log('🔐 Fixing passwords for nassim users...\n');

        // Fix customer
        const customer = await User.findOne({ email: 'aymenbekkai177@gmail.com' });
        if (customer) {
            await User.updateOne(
                { _id: customer._id },
                { $set: { password: hashedPassword } }
            );
            const testCustomer = await User.findById(customer._id);
            const customerMatch = await bcrypt.compare(password, testCustomer.password);
            console.log('Customer (aymenbekkai177@gmail.com):', customerMatch ? '✅ FIXED' : '❌ FAILED');
        }

        // Fix owner
        const owner = await User.findOne({ email: 'aymenbekkai179@gmail.com' });
        if (owner) {
            await User.updateOne(
                { _id: owner._id },
                { $set: { password: hashedPassword } }
            );
            const testOwner = await User.findById(owner._id);
            const ownerMatch = await bcrypt.compare(password, testOwner.password);
            console.log('Owner (aymenbekkai179@gmail.com):', ownerMatch ? '✅ FIXED' : '❌ FAILED');
        }

        console.log('\n✅ Done! Passwords reset to: nassim');
        console.log('\n📝 You can now login with:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Customer: aymenbekkai177@gmail.com / nassim');
        console.log('Owner: aymenbekkai179@gmail.com / nassim');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixBothPasswords();
