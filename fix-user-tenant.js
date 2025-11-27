// Fix existing users to have tenant field
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixUserTenants() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smartbiz', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB');

        // Find all users with business but no tenant
        const users = await User.find({ 
            business: { $exists: true, $ne: null },
            $or: [
                { tenant: { $exists: false } },
                { tenant: null }
            ]
        });

        console.log(`Found ${users.length} users to update`);

        // Update each user
        for (const user of users) {
            user.tenant = user.business;
            await user.save();
            console.log(`✅ Updated user: ${user.name} (${user.email})`);
        }

        console.log('\n✅ All users updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixUserTenants();
