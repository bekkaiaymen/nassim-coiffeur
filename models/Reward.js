const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'اسم المكافأة مطلوب'],
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    pointsCost: {
        type: Number,
        required: [true, 'تكلفة النقاط مطلوبة'],
        min: 0
    },
    type: {
        type: String,
        enum: ['discount', 'free_service', 'gift', 'upgrade'],
        default: 'discount'
    },
    value: {
        type: Number // قيمة الخصم أو الهدية
    },
    icon: {
        type: String,
        default: '🎁'
    },
    image: {
        type: String,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expiresInDays: {
        type: Number, // صلاحية المكافأة بعد الاستبدال (بالأيام)
        default: 30
    },
    redemptionCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for faster queries
rewardSchema.index({ business: 1, isActive: 1 });
rewardSchema.index({ business: 1, pointsCost: 1 });

module.exports = mongoose.model('Reward', rewardSchema);
