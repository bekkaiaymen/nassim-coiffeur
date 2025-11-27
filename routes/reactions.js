const express = require('express');
const router = express.Router();
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

// Add or update reaction
router.post('/:postId/react', customerAuth, async (req, res) => {
    try {
        const { customerId, type } = req.body;
        
        // Validate reaction type
        const validTypes = ['like', 'love', 'wow'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ 
                success: false, 
                message: 'نوع التفاعل غير صالح. استخدم: like, love, أو wow' 
            });
        }

        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ 
                success: false, 
                message: 'المنشور غير موجود' 
            });
        }

        // Initialize reactions if not exists
        if (!post.reactions) {
            post.reactions = { likes: [], loves: [], wows: [] };
        }
        if (!post.stats) {
            post.stats = { totalLikes: 0, totalLoves: 0, totalWows: 0, totalComments: 0 };
        }

        // Remove customer from all reaction types
        ['likes', 'loves', 'wows'].forEach(reactionType => {
            const index = post.reactions[reactionType].findIndex(
                r => r.customer.toString() === customerId
            );
            if (index > -1) {
                post.reactions[reactionType].splice(index, 1);
            }
        });

        // Add new reaction
        const reactionField = `${type}s`; // like -> likes, love -> loves
        post.reactions[reactionField].push({
            customer: customerId,
            createdAt: new Date()
        });

        // Update stats
        post.stats.totalLikes = post.reactions.likes.length;
        post.stats.totalLoves = post.reactions.loves.length;
        post.stats.totalWows = post.reactions.wows.length;

        await post.save();

        res.json({ 
            success: true, 
            message: 'تم إضافة التفاعل',
            data: {
                type,
                stats: post.stats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Remove reaction
router.delete('/:postId/react', customerAuth, async (req, res) => {
    try {
        const { customerId } = req.body;

        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ 
                success: false, 
                message: 'المنشور غير موجود' 
            });
        }

        if (!post.reactions) {
            return res.json({ 
                success: true, 
                message: 'لا توجد تفاعلات' 
            });
        }

        // Remove from all reaction types
        let removed = false;
        ['likes', 'loves', 'wows'].forEach(reactionType => {
            const index = post.reactions[reactionType].findIndex(
                r => r.customer.toString() === customerId
            );
            if (index > -1) {
                post.reactions[reactionType].splice(index, 1);
                removed = true;
            }
        });

        if (removed) {
            // Update stats
            if (!post.stats) post.stats = {};
            post.stats.totalLikes = post.reactions.likes.length;
            post.stats.totalLoves = post.reactions.loves.length;
            post.stats.totalWows = post.reactions.wows.length;
            
            await post.save();
        }

        res.json({ 
            success: true, 
            message: 'تم إلغاء التفاعل',
            data: {
                stats: post.stats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get user's reaction for a post
router.get('/:postId/my-reaction', customerAuth, async (req, res) => {
    try {
        const { customerId } = req.query;

        const post = await Post.findById(req.params.postId);
        if (!post || !post.reactions) {
            return res.json({ 
                success: true, 
                data: { reaction: null } 
            });
        }

        // Check which reaction type the user has
        for (const [type, reactions] of Object.entries(post.reactions)) {
            const found = reactions.find(r => r.customer.toString() === customerId);
            if (found) {
                return res.json({ 
                    success: true, 
                    data: { 
                        reaction: type.slice(0, -1) // likes -> like
                    } 
                });
            }
        }

        res.json({ 
            success: true, 
            data: { reaction: null } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
