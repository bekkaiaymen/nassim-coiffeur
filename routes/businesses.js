const express = require('express');
const router = express.Router();
const Business = require('../models/Business');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

// Check subdomain availability
router.get('/check-subdomain', async (req, res) => {
    try {
        const { subdomain } = req.query;
        
        if (!subdomain) {
            return res.status(400).json({
                success: false,
                message: 'النطاق الفرعي مطلوب'
            });
        }
        
        const exists = await Business.findOne({ subdomain: subdomain.toLowerCase() });
        
        res.json({
            success: true,
            available: !exists,
            subdomain: subdomain.toLowerCase()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Register new business (تسجيل محل جديد)
router.post('/register', async (req, res) => {
    try {
        const {
            businessName,
            businessType,
            email,
            phone,
            subdomain,
            ownerName,
            ownerEmail,
            ownerPassword,
            ownerPhone
        } = req.body;

        // Check if subdomain exists
        const subdomainExists = await Business.findOne({ subdomain });
        if (subdomainExists) {
            return res.status(400).json({
                success: false,
                message: 'النطاق الفرعي مستخدم بالفعل'
            });
        }

        // Check if owner email exists
        const ownerExists = await User.findOne({ email: ownerEmail });
        if (ownerExists) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني مسجل مسبقاً'
            });
        }

        // Create business owner
        const owner = await User.create({
            name: ownerName,
            email: ownerEmail,
            password: ownerPassword,
            phone: ownerPhone,
            role: 'business_owner'
        });

        // Create business
        const business = await Business.create({
            businessName,
            businessType,
            email,
            phone,
            subdomain,
            owner: owner._id,
            subscription: {
                plan: 'free',
                status: 'trial',
                startDate: new Date(),
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
            }
        });

        // Update owner with business reference (use both tenant and business for compatibility)
        owner.tenant = business._id;  // Required for middleware
        owner.business = business._id;  // Keep for backward compatibility
        await owner.save();

        const token = generateToken(owner._id);

        res.status(201).json({
            success: true,
            message: 'تم تسجيل المحل بنجاح! يمكنك الآن البدء بفترة تجريبية مجانية لمدة 14 يوماً',
            data: {
                business: {
                    id: business._id,
                    name: business.businessName,
                    subdomain: business.subdomain,
                    plan: business.subscription.plan,
                    trialEndsAt: business.subscription.endDate
                },
                owner: {
                    id: owner._id,
                    name: owner.name,
                    email: owner.email,
                    role: owner.role
                },
                token
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Get all active businesses for public (للزبائن)
router.get('/public', async (req, res) => {
    try {
        const { type, city, search } = req.query;
        let query = {};

        if (type) query.businessType = type;
        if (city) query.city = city;
        if (search) {
            query.$or = [
                { businessName: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } }
            ];
        }

        const businesses = await Business.find(query)
            .select('businessName businessType subdomain city phone email')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: businesses.length, data: businesses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all businesses (Super Admin only)
router.get('/', async (req, res) => {
    try {
        const { status, plan, search } = req.query;
        let query = {};

        if (status) query.status = status;
        if (plan) query['subscription.plan'] = plan;
        if (search) {
            query.$or = [
                { businessName: { $regex: search, $options: 'i' } },
                { subdomain: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const businesses = await Business.find(query)
            .populate('owner', 'name email phone')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: businesses.length, data: businesses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get current user's business (for dashboard)
router.get('/current/info', protect, async (req, res) => {
    try {
        
        const businessId = req.user.business || req.user.tenant;
        if (!businessId) {
            return res.status(404).json({ success: false, message: 'لا يوجد محل مرتبط بهذا المستخدم' });
        }
        
        const business = await Business.findById(businessId).populate('owner', 'name email phone');
        
        if (!business) {
            return res.status(404).json({ success: false, message: 'المحل غير موجود' });
        }

        res.json({ success: true, data: business });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update current user's business (for dashboard)
router.put('/current/info', protect, async (req, res) => {
    try {
        
        const businessId = req.user.business || req.user.tenant;
        if (!businessId) {
            return res.status(404).json({ success: false, message: 'لا يوجد محل مرتبط بهذا المستخدم' });
        }
        
        const business = await Business.findByIdAndUpdate(
            businessId,
            req.body,
            { new: true, runValidators: true }
        );

        if (!business) {
            return res.status(404).json({ success: false, message: 'المحل غير موجود' });
        }

        res.json({
            success: true,
            message: 'تم تحديث بيانات المحل بنجاح',
            data: business
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Get business by ID or subdomain
router.get('/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        
        let business;
        if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
            // MongoDB ObjectId
            business = await Business.findById(identifier).populate('owner', 'name email phone');
        } else {
            // Subdomain
            business = await Business.findOne({ subdomain: identifier }).populate('owner', 'name email phone');
        }

        if (!business) {
            return res.status(404).json({ success: false, message: 'المحل غير موجود' });
        }

        res.json({ success: true, data: business });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update business
router.put('/:id', async (req, res) => {
    try {
        const business = await Business.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!business) {
            return res.status(404).json({ success: false, message: 'المحل غير موجود' });
        }

        res.json({
            success: true,
            message: 'تم تحديث بيانات المحل بنجاح',
            data: business
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Update subscription
router.patch('/:id/subscription', async (req, res) => {
    try {
        const { plan, status, endDate } = req.body;
        
        const business = await Business.findById(req.params.id);
        if (!business) {
            return res.status(404).json({ success: false, message: 'المحل غير موجود' });
        }

        if (plan) business.subscription.plan = plan;
        if (status) business.subscription.status = status;
        if (endDate) business.subscription.endDate = endDate;

        // Update limits based on plan
        const planLimits = {
            free: { maxEmployees: 1, maxAppointmentsPerMonth: 50, maxCustomers: 100, canUseAI: false },
            basic: { maxEmployees: 3, maxAppointmentsPerMonth: 200, maxCustomers: 500, canUseAI: true },
            professional: { maxEmployees: 10, maxAppointmentsPerMonth: 1000, maxCustomers: 2000, canUseAI: true },
            enterprise: { maxEmployees: -1, maxAppointmentsPerMonth: -1, maxCustomers: -1, canUseAI: true }
        };

        if (plan && planLimits[plan]) {
            business.limits = { ...business.limits, ...planLimits[plan] };
        }

        await business.save();

        res.json({
            success: true,
            message: 'تم تحديث الاشتراك بنجاح',
            data: business
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Suspend business
router.patch('/:id/suspend', async (req, res) => {
    try {
        const business = await Business.findById(req.params.id);
        if (!business) {
            return res.status(404).json({ success: false, message: 'المحل غير موجود' });
        }

        business.status = 'suspended';
        business.subscription.status = 'suspended';
        await business.save();

        res.json({
            success: true,
            message: 'تم تعليق المحل بنجاح',
            data: business
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Activate business
router.patch('/:id/activate', async (req, res) => {
    try {
        const business = await Business.findById(req.params.id);
        if (!business) {
            return res.status(404).json({ success: false, message: 'المحل غير موجود' });
        }

        business.status = 'active';
        if (business.subscription.status === 'suspended') {
            business.subscription.status = 'active';
        }
        await business.save();

        res.json({
            success: true,
            message: 'تم تفعيل المحل بنجاح',
            data: business
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete business
router.delete('/:id', async (req, res) => {
    try {
        const business = await Business.findByIdAndDelete(req.params.id);

        if (!business) {
            return res.status(404).json({ success: false, message: 'المحل غير موجود' });
        }

        res.json({ success: true, message: 'تم حذف المحل بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get business statistics (Super Admin)
router.get('/admin/stats', async (req, res) => {
    try {
        const totalBusinesses = await Business.countDocuments();
        const activeBusinesses = await Business.countDocuments({ status: 'active' });
        const trialBusinesses = await Business.countDocuments({ 'subscription.status': 'trial' });
        
        const businessesByPlan = await Business.aggregate([
            { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
        ]);

        const totalRevenue = await Business.aggregate([
            { $group: { _id: null, total: { $sum: '$stats.totalRevenue' } } }
        ]);

        res.json({
            success: true,
            data: {
                totalBusinesses,
                activeBusinesses,
                trialBusinesses,
                businessesByPlan,
                totalRevenue: totalRevenue[0]?.total || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;