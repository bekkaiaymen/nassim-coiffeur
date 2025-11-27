const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Favorite = require('../models/Favorite');
const Customer = require('../models/Customer');
const Business = require('../models/Business');
const { protect } = require('../middleware/auth');

// Customer auth middleware (without User lookup)
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

// Get favorites for customer
router.get('/customer/:customerId', customerAuth, async (req, res) => {
    try {
        const { customerId } = req.params;

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

        const favorites = await Favorite.find({ customer: customerId })
            .populate('business', 'businessName address phone email averageRating totalReviews')
            .sort({ createdAt: -1 });

        res.json({ 
            success: true, 
            data: favorites 
        });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get favorites for user (all customers)
router.get('/user', customerAuth, async (req, res) => {
    try {
        const favorites = await Favorite.find({ user: req.userId })
            .populate('business', 'businessName address phone email averageRating totalReviews')
            .populate('customer', 'name phone')
            .sort({ createdAt: -1 });

        res.json({ 
            success: true, 
            data: favorites 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Check if business is favorited
router.get('/check/:customerId/:businessId', customerAuth, async (req, res) => {
    try {
        const { customerId, businessId } = req.params;

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

        const favorite = await Favorite.findOne({ 
            user: req.userId, 
            business: businessId 
        });

        res.json({ 
            success: true, 
            isFavorite: !!favorite,
            data: favorite 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add to favorites
router.post('/add', customerAuth, async (req, res) => {
    try {
        const { customerId, businessId } = req.body;

        if (!customerId || !businessId) {
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

        // Check if already favorited
        const existingFavorite = await Favorite.findOne({
            user: req.userId,
            business: businessId
        });

        if (existingFavorite) {
            return res.status(400).json({ 
                success: false, 
                message: 'المحل موجود بالفعل في المفضلة' 
            });
        }

        const favorite = await Favorite.create({
            user: req.userId,
            customer: customerId,
            business: businessId
        });

        const populatedFavorite = await Favorite.findById(favorite._id)
            .populate('business', 'businessName address phone email averageRating totalReviews');

        res.status(201).json({ 
            success: true, 
            message: 'تمت الإضافة إلى المفضلة',
            data: populatedFavorite 
        });
    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Remove from favorites
router.delete('/remove/:businessId', customerAuth, async (req, res) => {
    try {
        const { businessId } = req.params;

        const favorite = await Favorite.findOneAndDelete({
            user: req.userId,
            business: businessId
        });

        if (!favorite) {
            return res.status(404).json({ 
                success: false, 
                message: 'المحل غير موجود في المفضلة' 
            });
        }

        res.json({ 
            success: true, 
            message: 'تمت الإزالة من المفضلة' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Toggle favorite (add or remove)
router.post('/toggle', customerAuth, async (req, res) => {
    try {
        const { customerId, businessId } = req.body;

        if (!customerId || !businessId) {
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

        const existingFavorite = await Favorite.findOne({
            user: req.userId,
            business: businessId
        });

        if (existingFavorite) {
            // Remove from favorites
            await existingFavorite.deleteOne();
            return res.json({ 
                success: true, 
                message: 'تمت الإزالة من المفضلة',
                isFavorite: false 
            });
        } else {
            // Add to favorites
            const business = await Business.findById(businessId);
            if (!business) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'المحل غير موجود' 
                });
            }

            const favorite = await Favorite.create({
                user: req.userId,
                customer: customerId,
                business: businessId
            });

            const populatedFavorite = await Favorite.findById(favorite._id)
                .populate('business', 'businessName address phone email averageRating totalReviews');

            return res.status(201).json({ 
                success: true, 
                message: 'تمت الإضافة إلى المفضلة',
                isFavorite: true,
                data: populatedFavorite 
            });
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;
