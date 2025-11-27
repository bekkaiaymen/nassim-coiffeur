const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Review = require('../models/Review');
const Customer = require('../models/Customer');
const Business = require('../models/Business');
const Appointment = require('../models/Appointment');
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
        
        // دعم كل من id و userId للتوافق مع الـ tokens القديمة
        req.userId = decoded.id || decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'انتهت صلاحية الجلسة' });
    }
};

// Public route - Get reviews for business (no auth required)
router.get('/business/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const { status = 'approved', limit = 50, rating } = req.query;

        const query = { 
            business: businessId,
            status 
        };

        if (rating) {
            query.rating = parseInt(rating);
        }

        const reviews = await Review.find(query)
            .populate('customer', 'name')
            .populate('user', 'name')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        // Calculate statistics
        let businessObjectId;
        try {
            businessObjectId = mongoose.Types.ObjectId.isValid(businessId) 
                ? new mongoose.Types.ObjectId(businessId) 
                : businessId;
        } catch (err) {
            businessObjectId = businessId;
        }
        
        const stats = await Review.aggregate([
            { $match: { business: businessObjectId, status: 'approved' } },
            { $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
                rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
                rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
            }}
        ]);

        res.json({ 
            success: true,
            data: reviews,
            stats: stats[0] || {
                averageRating: 0,
                totalReviews: 0,
                rating5: 0,
                rating4: 0,
                rating3: 0,
                rating2: 0,
                rating1: 0
            }
        });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get reviews for customer
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

        const reviews = await Review.find({ customer: customerId })
            .populate('business', 'businessName')
            .populate('appointment', 'date time service')
            .sort({ createdAt: -1 });

        res.json({ 
            success: true, 
            data: reviews 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create review
router.post('/create', customerAuth, async (req, res) => {
    try {
        const { 
            customerId, 
            businessId, 
            appointmentId,
            rating, 
            title, 
            comment, 
            tags 
        } = req.body;

        if (!customerId || !businessId || !rating || !title || !comment) {
            return res.status(400).json({ 
                success: false, 
                message: 'جميع الحقول المطلوبة يجب ملؤها' 
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

        // Check if appointment exists and belongs to customer
        let appointment = null;
        if (appointmentId) {
            appointment = await Appointment.findOne({
                _id: appointmentId,
                customerId: customerId
            });
        }

        // Check if customer already reviewed this business
        const existingReview = await Review.findOne({
            customer: customerId,
            business: businessId,
            appointment: appointmentId || null
        });

        if (existingReview) {
            return res.status(400).json({ 
                success: false, 
                message: 'لقد قمت بتقييم هذا المحل بالفعل' 
            });
        }

        const review = await Review.create({
            tenant: business.tenant || business._id,
            business: businessId,
            customer: customerId,
            user: req.userId,
            appointment: appointmentId || undefined,
            rating: parseInt(rating),
            title,
            comment,
            tags: tags || [],
            status: 'approved' // Auto-approve for now
        });

        // Update business average rating
        const stats = await Review.aggregate([
            { $match: { business: business._id, status: 'approved' } },
            { $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }}
        ]);

        if (stats[0]) {
            business.averageRating = stats[0].averageRating;
            business.totalReviews = stats[0].totalReviews;
            await business.save();
        }

        const populatedReview = await Review.findById(review._id)
            .populate('customer', 'name')
            .populate('business', 'businessName');

        res.status(201).json({ 
            success: true, 
            message: 'شكراً! تم نشر تقييمك بنجاح',
            data: populatedReview 
        });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Update review
router.put('/:id', customerAuth, async (req, res) => {
    try {
        const { rating, title, comment, tags } = req.body;

        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: 'التقييم غير موجود' 
            });
        }

        // Verify customer owns this review
        const customer = await Customer.findOne({ 
            _id: review.customer,
            user: req.userId 
        });

        if (!customer) {
            return res.status(403).json({ 
                success: false, 
                message: 'غير مصرح لك بالوصول' 
            });
        }

        review.rating = rating || review.rating;
        review.title = title || review.title;
        review.comment = comment || review.comment;
        review.tags = tags || review.tags;
        await review.save();

        res.json({ 
            success: true, 
            message: 'تم تحديث التقييم',
            data: review 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Delete review
router.delete('/:id', customerAuth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: 'التقييم غير موجود' 
            });
        }

        // Verify customer owns this review
        const customer = await Customer.findOne({ 
            _id: review.customer,
            user: req.userId 
        });

        if (!customer) {
            return res.status(403).json({ 
                success: false, 
                message: 'غير مصرح لك بالوصول' 
            });
        }

        await review.deleteOne();

        res.json({ 
            success: true, 
            message: 'تم حذف التقييم' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
