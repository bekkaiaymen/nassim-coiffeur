// WhatsApp Desktop Integration
// Uses the WhatsApp Desktop app that's already installed and logged in

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Send message using WhatsApp Desktop app
 * Opens the chat in the installed WhatsApp Desktop application
 */
const sendMessageViaDesktop = async (phone, message) => {
    try {
        // Format phone number
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        
        // Handle Algerian numbers
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '213' + cleanPhone.substring(1);
        }
        if (!cleanPhone.startsWith('213')) {
            cleanPhone = '213' + cleanPhone;
        }

        // Encode message for URL
        const encodedMessage = encodeURIComponent(message);
        
        // WhatsApp Desktop protocol URL
        const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
        
        // Open in WhatsApp Desktop (Windows command)
        await execPromise(`start "" "${whatsappUrl}"`);
        
        console.log(`📱 Opened chat for ${cleanPhone} in WhatsApp Desktop`);
        
        return {
            success: true,
            phone: cleanPhone,
            method: 'desktop'
        };
        
    } catch (error) {
        console.error('Error opening WhatsApp Desktop:', error);
        throw error;
    }
};

/**
 * Check if WhatsApp Desktop is installed and running
 */
const checkDesktopApp = async () => {
    try {
        // Check if WhatsApp.exe is running
        const { stdout } = await execPromise('tasklist /FI "IMAGENAME eq WhatsApp.exe"');
        const isRunning = stdout.includes('WhatsApp.exe');
        
        return {
            installed: true,
            running: isRunning,
            status: isRunning ? 'ready' : 'installed_not_running'
        };
    } catch (error) {
        return {
            installed: false,
            running: false,
            status: 'not_installed'
        };
    }
};

/**
 * Launch WhatsApp Desktop app
 */
const launchDesktopApp = async () => {
    try {
        // Try common WhatsApp Desktop installation paths
        const paths = [
            `${process.env.LOCALAPPDATA}\\WhatsApp\\WhatsApp.exe`,
            `${process.env.APPDATA}\\WhatsApp\\WhatsApp.exe`,
            'C:\\Program Files\\WhatsApp\\WhatsApp.exe'
        ];
        
        for (const path of paths) {
            try {
                await execPromise(`start "" "${path}"`);
                console.log('✅ WhatsApp Desktop launched');
                return true;
            } catch (e) {
                continue;
            }
        }
        
        throw new Error('WhatsApp Desktop not found');
    } catch (error) {
        console.error('Failed to launch WhatsApp Desktop:', error);
        return false;
    }
};

module.exports = {
    sendMessageViaDesktop,
    checkDesktopApp,
    launchDesktopApp
};
