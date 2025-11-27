// API Configuration for Production
// استخدم هذا الملف لتحديث جميع روابط API في المشروع

// تطوير محلي
const DEV_API_URL = 'http://localhost:3000';

// إنتاج (Production) - عدّل هذا بعد رفع Backend إلى Render
const PROD_API_URL = 'https://nassim-backend.onrender.com';

// اختيار تلقائي حسب البيئة
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? DEV_API_URL 
    : PROD_API_URL;

// تصدير للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_BASE_URL };
}

console.log('🌐 API URL:', API_BASE_URL);
