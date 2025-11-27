const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const { protect, ensureTenant, addTenantFilter } = require('../middleware/auth');

// Public route to get customer invoices (no auth required)
router.get('/public/customer/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        
        // Find customer by phone
        const customer = await Customer.findOne({ phone });
        
        if (!customer) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        // Get all invoices for this customer
        const invoices = await Invoice.find({ customerId: customer._id })
            .sort({ createdAt: -1 });

        res.json({ success: true, count: invoices.length, data: invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Apply middleware to all protected routes
router.use(protect);
router.use(ensureTenant);

// Get all invoices
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, status, customer } = req.query;
        let query = addTenantFilter(req, {});

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        if (status) query.paymentStatus = status;
        if (customer) query.customerPhone = customer;

        const invoices = await Invoice.find(query)
            .populate('customerId', 'name phone')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: invoices.length, data: invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get invoice by ID
router.get('/:id', async (req, res) => {
    try {
        const query = addTenantFilter(req, { _id: req.params.id });
        const invoice = await Invoice.findOne(query)
            .populate('customerId', 'name phone email');

        if (!invoice) {
            return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
        }

        res.json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get invoice by number
router.get('/number/:invoiceNumber', async (req, res) => {
    try {
        const query = addTenantFilter(req, { invoiceNumber: req.params.invoiceNumber });
        const invoice = await Invoice.findOne(query)
            .populate('customerId', 'name phone email');

        if (!invoice) {
            return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
        }

        res.json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create new invoice
router.post('/', async (req, res) => {
    try {
        const { customerName, customerPhone, items, paymentMethod, notes } = req.body;

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        const taxRate = parseFloat(process.env.TAX_RATE) || 0.15;
        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        // Find or create customer within tenant
        const customerQuery = addTenantFilter(req, { phone: customerPhone });
        let customer = await Customer.findOne(customerQuery);
        if (!customer && customerPhone) {
            customer = await Customer.create({
                tenant: req.tenantId,
                name: customerName,
                phone: customerPhone
            });
        }

        const invoice = await Invoice.create({
            tenant: req.tenantId,
            customerName,
            customerPhone,
            customerId: customer?._id,
            items,
            subtotal,
            tax,
            total,
            paymentMethod,
            paymentStatus: 'paid',
            paidAmount: total,
            notes
        });

        // Update customer stats
        if (customer) {
            customer.totalSpent += total;
            customer.lastVisit = new Date();
            await customer.save();
        }

        res.status(201).json({ 
            success: true, 
            message: 'تم إصدار الفاتورة بنجاح',
            data: invoice 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Update invoice
router.put('/:id', async (req, res) => {
    try {
        const query = addTenantFilter(req, { _id: req.params.id });
        const invoice = await Invoice.findOneAndUpdate(
            query,
            req.body,
            { new: true, runValidators: true }
        );

        if (!invoice) {
            return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
        }

        res.json({ 
            success: true, 
            message: 'تم تحديث الفاتورة بنجاح',
            data: invoice 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Update payment status
router.patch('/:id/payment', async (req, res) => {
    try {
        const { paymentStatus, paidAmount } = req.body;

        const invoice = await Invoice.findByIdAndUpdate(
            req.params.id,
            { paymentStatus, paidAmount },
            { new: true }
        );

        if (!invoice) {
            return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
        }

        res.json({ 
            success: true, 
            message: 'تم تحديث حالة الدفع',
            data: invoice 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findByIdAndDelete(req.params.id);

        if (!invoice) {
            return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
        }

        res.json({ success: true, message: 'تم حذف الفاتورة بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get invoice statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayInvoices = await Invoice.find({
            createdAt: { $gte: today }
        });

        const todayRevenue = todayInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const todayCount = todayInvoices.length;

        const totalRevenue = await Invoice.aggregate([
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);

        res.json({
            success: true,
            data: {
                todayRevenue,
                todayCount,
                totalRevenue: totalRevenue[0]?.total || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;