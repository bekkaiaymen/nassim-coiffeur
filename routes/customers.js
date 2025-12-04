const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const Customer = require('../models/Customer');
const User = require('../models/User');
const Business = require('../models/Business');
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');
const { protect, ensureTenant, addTenantFilter, checkLimit } = require('../middleware/auth');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer
const useCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

const storage = useCloudinary 
    ? multer.memoryStorage() 
    : multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            cb(null, uploadsDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'customer-' + uniqueSuffix + path.extname(file.originalname));
        }
    });

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

// Get all customers for a business (owner dashboard)
router.get('/business/:businessId', protect, async (req, res) => {
    try {
        const { businessId } = req.params;
        
        // Find all customers who have appointments with this business
        const appointments = await Appointment.find({ business: businessId })
            .distinct('customer');
        
        const customers = await Customer.find({ _id: { $in: appointments } })
            .select('name email phone loyaltyPoints createdAt');
        
        // Add appointments count for each customer
        const customersWithStats = await Promise.all(customers.map(async (customer) => {
            const appointmentsCount = await Appointment.countDocuments({
                business: businessId,
                customer: customer._id
            });
            
            return {
                ...customer.toObject(),
                appointmentsCount
            };
        }));

        res.json(customersWithStats);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب العملاء' });
    }
});

// Delete old accounts without password (admin endpoint)
router.delete('/cleanup-old-accounts', async (req, res) => {
    try {
        // Find users without password
        const usersWithoutPassword = await User.find({ 
            role: 'customer',
            password: { $exists: false } 
        });
        
        console.log(`Found ${usersWithoutPassword.length} old accounts without password`);
        
        // Delete customer profiles and users
        for (const user of usersWithoutPassword) {
            await Customer.deleteMany({ user: user._id });
            await User.deleteOne({ _id: user._id });
            console.log(`Deleted old account: ${user.phone}`);
        }
        
        res.json({
            success: true,
            message: `تم حذف ${usersWithoutPassword.length} حساب قديم`,
            count: usersWithoutPassword.length
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء التنظيف'
        });
    }
});

// Register new customer with followed businesses
router.post('/register', upload.single('photo'), async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        let followedBusinesses = [];
        
        try {
            followedBusinesses = JSON.parse(req.body.followedBusinesses || '[]');
        } catch (e) {
            console.error('Error parsing followedBusinesses:', e);
            // Fallback if it's already an array (e.g. from JSON request)
            if (Array.isArray(req.body.followedBusinesses)) {
                followedBusinesses = req.body.followedBusinesses;
            }
        }

        // Handle photo upload
        let photoUrl = null;
        if (req.file) {
            if (useCloudinary) {
                try {
                    const result = await new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'customer-profiles' },
                            (error, result) => {
                                if (error) reject(error);
                                else resolve(result);
                            }
                        );
                        uploadStream.end(req.file.buffer);
                    });
                    photoUrl = result.secure_url;
                } catch (uploadError) {
                    console.error('Cloudinary upload error:', uploadError);
                }
            } else {
                photoUrl = `/uploads/${req.file.filename}`;
            }
        }

        // Validate required fields
        if (!name || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء إدخال جميع الحقول المطلوبة'
            });
        }

        // Validate phone format
        const phoneRegex = /^(0[567]|[567])[0-9]{8}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'صيغة رقم الجوال غير صحيحة'
            });
        }

        // Check if phone already exists
        let existingUser = await User.findOne({ phone });
        if (existingUser) {
            // If user exists but has no password (old account), delete it and create new one
            if (!existingUser.password) {
                console.log('Deleting old account without password:', existingUser._id);
                
                // Delete all customer profiles for this user
                await Customer.deleteMany({ user: existingUser._id });
                
                // Delete the old user
                await User.deleteOne({ _id: existingUser._id });
                
                console.log('Old account deleted, will create new one');
                // Set to null so the code below creates a new user
                existingUser = null;
            } else {
                // User exists with password
                return res.status(400).json({
                    success: false,
                    message: 'رقم الجوال مسجل مسبقاً'
                });
            }
        }
        
        // If no existing user (or was deleted), proceed with registration

        // Check if email exists (if provided)
        if (email) {
            const existingEmail = await User.findOne({ email });
            if (existingEmail && existingEmail.phone !== phone) {
                return res.status(400).json({
                    success: false,
                    message: 'البريد الإلكتروني مسجل مسبقاً'
                });
            }
        }

        // Validate followed businesses
        if (!followedBusinesses || followedBusinesses.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء اختيار محل واحد على الأقل للمتابعة'
            });
        }

        // Create user account for customer (password will be hashed by pre-save middleware)
        const user = await User.create({
            name,
            email: email || `customer_${phone}@smartbiz.com`,
            phone,
            password,
            role: 'customer',
            avatar: photoUrl // Save photo URL
        });

        // Create customer profiles for each followed business
        const customerProfiles = [];
        for (const businessId of followedBusinesses) {
            try {
                // Get business and tenant info
                const business = await Business.findById(businessId);
                if (!business) {
                    console.log(`Business not found: ${businessId}`);
                    continue;
                }

                // Ensure tenant exists or create a default one
                let tenantId = business.tenant;
                if (!tenantId) {
                    console.log(`No tenant for business ${businessId}, using business ID as tenant`);
                    tenantId = business._id;
                }

                // Create customer profile
                const customer = await Customer.create({
                    tenant: tenantId,
                    business: businessId,
                    user: user._id,
                    name,
                    phone,
                    email: email || undefined,
                    status: 'active',
                    photo: photoUrl // Save photo URL
                });

                customerProfiles.push({
                    businessId,
                    businessName: business.businessName,
                    customerId: customer._id
                });
            } catch (error) {
                console.error(`Error creating customer profile for business ${businessId}:`, error);
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user._id, 
                role: user.role,
                phone: user.phone 
            },
            process.env.JWT_SECRET || 'smartbiz-secret-2025',
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            message: 'تم التسجيل بنجاح',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    phone: user.phone,
                    email: user.email,
                    role: user.role
                },
                customerProfiles,
                token
            }
        });

    } catch (error) {
        console.error('Customer registration error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في التسجيل'
        });
    }
});

