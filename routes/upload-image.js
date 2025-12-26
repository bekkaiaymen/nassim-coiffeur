const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('فقط ملفات الصور مسموح بها'));
        }
    }
});

/**
 * POST /api/upload-image
 * Upload image to Cloudinary
 * Accepts: multipart/form-data with image file
 * Returns: { success: true, url: cloudinary_url }
 */
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'لم يتم إرفاق صورة' 
            });
        }

        // Check if Cloudinary is configured
        if (!process.env.CLOUDINARY_CLOUD_NAME) {
            // Fallback: return a placeholder or save locally
            return res.status(200).json({
                success: true,
                url: '/placeholder-product.jpg',
                message: 'Cloudinary not configured, using placeholder'
            });
        }

        // Upload to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'nassim-products',
                resource_type: 'image',
                transformation: [
                    { width: 800, height: 800, crop: 'limit' },
                    { quality: 'auto:good' }
                ]
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'فشل رفع الصورة إلى Cloudinary',
                        error: error.message 
                    });
                }

                res.json({
                    success: true,
                    url: result.secure_url,
                    publicId: result.public_id
                });
            }
        );

        // Convert buffer to stream and pipe to Cloudinary
        const bufferStream = Readable.from(req.file.buffer);
        bufferStream.pipe(uploadStream);

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ أثناء رفع الصورة',
            error: error.message 
        });
    }
});

/**
 * POST /api/upload-image/search
 * Search for product image on internet using Unsplash API
 * Body: { productName: string }
 * Returns: { success: true, url: image_url }
 */
router.post('/search', async (req, res) => {
    try {
        const { productName } = req.body;

        if (!productName) {
            return res.status(400).json({ 
                success: false, 
                message: 'اسم المنتج مطلوب' 
            });
        }

        // Use Unsplash API for free high-quality images
        const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || 'demo';
        
        // Search query - translate common Arabic terms to English
        const searchQuery = translateProductName(productName);

        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=squarish`,
            {
                headers: {
                    'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Unsplash API request failed');
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const imageUrl = data.results[0].urls.regular;
            
            res.json({
                success: true,
                url: imageUrl,
                source: 'unsplash',
                warning: 'هذه الصورة من الإنترنت قد لا تطابق المنتج تماماً'
            });
        } else {
            res.json({
                success: false,
                message: 'لم يتم العثور على صورة مطابقة'
            });
        }

    } catch (error) {
        console.error('Image search error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'فشل البحث عن الصورة',
            error: error.message 
        });
    }
});

/**
 * Helper function to translate Arabic product names to English for better search results
 */
function translateProductName(arabicName) {
    const translations = {
        'شامبو': 'shampoo hair product',
        'جل': 'hair gel styling',
        'واكس': 'hair wax',
        'بومادة': 'pomade hair',
        'زيت': 'hair oil',
        'كريم': 'hair cream',
        'لحية': 'beard care product',
        'ماكينة': 'hair clipper',
        'مقص': 'scissors barber',
        'فرشاة': 'hair brush',
        'مشط': 'hair comb'
    };

    let searchTerm = arabicName.toLowerCase();
    
    // Replace Arabic words with English equivalents
    for (const [arabic, english] of Object.entries(translations)) {
        if (searchTerm.includes(arabic)) {
            searchTerm = searchTerm.replace(arabic, english);
        }
    }

    // If still mostly Arabic, use generic term based on detection
    if (/[\u0600-\u06FF]/.test(searchTerm)) {
        if (searchTerm.includes('شعر')) return 'hair care product';
        if (searchTerm.includes('لحية')) return 'beard care product';
        return 'barber shop product';
    }

    return searchTerm;
}

module.exports = router;
