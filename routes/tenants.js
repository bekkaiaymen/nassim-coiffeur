const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const Subscription = require('../models/Subscription');

// Create tenant (business owner)
router.post('/', async (req, res) => {
    try {
        const { name, slug, ownerId, billingEmail } = req.body;
        const tenant = await Tenant.create({ name, slug, owner: ownerId, billingEmail });
        res.status(201).json({ success: true, data: tenant });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Get tenants (admin)
router.get('/', async (req, res) => {
    try {
        const tenants = await Tenant.find().populate('owner', 'name email');
        res.json({ success: true, count: tenants.length, data: tenants });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get tenant by id
router.get('/:id', async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id).populate('owner', 'name email');
        if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
        res.json({ success: true, data: tenant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update tenant
router.put('/:id', async (req, res) => {
    try {
        const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.json({ success: true, data: tenant });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Delete tenant (simple)
router.delete('/:id', async (req, res) => {
    try {
        await Tenant.findByIdAndDelete(req.params.id);
        // optionally delete subscription(s)
        await Subscription.deleteMany({ tenant: req.params.id });
        res.json({ success: true, message: 'Tenant deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
