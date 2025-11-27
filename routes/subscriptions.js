const express = require('express');
const router = express.Router();
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Business = require('../models/Business');
const Payment = require('../models/Payment');

// Get all subscription plans
router.get('/', async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ isActive: true }).sort({ 'pricing.monthly': 1 });
        
        res.json({ success: true, count: plans.length, data: plans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get plan by ID
router.get('/:id', async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.id);
        
        if (!plan) {
            return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
        }

        res.json({ success: true, data: plan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create subscription plan (Super Admin)
router.post('/', async (req, res) => {
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

// Update subscription plan (Super Admin)
router.put('/:id', async (req, res) => {
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

// Delete subscription plan (Super Admin)
router.delete('/:id', async (req, res) => {
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

// Subscribe/Upgrade business to plan
router.post('/:planId/subscribe', async (req, res) => {
    try {
        const { businessId, billingCycle } = req.body; // billingCycle: 'monthly' or 'yearly'

        const plan = await SubscriptionPlan.findById(req.params.planId);
        if (!plan) {
            return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
        }

        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({ success: false, message: 'المحل غير موجود' });
        }

        // Calculate amount
        const amount = billingCycle === 'yearly' 
            ? plan.pricing.yearly 
            : plan.pricing.monthly;

        // Calculate end date
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (billingCycle === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
            endDate.setMonth(endDate.getMonth() + 1);
        }

        // Update business subscription
        business.subscription = {
            plan: plan.planId,
            status: 'active',
            startDate,
            endDate,
            price: amount,
            billingCycle,
            nextBillingDate: endDate
        };

        // Update limits
        business.limits = {
            maxEmployees: plan.features.maxEmployees,
            maxAppointmentsPerMonth: plan.features.maxAppointmentsPerMonth,
            maxCustomers: plan.features.maxCustomers,
            maxServices: plan.features.maxServices,
            canUseAI: plan.features.canUseAI,
            canUseLoyalty: plan.features.canUseLoyalty,
            canUseAnalytics: plan.features.canUseAnalytics,
            canUseNotifications: plan.features.canUseNotifications,
            canUseCustomBranding: plan.features.canUseCustomBranding
        };

        await business.save();

        // Create payment record
        const payment = await Payment.create({
            business: businessId,
            plan: plan._id,
            amount,
            paymentMethod: 'pending', // Will be updated by payment gateway
            status: 'pending',
            subscriptionPeriod: {
                startDate,
                endDate
            }
        });

        res.json({
            success: true,
            message: `تم الاشتراك في خطة ${plan.planName} بنجاح`,
            data: {
                business,
                payment: {
                    id: payment._id,
                    amount: payment.amount,
                    invoiceNumber: payment.invoiceNumber,
                    status: payment.status
                }
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Cancel subscription
router.post('/cancel', async (req, res) => {
    try {
        const { businessId } = req.body;

        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({ success: false, message: 'المحل غير موجود' });
        }

        business.subscription.status = 'cancelled';
        business.subscription.cancelledAt = new Date();
        await business.save();

        res.json({
            success: true,
            message: 'تم إلغاء الاشتراك. سيستمر الوصول حتى نهاية الفترة المدفوعة',
            data: business
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Renew subscription
router.post('/renew', async (req, res) => {
    try {
        const { businessId } = req.body;

        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({ success: false, message: 'المحل غير موجود' });
        }

        const plan = await SubscriptionPlan.findOne({ planId: business.subscription.plan });
        if (!plan) {
            return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
        }

        // Calculate amount
        const amount = business.subscription.billingCycle === 'yearly' 
            ? plan.pricing.yearly 
            : plan.pricing.monthly;

        // Calculate new end date
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (business.subscription.billingCycle === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
            endDate.setMonth(endDate.getMonth() + 1);
        }

        business.subscription.status = 'active';
        business.subscription.startDate = startDate;
        business.subscription.endDate = endDate;
        business.subscription.nextBillingDate = endDate;
        await business.save();

        // Create payment record
        const payment = await Payment.create({
            business: businessId,
            plan: plan._id,
            amount,
            paymentMethod: 'pending',
            status: 'pending',
            subscriptionPeriod: {
                startDate,
                endDate
            }
        });

        res.json({
            success: true,
            message: 'تم تجديد الاشتراك بنجاح',
            data: {
                business,
                payment: {
                    id: payment._id,
                    amount: payment.amount,
                    invoiceNumber: payment.invoiceNumber
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Check subscription status
router.get('/check/:businessId', async (req, res) => {
    try {
        const business = await Business.findById(req.params.businessId);
        if (!business) {
            return res.status(404).json({ success: false, message: 'المحل غير موجود' });
        }

        const now = new Date();
        const daysRemaining = Math.ceil((new Date(business.subscription.endDate) - now) / (1000 * 60 * 60 * 24));
        
        let status = {
            isActive: business.subscription.status === 'active',
            plan: business.subscription.plan,
            daysRemaining,
            endDate: business.subscription.endDate,
            isExpiring: daysRemaining <= 7 && daysRemaining > 0,
            isExpired: daysRemaining <= 0
        };

        // Auto-expire if needed
        if (status.isExpired && business.subscription.status === 'active') {
            business.subscription.status = 'expired';
            await business.save();
            status.isActive = false;
        }

        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
