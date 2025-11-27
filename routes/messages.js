const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Customer = require('../models/Customer');
const Business = require('../models/Business');
const User = require('../models/User');
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

// Public route - Get messages for customer
router.get('/customer/:customerId', customerAuth, async (req, res) => {
    try {
        const { customerId } = req.params;
        const { businessId } = req.query;

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
        if (businessId) {
            query.business = businessId;
        }

        const messages = await Message.find(query)
            .populate('business', 'businessName')
            .sort({ createdAt: -1 });

        // Get unique conversations (businesses)
        const conversations = await Message.aggregate([
            { $match: { customer: customer._id } },
            { $sort: { createdAt: -1 } },
            { $group: {
                _id: '$business',
                lastMessage: { $first: '$content' },
                lastMessageTime: { $first: '$createdAt' },
                unreadCount: {
                    $sum: {
                        $cond: [
                            { $and: [{ $eq: ['$sender', 'business'] }, { $eq: ['$read', false] }] },
                            1,
                            0
                        ]
                    }
                }
            }}
        ]);

        // Populate business data
        const populatedConversations = await Business.populate(conversations, {
            path: '_id',
            select: 'businessName'
        });

        res.json({ 
            success: true, 
            data: {
                messages,
                conversations: populatedConversations
            }
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Public route - Send message from customer
router.post('/send', customerAuth, async (req, res) => {
    try {
        const { customerId, businessId, content } = req.body;

        if (!customerId || !businessId || !content) {
            return res.status(400).json({ 
                success: false, 
                message: 'جميع الحقول مطلوبة' 
            });
        }

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

        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({ 
                success: false, 
                message: 'المحل غير موجود' 
            });
        }

        const message = await Message.create({
            tenant: business.tenant || business._id,
            business: businessId,
            customer: customerId,
            user: req.user._id,
            sender: 'customer',
            content,
            read: false
        });

        const populatedMessage = await Message.findById(message._id)
            .populate('business', 'businessName');

        res.status(201).json({ 
            success: true, 
            message: 'تم إرسال الرسالة',
            data: populatedMessage 
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Mark message as read
router.patch('/:id/read', customerAuth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ 
                success: false, 
                message: 'الرسالة غير موجودة' 
            });
        }

        // Verify customer owns this message
        const customer = await Customer.findOne({ 
            _id: message.customer,
            user: req.user._id 
        });

        if (!customer) {
            return res.status(403).json({ 
                success: false, 
                message: 'غير مصرح لك بالوصول' 
            });
        }

        message.read = true;
        message.readAt = new Date();
        await message.save();

        res.json({ 
            success: true, 
            message: 'تم تحديث الرسالة',
            data: message 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