// Customer login
router.post('/login', async (req, res) => {
    try {
        const { phone, email, password } = req.body;

        console.log('Login attempt:', { phone, email, hasPassword: !!password });

        if ((!phone && !email) || !password) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء إدخال رقم الجوال أو البريد الإلكتروني وكلمة المرور'
            });
        }

        // Build query - search by phone or email
        // Note: We check role='customer' OR we allow business owners who are also customers
        let query = {};
        if (email && email.includes('@')) {
            query.email = email;
            console.log('Searching by email:', email);
        } else if (phone) {
            query.phone = phone;
            console.log('Searching by phone:', phone);
        }

        // Find user - first try as customer, then as any role
        let user = await User.findOne({ ...query, role: 'customer' });
        
        // If not found as customer, check if user exists with other role
        if (!user) {
            user = await User.findOne(query);
            if (user && user.role !== 'customer') {
                console.log('User found with different role:', user.role);
                return res.status(401).json({
                    success: false,
                    message: 'هذا البريد مسجل كـ ' + (user.role === 'business_owner' ? 'صاحب محل' : 'موظف') + '. الرجاء استخدام صفحة تسجيل الدخول المناسبة'
                });
            }
        }
        
        if (!user) {
            console.log('User not found with query:', query);
            return res.status(401).json({
                success: false,
                message: 'البيانات غير صحيحة'
            });
        }

        console.log('User found:', { id: user._id, phone: user.phone, email: user.email, hasPassword: !!user.password });

        // Check if user has password
        if (!user.password) {
            console.log('User has no password:', user._id);
            return res.status(401).json({
                success: false,
                message: 'هذا الحساب تم إنشاؤه بطريقة قديمة. الرجاء التسجيل مرة أخرى من صفحة التسجيل'
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password mismatch for user:', user._id);
            return res.status(401).json({
                success: false,
                message: 'كلمة المرور غير صحيحة'
            });
        }

        console.log('Login successful for user:', user._id);

        // Get customer's followed businesses
        const customerProfiles = await Customer.find({ user: user._id })
            .populate('business', 'businessName businessType subdomain')
            .select('business loyaltyPoints totalVisits');

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user._id, 
                role: user.role,
                phone: user.phone 
            },
            process.env.JWT_SECRET || 'smartbiz-secret-2025',
            { expiresIn: '30d' }
        );

        // Check if customer follows nassim business
        const nassimBusinessId = '69259331651b1babc1eb83dc';
        const followsNassim = customerProfiles.some(profile => 
            profile.business && profile.business._id.toString() === nassimBusinessId
        );

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    phone: user.phone,
                    email: user.email,
                    role: user.role
                },
                followedBusinesses: customerProfiles,
                followsNassim,
                token
            }
        });

    } catch (error) {
        console.error('Customer login error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تسجيل الدخول'
        });
    }
});

