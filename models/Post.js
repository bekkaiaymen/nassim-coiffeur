const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: [true, 'عنوان المنشور مطلوب'],
        trim: true
    },
    content: {
        type: String,
        required: [true, 'محتوى المنشور مطلوب']
    },
    image: {
        type: String // URL للصورة
    },
    type: {
        type: String,
        enum: ['announcement', 'offer', 'news', 'tip'],
        default: 'announcement'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date // للعروض المحدودة بوقت
    },
    views: {
        type: Number,
        default: 0
    },
    // نظام الإعجابات المتعدد
    reactions: {
        likes: [{
            customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
            createdAt: { type: Date, default: Date.now }
        }],
        loves: [{
            customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
            createdAt: { type: Date, default: Date.now }
        }],
        wows: [{
            customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
            createdAt: { type: Date, default: Date.now }
        }]
    },
    // للتوافق مع الكود القديم
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    }],
    // إحصائيات
    stats: {
        totalLikes: { type: Number, default: 0 },
        totalLoves: { type: Number, default: 0 },
        totalWows: { type: Number, default: 0 },
        totalComments: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Index for faster queries
postSchema.index({ business: 1, createdAt: -1 });
postSchema.index({ business: 1, isActive: 1 });

module.exports = mongoose.model('Post', postSchema);
