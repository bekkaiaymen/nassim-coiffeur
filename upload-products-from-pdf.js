const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mongoose = require('mongoose');
const Product = require('./models/Product');

// Database connection
require('dotenv').config();
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nassim-db');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

/**
 * استخراج معلومات المنتجات من ملف PDF
 * يدعم صيغ مختلفة:
 * - اسم المنتج | السعر
 * - اسم المنتج - السعر
 * - اسم المنتج: السعر
 */
async function extractProductsFromPDF(pdfPath) {
    console.log('📄 Reading PDF file:', pdfPath);
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    
    console.log('📝 Total pages:', pdfData.numpages);
    console.log('📝 Extracting text...\n');
    
    const text = pdfData.text;
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    const products = [];
    
    // محاولة استخراج المنتجات باستخدام أنماط مختلفة
    for (let line of lines) {
        line = line.trim();
        
        // تخطي العناوين والخطوط الفارغة
        if (line.length < 3 || 
            line.toLowerCase().includes('product') || 
            line.toLowerCase().includes('price') ||
            line.toLowerCase().includes('منتج') ||
            line.toLowerCase().includes('سعر')) {
            continue;
        }
        
        // Pattern 1: Name | Price (e.g., "شامبو للشعر | 500")
        let match = line.match(/^(.+?)\s*\|\s*(\d+(?:\.\d+)?)/);
        
        // Pattern 2: Name - Price (e.g., "شامبو للشعر - 500")
        if (!match) {
            match = line.match(/^(.+?)\s*-\s*(\d+(?:\.\d+)?)/);
        }
        
        // Pattern 3: Name: Price (e.g., "شامبو للشعر: 500")
        if (!match) {
            match = line.match(/^(.+?):\s*(\d+(?:\.\d+)?)/);
        }
        
        // Pattern 4: Name followed by number (e.g., "شامبو للشعر 500")
        if (!match) {
            match = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
        }
        
        // Pattern 5: Price followed by name (e.g., "500 شامبو للشعر")
        if (!match) {
            match = line.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
            if (match) {
                // عكس الترتيب
                match = [match[0], match[2], match[1]];
            }
        }
        
        if (match) {
            const name = match[1].trim();
            const price = parseFloat(match[2]);
            
            // تحقق من صحة البيانات
            if (name.length > 2 && price > 0 && price < 100000) {
                products.push({
                    name: name,
                    purchasePrice: price,
                    sellingPrice: Math.round(price * 1.3), // هامش ربح 30%
                    description: `${name} - منتج أصلي`,
                    category: detectCategory(name),
                    inStock: true,
                    stockQuantity: 10
                });
            }
        }
    }
    
    console.log(`\n✅ Extracted ${products.length} products from PDF\n`);
    return products;
}

/**
 * تحديد فئة المنتج تلقائياً بناءً على الاسم
 */
function detectCategory(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('شامبو') || nameLower.includes('shampoo')) {
        return 'hair-care';
    }
    if (nameLower.includes('زيت') || nameLower.includes('oil')) {
        return 'hair-care';
    }
    if (nameLower.includes('كريم') || nameLower.includes('cream')) {
        return 'hair-care';
    }
    if (nameLower.includes('جل') || nameLower.includes('gel')) {
        return 'styling';
    }
    if (nameLower.includes('واكس') || nameLower.includes('wax')) {
        return 'styling';
    }
    if (nameLower.includes('بومادة') || nameLower.includes('pomade')) {
        return 'styling';
    }
    if (nameLower.includes('لحية') || nameLower.includes('beard')) {
        return 'beard-care';
    }
    if (nameLower.includes('ماكينة') || nameLower.includes('machine') || nameLower.includes('clipper')) {
        return 'tools';
    }
    if (nameLower.includes('مقص') || nameLower.includes('scissors')) {
        return 'tools';
    }
    if (nameLower.includes('فرشاة') || nameLower.includes('brush')) {
        return 'tools';
    }
    
    return 'other';
}

