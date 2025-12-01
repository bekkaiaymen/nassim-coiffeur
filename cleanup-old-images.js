const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbiz')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

const Service = require('./models/Service');
const Reward = require('./models/Reward');
const Employee = require('./models/Employee');

async function cleanupOldImages() {
    try {
        console.log('🧹 Starting cleanup of old local image paths...\n');

        // Clean Services
        const services = await Service.find({
            image: { $regex: '^/uploads/' }
        });
        
        console.log(`📦 Found ${services.length} services with old image paths`);
        
        for (const service of services) {
            console.log(`   - Removing image from: ${service.name}`);
            service.image = null;
            await service.save();
        }

        // Clean Rewards (Products)
        const rewards = await Reward.find({
            image: { $regex: '^/uploads/' }
        });
        
        console.log(`🎁 Found ${rewards.length} rewards/products with old image paths`);
        
        for (const reward of rewards) {
            console.log(`   - Removing image from: ${reward.name}`);
            reward.image = null;
            await reward.save();
        }

        // Clean Employees
        const employees = await Employee.find({
            photo: { $regex: '^/uploads/' }
        });
        
        console.log(`👤 Found ${employees.length} employees with old photo paths`);
        
        for (const employee of employees) {
            console.log(`   - Removing photo from: ${employee.name}`);
            employee.photo = null;
            await employee.save();
        }

        console.log('\n✅ Cleanup completed!');
        console.log('💡 Now you can re-upload images and they will go to Cloudinary automatically.');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup error:', error);
        process.exit(1);
    }
}

cleanupOldImages();
