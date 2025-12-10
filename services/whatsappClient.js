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
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
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
            puppeteer: puppeteerConfig,
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
            }
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
        try {
            await client.logout();
        } catch (e) {
            console.error('Logout error:', e);
        }
        isReady = false;
        qrCodeData = null;
        isInitializing = false;
        // Re-init to allow new login
        setTimeout(initializeClient, 1000);
    }
};

const reset = async () => {
    console.log('🔄 Resetting WhatsApp Client...');
    if (client) {
        try {
            await client.destroy();
        } catch (e) { console.error('Destroy error:', e); }
    }
    
    isReady = false;
    qrCodeData = null;
    isInitializing = false;
    
    // Try to delete session folder
    const sessionPath = './.wwebjs_auth/session-nassim-bot';
    if (fs.existsSync(sessionPath)) {
        try {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log('🗑️ Session data cleared');
        } catch (e) {
            console.error('Failed to clear session data:', e);
        }
    }
    
    initializeClient();
};

module.exports = {
    initializeClient,
    getStatus,
    sendMessage,
    logout,
    reset
};
