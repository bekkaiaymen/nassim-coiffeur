const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    billingEmail: { type: String },
    phone: { type: String },
    address: { type: String },
    settings: {
        rewardsEnabled: { type: Boolean, default: true },
        rewardsConfig: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    status: { type: String, enum: ['active', 'suspended', 'cancelled'], default: 'active' }
}, { timestamps: true });

tenantSchema.index({ slug: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);
