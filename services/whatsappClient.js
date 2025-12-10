const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');

let client;
let qrCodeData = null;
let isReady = false;
let isInitializing = false;

// Helper to find Chrome path on Windows
const getChromePath = () => {
    const paths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    
    for (const path of paths) {
        if (fs.existsSync(path)) {
            return path;
        }
    }
    return null;
};

const initializeClient = async () => {
    if (isInitializing || isReady) return;
    
    isInitializing = true;
    console.log('🔄 Initializing WhatsApp Client...');

    try {
        const chromePath = getChromePath();
        const puppeteerConfig = {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        };

        if (chromePath) {
            console.log(`ℹ️ Using System Browser: ${chromePath}`);
            puppeteerConfig.executablePath = chromePath;
        } else {
            console.warn('⚠️ No system browser found. Puppeteer might fail if Chromium is not downloaded.');
        }

        client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'nassim-bot'
            }),
            puppeteer: puppeteerConfig
        });

        client.on('qr', async (qr) => {
            console.log('📱 QR Code received');
            try {
                qrCodeData = await qrcode.toDataURL(qr);
            } catch (err) {
                console.error('Error generating QR code:', err);
            }
        });

        client.on('ready', () => {
            console.log('✅ WhatsApp Client is ready!');
            isReady = true;
            qrCodeData = null;
        });

        client.on('authenticated', () => {
            console.log('🔐 WhatsApp Authenticated');
        });

        client.on('auth_failure', msg => {
            console.error('❌ WhatsApp Auth Failure:', msg);
            isReady = false;
        });

        client.on('disconnected', (reason) => {
            console.log('❌ WhatsApp Disconnected:', reason);
            isReady = false;
            qrCodeData = null;
            // Re-initialize after a delay
            setTimeout(() => {
                isInitializing = false;
                initializeClient();
            }, 5000);
        });

        await client.initialize();
    } catch (error) {
        console.error('Error initializing WhatsApp client:', error);
        isInitializing = false;
    }
};

const getStatus = () => {
    return {
        isReady,
        qrCode: qrCodeData
    };
};

const sendMessage = async (phone, message) => {
    if (!isReady) throw new Error('WhatsApp client is not ready');

    // Format phone number
    // Remove non-digits
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    
    // Handle Algerian numbers
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '213' + cleanPhone.substring(1);
    }
    if (!cleanPhone.startsWith('213')) {
        cleanPhone = '213' + cleanPhone;
    }

    const chatId = `${cleanPhone}@c.us`;

    try {
        const response = await client.sendMessage(chatId, message);
        return response;
    } catch (error) {
        console.error(`Error sending message to ${cleanPhone}:`, error);
        throw error;
    }
};

const logout = async () => {
    if (client) {
        await client.logout();
        isReady = false;
        qrCodeData = null;
        isInitializing = false;
        // Re-init to allow new login
        initializeClient();
    }
};

module.exports = {
    initializeClient,
    getStatus,
    sendMessage,
    logout
};