/**
 * رفع المنتجات إلى قاعدة البيانات
 */
async function uploadProductsToDB(products, businessId) {
    console.log(`🚀 Uploading ${products.length} products to database...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const productData of products) {
        try {
            // إضافة معلومات Business
            productData.business = businessId;
            productData.tenant = businessId;
            
            // التحقق من عدم وجود منتج بنفس الاسم
            const existing = await Product.findOne({
                business: businessId,
                name: { $regex: new RegExp(`^${productData.name}$`, 'i') }
            });
            
            if (existing) {
                console.log(`⚠️  منتج موجود بالفعل: ${productData.name}`);
                continue;
            }
            
            // إنشاء المنتج
            const product = await Product.create(productData);
            console.log(`✅ تم إضافة: ${product.name} - ${product.sellingPrice} دج`);
            successCount++;
            
        } catch (error) {
            console.error(`❌ خطأ في إضافة ${productData.name}:`, error.message);
            errorCount++;
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ تم بنجاح: ${successCount}`);
    console.log(`❌ فشل: ${errorCount}`);
    console.log(`📊 الإجمالي: ${products.length}`);
    console.log('='.repeat(50));
}

/**
 * الدالة الرئيسية
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║          🛍️  رفع المنتجات من PDF - Nassim Coiffeur           ║
╚════════════════════════════════════════════════════════════════╝

الاستخدام:
    node upload-products-from-pdf.js <ملف PDF> <Business ID>

مثال:
    node upload-products-from-pdf.js products.pdf 69259331651b1babc1eb83dc

الصيغ المدعومة في PDF:
    ✓ اسم المنتج | السعر
    ✓ اسم المنتج - السعر
    ✓ اسم المنتج: السعر
    ✓ اسم المنتج السعر
    ✓ السعر اسم المنتج

أمثلة:
    شامبو للشعر | 500
    جل تصفيف - 350
    زيت لحية: 800
    كريم الشعر 450
        `);
        process.exit(1);
    }
    
    const pdfPath = args[0];
    const businessId = args[1];
    
    // التحقق من وجود الملف
    if (!fs.existsSync(pdfPath)) {
        console.error(`❌ الملف غير موجود: ${pdfPath}`);
        process.exit(1);
    }
    
    // التحقق من امتداد الملف
    if (path.extname(pdfPath).toLowerCase() !== '.pdf') {
        console.error(`❌ الملف يجب أن يكون PDF`);
        process.exit(1);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🚀 بدء عملية رفع المنتجات');
    console.log('='.repeat(50) + '\n');
    
    try {
        // الاتصال بقاعدة البيانات
        await connectDB();
        
        // استخراج المنتجات من PDF
        const products = await extractProductsFromPDF(pdfPath);
        
        if (products.length === 0) {
            console.log('⚠️  لم يتم العثور على أي منتجات في PDF');
            console.log('💡 تأكد من أن الملف يحتوي على منتجات بالصيغة الصحيحة');
            process.exit(0);
        }
        
        // عرض عينة من المنتجات
        console.log('📋 عينة من المنتجات المستخرجة:');
        products.slice(0, 5).forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.name} - ${p.sellingPrice} دج (شراء: ${p.purchasePrice})`);
        });
        if (products.length > 5) {
            console.log(`   ... و ${products.length - 5} منتج آخر\n`);
        }
        
        // طلب تأكيد المستخدم
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        readline.question('هل تريد رفع هذه المنتجات؟ (y/n): ', async (answer) => {
            readline.close();
            
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                await uploadProductsToDB(products, businessId);
                console.log('\n✅ تمت العملية بنجاح!\n');
            } else {
                console.log('\n❌ تم الإلغاء\n');
            }
            
            process.exit(0);
        });
        
    } catch (error) {
        console.error('\n❌ حدث خطأ:', error);
        process.exit(1);
    }
}

// تشغيل البرنامج
if (require.main === module) {
    main();
}

module.exports = { extractProductsFromPDF, uploadProductsToDB };
