// Direct MongoDB query to check and fix Aymen's account
const { MongoClient, ObjectId } = require('mongodb');

async function fixAccount() {
    const client = new MongoClient('mongodb://localhost:27017');
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('smartbiz');
        const users = db.collection('users');
        
        // Find Aymen's account
        const user = await users.findOne({ email: 'aymenbekkai17@gmail.com' });
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        
        console.log('Found user:', user.name);
        console.log('Current tenant:', user.tenant);
        console.log('Current business:', user.business);
        console.log('Tenant type:', typeof user.tenant);
        console.log('Business type:', typeof user.business);
        
        // Fix tenant to match business
        if (user.business) {
            const result = await users.updateOne(
                { email: 'aymenbekkai17@gmail.com' },
                { $set: { tenant: user.business } }
            );
            
            console.log('✅ Update result:', result);
            
            // Verify update
            const updatedUser = await users.findOne({ email: 'aymenbekkai17@gmail.com' });
            console.log('✅ Updated tenant:', updatedUser.tenant);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
        console.log('✅ Done');
    }
}

fixAccount();
