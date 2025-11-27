const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const jwt = require('jsonwebtoken');

// Middleware للتحقق من العميل
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

// Get comments for a post
router.get('/post/:postId', async (req, res) => {
    try {
        const comments = await Comment.find({ 
            post: req.params.postId,
            isHidden: false 
        })
        .populate('customer', 'name')
        .sort({ createdAt: -1 })
        .limit(100);

        res.json({ 
            success: true, 
            data: comments,
            count: comments.length 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add comment to post
router.post('/post/:postId', customerAuth, async (req, res) => {
    try {
        const { content, customerName, customerId } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'محتوى التعليق مطلوب' 
            });
        }

        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ 
                success: false, 
                message: 'المنشور غير موجود' 
            });
        }

        const comment = await Comment.create({
            post: req.params.postId,
            customer: customerId,
            user: req.userId,
            customerName,
            content: content.trim()
        });

        // Update post stats
        if (!post.stats) post.stats = {};
        post.stats.totalComments = (post.stats.totalComments || 0) + 1;
        await post.save();

        const populatedComment = await Comment.findById(comment._id)
            .populate('customer', 'name');

        res.status(201).json({ 
            success: true, 
            message: 'تم إضافة التعليق',
            data: populatedComment 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Like/Unlike comment
router.post('/:commentId/like', customerAuth, async (req, res) => {
    try {
        const { customerId } = req.body;
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).json({ 
                success: false, 
                message: 'التعليق غير موجود' 
            });
        }

        const likeIndex = comment.likes.findIndex(id => id.toString() === customerId);

        if (likeIndex > -1) {
            // Unlike
            comment.likes.splice(likeIndex, 1);
            await comment.save();
            return res.json({ 
                success: true, 
                message: 'تم إلغاء الإعجاب',
                liked: false,
                likesCount: comment.likes.length 
            });
        } else {
            // Like
            comment.likes.push(customerId);
            await comment.save();
            return res.json({ 
                success: true, 
                message: 'تم الإعجاب',
                liked: true,
                likesCount: comment.likes.length 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete comment (only by owner or business owner)
router.delete('/:commentId', customerAuth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).json({ 
                success: false, 
                message: 'التعليق غير موجود' 
            });
        }

        // Check if user owns the comment
        if (comment.user.toString() !== req.userId.toString()) {
            return res.status(403).json({ 
                success: false, 
                message: 'غير مصرح لك بحذف هذا التعليق' 
            });
        }

        await comment.deleteOne();

        // Update post stats
        const post = await Post.findById(comment.post);
        if (post && post.stats) {
            post.stats.totalComments = Math.max(0, (post.stats.totalComments || 1) - 1);
            await post.save();
        }

        res.json({ 
            success: true, 
            message: 'تم حذف التعليق' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
