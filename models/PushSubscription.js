const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    endpoint: {
        type: String,
        required: true,
        unique: true
    },
    keys: {
        p256dh: String,
        auth: String
    },
    expirationTime: {
        type: Date
    },
    deviceInfo: {
        os: String,
        browser: String,
        language: String,
        userAgent: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastNotifiedAt: {
        type: Date
    },
    lastError: {
        type: String
    }
}, {
    timestamps: true
});

pushSubscriptionSchema.index({ customer: 1, isActive: 1 });
pushSubscriptionSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
