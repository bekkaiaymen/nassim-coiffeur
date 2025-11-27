const mongoose = require('mongoose');
require('dotenv').config();

const Business = require('./models/Business');
const Post = require('./models/Post');
const Reward = require('./models/Reward');

async function createNassimContent() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ متصل بقاعدة البيانات\n');

        const business = await Business.findOne({ businessName: /nassim/i });
        
        if (!business) {
            console.log('❌ لم يتم العثور على محل nassim');
            process.exit(1);
        }

        console.log(`🏪 محل: ${business.businessName} (${business._id})\n`);

        // Create Posts
        const posts = [
            {
                business: business._id,
                title: '🎉 افتتاح فرع جديد',
                content: 'يسعدنا أن نعلن عن افتتاح فرعنا الجديد في حي النرجس! نفس الجودة والخدمة المميزة.',
                type: 'announcement',
                isActive: true
            },
            {
                business: business._id,
                title: '💈 عرض خاص - حلاقة + لحية',
                content: 'عرض خاص لفترة محدودة! احصل على قص شعر + تشذيب لحية بسعر 50 ريال فقط بدلاً من 60 ريال',
                type: 'offer',
                isActive: true,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            },
            {
                business: business._id,
                title: '✨ نصيحة اليوم',
                content: 'للحفاظ على شعر صحي، احرص على قصه بانتظام كل 4-6 أسابيع واستخدم شامبو مناسب لنوع شعرك',
                type: 'tip',
                isActive: true
            },
            {
                business: business._id,
                title: '🆕 خدمات جديدة',
                content: 'نقدم الآن خدمة الحلاقة الملكية الفاخرة مع تدليك وماسك للوجه - تجربة لا تُنسى!',
                type: 'news',
                isActive: true
            }
        ];

        console.log('📝 إنشاء المنشورات...');
        for (const postData of posts) {
            const existing = await Post.findOne({
                business: business._id,
                title: postData.title
            });
            
            if (existing) {
                console.log(`⏭️  "${postData.title}" موجود بالفعل`);
            } else {
                const post = await Post.create(postData);
                console.log(`✅ تم إضافة: ${post.title}`);
            }
        }

        // Create Rewards
        const rewards = [
            {
                business: business._id,
                name: 'خصم 10 ريال',
                description: 'خصم 10 ريال على أي خدمة',
                pointsCost: 50,
                type: 'discount',
                value: 10,
                icon: '💰',
                isActive: true
            },
            {
                business: business._id,
                name: 'تشذيب لحية مجاني',
                description: 'احصل على خدمة تشذيب لحية مجانية',
                pointsCost: 100,
                type: 'free_service',
                icon: '🎁',
                isActive: true
            },
            {
                business: business._id,
                name: 'خصم 20 ريال',
                description: 'خصم 20 ريال على الحلاقة الملكية',
                pointsCost: 150,
                type: 'discount',
                value: 20,
                icon: '💎',
                isActive: true
            },
            {
                business: business._id,
                name: 'قص شعر مجاني',
                description: 'احصل على قص شعر مجاني كامل',
                pointsCost: 200,
                type: 'free_service',
                icon: '✂️',
                isActive: true
            },
            {
                business: business._id,
                name: 'ترقية للحلاقة الملكية',
                description: 'ترقية مجانية من الحلاقة العادية للملكية',
                pointsCost: 250,
                type: 'upgrade',
                icon: '👑',
                isActive: true
            },
            {
                business: business._id,
                name: 'خصم 50%',
                description: 'خصم 50% على أي خدمة',
                pointsCost: 500,
                type: 'discount',
                value: 50,
                icon: '🔥',
                isActive: true
            }
        ];

        console.log('\n🎁 إنشاء المكافآت...');
        for (const rewardData of rewards) {
            const existing = await Reward.findOne({
                business: business._id,
                name: rewardData.name
            });
            
            if (existing) {
                console.log(`⏭️  "${rewardData.name}" موجودة بالفعل`);
            } else {
                const reward = await Reward.create(rewardData);
                console.log(`✅ تم إضافة: ${reward.name} (${reward.pointsCost} نقطة)`);
            }
        }

        console.log('\n✨ تم بنجاح!');
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

createNassimContent();
