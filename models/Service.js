const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business'
    },
    name: {
        type: String,
        required: [true, 'اسم الخدمة مطلوب'],
        trim: true
    },
    nameEn: {
        type: String,
        trim: true
    },
    description: {
        type: String
    },
    category: {
        type: String,
        required: true,
        enum: ['haircut', 'beard', 'styling', 'coloring', 'spa', 'other']
    },
    price: {
        type: Number,
        required: [true, 'السعر مطلوب']
    },
    priceMin: {
        type: Number,
        default: 0
    },
    priceMax: {
        type: Number,
        default: 0
    },
    duration: {
        type: Number, // in minutes
        required: [true, 'المدة مطلوبة'],
        default: 30
    },
    image: {
        type: String
    },
    available: {
        type: Boolean,
        default: true
    },
    popularityScore: {
        type: Number,
        default: 0
    },
    tags: [String]
}, {
    timestamps: true
});

// Index for faster queries
serviceSchema.index({ category: 1 });
serviceSchema.index({ available: 1 });

module.exports = mongoose.model('Service', serviceSchema);