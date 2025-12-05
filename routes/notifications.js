const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const webpush = require('web-push');
const Notification = require('../models/Notification');
const Customer = require('../models/Customer');
const PushSubscription = require('../models/PushSubscription');
const { protect } = require('../middleware/auth');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BPX8TzW3Qj9SarBGDGlkz8MkFv_X1hMpgIhUZ1d7DIgsvJp9wjTmlYkuinW0avz8bMBHiye6hIdJwLFwbo8_slg';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'i9bbTfzz3p8XD9Qn_nme3pmQsKTGc2A512CI9KpUw8U';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    try {
        webpush.setVapidDetails('mailto:notifications@nassim-coiffeur.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    } catch (error) {
        console.error('Failed to configure VAPID keys:', error.message);
    }
}

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

// Public endpoint to expose VAPID public key
router.get('/vapid-public-key', (req, res) => {
    if (!VAPID_PUBLIC_KEY) {
        return res.status(503).json({ success: false, message: 'مفاتيح VAPID غير جاهزة بعد' });
    }

    res.json({ success: true, publicKey: VAPID_PUBLIC_KEY });
});

// Save or update push subscription for a customer
router.post('/subscriptions', customerAuth, async (req, res) => {
    try {
        const { subscription, customerId, deviceInfo } = req.body;

        if (!subscription || !subscription.endpoint || !customerId) {
            return res.status(400).json({ success: false, message: 'بيانات الاشتراك غير مكتملة' });
        }

        const customer = await Customer.findOne({
            _id: customerId,
            user: req.userId
        });

        if (!customer) {
            return res.status(403).json({ success: false, message: 'غير مصرح لك بحفظ هذا الاشتراك' });
        }

        const payload = {
            user: req.userId,
            customer: customerId,
            endpoint: subscription.endpoint,
            keys: subscription.keys || {},
            expirationTime: subscription.expirationTime || null,
            deviceInfo: {
                os: deviceInfo?.os || null,
                browser: deviceInfo?.browser || null,
                language: deviceInfo?.language || null,
                userAgent: deviceInfo?.userAgent || null
            },
            isActive: true,
            lastError: null
        };

        const savedSubscription = await PushSubscription.findOneAndUpdate(
            { endpoint: subscription.endpoint },
            payload,
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json({ success: true, data: savedSubscription });
    } catch (error) {
        console.error('Save subscription error:', error);
        res.status(500).json({ success: false, message: 'تعذر حفظ الاشتراك' });
    }
});

// Remove push subscription
router.delete('/subscriptions', customerAuth, async (req, res) => {
    try {
        const { endpoint } = req.body;

        if (!endpoint) {
            return res.status(400).json({ success: false, message: 'يجب إرسال رابط الاشتراك' });
        }

        const subscription = await PushSubscription.findOne({ endpoint });

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'الاشتراك غير موجود' });
        }

        if (subscription.user.toString() !== req.userId.toString()) {
            return res.status(403).json({ success: false, message: 'غير مصرح لك بحذف هذا الاشتراك' });
        }

        await subscription.deleteOne();

        res.json({ success: true, message: 'تم حذف الاشتراك' });
    } catch (error) {
        console.error('Delete subscription error:', error);
        res.status(500).json({ success: false, message: 'تعذر حذف الاشتراك' });
    }
});

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

        queuePushDelivery(populatedNotification).catch(err => {
            console.error('Push delivery error:', err);
        });

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

async function queuePushDelivery(notification) {
    if (!notification || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return;
    }

    try {
        const customerId = notification.customer?._id || notification.customer;
        if (!customerId) {
            return;
        }

        const subscriptions = await PushSubscription.find({
            customer: customerId,
            isActive: true
        });

        if (!subscriptions.length) {
            return;
        }

        const payload = JSON.stringify({
            title: notification.title,
            message: notification.message,
            type: notification.type,
            icon: notification.icon,
            data: {
                notificationId: notification._id,
                customerId,
                businessId: notification.business?._id || notification.business,
                createdAt: notification.createdAt,
                meta: notification.data || {}
            }
        });

        await Promise.allSettled(
            subscriptions.map(sub => sendWebPush(sub, payload))
        );
    } catch (error) {
        console.error('queuePushDelivery error:', error);
    }
}

async function sendWebPush(subscriptionDoc, payload) {
    try {
        await webpush.sendNotification({
            endpoint: subscriptionDoc.endpoint,
            keys: subscriptionDoc.keys || {}
        }, payload);

        subscriptionDoc.lastNotifiedAt = new Date();
        subscriptionDoc.isActive = true;
        subscriptionDoc.lastError = null;
        await subscriptionDoc.save();
    } catch (error) {
        subscriptionDoc.lastError = error.message;

        if (error.statusCode === 404 || error.statusCode === 410) {
            subscriptionDoc.isActive = false;
        }

        await subscriptionDoc.save().catch(() => {});
        console.error('sendWebPush error:', error.statusCode || '', error.body || error.message);
    }
}

module.exports = router;
