const mongoose = require('mongoose');
require('dotenv').config();

const Business = require('./models/Business');

async function fixBusinessType() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const BUSINESS_ID = '69259331651b1babc1eb83dc';
        
        const business = await Business.findById(BUSINESS_ID);
        
        if (!business) {
            console.log('❌ Business not found!');
            process.exit(1);
        }

        console.log('Current businessType:', business.businessType);
        
        // Update to valid enum value
        business.businessType = 'barbershop';
        await business.save();
        
        console.log('✅ Updated businessType to: barbershop');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixBusinessType();
