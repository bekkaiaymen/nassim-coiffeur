const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business'
    },
    customerName: {
        type: String,
        required: [true, 'اسم العميل مطلوب'],
        trim: true
    },
    customerPhone: {
        type: String,
        required: [true, 'رقم الجوال مطلوب'],
        trim: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    service: {
        type: String,
        required: [true, 'نوع الخدمة مطلوب']
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service'
    },
    date: {
        type: Date,
        required: [true, 'التاريخ مطلوب']
    },
    time: {
        type: String,
        required: [true, 'الوقت مطلوب']
    },
    duration: {
        type: Number,
        default: 30
    },
    price: {
        type: Number,
        default: 50
    },
    barber: {
        type: String,
        required: false  // Optional - can be assigned later by business
    },
    barberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // الموظف المختار
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    employeeName: {
        type: String,
        trim: true
    },
    // نظام التأكيد المزدوج
    confirmations: {
        // تأكيد استلام الطلب
        appointmentConfirmed: {
            type: Boolean,
            default: false
        },
        appointmentConfirmedAt: {
            type: Date
        },
        appointmentConfirmedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        // تأكيد توفر الموظف
        employeeConfirmed: {
            type: Boolean,
            default: false
        },
        employeeConfirmedAt: {
            type: Date
        },
        employeeConfirmedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'appointment_confirmed', 'employee_confirmed', 'fully_confirmed', 'completed', 'cancelled'],
        default: 'pending'
    },
    notes: {
        type: String
    },
    extraCharge: {
        type: Number,
        default: 0
    },
    isVIPSlot: {
        type: Boolean,
        default: false
    },
    reminderSent: {
        type: Boolean,
        default: false
    },
    completion: {
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee'
        },
        performedByName: {
            type: String,
            trim: true
        },
        finishedAt: {
            type: Date
        },
        servicesProvided: [String],
        style: {
            type: String,
            trim: true
        },
        productsUsed: [String],
        notes: {
            type: String,
            trim: true
        },
        photo: {
            type: String
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        warnings: [String],
        aftercareAdvice: {
            type: String,
            trim: true
        }
    },
    customerFeedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            trim: true
        },
        punctuality: {
            type: String,
            enum: ['early', 'on-time', 'late', 'very-late']
        },
        photoConsent: {
            type: Boolean,
            default: false
        },
        behaviourNotes: [String],
        submittedAt: {
            type: Date
        }
    },
    // تقييم الحلاقة من العميل
    haircutRating: {
        type: Number,
        min: 1,
        max: 5
    },
    // تقييم الحلاق من العميل
    barberRating: {
        type: Number,
        min: 1,
        max: 5
    },
    // تعليق التقييم من العميل
    ratingComment: {
        type: String,
        trim: true
    },
    // هل ينصح بالمحل
    recommendShop: {
        type: Boolean
    },
    // تاريخ التقييم
    ratedAt: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for faster queries
appointmentSchema.index({ date: 1, time: 1 });
appointmentSchema.index({ customerPhone: 1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);