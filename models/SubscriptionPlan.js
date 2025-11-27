const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    nameAr: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    description: {
        type: String
    },
    descriptionAr: {
        type: String
    },
    
    // السعر
    pricing: {
        monthly: {
            type: Number,
            required: true
        },
        yearly: {
            type: Number
        },
        currency: {
            type: String,
            default: 'SAR'
        },
        trialDays: {
            type: Number,
            default: 14
        }
    },
    
    // المميزات والحدود
    features: {
        maxEmployees: {
            type: Number,
            required: true
        },
        maxAppointmentsPerMonth: {
            type: Number,
            required: true
        },
        maxCustomers: {
            type: Number,
            required: true
        },
        maxServices: {
            type: Number,
            default: -1 // -1 = unlimited
        },
        
        // الميزات المتقدمة
        aiAssistant: {
            type: Boolean,
            default: false
        },
        whatsappIntegration: {
            type: Boolean,
            default: false
        },
        smsNotifications: {
            type: Boolean,
            default: false
        },
        emailNotifications: {
            type: Boolean,
            default: true
        },
        loyaltyProgram: {
            type: Boolean,
            default: false
        },
        advancedReports: {
            type: Boolean,
            default: false
        },
        multipleLocations: {
            type: Boolean,
            default: false
        },
        customDomain: {
            type: Boolean,
            default: false
        },
        apiAccess: {
            type: Boolean,
            default: false
        },
        prioritySupport: {
            type: Boolean,
            default: false
        },
        removeWatermark: {
            type: Boolean,
            default: false
        },
        customBranding: {
            type: Boolean,
            default: false
        }
    },
    
    // عمولة المنصة
    platformCommission: {
        type: Number,
        default: 0 // نسبة مئوية
    },
    
    // الترتيب والعرض
    displayOrder: {
        type: Number,
        default: 0
    },
    
    popular: {
        type: Boolean,
        default: false
    },
    
    active: {
        type: Boolean,
        default: true
    },
    
    // قائمة المميزات للعرض
    featureList: [{
        feature: String,
        included: { type: Boolean, default: true }
    }]
    
}, {
    timestamps: true
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);