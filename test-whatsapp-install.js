const whatsapp = require('whatsapp-web.js');
console.log('WhatsApp Web JS loaded successfully');
try {
    const client = new whatsapp.Client({
        authStrategy: new whatsapp.LocalAuth({ clientId: 'test' })
    });
    console.log('Client created successfully');
} catch (e) {
    console.error('Error creating client:', e);
}
