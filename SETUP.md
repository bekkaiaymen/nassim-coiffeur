# تعليمات التشغيل - SmartBiz AI

## المتطلبات الأساسية

قبل البدء، تأكد من تثبيت:
- **Node.js** (الإصدار 16 أو أحدث)
- **MongoDB** (الإصدار 4.4 أو أحدث)

## خطوات التشغيل

### 1. تثبيت MongoDB

#### على Windows:
```powershell
# تحميل MongoDB من الموقع الرسمي
# https://www.mongodb.com/try/download/community

# أو استخدام Chocolatey
choco install mongodb

# تشغيل MongoDB
mongod
```

#### أو استخدام MongoDB Atlas (Cloud):
- سجل حساب مجاني على https://www.mongodb.com/cloud/atlas
- أنشئ Cluster جديد
- احصل على Connection String
- عدّل ملف `.env` واستبدل `MONGODB_URI`

### 2. تثبيت المكتبات

```powershell
npm install
```

### 3. تعبئة قاعدة البيانات (اختياري)

```powershell
npm run seed
```

هذا الأمر سيضيف:
- 4 مستخدمين (مدير و3 حلاقين)
- 6 خدمات
- 5 عملاء
- 6 مواعيد
- 4 فواتير

**بيانات تسجيل الدخول:**
- البريد: `admin@smartbiz.com`
- كلمة المرور: `123456`

### 4. تشغيل الخادم

```powershell
# للتطوير (مع إعادة التشغيل التلقائي)
npm run dev

# أو للإنتاج
npm start
```

### 5. فتح المتصفح

افتح المتصفح على: `http://localhost:3000`

## هيكل المشروع

```
smartbiz-ai/
├── models/              # نماذج قاعدة البيانات
│   ├── Appointment.js
│   ├── Customer.js
│   ├── Invoice.js
│   ├── Service.js
│   └── User.js
├── routes/              # مسارات API
│   ├── appointments.js
│   ├── customers.js
│   ├── invoices.js
│   ├── services.js
│   ├── users.js
│   ├── stats.js
│   └── ai.js
├── index.html          # واجهة المستخدم
├── styles.css          # التنسيقات
├── script.js           # البرمجة التفاعلية
├── server.js           # الخادم الرئيسي
├── seed.js             # بيانات تجريبية
├── package.json
└── .env                # إعدادات البيئة
```

## API Endpoints

### المواعيد (Appointments)
- `GET /api/appointments` - جلب جميع المواعيد
- `POST /api/appointments` - إنشاء موعد جديد
- `GET /api/appointments/:id` - جلب موعد محدد
- `PUT /api/appointments/:id` - تحديث موعد
- `DELETE /api/appointments/:id` - حذف موعد

### الفواتير (Invoices)
- `GET /api/invoices` - جلب جميع الفواتير
- `POST /api/invoices` - إنشاء فاتورة جديدة
- `GET /api/invoices/:id` - جلب فاتورة محددة
- `PUT /api/invoices/:id` - تحديث فاتورة

### العملاء (Customers)
- `GET /api/customers` - جلب جميع العملاء
- `POST /api/customers` - إضافة عميل جديد
- `GET /api/customers/:id` - جلب عميل محدد
- `PUT /api/customers/:id` - تحديث بيانات عميل

### الخدمات (Services)
- `GET /api/services` - جلب جميع الخدمات
- `POST /api/services` - إضافة خدمة جديدة
- `PUT /api/services/:id` - تحديث خدمة

### المستخدمين (Users)
- `POST /api/users/register` - تسجيل مستخدم جديد
- `POST /api/users/login` - تسجيل الدخول
- `GET /api/users` - جلب جميع المستخدمين

### الإحصائيات (Stats)
- `GET /api/stats/dashboard` - إحصائيات لوحة التحكم
- `GET /api/stats/revenue` - إحصائيات الإيرادات
- `GET /api/stats/appointments` - إحصائيات المواعيد
- `GET /api/stats/customers` - إحصائيات العملاء

### الذكاء الاصطناعي (AI)
- `POST /api/ai/chat` - محادثة مع الذكاء الاصطناعي
- `POST /api/ai/book` - حجز موعد عبر AI
- `GET /api/ai/suggestions` - اقتراحات AI

## المميزات المتاحة

✅ **حجز المواعيد**
- حجز مواعيد جديدة
- تحديث وإلغاء المواعيد
- منع التعارض في المواعيد
- قائمة انتظار

✅ **إدارة الفواتير**
- إصدار فواتير إلكترونية
- حساب الضريبة تلقائياً (15%)
- أرقام فواتير تلقائية
- تقارير الإيرادات

✅ **نظام العملاء**
- قاعدة بيانات للعملاء
- سجل الزيارات
- نقاط الولاء
- تفضيلات العملاء

✅ **الذكاء الاصطناعي**
- ردود ذكية على الاستفسارات
- حجز تلقائي
- اقتراحات مخصصة
- متاح 24/7

✅ **لوحة التحكم**
- إحصائيات في الوقت الفعلي
- رسوم بيانية تفاعلية
- تقارير تفصيلية
- تحليل الأداء

## استكشاف الأخطاء

### خطأ في الاتصال بـ MongoDB
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**الحل:** تأكد من تشغيل MongoDB:
```powershell
mongod
```

### خطأ في المنفذ
```
Error: listen EADDRINUSE: address already in use :::3000
```
**الحل:** غيّر المنفذ في ملف `.env`:
```
PORT=3001
```

### خطأ في تثبيت المكتبات
```powershell
# امسح مجلد node_modules وأعد التثبيت
Remove-Item -Recurse -Force node_modules
npm install
```

## التطوير المستقبلي

- [ ] تكامل WhatsApp API
- [ ] إشعارات SMS
- [ ] تطبيق موبايل
- [ ] نظام الدفع الإلكتروني
- [ ] تقارير PDF
- [ ] نسخ احتياطي تلقائي
- [ ] نظام الصلاحيات المتقدم
- [ ] واجهة إدارة متقدمة

## الدعم

لأي استفسارات أو مساعدة:
- البريد: support@smartbiz-ai.com
- الموقع: www.smartbiz-ai.com

---

**تم التطوير بـ ❤️ في السعودية**