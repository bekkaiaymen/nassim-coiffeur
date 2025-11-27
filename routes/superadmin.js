const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { protect } = require('../middleware/auth');

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'يجب تسجيل الدخول أولاً' 
        });
    }
    
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'غير مصرح لك بالوصول لهذه الصفحة' 
        });
    }
    next();
};

// Apply middleware
router.use(protect);
router.use(requireSuperAdmin);

// Get all tenants/businesses
router.get('/tenants', async (req, res) => {
    try {
        console.log('🔍 Super Admin accessing /tenants:', {
            user: req.user?._id,
            role: req.user?.role
        });
        
        const Business = require('../models/Business');
        
        // Get all businesses with populated owner
        const businesses = await Business.find()
            .populate('owner', 'name email phone')
            .sort({ createdAt: -1 });

        console.log('✅ Found businesses:', businesses.length);

        res.json({ success: true, count: businesses.length, data: businesses });
    } catch (error) {
        console.error('❌ Error in /api/superadmin/tenants:', error);
        res.status(500).json({ success: false, message: error.message, stack: error.stack });
    }
});

// Get single tenant
router.get('/tenants/:id', async (req, res) => {
    try {
        const Business = require('../models/Business');
        const Employee = require('../models/Employee');
        const Appointment = require('../models/Appointment');
        const Customer = require('../models/Customer');
        
        const business = await Business.findById(req.params.id)
            .populate('owner', 'name email phone');

        if (!business) {
            return res.status(404).json({ success: false, message: 'المتجر غير موجود' });
        }

        // Get business statistics
        const employees = await Employee.countDocuments({ business: business._id });
        const appointments = await Appointment.countDocuments({ business: business._id });
        const customers = await Customer.countDocuments({ business: business._id });

        res.json({ 
            success: true, 
            data: {
                ...business.toObject(),
                stats: {
                    ...business.stats,
                    employees,
                    appointments,
                    customers
                }
            }
        });
    } catch (error) {
        console.error('Error in /api/superadmin/tenants/:id:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create new tenant
router.post('/tenants', async (req, res) => {
    try {
        const tenant = await Tenant.create(req.body);
        res.status(201).json({ 
            success: true, 
            message: 'تم إنشاء المتجر بنجاح',
            data: tenant 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Update tenant
router.put('/tenants/:id', async (req, res) => {
    try {
        const tenant = await Tenant.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!tenant) {
            return res.status(404).json({ success: false, message: 'المتجر غير موجود' });
        }

        res.json({ 
            success: true, 
            message: 'تم تحديث المتجر بنجاح',
            data: tenant 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Delete tenant
router.delete('/tenants/:id', async (req, res) => {
    try {
        const tenant = await Tenant.findByIdAndDelete(req.params.id);

        if (!tenant) {
            return res.status(404).json({ success: false, message: 'المتجر غير موجود' });
        }

        res.json({ success: true, message: 'تم حذف المتجر بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all subscription plans
router.get('/plans', async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find().sort({ price: 1 });
        res.json({ success: true, count: plans.length, data: plans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create new plan
router.post('/plans', async (req, res) => {
    try {
        const plan = await SubscriptionPlan.create(req.body);
        res.status(201).json({ 
            success: true, 
            message: 'تم إنشاء الخطة بنجاح',
            data: plan 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Update plan
router.put('/plans/:id', async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!plan) {
            return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
        }

        res.json({ 
            success: true, 
            message: 'تم تحديث الخطة بنجاح',
            data: plan 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Delete plan
router.delete('/plans/:id', async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);

        if (!plan) {
            return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
        }

        res.json({ success: true, message: 'تم حذف الخطة بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find()
            .populate('tenant', 'name')
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get platform statistics
router.get('/stats', async (req, res) => {
    try {
        const totalTenants = await Tenant.countDocuments();
        const activeTenants = await Tenant.countDocuments({ 'subscription.status': 'active' });
        const totalUsers = await User.countDocuments();
        const totalPlans = await SubscriptionPlan.countDocuments();

        // Calculate revenue
        const tenants = await Tenant.find({ 'subscription.status': 'active' })
            .populate('subscription.plan');
        
        let monthlyRevenue = 0;
        tenants.forEach(tenant => {
            if (tenant.subscription?.plan?.price) {
                monthlyRevenue += tenant.subscription.plan.price;
            }
        });

        res.json({
            success: true,
            data: {
                totalTenants,
                activeTenants,
                totalUsers,
                totalPlans,
                monthlyRevenue,
                yearlyRevenue: monthlyRevenue * 12
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
