const express = require('express');
const router = express.Router();
const Reward = require('../models/Reward');
const Customer = require('../models/Customer');
const { protect, ensureTenant, requireRole } = require('../middleware/auth');

// Public endpoint - Get available rewards for a business (new format)
router.get('/public/by-business/:businessId', async (req, res) => {
    try {
        const rewards = await Reward.find({
            business: req.params.businessId,
            isActive: true
        }).sort({ pointsCost: 1 });

        res.json({
            success: true,
            data: rewards
        });
    } catch (error) {
        console.error('Error fetching rewards:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المكافآت'
        });
    }
});

// Public endpoint - Get available rewards for a business (old format)
router.get('/public/:businessId', async (req, res) => {
    try {
        const rewards = await Reward.find({
            business: req.params.businessId,
            isActive: true
        }).sort({ pointsCost: 1 });

        res.json({
            success: true,
            data: rewards
        });
    } catch (error) {
        console.error('Error fetching rewards:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المكافآت'
        });
    }
});

// Protected endpoint - Redeem reward
router.post('/:rewardId/redeem', protect, async (req, res) => {
    try {
        const reward = await Reward.findById(req.params.rewardId);
        
        if (!reward || !reward.isActive) {
            return res.status(404).json({
                success: false,
                message: 'المكافأة غير متوفرة'
            });
        }

        // Get customer
        const customer = await Customer.findOne({ user: req.user._id });
        
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'حساب العميل غير موجود'
            });
        }

        // Check if customer has enough points
        if (customer.loyaltyPoints < reward.pointsCost) {
            return res.status(400).json({
                success: false,
                message: `تحتاج إلى ${reward.pointsCost - customer.loyaltyPoints} نقطة إضافية`
            });
        }

        // Deduct points
        customer.loyaltyPoints -= reward.pointsCost;
        
        // Add to points history
        customer.pointsHistory.push({
            points: -reward.pointsCost,
            type: 'redeemed',
            description: `استبدال: ${reward.name}`,
            date: new Date()
        });

        await customer.save();

        // Increment redemption count
        reward.redemptionCount += 1;
        await reward.save();

        res.json({
            success: true,
            message: `تم استبدال ${reward.name} بنجاح!`,
            data: {
                reward,
                remainingPoints: customer.loyaltyPoints,
                expiresAt: new Date(Date.now() + reward.expiresInDays * 24 * 60 * 60 * 1000)
            }
        });
    } catch (error) {
        console.error('Error redeeming reward:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في استبدال المكافأة'
        });
    }
});

// Business owner endpoints
// Create reward
router.post('/', protect, ensureTenant, async (req, res) => {
    try {
        const rewardData = {
            ...req.body,
            business: req.tenantId
        };

        const reward = await Reward.create(rewardData);

        res.status(201).json({
            success: true,
            message: 'تم إنشاء المكافأة بنجاح',
            data: reward
        });
    } catch (error) {
        console.error('Error creating reward:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'خطأ في إنشاء المكافأة'
        });
    }
});

// Get all rewards for business
router.get('/', protect, ensureTenant, async (req, res) => {
    try {
        const { business } = req.query;
        const businessId = business || req.tenantId;
        const rewards = await Reward.find({ business: businessId })
            .sort({ pointsCost: 1 });

        res.json(rewards);
    } catch (error) {
        console.error('Error fetching rewards:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المكافآت'
        });
    }
});

// Update reward
router.put('/:id', protect, ensureTenant, async (req, res) => {
    try {
        const reward = await Reward.findOneAndUpdate(
            { _id: req.params.id, business: req.tenantId },
            req.body,
            { new: true, runValidators: true }
        );

        if (!reward) {
            return res.status(404).json({
                success: false,
                message: 'المكافأة غير موجودة'
            });
        }

        res.json({
            success: true,
            message: 'تم تحديث المكافأة بنجاح',
            data: reward
        });
    } catch (error) {
        console.error('Error updating reward:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'خطأ في تحديث المكافأة'
        });
    }
});

// Delete reward
router.delete('/:id', protect, ensureTenant, async (req, res) => {
    try {
        const reward = await Reward.findOneAndDelete({
            _id: req.params.id,
            business: req.tenantId
        });

        if (!reward) {
            return res.status(404).json({
                success: false,
                message: 'المكافأة غير موجودة'
            });
        }

        res.json({
            success: true,
            message: 'تم حذف المكافأة بنجاح'
        });
    } catch (error) {
        console.error('Error deleting reward:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف المكافأة'
        });
    }
});

module.exports = router;