// Public route for old customer phone login (no auth required)
router.get('/public/login', async (req, res) => {
    try {
        const { phone } = req.query;
        
        if (!phone) {
            return res.status(400).json({ success: false, message: 'رقم الجوال مطلوب' });
        }

        const customer = await Customer.findOne({ phone });

        if (!customer) {
            return res.status(404).json({ success: false, message: 'رقم الجوال غير مسجل في النظام' });
        }

        res.json({ success: true, data: [customer] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Public route to get customer data by phone (no auth required)
router.get('/public/profile', async (req, res) => {
    console.log('📥 /public/profile endpoint called');
    console.log('📥 Headers:', req.headers.authorization ? 'Has Authorization' : 'No Authorization');
    try {
        // Check if using token authentication
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const jwt = require('jsonwebtoken');
            const User = require('../models/User');
            
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartbiz-secret-2025');
                const userId = decoded.id || decoded.userId;
                
                console.log('🔍 Decoded token userId:', userId);
                console.log('🔍 Token payload:', decoded);
                
                // البحث عن User أولاً للحصول على المعلومات الحقيقية
                const user = await User.findById(userId);
                
                console.log('👤 Found user:', user ? {
                    id: user._id,
                    name: user.name,
                    phone: user.phone,
                    email: user.email
                } : 'NOT FOUND');
                
                if (!user) {
                    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
                }
                
                // البحث عن Customer مرتبط بهذا User
                let customer = await Customer.findOne({ user: userId });
                
                console.log('🔍 Found customer:', customer ? {
                    id: customer._id,
                    name: customer.name,
                    phone: customer.phone,
                    user: customer.user
                } : 'NOT FOUND');
                
                if (customer) {
                    // التحقق من أن معلومات Customer تطابق User
                    if (customer.phone !== user.phone || customer.name !== user.name) {
                        console.log('⚠️ Customer data mismatch, updating...');
                        customer.name = user.name;
                        customer.phone = user.phone;
                        customer.email = user.email;
                        await customer.save();
                    }
                    return res.json({ success: true, data: customer });
                }
                
                // إنشاء customer جديد من بيانات User
                console.log('➕ Creating new customer from user data');
                customer = await Customer.create({
                    user: user._id,
                    tenant: user.tenant || user.business,
                    name: user.name,
                    phone: user.phone,
                    email: user.email,
                    loyaltyPoints: 0,
                    totalVisits: 0
                });
                
                console.log('✅ Created customer:', {
                    id: customer._id,
                    name: customer.name,
                    phone: customer.phone
                });
                
                return res.json({ success: true, data: customer });
            } catch (err) {
                console.error('❌ Profile error:', err);
                return res.status(401).json({ success: false, message: 'انتهت صلاحية الجلسة' });
            }
        }
        
        // Fallback to phone query
        const { phone } = req.query;
        
        if (!phone) {
            return res.status(400).json({ success: false, message: 'رقم الجوال مطلوب' });
        }

        const customer = await Customer.findOne({ phone });

        if (!customer) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        res.json({ success: true, count: 1, data: [customer] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Public route to update customer profile (no tenant middleware)
router.put('/public/profile/:id', upload.single('photo'), async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'غير مصرح. يرجى تسجيل الدخول' });
        }
        
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartbiz-secret-2025');
            
            // Find customer by ID and verify ownership
            const customer = await Customer.findOne({ 
                _id: req.params.id,
                user: decoded.id 
            });
            
            if (!customer) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'غير مصرح لك بتحديث هذا الملف الشخصي' 
                });
            }
            
            // Handle photo upload
            if (req.file) {
                let photoUrl = null;
                if (useCloudinary) {
                    try {
                        const result = await new Promise((resolve, reject) => {
                            const uploadStream = cloudinary.uploader.upload_stream(
                                { folder: 'customer-profiles' },
                                (error, result) => {
                                    if (error) reject(error);
                                    else resolve(result);
                                }
                            );
                            uploadStream.end(req.file.buffer);
                        });
                        photoUrl = result.secure_url;
                    } catch (uploadError) {
                        console.error('Cloudinary upload error:', uploadError);
                    }
                } else {
                    photoUrl = `/uploads/${req.file.filename}`;
                }
                
                if (photoUrl) {
                    customer.photo = photoUrl;
                    // Also update user avatar
                    await User.findByIdAndUpdate(decoded.id, { avatar: photoUrl });
                }
            }

            // Update customer fields
            const { name, phone, email, address } = req.body;
            if (name) customer.name = name;
            if (phone) customer.phone = phone;
            if (email) customer.email = email;
            if (address) customer.address = address;
            
            await customer.save();
            
            return res.json({ 
                success: true, 
                message: 'تم تحديث بيانات الملف الشخصي',
                data: customer 
            });
        } catch (err) {
            return res.status(401).json({ success: false, message: 'انتهت صلاحية الجلسة' });
        }
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Apply middleware to all protected routes
router.use(protect);
router.use(ensureTenant);

// Get all customers
router.get('/', async (req, res) => {
    try {
        const { status, search, phone } = req.query;
        let query = addTenantFilter(req, {});

        if (status) query.status = status;
        if (phone) query.phone = phone;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const customers = await Customer.find(query).sort({ totalSpent: -1 });

        res.json({ success: true, count: customers.length, data: customers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
    try {
        const query = addTenantFilter(req, { _id: req.params.id });
        const customer = await Customer.findOne(query);

        if (!customer) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        // Get customer appointments and invoices within tenant
        const tenantQuery = addTenantFilter(req, { customerId: customer._id });
        const appointments = await Appointment.find(tenantQuery)
            .sort({ date: -1 })
            .limit(10);

        const invoices = await Invoice.find(tenantQuery)
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({ 
            success: true, 
            data: {
                customer,
                recentAppointments: appointments,
                recentInvoices: invoices
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get customer by phone
router.get('/phone/:phone', async (req, res) => {
    try {
        const customer = await Customer.findOne({ phone: req.params.phone });

        if (!customer) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        res.json({ success: true, data: customer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create new customer
router.post('/', async (req, res) => {
    try {
        const customer = await Customer.create(req.body);

        res.status(201).json({ 
            success: true, 
            message: 'تم إضافة العميل بنجاح',
            data: customer 
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: 'رقم الجوال مسجل مسبقاً' 
            });
        }
        res.status(400).json({ success: false, message: error.message });
    }
});

// Update customer
router.put('/:id', async (req, res) => {
    try {
        // Check if request is from customer (has user field in token)
        if (req.user && !req.user.business) {
            // Customer updating their own profile
            const customer = await Customer.findOne({ 
                _id: req.params.id,
                user: req.user._id 
            });
            
            if (!customer) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'غير مصرح لك بتحديث هذا الملف الشخصي' 
                });
            }
            
            // Update customer
            Object.assign(customer, req.body);
            await customer.save();
            
            return res.json({ 
                success: true, 
                message: 'تم تحديث بيانات الملف الشخصي',
                data: customer 
            });
        }
        
        // Business updating customer (original behavior)
        const customer = await Customer.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!customer) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        res.json({ 
            success: true, 
            message: 'تم تحديث بيانات العميل',
            data: customer 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Add loyalty points
router.patch('/:id/loyalty', async (req, res) => {
    try {
        const { points } = req.body;
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        customer.loyaltyPoints += points;
        await customer.save();

        res.json({ 
            success: true, 
            message: 'تم إضافة النقاط بنجاح',
            data: customer 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete customer
router.delete('/:id', async (req, res) => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);

        if (!customer) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        res.json({ success: true, message: 'تم حذف العميل بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get customer statistics
router.get('/:id/stats', async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        const appointmentsCount = await Appointment.countDocuments({ 
            customerId: customer._id 
        });

        const completedAppointments = await Appointment.countDocuments({ 
            customerId: customer._id,
            status: 'completed'
        });

        const cancelledAppointments = await Appointment.countDocuments({ 
            customerId: customer._id,
            status: 'cancelled'
        });

        const totalSpent = await Invoice.aggregate([
            { $match: { customerId: customer._id } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);

        res.json({
            success: true,
            data: {
                totalAppointments: appointmentsCount,
                completedAppointments,
                cancelledAppointments,
                totalSpent: totalSpent[0]?.total || 0,
                loyaltyPoints: customer.loyaltyPoints
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;