const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { protect, ensureTenant, requireRole } = require('../middleware/auth');

// Public endpoint - Get active posts for a business (new format)
router.get('/public/by-business/:businessId', async (req, res) => {
    try {
        const posts = await Post.find({
            business: req.params.businessId,
            isActive: true,
            $or: [
                { expiresAt: { $exists: false } },
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(50);

        res.json({
            success: true,
            data: posts
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المنشورات'
        });
    }
});

// Public endpoint - Get active posts for a business (old format)
router.get('/public/:businessId', async (req, res) => {
    try {
        const posts = await Post.find({
            business: req.params.businessId,
            isActive: true,
            $or: [
                { expiresAt: { $exists: false } },
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(50);

        res.json({
            success: true,
            data: posts
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المنشورات'
        });
    }
});

// Public endpoint - Increment post views
router.post('/public/:postId/view', async (req, res) => {
    try {
        await Post.findByIdAndUpdate(req.params.postId, {
            $inc: { views: 1 }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error incrementing views:', error);
        res.status(500).json({ success: false });
    }
});

// Protected endpoint - Like/unlike post
router.post('/:postId/like', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'المنشور غير موجود'
            });
        }

        const customerIndex = post.likes.indexOf(req.user._id);
        
        if (customerIndex > -1) {
            // Unlike
            post.likes.splice(customerIndex, 1);
        } else {
            // Like
            post.likes.push(req.user._id);
        }

        await post.save();

        res.json({
            success: true,
            data: {
                likesCount: post.likes.length,
                isLiked: customerIndex === -1
            }
        });
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث الإعجاب'
        });
    }
});

// Business owner endpoints
// Create post
router.post('/', protect, ensureTenant, requireRole(['business_owner', 'admin']), async (req, res) => {
    try {
        const postData = {
            ...req.body,
            business: req.tenantId
        };

        const post = await Post.create(postData);

        res.status(201).json({
            success: true,
            message: 'تم إنشاء المنشور بنجاح',
            data: post
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'خطأ في إنشاء المنشور'
        });
    }
});

// Get all posts for business
router.get('/', protect, ensureTenant, async (req, res) => {
    try {
        const { business } = req.query;
        const businessId = business || req.tenantId;
        const posts = await Post.find({ business: businessId })
            .sort({ createdAt: -1 });

        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المنشورات'
        });
    }
});

// Update post
router.put('/:id', protect, ensureTenant, async (req, res) => {
    try {
        const post = await Post.findOneAndUpdate(
            { _id: req.params.id, business: req.tenantId },
            req.body,
            { new: true, runValidators: true }
        );

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'المنشور غير موجود'
            });
        }

        res.json({
            success: true,
            message: 'تم تحديث المنشور بنجاح',
            data: post
        });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'خطأ في تحديث المنشور'
        });
    }
});

// Delete post
router.delete('/:id', protect, ensureTenant, async (req, res) => {
    try {
        const post = await Post.findOneAndDelete({
            _id: req.params.id,
            business: req.tenantId
        });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'المنشور غير موجود'
            });
        }

        res.json({
            success: true,
            message: 'تم حذف المنشور بنجاح'
        });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف المنشور'
        });
    }
});

module.exports = router;
