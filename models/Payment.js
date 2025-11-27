const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    
    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
        required: true
    },
    
    amount: {
        type: Number,
        required: true
    },
    
    currency: {
        type: String,
        default: 'SAR'
    },
    
    billingPeriod: {
        type: String,
        enum: ['monthly', 'yearly'],
        required: true
    },
    
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'bank_transfer', 'mada', 'apple_pay', 'stc_pay', 'manual'],
        required: true
    },
    
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    
    transactionId: {
        type: String,
        unique: true,
        sparse: true
    },
    
    invoiceNumber: {
        type: String,
        unique: true
    },
    
    paymentGateway: {
        type: String,
        enum: ['stripe', 'moyasar', 'tap', 'hyperpay', 'manual']
    },
    
    gatewayResponse: {
        type: mongoose.Schema.Types.Mixed
    },
    
    paidAt: Date,
    
    subscriptionStartDate: Date,
    subscriptionEndDate: Date,
    
    notes: String,
    
    refund: {
        refunded: { type: Boolean, default: false },
        refundedAt: Date,
        refundAmount: Number,
        refundReason: String
    }
    
}, {
    timestamps: true
});

// Auto-generate invoice number
paymentSchema.pre('save', async function(next) {
    if (!this.invoiceNumber) {
        const count = await mongoose.model('Payment').countDocuments();
        this.invoiceNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

paymentSchema.index({ business: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);