const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

// Register customer for specific business (nassim)
router.post('/register-customer', async (req, res) => {
    try {
        const { name, email, phone, password, business } = req.body;

        if (!name || !phone || !password || !business) {
            return res.status(400).json({ 
                success: false, 
                message: 'الاسم ورقم الجوال وكلمة المرور مطلوبة' 
            });
        }

        // Check if phone exists
        const phoneExists = await User.findOne({ phone });
        if (phoneExists) {
            return res.status(400).json({ 
                success: false, 
                message: 'رقم الجوال مسجل مسبقاً' 
            });
        }

        // Check email if provided
        if (email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'البريد الإلكتروني مسجل مسبقاً' 
                });
            }
        }

        const user = await User.create({
            name,
            email: email || undefined,
            phone,
            password,
            role: 'customer',
            business: business,
            tenant: business
        });

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'تم التسجيل بنجاح',
            token,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Register customer error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Register user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ 
                success: false, 
                message: 'البريد الإلكتروني مسجل مسبقاً' 
            });
        }

        const user = await User.create({
            name,
            email,
            password,
            phone,
            role: role || 'staff'
        });

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'تم التسجيل بنجاح',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user._id);

        // Get business info to check if it's nassim
        const Business = require('../models/Business');
        let redirectUrl = null;
        
        if (user.business) {
            const business = await Business.findById(user.business);
            if (business && business.businessName === 'nassim') {
                redirectUrl = '/nassim';
            }
        }

        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            redirectUrl,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                business: user.business,
                token
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get current user (me)
router.get('/me', async (req, res) => {
    try {
        // Extract token from header
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'غير مصرح لك' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        
        // Get user from database
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'المستخدم غير موجود' 
            });
        }

        res.json({ 
            success: true, 
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: 'غير مصرح لك' 
        });
    }
});

// Get user profile with business info
router.get('/profile', async (req, res) => {
    try {
        // Extract token from header
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'غير مصرح لك' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        
        // Get user from database with business populated
        const user = await User.findById(decoded.id)
            .select('-password')
            .populate('business', 'name phone email address businessHours status');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'المستخدم غير موجود' 
            });
        }

        res.json({ 
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                avatar: user.avatar,
                business: user.business
            },
            business: user.business
        });
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: 'غير مصرح لك' 
        });
    }
});

// Get all users
router.get('/', async (req, res) => {
    try {
        const { role, status } = req.query;
        let query = {};

        if (role) query.role = role;
        if (status) query.status = status;

        const users = await User.find(query).select('-password');

        res.json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        res.json({ 
            success: true, 
            message: 'تم تحديث البيانات بنجاح',
            data: user 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Fix user tenant field (temporary endpoint)
router.post('/fix-tenant', async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }
        
        console.log('Before fix:', {
            name: user.name,
            email: user.email,
            tenant: user.tenant,
            business: user.business
        });
        
        if (user.business) {
            user.tenant = user.business;
            await user.save();
            
            console.log('After fix:', {
                tenant: user.tenant,
                business: user.business
            });
            
            return res.json({ 
                success: true, 
                message: 'تم إصلاح الحساب بنجاح',
                data: {
                    name: user.name,
                    email: user.email,
                    tenant: user.tenant,
                    business: user.business
                }
            });
        } else {
            return res.status(400).json({ 
                success: false, 
                message: 'المستخدم ليس لديه business' 
            });
        }
    } catch (error) {
        console.error('Fix tenant error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Reset password (temporary endpoint)
router.post('/reset-password-temp', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }
        
        // Update password (pre-save hook will hash it)
        user.password = newPassword;
        await user.save();
        
        return res.json({ 
            success: true, 
            message: 'تم تغيير كلمة المرور بنجاح',
            data: {
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;