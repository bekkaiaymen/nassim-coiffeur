const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI);

const showStats = async () => {
    try {
        console.log('📊 إحصائيات قاعدة البيانات\n');
        console.log('===========================\n');

        const collections = await mongoose.connection.db.listCollections().toArray();
        
        let totalRecords = 0;
        
        for (const collection of collections) {
            const count = await mongoose.connection.db.collection(collection.name).countDocuments();
            totalRecords += count;
            console.log(`${collection.name.padEnd(25)} : ${count} سجل`);
        }
        
        console.log('\n===========================');
        console.log(`إجمالي السجلات: ${totalRecords}`);
        console.log('===========================\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
};

showStats();
