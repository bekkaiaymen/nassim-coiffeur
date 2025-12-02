const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Employee = require('../models/Employee');

// Protect routes (authenticate user)
exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'غير مصرح. يرجى تسجيل الدخول'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartbiz-secret-2025');
        
        // Check if it's an employee token
        if (decoded.role === 'employee') {
            req.user = await Employee.findById(decoded.id).populate('tenant').populate('business');
        } else {
            req.user = await User.findById(decoded.id).populate('tenant').populate('business');
        }
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }
        
        req.userId = req.user._id;
        req.userRole = req.user.role;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({
            success: false,
            message: 'الجلسة منتهية. يرجى تسجيل الدخول مرة أخرى'
        });
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بالوصول إلى هذا المورد'
            });
        }
        next();
    };
};

// Require specific role(s) - alternative name for authorize
exports.requireRole = (roles) => {
    return (req, res, next) => {
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بالوصول إلى هذا المورد'
            });
        }
        next();
    };
};

// Ensure user belongs to a tenant (multi-tenant scoping)
exports.ensureTenant = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'يجب تسجيل الدخول أولاً' 
            });
        }

        // Super admins can access all tenants
        if (req.user.role === 'super_admin') {
            // Allow super admins to specify tenant via query or body
            const tenantId = req.query.tenantId || req.body.tenantId || req.user.tenant || req.user.business;
            if (tenantId) {
                let tenant = await Tenant.findById(tenantId);
                if (!tenant) {
                    const Business = require('../models/Business');
                    tenant = await Business.findById(tenantId);
                }
                if (!tenant) {
                    return res.status(404).json({ 
                        success: false, 
                        message: 'المتجر غير موجود' 
                    });
                }
                req.tenant = tenant;
                req.tenantId = tenant._id;
            }
            return next();
        }

        // Regular users must have a tenant or business
        // Handle both ObjectId (string) and populated object
        let tenantId = req.user.tenant || req.user.business;
        
        // If it's a populated object, extract the _id
        if (tenantId && typeof tenantId === 'object' && tenantId._id) {
            tenantId = tenantId._id;
        }
        
        console.log('ensureTenant check:', {
            userId: req.user._id,
            userName: req.user.name,
            userRole: req.user.role,
            hasTenant: !!req.user.tenant,
            hasBusiness: !!req.user.business,
            tenantId: tenantId
        });
        
        if (!tenantId) {
            console.error('User has no tenant or business!');
            return res.status(403).json({ 
                success: false, 
                message: 'المستخدم غير مرتبط بمتجر' 
            });
        }

        // Try to find as Tenant first, then as Business
        let tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            const Business = require('../models/Business');
            tenant = await Business.findById(tenantId);
        }
        
        if (!tenant) {
            console.error('Tenant/Business not found:', tenantId);
            return res.status(404).json({ 
                success: false, 
                message: 'المتجر غير موجود' 
            });
        }
        
        console.log('Tenant found:', tenant.businessName || tenant.name);

        // Check status - Allow active, pending, and trial statuses
        if (tenant.status) {
            const allowedStatuses = ['active', 'pending', 'trial'];
            if (!allowedStatuses.includes(tenant.status)) {
                console.error('Business status not allowed:', tenant.status);
                return res.status(403).json({ 
                    success: false, 
                    message: 'المتجر غير نشط - يرجى التواصل مع الدعم' 
                });
            }
        }

        req.tenant = tenant;
        req.tenantId = tenant._id;
        
        next();
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Add tenant filter to query (helper for route handlers)
exports.addTenantFilter = (req, filter = {}) => {
    // Super admins can see all if no tenant specified
    if (req.user.role === 'super_admin' && !req.tenantId) {
        return filter;
    }
    
    // Add tenant filter for all other users
    if (req.tenantId) {
        filter.tenant = req.tenantId;
    }
    
    return filter;
};

// Check subscription limits
exports.checkLimit = (limitType) => {
    return async (req, res, next) => {
        try {
            if (!req.tenant || req.user.role === 'super_admin') {
                return next(); // Super admins bypass limits
            }

            const Subscription = require('../models/Subscription');
            const subscription = await Subscription.findOne({ 
                tenant: req.tenantId,
                status: 'active'
            }).populate('plan');

            if (!subscription || !subscription.plan) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'لا يوجد اشتراك نشط' 
                });
            }

            const plan = subscription.plan;

            // Check specific limits based on limitType
            if (limitType === 'appointments') {
                const Appointment = require('../models/Appointment');
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                const count = await Appointment.countDocuments({
                    tenant: req.tenantId,
                    createdAt: { $gte: startOfMonth }
                });

                if (plan.features.maxAppointmentsPerMonth !== -1 && 
                    count >= plan.features.maxAppointmentsPerMonth) {
                    return res.status(403).json({ 
                        success: false, 
                        message: 'لقد وصلت إلى الحد الأقصى من المواعيد لهذا الشهر' 
                    });
                }
            }

            if (limitType === 'employees') {
                const User = require('../models/User');
                const count = await User.countDocuments({
                    tenant: req.tenantId,
                    role: { $in: ['manager', 'employee'] }
                });

                if (plan.features.maxEmployees !== -1 && 
                    count >= plan.features.maxEmployees) {
                    return res.status(403).json({ 
                        success: false, 
                        message: 'لقد وصلت إلى الحد الأقصى من الموظفين' 
                    });
                }
            }

            if (limitType === 'customers') {
                const Customer = require('../models/Customer');
                const count = await Customer.countDocuments({
                    tenant: req.tenantId
                });

                if (plan.features.maxCustomers !== -1 && 
                    count >= plan.features.maxCustomers) {
                    return res.status(403).json({ 
                        success: false, 
                        message: 'لقد وصلت إلى الحد الأقصى من العملاء' 
                    });
                }
            }

            next();
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    };
};