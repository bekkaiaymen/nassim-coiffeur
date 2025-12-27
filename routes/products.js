const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, ensureTenant } = require('../middleware/auth');

// Test route
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Products API is working' });
});

// Get all products for a business
router.get('/business/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const { category, inStock, search } = req.query;
        
        const query = { business: businessId };
        
        if (category) query.category = category;
        if (inStock !== undefined) query.inStock = inStock === 'true';
        if (search) {
            query.$text = { $search: search };
        }
        
        const products = await Product.find(query)
            .sort({ createdAt: -1 });
        
        res.json({ success: true, data: products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
        }
        
        res.json({ success: true, data: product });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create new product
router.post('/', protect, async (req, res) => {
    try {
        const {
            business,
            name,
            description,
            category,
            purchasePrice,
            sellingPrice,
            stockQuantity,
            brand,
            barcode,
            sku
        } = req.body;
        
        // Validation
        if (!business || !name || purchasePrice === undefined || sellingPrice === undefined) {
            return res.status(400).json({
                success: false,
                message: 'المعلومات الأساسية مطلوبة (business, name, purchasePrice, sellingPrice)'
            });
        }
        
        // Check for duplicate SKU or Barcode
        if (sku) {
            const existingSKU = await Product.findOne({ business, sku });
            if (existingSKU) {
                return res.status(400).json({
                    success: false,
                    message: 'رمز المنتج (SKU) موجود بالفعل'
                });
            }
        }
        
        if (barcode) {
            const existingBarcode = await Product.findOne({ business, barcode });
            if (existingBarcode) {
                return res.status(400).json({
                    success: false,
                    message: 'الباركود موجود بالفعل'
                });
            }
        }
        
        const product = await Product.create({
            tenant: business,
            business,
            name,
            description,
            category: category || 'other',
            purchasePrice,
            sellingPrice,
            stockQuantity: stockQuantity || 0,
            inStock: (stockQuantity || 0) > 0,
            brand,
            barcode,
            sku
        });
        
        res.status(201).json({
            success: true,
            data: product,
            message: 'تم إضافة المنتج بنجاح'
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update product
router.put('/:id', protect, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
        }
        
        // Update fields
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                product[key] = req.body[key];
            }
        });
        
        // Update inStock based on stockQuantity
        if (req.body.stockQuantity !== undefined) {
            product.inStock = req.body.stockQuantity > 0;
        }
        
        await product.save();
        
        res.json({
            success: true,
            data: product,
            message: 'تم تحديث المنتج بنجاح'
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete product
router.delete('/:id', protect, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
        }
        
        await product.deleteOne();
        
        res.json({
            success: true,
            message: 'تم حذف المنتج بنجاح'
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update stock quantity
router.patch('/:id/stock', protect, async (req, res) => {
    try {
        const { quantity, operation } = req.body; // operation: 'add' or 'subtract'
        
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
        }
        
        if (operation === 'add') {
            product.stockQuantity += quantity;
        } else if (operation === 'subtract') {
            product.stockQuantity = Math.max(0, product.stockQuantity - quantity);
        } else {
            product.stockQuantity = quantity;
        }
        
        product.inStock = product.stockQuantity > 0;
        await product.save();
        
        res.json({
            success: true,
            data: product,
            message: 'تم تحديث المخزون بنجاح'
        });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get low stock products
router.get('/business/:businessId/low-stock', async (req, res) => {
    try {
        const { businessId } = req.params;
        
        const products = await Product.find({
            business: businessId,
            inStock: true,
            $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] }
        }).sort({ stockQuantity: 1 });
        
        res.json({ success: true, data: products });
    } catch (error) {
        console.error('Error fetching low stock products:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get product statistics
router.get('/business/:businessId/stats', async (req, res) => {
    try {
        const { businessId } = req.params;
        
        const products = await Product.find({ business: businessId });
        
        const stats = {
            totalProducts: products.length,
            inStock: products.filter(p => p.inStock).length,
            outOfStock: products.filter(p => !p.inStock).length,
            lowStock: products.filter(p => p.inStock && p.stockQuantity <= p.lowStockThreshold).length,
            totalValue: products.reduce((sum, p) => sum + (p.purchasePrice * p.stockQuantity), 0),
            potentialRevenue: products.reduce((sum, p) => sum + (p.sellingPrice * p.stockQuantity), 0),
            totalSold: products.reduce((sum, p) => sum + (p.stats?.totalSold || 0), 0),
            totalRevenue: products.reduce((sum, p) => sum + (p.stats?.totalRevenue || 0), 0),
            totalProfit: products.reduce((sum, p) => sum + (p.stats?.totalProfit || 0), 0)
        };
        
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error fetching product stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
