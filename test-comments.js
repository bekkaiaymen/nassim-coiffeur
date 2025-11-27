// Test comments and reactions
const mongoose = require('mongoose');
require('dotenv').config();

const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Customer = require('./models/Customer');

async function testCommentsAndReactions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbiz');
        console.log('✅ Connected to MongoDB\n');

        // Get nassim business ID
        const nassimId = '69259331651b1babc1eb83dc';

        // Get first post
        const post = await Post.findOne({ business: nassimId });
        if (!post) {
            console.log('❌ No posts found for nassim');
            process.exit(0);
        }

        console.log('📝 Post found:', post.title);
        console.log('📊 Current stats:', post.stats);

        // Get a customer
        const customer = await Customer.findOne({ business: nassimId });
        if (!customer) {
            console.log('❌ No customers found');
            process.exit(0);
        }

        console.log('\n👤 Customer:', customer.name);

        // Test 1: Add a reaction (like)
        console.log('\n🧪 Test 1: Adding LIKE reaction...');
        if (!post.reactions) post.reactions = { likes: [], loves: [], wows: [] };
        if (!post.stats) post.stats = {};

        // Remove existing reactions
        ['likes', 'loves', 'wows'].forEach(type => {
            const index = post.reactions[type].findIndex(r => r.customer.toString() === customer._id.toString());
            if (index > -1) post.reactions[type].splice(index, 1);
        });

        // Add like
        post.reactions.likes.push({
            customer: customer._id,
            createdAt: new Date()
        });

        post.stats.totalLikes = post.reactions.likes.length;
        post.stats.totalLoves = post.reactions.loves.length;
        post.stats.totalWows = post.reactions.wows.length;

        await post.save();
        console.log('✅ Like added! Stats:', post.stats);

        // Test 2: Add a comment
        console.log('\n🧪 Test 2: Adding comment...');
        const comment = await Comment.create({
            post: post._id,
            customer: customer._id,
            customerName: customer.name,
            content: 'تعليق تجريبي! أعجبني هذا المنشور 👍'
        });

        // Update post comment count
        post.stats.totalComments = (post.stats.totalComments || 0) + 1;
        await post.save();

        console.log('✅ Comment added:', comment.content);
        console.log('📊 Updated stats:', post.stats);

        // Test 3: Load comments
        console.log('\n🧪 Test 3: Loading comments...');
        const comments = await Comment.find({ post: post._id }).populate('customer', 'name');
        console.log(`✅ Found ${comments.length} comments:`);
        comments.forEach(c => {
            console.log(`   - ${c.customerName}: ${c.content}`);
        });

        // Test 4: Change reaction to love
        console.log('\n🧪 Test 4: Changing reaction to LOVE...');
        post.reactions.likes = post.reactions.likes.filter(r => r.customer.toString() !== customer._id.toString());
        post.reactions.loves.push({
            customer: customer._id,
            createdAt: new Date()
        });

        post.stats.totalLikes = post.reactions.likes.length;
        post.stats.totalLoves = post.reactions.loves.length;
        await post.save();

        console.log('✅ Changed to love! Stats:', post.stats);

        // Final summary
        console.log('\n📊 Final Post Status:');
        console.log('   Title:', post.title);
        console.log('   Likes:', post.stats.totalLikes);
        console.log('   Loves:', post.stats.totalLoves);
        console.log('   Wows:', post.stats.totalWows);
        console.log('   Comments:', post.stats.totalComments);

        console.log('\n✅ All tests passed!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testCommentsAndReactions();
