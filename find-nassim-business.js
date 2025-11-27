const mongoose = require('mongoose');
const Business = require('./models/Business');

mongoose.connect('mongodb+srv://smartbiz_user:SmartBiz2025@cluster0.s7pwvtq.mongodb.net/smartbiz?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function findNassim() {
    try {
        console.log('🔍 البحث عن nassim...\n');
        
        // Search by slug
        let business = await Business.findOne({ slug: 'nassim' });
        console.log('البحث بـ slug:', business ? '✅ وجد' : '❌ لم يُجد');
        
        // Search by name
        business = await Business.findOne({ name: /nassim/i });
        console.log('البحث بـ name:', business ? '✅ وجد' : '❌ لم يُجد');
        
        // List all businesses
        console.log('\n📋 جميع المحلات في قاعدة البيانات:');
        const allBusinesses = await Business.find({});
        allBusinesses.forEach(b => {
            console.log(`- ${b.name} (slug: ${b.slug}) - ID: ${b._id}`);
        });
        
        // Try to find by ObjectId if we know it
        const nassimId = '69259331651b1babc1eb83dc';
        try {
            business = await Business.findById(nassimId);
            if (business) {
                console.log('\n✅ تم العثور على nassim بـ ObjectId:');
                console.log('الاسم:', business.name);
                console.log('Slug:', business.slug);
                console.log('ID:', business._id);
            }
        } catch (e) {
            console.log('\n❌ ObjectId غير صالح');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

findNassim();
