const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use('/superadmin', express.static(path.join(__dirname, 'public/superadmin')));
app.use('/register', express.static(path.join(__dirname, 'public/register')));
app.use('/customer-register', express.static(path.join(__dirname, 'public/customer-register')));
app.use('/book-now', express.static(path.join(__dirname, 'public/book-now')));
app.use('/owner', express.static(path.join(__dirname, 'public/dashboard')));
app.use('/nassim', express.static(path.join(__dirname, 'public/nassim')));
app.use('/nassim-owner', express.static(path.join(__dirname, 'public/nassim-owner')));

// MongoDB Connection (optional - server will still run without it)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbiz', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('✅ MongoDB متصل بنجاح');
    
    // Server startup - database ready
    console.log('📊 قاعدة البيانات جاهزة للاستخدام');
})
.catch(err => {
    console.warn('⚠️ تحذير: لم يتم الاتصال بـ MongoDB - سيعمل الخادم بدون قاعدة بيانات');
    console.warn('   السبب:', err.message);
});

// Routes
const appointmentRoutes = require('./routes/appointments');
const invoiceRoutes = require('./routes/invoices');
const customerRoutes = require('./routes/customers');
const userRoutes = require('./routes/users');
const serviceRoutes = require('./routes/services');
const statsRoutes = require('./routes/stats');
const aiRoutes = require('./routes/ai');
const tenantRoutes = require('./routes/tenants');
const planRoutes = require('./routes/plans');
const businessRoutes = require('./routes/businesses');
const subscriptionRoutes = require('./routes/subscriptions');
const paymentRoutes = require('./routes/payments');
const superadminRoutes = require('./routes/superadmin');
const messageRoutes = require('./routes/messages');
const reviewRoutes = require('./routes/reviews');
const favoriteRoutes = require('./routes/favorites');
const notificationRoutes = require('./routes/notifications');
const employeeRoutes = require('./routes/employees');
const postRoutes = require('./routes/posts');
const rewardRoutes = require('./routes/rewards');
const commentRoutes = require('./routes/comments');
const reactionRoutes = require('./routes/reactions');
const settingsRoutes = require('./routes/settings');

app.use('/api/appointments', appointmentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', userRoutes); // Auth routes (login, register)
app.use('/api/services', serviceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/settings', settingsRoutes);

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'index.html'));
});

app.get('/dashboard-pro', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'dashboard-pro.html'));
});

app.get('/book', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'book', 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login', 'index.html'));
});

app.get('/customer-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'customer-login', 'index.html'));
});

app.get('/customer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'customer', 'index.html'));
});

app.get('/superadmin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'superadmin-login', 'index.html'));
});

app.get('/superadmin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'superadmin', 'index.html'));
});

app.get('/customer-register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'customer-register', 'index.html'));
});

app.get('/customer-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'customer-login', 'index.html'));
});

app.get('/nassim', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'nassim', 'index.html'));
});

app.get('/book-now', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'book-now', 'index.html'));
});

app.get('/owner', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'appointments.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'حدث خطأ في الخادم',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler - only for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'المسار غير موجود' 
    });
});

// For other routes, return 404 page or redirect
app.use((req, res) => {
    res.status(404).send('<h1>404 - الصفحة غير موجودة</h1><p><a href="/">العودة للصفحة الرئيسية</a></p>');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
    console.log(`🌐 افتح المتصفح على: http://localhost:${PORT}`);
});

module.exports = app;