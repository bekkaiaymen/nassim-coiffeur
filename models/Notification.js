const mongoose = require('mongoose');
const { queuePushDelivery } = require('../services/pushService');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business'
    },
    type: {
        type: String,
        enum: ['booking_confirmed', 'booking_reminder', 'booking_cancelled', 'barber_changed', 'barber_confirmed', 'review_request', 'promotion', 'message', 'general'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        default: '🔔'
    },
    read: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date
    },
    data: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for faster queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ customer: 1 });

notificationSchema.pre('save', function(next) {
    this.wasNew = this.isNew;
    next();
});

notificationSchema.post('save', function(doc, next) {
    if (this.wasNew) {
        queuePushDelivery(doc).catch((error) => {
            console.error('Push delivery error:', error?.message || error);
        });
    }
    next();
});

module.exports = mongoose.model('Notification', notificationSchema);
