const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Reward = require('../models/Reward');
const Employee = require('../models/Employee');

// @desc    Clean up old local image paths
// @route   POST /api/cleanup/old-images
// @access  Private (owner only)
router.post('/old-images', async (req, res) => {
    try {
        let cleaned = 0;

        // Clean Services
        const servicesResult = await Service.updateMany(
            { image: { $regex: '^/uploads/' } },
            { $set: { image: null } }
        );
        cleaned += servicesResult.modifiedCount;

        // Clean Rewards/Products
        const rewardsResult = await Reward.updateMany(
            { image: { $regex: '^/uploads/' } },
            { $set: { image: null } }
        );
        cleaned += rewardsResult.modifiedCount;

        // Clean Employees
        const employeesResult = await Employee.updateMany(
            { photo: { $regex: '^/uploads/' } },
            { $set: { photo: null } }
        );
        cleaned += employeesResult.modifiedCount;

        res.json({
            success: true,
            message: `تم تنظيف ${cleaned} صورة قديمة`,
            details: {
                services: servicesResult.modifiedCount,
                rewards: rewardsResult.modifiedCount,
                employees: employeesResult.modifiedCount
            }
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في التنظيف'
        });
    }
});

module.exports = router;
