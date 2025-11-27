const express = require('express');
const router = express.Router();
const ReminderSetting = require('../models/ReminderSetting');
const { protect } = require('../middleware/auth');

// Get reminder settings for a business
router.get('/reminders/:businessId', protect, async (req, res) => {
    try {
        const { businessId } = req.params;
        
        let settings = await ReminderSetting.findOne({ business: businessId });
        
        // If no settings exist, return defaults
        if (!settings) {
            return res.json({
                enabled: true,
                intervalDays: 14,
                sendTime: '10:00',
                message: 'مرحباً {name}، حان وقت حلاقتك التالية! احجز موعدك الآن في Nassim Barber ✂️'
            });
        }
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching reminder settings:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب الإعدادات' });
    }
});

// Save/update reminder settings
router.post('/reminders', protect, async (req, res) => {
    try {
        const { business, enabled, intervalDays, sendTime, message } = req.body;
        
        // Validate input
        if (!business) {
            return res.status(400).json({ error: 'معرف المحل مطلوب' });
        }
        
        if (intervalDays && (intervalDays < 1 || intervalDays > 365)) {
            return res.status(400).json({ error: 'الفترة الزمنية يجب أن تكون بين 1 و 365 يوم' });
        }
        
        // Update or create settings
        let settings = await ReminderSetting.findOne({ business });
        
        if (settings) {
            // Update existing settings
            settings.enabled = enabled !== undefined ? enabled : settings.enabled;
            settings.intervalDays = intervalDays || settings.intervalDays;
            settings.sendTime = sendTime || settings.sendTime;
            settings.message = message || settings.message;
            
            await settings.save();
        } else {
            // Create new settings
            settings = new ReminderSetting({
                business,
                enabled,
                intervalDays,
                sendTime,
                message
            });
            
            await settings.save();
        }
        
        res.json(settings);
    } catch (error) {
        console.error('Error saving reminder settings:', error);
        res.status(500).json({ error: 'حدث خطأ في حفظ الإعدادات' });
    }
});

module.exports = router;
