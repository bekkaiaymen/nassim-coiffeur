const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
        index: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    customerName: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: [true, 'محتوى التعليق مطلوب'],
        trim: true,
        maxlength: [500, 'التعليق طويل جداً (الحد الأقصى 500 حرف)']
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    }],
    isHidden: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for faster queries
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ customer: 1 });

module.exports = mongoose.model('Comment', commentSchema);
