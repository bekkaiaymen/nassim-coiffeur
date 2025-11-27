const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    // معلومات أساسية
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'الرجاء إدخال اسم الموظف'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'الرجاء إدخال رقم الجوال'],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    avatar: {
        type: String,
        default: '/images/default-avatar.png'
    },
    
    // معلومات الوظيفة
    jobTitle: {
        type: String,
        default: 'حلاق',
        trim: true
    },
    specialties: [{
        type: String,
        trim: true
    }],
    experience: {
        type: Number, // بالسنوات
        default: 0
    },
    bio: {
        type: String,
        trim: true,
        maxlength: 500
    },
    
    // الحالة والتوفر
    status: {
        type: String,
        enum: ['active', 'inactive', 'on_leave', 'busy'],
        default: 'active'
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    
    // أوقات العمل
    workingHours: {
        saturday: {
            enabled: { type: Boolean, default: true },
            start: { type: String, default: '09:00' },
            end: { type: String, default: '21:00' }
        },
        sunday: {
            enabled: { type: Boolean, default: true },
            start: { type: String, default: '09:00' },
            end: { type: String, default: '21:00' }
        },
        monday: {
            enabled: { type: Boolean, default: true },
            start: { type: String, default: '09:00' },
            end: { type: String, default: '21:00' }
        },
        tuesday: {
            enabled: { type: Boolean, default: true },
            start: { type: String, default: '09:00' },
            end: { type: String, default: '21:00' }
        },
        wednesday: {
            enabled: { type: Boolean, default: true },
            start: { type: String, default: '09:00' },
            end: { type: String, default: '21:00' }
        },
        thursday: {
            enabled: { type: Boolean, default: true },
            start: { type: String, default: '09:00' },
            end: { type: String, default: '21:00' }
        },
        friday: {
            enabled: { type: Boolean, default: false },
            start: { type: String, default: '09:00' },
            end: { type: String, default: '21:00' }
        }
    },
    
    // الخدمات المتاحة
    services: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service'
    }],
    
    // إحصائيات
    stats: {
        totalAppointments: { type: Number, default: 0 },
        completedAppointments: { type: Number, default: 0 },
        cancelledAppointments: { type: Number, default: 0 },
        rating: { type: Number, default: 5.0, min: 0, max: 5 },
        reviewCount: { type: Number, default: 0 }
    },
    
    // معلومات إضافية
    hireDate: {
        type: Date,
        default: Date.now
    },
    salary: {
        type: Number,
        default: 0
    },
    commission: {
        type: Number,
        default: 0, // نسبة العمولة
        min: 0,
        max: 100
    },
    
    // الترتيب في القائمة
    order: {
        type: Number,
        default: 0
    },
    
    // ملاحظات داخلية
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Indexes
employeeSchema.index({ tenant: 1, business: 1 });
employeeSchema.index({ status: 1, isAvailable: 1 });
employeeSchema.index({ phone: 1, tenant: 1 });

// Virtual للحجوزات
employeeSchema.virtual('appointments', {
    ref: 'Appointment',
    localField: '_id',
    foreignField: 'employee'
});

// Method لحساب الحجوزات القادمة
employeeSchema.methods.getUpcomingAppointments = async function() {
    const Appointment = mongoose.model('Appointment');
    return await Appointment.find({
        employee: this._id,
        date: { $gte: new Date() },
        status: { $in: ['pending', 'confirmed'] }
    }).populate('customer service');
};

// Method للتحقق من التوفر في وقت محدد
employeeSchema.methods.isAvailableAt = async function(date, time) {
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    
    // التحقق من يوم العمل
    if (!this.workingHours[dayName].enabled) {
        return false;
    }
    
    // التحقق من الوقت
    const workStart = this.workingHours[dayName].start;
    const workEnd = this.workingHours[dayName].end;
    
    if (time < workStart || time >= workEnd) {
        return false;
    }
    
    // التحقق من الحجوزات المتضاربة
    const Appointment = mongoose.model('Appointment');
    const conflictingAppointments = await Appointment.countDocuments({
        employee: this._id,
        date: {
            $gte: new Date(date.setHours(0, 0, 0, 0)),
            $lt: new Date(date.setHours(23, 59, 59, 999))
        },
        time: time,
        status: { $in: ['pending', 'confirmed'] }
    });
    
    return conflictingAppointments === 0;
};

module.exports = mongoose.model('Employee', employeeSchema);
