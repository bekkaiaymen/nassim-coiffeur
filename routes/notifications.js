const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');

// Customer auth middleware
const customerAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'غير مصرح. يرجى تسجيل الدخول' });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartbiz-secret-2025');
        
        req.userId = decoded.id || decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'انتهت صلاحية الجلسة' });
    }
};

// Get notifications for customer
router.get('/customer/:customerId', customerAuth, async (req, res) => {
    try {
        const { customerId } = req.params;
        const { limit = 50, unreadOnly = false } = req.query;

        // Verify customer belongs to user
        const customer = await Customer.findOne({ 
            _id: customerId,
            user: req.userId 
        });

        if (!customer) {
            return res.status(403).json({ 
                success: false, 
                message: 'غير مصرح لك بالوصول' 
            });
        }

        const query = { customer: customerId };
        if (unreadOnly === 'true') {
            query.read = false;
        }

        const notifications = await Notification.find(query)
            .populate('business', 'businessName')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        // Get unread count
        const unreadCount = await Notification.countDocuments({
            customer: customerId,
            read: false
        });

        res.json({ 
            success: true, 
            data: notifications,
            unreadCount 
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get notifications for user (all customers)
router.get('/user', customerAuth, async (req, res) => {
    try {
        const { limit = 50, unreadOnly = false } = req.query;

        const query = { user: req.userId };
        if (unreadOnly === 'true') {
            query.read = false;
        }

        const notifications = await Notification.find(query)
            .populate('business', 'businessName')
            .populate('customer', 'name')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        // Get unread count
        const unreadCount = await Notification.countDocuments({
            user: req.userId,
            read: false
        });

        res.json({ 
            success: true, 
            data: notifications,
            unreadCount 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create notification (typically called by backend systems)
router.post('/create', customerAuth, async (req, res) => {
    try {
        const { 
            customerId, 
            businessId, 
            type, 
            title, 
            message, 
            icon,
            data 
        } = req.body;

        if (!customerId || !type || !title || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'جميع الحقول المطلوبة يجب ملؤها' 
            });
        }

        // Verify customer exists
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ 
                success: false, 
                message: 'العميل غير موجود' 
            });
        }

        const notification = await Notification.create({
            user: customer.user,
            customer: customerId,
            business: businessId,
            type,
            title,
            message,
            icon: icon || 'bell',
            data: data || {},
            read: false
        });

        const populatedNotification = await Notification.findById(notification._id)
            .populate('business', 'businessName')
            .populate('customer', 'name');

        res.status(201).json({ 
            success: true, 
            message: 'تم إنشاء الإشعار',
            data: populatedNotification 
        });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Mark notification as read
router.patch('/:id/read', customerAuth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ 
                success: false, 
                message: 'الإشعار غير موجود' 
            });
        }

        // Verify notification belongs to user
        if (notification.user.toString() !== req.userId.toString()) {
            return res.status(403).json({ 
                success: false, 
                message: 'غير مصرح لك بالوصول' 
            });
        }

        notification.read = true;
        notification.readAt = new Date();
        await notification.save();

        res.json({ 
            success: true, 
            message: 'تم تحديث الإشعار',
            data: notification 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Mark all notifications as read
router.patch('/read-all', customerAuth, async (req, res) => {
    try {
        const { customerId } = req.body;

        const query = { user: req.userId, read: false };
        if (customerId) {
            // Verify customer belongs to user
            const customer = await Customer.findOne({ 
                _id: customerId,
                user: req.userId 
            });

            if (!customer) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'غير مصرح لك بالوصول' 
                });
            }
            query.customer = customerId;
        }

        const result = await Notification.updateMany(
            query,
            { 
                read: true, 
                readAt: new Date() 
            }
        );

        res.json({ 
            success: true, 
            message: 'تم تحديث جميع الإشعارات',
            modifiedCount: result.modifiedCount 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete notification
router.delete('/:id', customerAuth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ 
                success: false, 
                message: 'الإشعار غير موجود' 
            });
        }

        // Verify notification belongs to user
        if (notification.user.toString() !== req.userId.toString()) {
            return res.status(403).json({ 
                success: false, 
                message: 'غير مصرح لك بالوصول' 
            });
        }

        await notification.deleteOne();

        res.json({ 
            success: true, 
            message: 'تم حذف الإشعار' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete all notifications for user
router.delete('/user/all', customerAuth, async (req, res) => {
    try {
        const { customerId, readOnly = false } = req.query;

        const query = { user: req.userId };
        if (customerId) {
            // Verify customer belongs to user
            const customer = await Customer.findOne({ 
                _id: customerId,
                user: req.userId 
            });

            if (!customer) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'غير مصرح لك بالوصول' 
                });
            }
            query.customer = customerId;
        }

        if (readOnly === 'true') {
            query.read = true;
        }

        const result = await Notification.deleteMany(query);

        res.json({ 
            success: true, 
            message: 'تم حذف الإشعارات',
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
