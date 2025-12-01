const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Auth middleware
const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'لا يوجد رمز مصادقة' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'رمز المصادقة غير صالح' });
    }
};

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage (use memory for Cloudinary)
const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY;

console.log('📸 Cloudinary status:', useCloudinary ? '✅ Enabled' : '❌ Disabled (using local storage)');
if (useCloudinary) {
    console.log('☁️  Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
}

const storage = useCloudinary 
    ? multer.memoryStorage() // Store in memory for Cloudinary upload
    : multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadsDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
        }
    });

// File filter to accept only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('يرجى رفع صورة فقط (JPEG, JPG, PNG, GIF, WEBP)'));
    }
};

// Multer upload configuration
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    },
    fileFilter: fileFilter
});

// POST /api/upload/image - Upload image
router.post('/image', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'لم يتم رفع أي صورة' });
        }

        let imageUrl;

        if (useCloudinary) {
            // Upload to Cloudinary
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'nassim-products',
                    resource_type: 'image',
                    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        return res.status(500).json({ message: 'فشل رفع الصورة إلى السحابة' });
                    }
                    imageUrl = result.secure_url;
                    res.json({
                        message: 'تم رفع الصورة بنجاح',
                        imageUrl: imageUrl
                    });
                }
            );
            uploadStream.end(req.file.buffer);
        } else {
            // Local storage fallback
            imageUrl = `/uploads/${req.file.filename}`;
            res.json({
                message: 'تم رفع الصورة بنجاح',
                imageUrl: imageUrl
            });
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ message: 'حدث خطأ أثناء رفع الصورة' });
    }
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)' });
        }
        return res.status(400).json({ message: 'خطأ في رفع الملف: ' + error.message });
    }
    if (error) {
        return res.status(400).json({ message: error.message });
    }
    next();
});

module.exports = router;
