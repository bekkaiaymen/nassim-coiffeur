const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const P = require('pino');

let sock;
let qrCodeData = null;
let isReady = false;
let isInitializing = false;

const logger = P({ level: 'silent' }); // Silent to avoid console spam

const initializeClient = async () => {
    if (isInitializing || isReady) return;
    
    isInitializing = true;
    console.log('🔄 Initializing Baileys WhatsApp Client...');

    try {
        const { state, saveCreds } = await useMultiFileAuthState('./baileys_auth');

        sock = makeWASocket({
            auth: state,
            logger,
            printQRInTerminal: false,
            browser: ['Nassim Salon', 'Chrome', '120.0.0']
        });

        // QR Code Event
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('📱 QR Code received');
                try {
                    qrCodeData = await qrcode.toDataURL(qr);
                } catch (err) {
                    console.error('Error generating QR:', err);
                }
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('❌ Connection closed. Reconnecting:', shouldReconnect);
                
                isReady = false;
                qrCodeData = null;
                isInitializing = false;

                if (shouldReconnect) {
                    setTimeout(() => initializeClient(), 3000);
                }
            } else if (connection === 'open') {
                console.log('✅ Baileys WhatsApp Client is ready!');
                isReady = true;
                qrCodeData = null;
                isInitializing = false;
            }
        });

        // Save credentials on update
        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error('Error initializing Baileys:', error);
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
    if (!isReady || !sock) throw new Error('WhatsApp client is not ready');

    // Format phone number
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    
    // Handle Algerian numbers
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '213' + cleanPhone.substring(1);
    }
    if (!cleanPhone.startsWith('213')) {
        cleanPhone = '213' + cleanPhone;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;

    try {
        await sock.sendMessage(jid, { text: message });
        return { success: true };
    } catch (error) {
        console.error(`Error sending message to ${cleanPhone}:`, error);
        throw error;
    }
};

const logout = async () => {
    if (sock) {
        try {
            await sock.logout();
        } catch (e) {
            console.error('Logout error:', e);
        }
        isReady = false;
        qrCodeData = null;
        isInitializing = false;
    }
};

const reset = async () => {
    console.log('🔄 Resetting Baileys Client...');
    
    isReady = false;
    qrCodeData = null;
    isInitializing = false;
    
    if (sock) {
        try {
            await sock.logout();
        } catch (e) {
            console.log('Already logged out');
        }
        sock = null;
    }
    
    // Delete auth folder
    const fs = require('fs');
    const authDir = './baileys_auth';
    if (fs.existsSync(authDir)) {
        try {
            fs.rmSync(authDir, { recursive: true, force: true });
            console.log('🗑️ Auth data cleared');
        } catch (e) {
            console.warn('Could not clear auth:', e.message);
        }
    }
    
    setTimeout(() => {
        initializeClient();
    }, 2000);
};

module.exports = {
    initializeClient,
    getStatus,
    sendMessage,
    logout,
    reset
};
