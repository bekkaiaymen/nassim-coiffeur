const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/smartbiz', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('✅ Connected to MongoDB');

    // Define a simple Business model
    const Business = mongoose.model('Business', new mongoose.Schema({}, { strict: false }));

    // Update all businesses to have active subscription
    const updateResult = await Business.updateMany(
        {},
        { 
            $set: { 
                'subscription.status': 'active',
                'subscription.plan': 'basic'
            } 
        }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} businesses`);

    // Count active businesses
    const activeCount = await Business.countDocuments({ 'subscription.status': 'active' });
    console.log(`📊 Total active businesses: ${activeCount}`);

    // Show sample businesses
    const businesses = await Business.find({ 'subscription.status': 'active' })
        .select('businessName businessType city subscription.status')
        .limit(5);
    
    console.log('\n📋 Sample businesses:');
    businesses.forEach(b => {
        console.log(`  - ${b.businessName} (${b.businessType}) - ${b.city || 'N/A'} - ${b.subscription.status}`);
    });

    mongoose.connection.close();
    console.log('\n✅ Done!');
}).catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
