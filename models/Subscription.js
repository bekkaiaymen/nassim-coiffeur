const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    status: { type: String, enum: ['active', 'trial', 'past_due', 'cancelled'], default: 'trial' },
    startedAt: { type: Date, default: Date.now },
    currentPeriodEnd: { type: Date },
    stripeSubscriptionId: { type: String },
    trialEndsAt: { type: Date },
    autoRenew: { type: Boolean, default: true }
}, { timestamps: true });

subscriptionSchema.index({ tenant: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
