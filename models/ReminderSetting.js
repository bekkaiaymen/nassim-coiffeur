const mongoose = require('mongoose');

const reminderSettingSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true,
        unique: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    intervalDays: {
        type: Number,
        default: 14,
        min: 1
    },
    sendTime: {
        type: String,
        default: '10:00'
    },
    message: {
        type: String,
        default: 'مرحباً {name}، حان وقت حلاقتك التالية! احجز موعدك الآن في Nassim Barber ✂️'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ReminderSetting', reminderSettingSchema);
