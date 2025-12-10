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
            headless: true, // Run in background
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-features=site-per-process',
                '--disable-web-security'
            ]
        };

        if (chromePath) {
            console.log(`ℹ️ Using System Browser: ${chromePath}`);
            puppeteerConfig.executablePath = chromePath;
        }

        client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'nassim-bot-windows', // Explicit Windows session
                dataPath: './.wwebjs_auth'
            }),
            puppeteer: puppeteerConfig,
            restartOnAuthFail: true,
            // Force Windows User Agent
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            // Use a specific stable version
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
            }
        });

        client.on('loading_screen', (percent, message) => {
            console.log('⏳ Loading:', percent, '%', message);
        });
        
        client.on('qr', async (qr) => {
            console.log('📱 QR Code received - Please scan');
            try {
                qrCodeData = await qrcode.toDataURL(qr);
            } catch (err) {
                console.error('Error generating QR code:', err);
            }
        });

        client.on('authenticated', () => {
            console.log('🔐 WhatsApp Authenticated - Syncing data...');
            qrCodeData = null; // Clear QR immediately on authentication
            isReady = true; // Set ready immediately after authentication
            isInitializing = false;
        });

        client.on('ready', () => {
            console.log('✅ WhatsApp Client is fully ready!');
            isReady = true;
            qrCodeData = null;
            isInitializing = false;
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
        isReady: isReady,
        qrCode: qrCodeData,
        isAuthenticated: isReady && !qrCodeData
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
    
    // Set flags first
    isReady = false;
    qrCodeData = null;
    isInitializing = false;
    
    if (client) {
        try {
            await client.destroy();
        } catch (e) { 
            console.log('Client already destroyed or not initialized');
        }
        client = null;
    }
    
    // Wait for processes to fully close
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Delete ALL session folders
    const authDir = './.wwebjs_auth';
    if (fs.existsSync(authDir)) {
        try {
            fs.rmSync(authDir, { recursive: true, force: true, maxRetries: 3 });
            console.log('🗑️ All session data cleared');
        } catch (e) {
            console.warn('Could not clear session data:', e.message);
        }
    }
    
    // Also clear cache
    const cacheDir = './.wwebjs_cache';
    if (fs.existsSync(cacheDir)) {
        try {
            fs.rmSync(cacheDir, { recursive: true, force: true, maxRetries: 3 });
            console.log('🗑️ Cache cleared');
        } catch (e) {
            console.warn('Could not clear cache:', e.message);
        }
    }
    
    // Wait before reinitializing
    setTimeout(() => {
        initializeClient();
    }, 3000);
};

module.exports = {
    initializeClient,
    getStatus,
    sendMessage,
    logout,
    reset
};
