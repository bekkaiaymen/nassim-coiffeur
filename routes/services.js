const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { protect, ensureTenant, addTenantFilter } = require('../middleware/auth');

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
router.use(protect);
router.use(ensureTenant);

// Get all services
router.get('/', async (req, res) => {
    try {
        const { category, available, business } = req.query;
        let query = business ? { business } : addTenantFilter(req, {});

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
        const query = addTenantFilter(req, { _id: req.params.id });
        const service = await Service.findOne(query);

        if (!service) {
            return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
        }

        res.json({ success: true, data: service });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create new service
router.post('/', async (req, res) => {
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