const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

const FALLBACK_PUBLIC_KEY = 'BPX8TzW3Qj9SarBGDGlkz8MkFv_X1hMpgIhUZ1d7DIgsvJp9wjTmlYkuinW0avz8bMBHiye6hIdJwLFwbo8_slg';
const FALLBACK_PRIVATE_KEY = 'i9bbTfzz3p8XD9Qn_nme3pmQsKTGc2A512CI9KpUw8U';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || FALLBACK_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || FALLBACK_PRIVATE_KEY;
let vapidConfigured = false;

function ensureWebPushConfigured() {
    if (vapidConfigured || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return;
    }

    try {
        webpush.setVapidDetails('mailto:notifications@nassim-coiffeur.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
        vapidConfigured = true;
        console.log('✅ Web Push VAPID configured successfully');
    } catch (error) {
        console.error('❌ Failed to configure web push:', error.message);
    }
}

ensureWebPushConfigured();

function getVapidPublicKey() {
    ensureWebPushConfigured();
    return VAPID_PUBLIC_KEY;
}

async function savePushSubscription({ subscription, userId, customerId, employeeId, deviceInfo }) {
    if (!subscription?.endpoint) {
        throw new Error('Subscription endpoint is required');
    }

    const payload = {
        user: userId,
        customer: customerId,
        employee: employeeId,
        endpoint: subscription.endpoint,
        keys: subscription.keys || {},
        expirationTime: subscription.expirationTime || null,
        deviceInfo: deviceInfo || {},
        isActive: true,
        lastError: null
    };

    return PushSubscription.findOneAndUpdate(
        { endpoint: subscription.endpoint },
        payload,
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
}

async function deletePushSubscription({ endpoint, userId }) {
    if (!endpoint) {
        throw new Error('Subscription endpoint is required');
    }

    const subscription = await PushSubscription.findOne({ endpoint });
    if (!subscription) {
        return null;
    }

    if (userId && subscription.user && subscription.user.toString() !== userId.toString()) {
        const err = new Error('Not authorized to delete this subscription');
        err.statusCode = 403;
        throw err;
    }

    await subscription.deleteOne();
    return subscription;
}

async function queuePushDelivery(notification) {
    console.log('\n📊 === START queuePushDelivery ===');
    
    ensureWebPushConfigured();

    if (!notification) {
        console.warn('⚠️ No notification object provided');
        return;
    }
    
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !vapidConfigured) {
        console.warn('❌ VAPID keys not configured properly');
        console.log('   Public Key exists:', !!VAPID_PUBLIC_KEY);
        console.log('   Private Key exists:', !!VAPID_PRIVATE_KEY);
        console.log('   Configured:', vapidConfigured);
        return;
    }
    
    console.log('✅ VAPID keys configured');
    console.log(`📝 Notification: "${notification.title}" for customer: ${notification.customer?._id || notification.customer}`);

    try {
        const customerId = notification.customer?._id || notification.customer;
        const userId = notification.user?._id || notification.user;
        const employeeId = notification.employee?._id || notification.employee;
        
        console.log(`👤 Customer ID: ${customerId}`);
        console.log(`👥 User ID: ${userId}`);
        console.log(`👨‍💼 Employee ID: ${employeeId}`);

        const filters = [];
        if (customerId) filters.push({ customer: customerId });
        if (userId) filters.push({ user: userId });
        if (employeeId) filters.push({ employee: employeeId });

        if (!filters.length) {
            console.warn('⚠️ No customer, user, or employee ID to target');
            return;
        }
        
        console.log(`🔍 Searching subscriptions with ${filters.length} filter(s)...`);

        const subscriptions = await PushSubscription.find({
            isActive: true,
            $or: filters
        });
        
        console.log(`📋 Found ${subscriptions.length} active subscription(s)`);
        
        if (!subscriptions.length) {
            console.warn('⚠️ No active subscriptions found for this customer/user');
            return;
        }
        
        subscriptions.forEach((sub, idx) => {
            console.log(`   ${idx + 1}. Endpoint: ${sub.endpoint.substring(0, 50)}...`);
            console.log(`      Device: ${sub.deviceInfo?.os || 'unknown'} - ${sub.deviceInfo?.browser || 'unknown'}`);
            console.log(`      Status: ${sub.isActive ? '✅ Active' : '❌ Inactive'}`);
        });

        const payload = JSON.stringify({
            title: notification.title,
            message: notification.message,
            type: notification.type,
            icon: notification.icon,
            data: {
                notificationId: notification._id,
                customerId,
                userId,
                businessId: notification.business?._id || notification.business,
                createdAt: notification.createdAt,
                meta: notification.data || {}
            }
        });
        
        console.log(`📤 Payload size: ${payload.length} bytes`);
        console.log('📨 Sending push to all subscriptions...');

        const results = await Promise.allSettled(subscriptions.map(sub => sendWebPush(sub, payload)));
        
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`📊 Results: ${succeeded} succeeded, ${failed} failed`);
        console.log('✅ === END queuePushDelivery ===\n');
    } catch (error) {
        console.error('❌ queuePushDelivery error:', error);
        console.log('✅ === END queuePushDelivery (with errors) ===\n');
    }
}

async function sendWebPush(subscriptionDoc, payload) {
    console.log(`\n🚀 sendWebPush to ${subscriptionDoc.endpoint.substring(0, 50)}...`);
    
    try {
        console.log(`   📍 Device: ${subscriptionDoc.deviceInfo?.os || 'unknown'}`);
        console.log(`   🔑 Has keys: ${!!subscriptionDoc.keys && !!subscriptionDoc.keys.auth}`);
        
        await webpush.sendNotification({
            endpoint: subscriptionDoc.endpoint,
            keys: subscriptionDoc.keys || {}
        }, payload, {
            TTL: 24 * 60 * 60 // 24 hours
        });

        console.log(`   ✅ Sent successfully!`);
        
        subscriptionDoc.lastNotifiedAt = new Date();
        subscriptionDoc.isActive = true;
        subscriptionDoc.lastError = null;
        await subscriptionDoc.save();
    } catch (error) {
        subscriptionDoc.lastError = error.message;
        
        console.error(`   ❌ Send failed:`);
        console.error(`      Status: ${error.statusCode || 'N/A'}`);
        console.error(`      Message: ${error.message}`);
        
        if (error.body) {
            console.error(`      Body: ${error.body}`);
        }

        if (error.statusCode === 404 || error.statusCode === 410) {
            console.error(`      ➜ Marking subscription as inactive (endpoint expired)`);
            subscriptionDoc.isActive = false;
        }

        await subscriptionDoc.save().catch((saveErr) => {
            console.error(`   ❌ Could not save error status:`, saveErr.message);
        });
    }
}

module.exports = {
    getVapidPublicKey,
    savePushSubscription,
    deletePushSubscription,
    queuePushDelivery
};
