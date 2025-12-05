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
    } catch (error) {
        console.error('Failed to configure web push:', error.message);
    }
}

ensureWebPushConfigured();

function getVapidPublicKey() {
    ensureWebPushConfigured();
    return VAPID_PUBLIC_KEY;
}

async function savePushSubscription({ subscription, userId, customerId, deviceInfo }) {
    if (!subscription?.endpoint) {
        throw new Error('Subscription endpoint is required');
    }

    const payload = {
        user: userId,
        customer: customerId,
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
    ensureWebPushConfigured();

    if (!notification || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !vapidConfigured) {
        return;
    }

    try {
        const customerId = notification.customer?._id || notification.customer;
        const userId = notification.user?._id || notification.user;

        const filters = [];
        if (customerId) filters.push({ customer: customerId });
        if (userId) filters.push({ user: userId });

        if (!filters.length) {
            return;
        }

        const subscriptions = await PushSubscription.find({
            isActive: true,
            $or: filters
        });

        if (!subscriptions.length) {
            return;
        }

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

        await Promise.allSettled(subscriptions.map(sub => sendWebPush(sub, payload)));
    } catch (error) {
        console.error('queuePushDelivery error:', error);
    }
}

async function sendWebPush(subscriptionDoc, payload) {
    try {
        await webpush.sendNotification({
            endpoint: subscriptionDoc.endpoint,
            keys: subscriptionDoc.keys || {}
        }, payload);

        subscriptionDoc.lastNotifiedAt = new Date();
        subscriptionDoc.isActive = true;
        subscriptionDoc.lastError = null;
        await subscriptionDoc.save();
    } catch (error) {
        subscriptionDoc.lastError = error.message;

        if (error.statusCode === 404 || error.statusCode === 410) {
            subscriptionDoc.isActive = false;
        }

        await subscriptionDoc.save().catch(() => {});
        console.error('sendWebPush error:', error.statusCode || '', error.body || error.message);
    }
}

module.exports = {
    getVapidPublicKey,
    savePushSubscription,
    deletePushSubscription,
    queuePushDelivery
};
