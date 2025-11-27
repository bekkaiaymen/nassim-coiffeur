// Check if posts exist in database
const mongoose = require('mongoose');
require('dotenv').config();

const Post = require('./models/Post');

async function checkPosts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbiz');
        console.log('✅ Connected to MongoDB\n');

        const nassimId = '69259331651b1babc1eb83dc';
        
        const posts = await Post.find({ business: nassimId, isActive: true });
        
        console.log(`📊 Found ${posts.length} active posts for nassim:\n`);
        
        posts.forEach((post, index) => {
            console.log(`${index + 1}. ${post.title}`);
            console.log(`   Type: ${post.type}`);
            console.log(`   Content: ${post.content.substring(0, 50)}...`);
            console.log(`   Stats: Likes=${post.stats?.totalLikes || 0}, Loves=${post.stats?.totalLoves || 0}, Comments=${post.stats?.totalComments || 0}`);
            console.log(`   Active: ${post.isActive}`);
            console.log('');
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkPosts();
