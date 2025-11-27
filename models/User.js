const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'الاسم مطلوب'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'البريد الإلكتروني مطلوب'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'كلمة المرور مطلوبة'],
        minlength: 6
    },
    phone: {
        type: String,
        required: [true, 'رقم الجوال مطلوب'],
        trim: true
    },
    role: {
        type: String,
        enum: ['super_admin', 'business_owner', 'manager', 'employee', 'customer'],
        default: 'customer'
    },
    
    // ربط المحل
    // Tenant / Business owner relation (multi-tenant)
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant'
    },
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business'
    },
    // Payment / billing reference for platform (optional)
    paymentCustomerId: { type: String },
    avatar: {
        type: String
    },
    schedule: {
        sunday: { working: Boolean, start: String, end: String },
        monday: { working: Boolean, start: String, end: String },
        tuesday: { working: Boolean, start: String, end: String },
        wednesday: { working: Boolean, start: String, end: String },
        thursday: { working: Boolean, start: String, end: String },
        friday: { working: Boolean, start: String, end: String },
        saturday: { working: Boolean, start: String, end: String }
    },
    specialties: [String],
    commission: {
        type: Number,
        default: 0
    },
    totalRevenue: {
        type: Number,
        default: 0
    },
    totalAppointments: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 5
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'on-leave'],
        default: 'active'
    },
    lastLogin: {
        type: Date
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);