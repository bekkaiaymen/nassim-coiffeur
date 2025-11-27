// Fix Aymen's account tenant field
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixAymenAccount() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smartbiz', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB');

        // Find Aymen's account
        const user = await User.findOne({ email: 'aymenbekkai17@gmail.com' });
        
        if (!user) {
            console.log('❌ User not found');
            process.exit(1);
        }

        console.log('Found user:', user.name);
        console.log('Current tenant:', user.tenant);
        console.log('Current business:', user.business);

        // Fix tenant to match business
        if (user.business) {
            user.tenant = user.business;
            await user.save();
            console.log('✅ Updated tenant to:', user.tenant);
        } else {
            console.log('❌ No business found for this user');
        }

        console.log('\n✅ Account fixed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixAymenAccount();
