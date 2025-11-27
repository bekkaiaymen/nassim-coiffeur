// Reset passwords for nassim users
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Customer = require('./models/Customer');

async function resetPasswords() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbiz');
        console.log('✅ Connected to MongoDB\n');

        const nassimBusinessId = '69259331651b1babc1eb83dc';
        const newPassword = 'nassim';

        // Hash password once
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        console.log('🔐 Hashed password ready\n');

        // Reset owner account
        console.log('👤 Resetting owner account...');
        const owner = await User.findOne({ 
            email: 'aymenbekkai179@gmail.com',
            business: nassimBusinessId 
        });

        if (owner) {
            // Update using updateOne to bypass pre-save hook
            await User.updateOne(
                { _id: owner._id },
                { $set: { password: hashedPassword } }
            );
            console.log('✅ Owner password reset:', owner.email);
            console.log('   Name:', owner.name);
            console.log('   Role:', owner.role);
        } else {
            console.log('❌ Owner not found');
        }

        // Reset customer account
        console.log('\n👤 Resetting customer account...');
        const customer = await User.findOne({ 
            email: 'aymenbekkai177@gmail.com',
            business: nassimBusinessId 
        });

        if (customer) {
            await User.updateOne(
                { _id: customer._id },
                { $set: { password: hashedPassword } }
            );
            console.log('✅ Customer password reset:', customer.email);
            console.log('   Name:', customer.name);
            console.log('   Role:', customer.role);
        } else {
            console.log('❌ Customer not found');
        }

        // Verify the passwords work
        console.log('\n🧪 Testing login...');
        
        if (owner) {
            const ownerTest = await User.findById(owner._id);
            const ownerMatch = await bcrypt.compare(newPassword, ownerTest.password);
            console.log('Owner login test:', ownerMatch ? '✅ SUCCESS' : '❌ FAILED');
        }

        if (customer) {
            const customerTest = await User.findById(customer._id);
            const customerMatch = await bcrypt.compare(newPassword, customerTest.password);
            console.log('Customer login test:', customerMatch ? '✅ SUCCESS' : '❌ FAILED');
        }

        console.log('\n✅ Password reset completed!');
        console.log('\n📝 Credentials:');
        console.log('Owner: aymenbekkai179@gmail.com / nassim');
        console.log('Customer: aymenbekkai177@gmail.com / nassim');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

resetPasswords();
