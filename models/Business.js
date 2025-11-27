const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
    // معلومات المحل الأساسية
    businessName: {
        type: String,
        required: [true, 'اسم المحل مطلوب'],
        trim: true
    },
    businessNameEn: {
        type: String,
        trim: true
    },
    subdomain: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[a-z0-9-]+$/, 'النطاق الفرعي يجب أن يحتوي على حروف وأرقام فقط']
    },
    businessType: {
        type: String,
        enum: ['barbershop', 'salon', 'restaurant', 'cafe', 'workshop', 'spa', 'other'],
        required: true
    },
    
    // معلومات الاتصال
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true
    },
    whatsapp: String,
    
    // العنوان
    address: {
        street: String,
        city: String,
        region: String,
        country: { type: String, default: 'السعودية' },
        zipCode: String,
        location: {
            lat: Number,
            lng: Number
        }
    },
    
    // الاشتراك والخطة
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'basic', 'professional', 'enterprise'],
            default: 'free'
        },
        status: {
            type: String,
            enum: ['trial', 'active', 'suspended', 'cancelled', 'expired'],
            default: 'trial'
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        endDate: Date,
        price: {
            type: Number,
            default: 0
        },
        paymentMethod: String,
        autoRenew: {
            type: Boolean,
            default: true
        }
    },
    
    // حدود الخطة
    limits: {
        maxEmployees: {
            type: Number,
            default: 1
        },
        maxAppointmentsPerMonth: {
            type: Number,
            default: 50
        },
        maxCustomers: {
            type: Number,
            default: 100
        },
        canUseAI: {
            type: Boolean,
            default: false
        },
        canUseWhatsApp: {
            type: Boolean,
            default: false
        },
        canUseLoyalty: {
            type: Boolean,
            default: false
        },
        canUseReports: {
            type: Boolean,
            default: false
        }
    },
    
    // استخدام فعلي
    usage: {
        employees: { type: Number, default: 0 },
        appointmentsThisMonth: { type: Number, default: 0 },
        customers: { type: Number, default: 0 },
        lastResetDate: { type: Date, default: Date.now }
    },
    
    // الإعدادات
    settings: {
        timezone: {
            type: String,
            default: 'Asia/Riyadh'
        },
        currency: {
            type: String,
            default: 'SAR'
        },
        language: {
            type: String,
            default: 'ar'
        },
        workingHours: {
            start: { type: String, default: '09:00' },
            end: { type: String, default: '21:00' }
        },
        workingDays: {
            type: [Number],
            default: [0, 1, 2, 3, 4, 5, 6] // 0 = Sunday
        },
        appointmentDuration: {
            type: Number,
            default: 30 // minutes
        },
        taxEnabled: {
            type: Boolean,
            default: true
        },
        taxRate: {
            type: Number,
            default: 0.15
        }
    },
    
    // إعدادات المكافآت (قابلة للتخصيص)
    loyaltyProgram: {
        enabled: {
            type: Boolean,
            default: false
        },
        pointsPerCurrency: {
            type: Number,
            default: 1 // 1 ريال = 1 نقطة
        },
        pointsValue: {
            type: Number,
            default: 0.1 // 1 نقطة = 0.1 ريال
        },
        minPointsToRedeem: {
            type: Number,
            default: 100
        },
        expiryDays: {
            type: Number,
            default: 365 // صلاحية النقاط
        },
        bonusRules: [{
            condition: String, // 'first_visit', 'birthday', 'referral'
            points: Number,
            description: String
        }],
        tiers: [{
            name: String, // 'برونزي', 'فضي', 'ذهبي'
            minSpent: Number,
            benefits: {
                pointsMultiplier: { type: Number, default: 1 },
                discount: { type: Number, default: 0 },
                specialOffers: Boolean
            }
        }]
    },
    
    // العلامة التجارية
    branding: {
        logo: String,
        primaryColor: {
            type: String,
            default: '#6366f1'
        },
        secondaryColor: {
            type: String,
            default: '#10b981'
        },
        coverImage: String,
        description: String,
        socialMedia: {
            facebook: String,
            instagram: String,
            twitter: String,
            snapchat: String
        }
    },
    
    // الإحصائيات
    stats: {
        totalRevenue: {
            type: Number,
            default: 0
        },
        totalAppointments: {
            type: Number,
            default: 0
        },
        totalCustomers: {
            type: Number,
            default: 0
        },
        averageRating: {
            type: Number,
            default: 0
        }
    },
    
    // صاحب المحل
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // الحالة
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended', 'closed'],
        default: 'pending'
    },
    
    isVerified: {
        type: Boolean,
        default: false
    },
    
    notes: String,
    
    // التسجيل في المنصة
    platformFees: {
        percentage: {
            type: Number,
            default: 0
        },
        totalCollected: {
            type: Number,
            default: 0
        }
    }
    
}, {
    timestamps: true
});

// Indexes
businessSchema.index({ subdomain: 1 });
businessSchema.index({ owner: 1 });
businessSchema.index({ 'subscription.status': 1 });
businessSchema.index({ status: 1 });

// Methods
businessSchema.methods.canAddEmployee = function() {
    return this.usage.employees < this.limits.maxEmployees;
};

businessSchema.methods.canAddCustomer = function() {
    return this.usage.customers < this.limits.maxCustomers;
};

businessSchema.methods.canBookAppointment = function() {
    return this.usage.appointmentsThisMonth < this.limits.maxAppointmentsPerMonth;
};

businessSchema.methods.isSubscriptionActive = function() {
    return this.subscription.status === 'active' || this.subscription.status === 'trial';
};

businessSchema.methods.incrementUsage = function(type) {
    this.usage[type] = (this.usage[type] || 0) + 1;
};

// Reset monthly usage
businessSchema.methods.resetMonthlyUsage = function() {
    const now = new Date();
    const lastReset = new Date(this.usage.lastResetDate);
    
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        this.usage.appointmentsThisMonth = 0;
        this.usage.lastResetDate = now;
    }
};

module.exports = mongoose.model('Business', businessSchema);