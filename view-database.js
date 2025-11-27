const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const viewDatabase = async () => {
    try {
        console.log('🔍 جاري الاتصال بقاعدة البيانات...\n');

        // Get all collection names
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        console.log('📊 الجداول الموجودة في قاعدة البيانات:');
        console.log('=====================================\n');
        
        for (const collection of collections) {
            const collectionName = collection.name;
            const count = await mongoose.connection.db.collection(collectionName).countDocuments();
            
            console.log(`📁 ${collectionName}: ${count} سجل`);
            
            // Show first 3 documents
            if (count > 0) {
                const docs = await mongoose.connection.db.collection(collectionName).find().limit(3).toArray();
                console.log(JSON.stringify(docs, null, 2));
                console.log('\n---\n');
            }
        }
        
        console.log('\n✅ تم عرض البيانات بنجاح!');
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
};

viewDatabase();
