const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'اسم المنتج مطلوب'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        enum: ['hair-care', 'beard-care', 'styling', 'tools', 'other'],
        default: 'other'
    },
    // الأسعار
    purchasePrice: {
        type: Number,
        required: [true, 'سعر الشراء مطلوب'],
        min: 0
    },
    sellingPrice: {
        type: Number,
        required: [true, 'سعر البيع مطلوب'],
        min: 0
    },
    // المخزون
    inStock: {
        type: Boolean,
        default: true
    },
    stockQuantity: {
        type: Number,
        default: 0,
        min: 0
    },
    lowStockThreshold: {
        type: Number,
        default: 5,
        min: 0
    },
    // الصور
    images: [{
        type: String
    }],
    mainImage: {
        type: String
    },
    // معلومات إضافية
    brand: {
        type: String,
        trim: true
    },
    barcode: {
        type: String,
        trim: true,
        unique: true,
        sparse: true
    },
    sku: {
        type: String,
        trim: true,
        unique: true,
        sparse: true
    },
    // إحصائيات
    stats: {
        totalSold: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        totalProfit: { type: Number, default: 0 }
    },
    // حالة المنتج
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    // ملاحظات
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Indexes
productSchema.index({ business: 1, category: 1 });
productSchema.index({ business: 1, name: 'text', description: 'text' });
productSchema.index({ business: 1, inStock: 1 });

// Virtual للربح
productSchema.virtual('profit').get(function() {
    return this.sellingPrice - this.purchasePrice;
});

// Virtual لنسبة الربح
productSchema.virtual('profitMargin').get(function() {
    if (this.purchasePrice === 0) return 0;
    return ((this.sellingPrice - this.purchasePrice) / this.purchasePrice * 100).toFixed(2);
});

// Virtual للمخزون المنخفض
productSchema.virtual('isLowStock').get(function() {
    return this.inStock && this.stockQuantity <= this.lowStockThreshold;
});

// Middleware: تحديث SKU تلقائياً
productSchema.pre('save', function(next) {
    if (!this.sku) {
        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.sku = `PRD-${randomSuffix}`;
    }
    next();
});

// تأكد من إرجاع virtuals في JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
