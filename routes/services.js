const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { protect, ensureTenant, addTenantFilter } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');

// Public endpoint - Get services by business (for customers)
router.get('/public/by-business/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const { category, available } = req.query;
        
        let query = { business: businessId };
        
        if (category) query.category = category;
        if (available !== undefined) query.available = available === 'true';
        else query.available = true; // Default to only available services
        
        const services = await Service.find(query).sort({ popularityScore: -1 });
        
        res.json({ success: true, count: services.length, data: services });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Apply middleware to all other routes
// router.use(protect); // Removed global protect to allow public access if needed, or handle per route
// router.use(ensureTenant);

// Get all services
router.get('/', async (req, res) => {
    try {
        const { category, available, business } = req.query;
        let query = {};
        let userOrEmployee = null;

        // Check for token manually since we support both User and Employee here
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartbiz-secret-2025');
                
                if (decoded.role === 'employee') {
                    userOrEmployee = await Employee.findById(decoded.id);
                } else {
                    userOrEmployee = await User.findById(decoded.id);
                }
            } catch (err) {
                console.log('Token verification failed in services GET:', err.message);
            }
        }

        // Build query
        if (business) {
            query.business = business;
        } else if (userOrEmployee) {
            // If authenticated, filter by tenant/business
            if (userOrEmployee.tenant) {
                query.tenant = userOrEmployee.tenant;
            } else if (userOrEmployee.business) {
                 query.business = userOrEmployee.business;
            }
        } else {
             return res.status(401).json({ success: false, message: 'غير مصرح. يرجى تسجيل الدخول أو تحديد المتجر' });
        }

        if (category) query.category = category;
        if (available !== undefined) query.available = available === 'true';

        const services = await Service.find(query).sort({ popularityScore: -1 });

        res.json(services);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get service by ID
router.get('/:id', async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
        }

        res.json({ success: true, data: service });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create new service
router.post('/', protect, ensureTenant, async (req, res) => {
    try {
        const service = await Service.create({
            ...req.body,
            tenant: req.tenantId,
            business: req.tenantId  // Add business field as well
        });

        res.status(201).json({ 
            success: true, 
            message: 'تم إضافة الخدمة بنجاح',
            data: service 
        });
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Update service
router.put('/:id', async (req, res) => {
    try {
        const service = await Service.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!service) {
            return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
        }

        res.json({ 
            success: true, 
            message: 'تم تحديث الخدمة بنجاح',
            data: service 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Toggle service availability
router.patch('/:id/toggle', async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
        }

        service.available = !service.available;
        await service.save();

        res.json({ 
            success: true, 
            message: `تم ${service.available ? 'تفعيل' : 'إيقاف'} الخدمة`,
            data: service 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete service
router.delete('/:id', async (req, res) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);

        if (!service) {
            return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
        }

        res.json({ success: true, message: 'تم حذف الخدمة بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get popular services
router.get('/popular/top', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const services = await Service.find({ available: true })
            .sort({ popularityScore: -1 })
            .limit(limit);

        res.json({ success: true, data: services });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;