const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
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
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    name: {
        type: String,
        required: [true, 'اسم العميل مطلوب'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'رقم الجوال مطلوب'],
        unique: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    dateOfBirth: {
        type: Date
    },
    address: {
        type: String
    },
    notes: {
        type: String
    },
    loyaltyPoints: {
        type: Number,
        default: 0
    },
    pendingPoints: {
        type: Number,
        default: 0
    },
    loyaltyTier: {
        type: String,
        default: 'برونزي'
    },
    pointsHistory: [{
        points: Number,
        type: { type: String, enum: ['earned', 'redeemed', 'expired', 'pending'] },
        description: String,
        date: { type: Date, default: Date.now },
        appointmentId: mongoose.Schema.Types.ObjectId,
        status: { type: String, enum: ['pending', 'confirmed'], default: 'pending' }
    }],
    pendingRewards: [{
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment'
        },
        points: Number,
        description: String,
        createdAt: { type: Date, default: Date.now }
    }],
    hasSeenFirstBookingOffer: {
        type: Boolean,
        default: false
    },
    totalVisits: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    lastVisit: {
        type: Date
    },
    preferences: {
        favoriteService: String,
        favoriteBarber: String,
        preferredTime: String
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    tags: [String],
    status: {
        type: String,
        enum: ['active', 'inactive', 'vip'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Index for faster queries
customerSchema.index({ phone: 1 });
customerSchema.index({ name: 1 });
customerSchema.index({ status: 1 });

module.exports = mongoose.model('Customer', customerSchema);