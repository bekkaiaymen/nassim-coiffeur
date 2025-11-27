const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { protect, ensureTenant } = require('../middleware/auth');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Tenant = require('../models/Tenant');
const Subscription = require('../models/Subscription');

// 🎯 Create Stripe Checkout Session للاشتراك
router.post('/create-checkout-session', protect, ensureTenant, async (req, res) => {
    try {
        const { planId } = req.body;
        
        if (!planId) {
            return res.status(400).json({ success: false, message: 'معرف الخطة مطلوب' });
        }

        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) {
            return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
        }

        const tenant = await Tenant.findById(req.user.tenant);
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'المتجر غير موجود' });
        }

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price: plan.stripe_price_id || 'price_1234567890', // استخدم Stripe Price ID الحقيقي
                    quantity: 1,
                }
            ],
            customer_email: tenant.billingEmail || req.user.email,
            client_reference_id: tenant._id.toString(),
            metadata: {
                tenantId: tenant._id.toString(),
                planId: plan._id.toString(),
                userId: req.user._id.toString()
            },
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing`,
        });

        res.json({ success: true, sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('❌ Stripe Checkout Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 🎯 Create Billing Portal Session لإدارة الاشتراك
router.post('/create-billing-portal', protect, ensureTenant, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ tenant: req.user.tenant })
            .sort({ createdAt: -1 });

        if (!subscription || !subscription.stripeCustomerId) {
            return res.status(400).json({
                success: false,
                message: 'لا يوجد اشتراك نشط'
            });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: subscription.stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
        });

        res.json({ success: true, url: portalSession.url });
    } catch (error) {
        console.error('❌ Billing Portal Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 🎯 Stripe Webhook Handler
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('✅ Webhook received:', event.type);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                
                // Get metadata
                const tenantId = session.metadata.tenantId;
                const planId = session.metadata.planId;
                const stripeCustomerId = session.customer;
                const stripeSubscriptionId = session.subscription;

                // Update or create subscription
                await Subscription.findOneAndUpdate(
                    { tenant: tenantId },
                    {
                        plan: planId,
                        status: 'active',
                        stripeCustomerId,
                        stripeSubscriptionId,
                        currentPeriodStart: new Date(),
                        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    },
                    { upsert: true, new: true }
                );

                // Update tenant
                await Tenant.findByIdAndUpdate(tenantId, {
                    plan: planId,
                    status: 'active'
                });

                console.log('✅ Subscription activated for tenant:', tenantId);
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object;
                const stripeSubscriptionId = invoice.subscription;

                await Subscription.findOneAndUpdate(
                    { stripeSubscriptionId },
                    {
                        status: 'active',
                        lastPaymentDate: new Date(),
                        lastPaymentAmount: invoice.amount_paid / 100
                    }
                );

                console.log('✅ Invoice paid:', invoice.id);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const stripeSubscriptionId = invoice.subscription;

                await Subscription.findOneAndUpdate(
                    { stripeSubscriptionId },
                    { status: 'past_due' }
                );

                const subscription = await Subscription.findOne({ stripeSubscriptionId });
                if (subscription) {
                    await Tenant.findByIdAndUpdate(subscription.tenant, {
                        status: 'suspended'
                    });
                }

                console.log('❌ Payment failed for subscription:', stripeSubscriptionId);
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const stripeSubscriptionId = subscription.id;

                await Subscription.findOneAndUpdate(
                    { stripeSubscriptionId },
                    {
                        status: subscription.status,
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
                    }
                );

                console.log('✅ Subscription updated:', stripeSubscriptionId);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const stripeSubscriptionId = subscription.id;

                await Subscription.findOneAndUpdate(
                    { stripeSubscriptionId },
                    { status: 'cancelled' }
                );

                const sub = await Subscription.findOne({ stripeSubscriptionId });
                if (sub) {
                    await Tenant.findByIdAndUpdate(sub.tenant, {
                        status: 'inactive'
                    });
                }

                console.log('❌ Subscription cancelled:', stripeSubscriptionId);
                break;
            }

            default:
                console.log(`⚠️ Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 📊 Get tenant subscription info
router.get('/subscription', protect, ensureTenant, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ tenant: req.user.tenant })
            .populate('plan')
            .sort({ createdAt: -1 });

        if (!subscription) {
            return res.json({
                success: true,
                data: null,
                message: 'لا يوجد اشتراك'
            });
        }

        res.json({ success: true, data: subscription });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 📋 Get all plans (Public)
router.get('/plans', async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ active: true })
            .sort({ displayOrder: 1 });

        res.json({ success: true, data: plans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;