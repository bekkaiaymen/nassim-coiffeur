const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    config: {
        pointsPerCurrency: { type: Number, default: 1 },
        pointsPerVisit: { type: Number, default: 0 },
        redemptionRate: { type: Number, default: 0.01 }, // 1 point = 0.01 currency
        tiers: { type: [mongoose.Schema.Types.Mixed], default: [] },
        expirationDays: { type: Number, default: 365 }
    }
}, { timestamps: true });

rewardSchema.index({ tenant: 1 });

module.exports = mongoose.model('RewardProgram', rewardSchema);
