const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappClient');

// Initialize client when this route is first loaded (or you can do it in server.js)
// We'll do it here to lazy load
whatsappService.initializeClient();

// Get Status & QR
router.get('/status', (req, res) => {
    const status = whatsappService.getStatus();
    res.json(status);
});

// Send Message
router.post('/send', async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
    }

    try {
        await whatsappService.sendMessage(phone, message);
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Failed to send message' });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    try {
        await whatsappService.logout();
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to logout' });
    }
});

// Reset Session (Hard Reset)
router.post('/reset', async (req, res) => {
    try {
        await whatsappService.reset();
        res.json({ success: true, message: 'Session reset successfully. Please wait for new QR code.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset session' });
    }
});

module.exports = router;
