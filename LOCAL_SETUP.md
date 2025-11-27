# 🖥️ دليل التشغيل المحلي - SmartBiz SaaS

## المتطلبات الأساسية

### 1️⃣ تثبيت Node.js
- نزّل وثبّت من: https://nodejs.org/
- النسخة الموصى بها: **v18 أو أحدث**
- تحقق من التثبيت:
```powershell
node --version
npm --version
```

### 2️⃣ تثبيت MongoDB (اختر أحد الخيارين)

**الخيار A: MongoDB Atlas (سحابي - موصى به)**
1. سجّل حساب مجاني على: https://www.mongodb.com/cloud/atlas
2. أنشئ Cluster مجاني
3. اضغط **Connect** → **Connect your application**
4. انسخ Connection String
5. استبدله في ملف `.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smartbiz?retryWrites=true&w=majority
```

**الخيار B: MongoDB محلي**
1. نزّل من: https://www.mongodb.com/try/download/community
2. ثبّت MongoDB Community Edition
3. شغّل MongoDB Service:
```powershell
# يجب أن يكون MongoDB مثبّت كـ Windows Service
net start MongoDB
```
4. استخدم في `.env`:
```
MONGODB_URI=mongodb://localhost:27017/smartbiz
```

---

## 🚀 خطوات التشغيل

### 1. إنشاء ملف .env
انسخ `.env.example` إلى `.env`:
```powershell
Copy-Item .env.example .env
```

### 2. تعديل ملف .env
افتح `.env` في محرر نصوص وتأكد من:
- ✅ `MONGODB_URI` صحيح (Atlas أو محلي)
- ✅ `PORT=3000` (أو أي port آخر)
- ✅ `JWT_SECRET` موجود (للتطوير المحلي القيمة الموجودة كافية)

### 3. تثبيت الحزم المطلوبة
```powershell
npm install
```
هذا سيثبت جميع Dependencies المطلوبة.

### 4. تعبئة قاعدة البيانات ببيانات تجريبية
```powershell
npm run seed
```
هذا سيُنشئ:
- ✅ 3 خطط اشتراك (Basic, Pro, Enterprise)
- ✅ 3 متاجر تجريبية
- ✅ مستخدمين (owners + موظفين)
- ✅ خدمات ومواعيد وعملاء

### 5. تشغيل السيرفر
```powershell
npm start
```
أو للتطوير مع auto-reload:
```powershell
npm run dev
```

السيرفر سيعمل على: **http://localhost:3000**

---

## 🧪 اختبار المشروع

### 1️⃣ اختبار API (Health Check)
افتح المتصفح:
```
http://localhost:3000/
```
يجب أن ترى: `SmartBiz AI API is running`

### 2️⃣ اختبار لوحة التحكم
افتح المتصفح:
```
http://localhost:3000/dashboard
```

سجّل دخول بأحد الحسابات التجريبية:

**🟡 Basic Tenant (صالون النجوم):**
- Email: `owner@alnujoom.com`
- Password: `123456`

**🟢 Pro Tenant (صالون الأناقة):**
- Email: `owner@alanaka.com`
- Password: `123456`

**🔵 Enterprise Tenant (صالونات الفخامة):**
- Email: `owner@alfakhamah.com`
- Password: `123456`

### 3️⃣ اختبار صفحة الحجز
افتح المتصفح:
```
http://localhost:3000/book?tenant=salon-alanaka
```
جرّب حجز موعد كعميل (بدون تسجيل دخول).

### 4️⃣ اختبار API مباشرة (PowerShell)
```powershell
# Test Login
Invoke-RestMethod -Uri "http://localhost:3000/api/users/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"owner@alanaka.com","password":"123456"}'
```

---

## 📂 بنية المشروع

```
e:\test\
├── server.js              # نقطة الدخول الرئيسية
├── package.json           # Dependencies والـ scripts
├── .env                   # متغيرات البيئة (أنشئه من .env.example)
├── seed.js                # ملف تعبئة البيانات التجريبية
├── models/                # Mongoose Schemas
│   ├── User.js
│   ├── Tenant.js
│   ├── Appointment.js
│   ├── Customer.js
│   └── ...
├── routes/                # API Routes
│   ├── appointments.js
│   ├── customers.js
│   ├── payments.js
│   └── ...
├── middleware/            # Authentication & Authorization
│   └── auth.js
└── public/                # Frontend Files
    ├── dashboard/         # لوحة تحكم صاحب المتجر
    │   ├── index.html
    │   ├── dashboard.css
    │   └── dashboard.js
    └── book/              # صفحة حجز العميل
        ├── index.html
        ├── booking.css
        └── booking.js
```

---

## 🔧 أوامر مفيدة

### إيقاف السيرفر
اضغط `Ctrl + C` في PowerShell

### مسح قاعدة البيانات وإعادة تعبئتها
```powershell
npm run seed
```

### التحقق من أن MongoDB يعمل (إذا كان محلي)
```powershell
mongosh --eval "db.version()"
```

### عرض جميع Tenants في قاعدة البيانات
```powershell
mongosh smartbiz --eval "db.tenants.find().pretty()"
```

---

## 🐛 حل المشاكل

### مشكلة: Cannot connect to MongoDB
**الحل:**
- إذا كنت تستخدم MongoDB محلي:
  ```powershell
  net start MongoDB
  ```
- إذا كنت تستخدم Atlas: تأكد من صحة Connection String في `.env`

### مشكلة: Port 3000 already in use
**الحل:**
- غيّر الـ PORT في `.env`:
  ```
  PORT=3001
  ```
- أو أغلق البرنامج الذي يستخدم port 3000:
  ```powershell
  netstat -ano | findstr :3000
  taskkill /PID <PID_NUMBER> /F
  ```

### مشكلة: npm install فشل
**الحل:**
```powershell
# امسح cache ثم أعد التثبيت
npm cache clean --force
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### مشكلة: seed.js يعطي خطأ
**الحل:**
- تأكد من أن MongoDB متصل ويعمل
- تحقق من أن `MONGODB_URI` صحيح في `.env`
- جرّب مسح البيانات القديمة:
  ```powershell
  mongosh smartbiz --eval "db.dropDatabase()"
  npm run seed
  ```

---

## 🔒 ملاحظات أمان (للتطوير المحلي فقط)

### ⚠️ لا تستخدم هذه الإعدادات في الإنتاج:
- JWT_SECRET ضعيف (استخدم سر قوي في production)
- كلمات مرور افتراضية (123456) - غيّرها في production
- CORS مفتوح لكل المصادر - حدّده في production

### 🔐 لإنشاء JWT Secret قوي (للإنتاج):
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📊 اختبار Stripe (اختياري)

إذا أردت اختبار نظام الدفع محلياً:

### 1. احصل على Stripe Test Keys
1. سجّل على: https://dashboard.stripe.com/register
2. اذهب إلى: Developers → API keys
3. انسخ **Test mode** keys:
   - Publishable key
   - Secret key

### 2. أضفها في .env
```
STRIPE_SECRET_KEY=sk_test_...
```

### 3. ثبّت Stripe CLI (لاختبار Webhooks)
```powershell
# نزّل من: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/payments/stripe-webhook
```

### 4. انسخ Webhook Secret
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 5. جرّب الدفع
- سجّل دخول لأي tenant
- اذهب إلى **الاشتراك**
- استخدم بطاقة Stripe الاختبارية:
  - Card: `4242 4242 4242 4242`
  - Date: `12/34`
  - CVC: `123`

---

## 📝 API Endpoints الرئيسية

### Authentication
```
POST   /api/users/register       # تسجيل مستخدم جديد
POST   /api/users/login          # تسجيل الدخول
GET    /api/users/me             # معلومات المستخدم الحالي
```

### Tenants (المتاجر)
```
GET    /api/tenants              # جميع المتاجر (super admin)
POST   /api/tenants              # إنشاء متجر جديد
GET    /api/tenants/current      # المتجر الحالي
PUT    /api/tenants/current      # تحديث إعدادات المتجر
```

### Appointments (المواعيد)
```
GET    /api/appointments         # جميع المواعيد
POST   /api/appointments         # إنشاء موعد
GET    /api/appointments/:id     # موعد محدد
PUT    /api/appointments/:id     # تحديث موعد
DELETE /api/appointments/:id     # حذف موعد
```

### Customers (العملاء)
```
GET    /api/customers            # جميع العملاء
POST   /api/customers            # إضافة عميل
GET    /api/customers/:id        # عميل محدد
PUT    /api/customers/:id        # تحديث عميل
DELETE /api/customers/:id        # حذف عميل
```

### Services (الخدمات)
```
GET    /api/services             # جميع الخدمات
POST   /api/services             # إضافة خدمة
PUT    /api/services/:id         # تحديث خدمة
DELETE /api/services/:id         # حذف خدمة
```

### Payments (المدفوعات)
```
POST   /api/payments/create-checkout-session    # إنشاء جلسة دفع
POST   /api/payments/create-billing-portal      # لوحة إدارة الاشتراك
GET    /api/payments/subscription                # الاشتراك الحالي
GET    /api/payments/history                     # سجل المدفوعات
```

### Stats (الإحصائيات)
```
GET    /api/stats/dashboard      # إحصائيات لوحة التحكم
GET    /api/stats/revenue        # إحصائيات الإيرادات
GET    /api/stats/customers      # إحصائيات العملاء
```

---

## 🎉 نصائح التطوير

### استخدم VS Code مع الإضافات:
- REST Client (لاختبار API)
- MongoDB for VS Code
- Thunder Client (بديل Postman)

### Auto-reload أثناء التطوير:
```powershell
npm run dev
```

### تتبع Logs:
```powershell
# السيرفر يطبع logs مفيدة:
# ✅ Connected to MongoDB
# 🚀 Server running on port 3000
# 💳 Stripe webhook received
```

---

## 📚 المزيد من الوثائق

- **DEPLOYMENT.md** - دليل النشر على الإنتاج (Render/Railway)
- **PROJECT_SUMMARY.md** - ملخص شامل للمشروع
- **README.md** - نظرة عامة

---

## ✅ Checklist قبل البدء

- [ ] Node.js مثبّت (v18+)
- [ ] MongoDB يعمل (Atlas أو محلي)
- [ ] ملف `.env` تم إنشاؤه من `.env.example`
- [ ] `MONGODB_URI` محدّث في `.env`
- [ ] `npm install` تم تنفيذه بنجاح
- [ ] `npm run seed` تم تنفيذه بنجاح
- [ ] السيرفر يعمل على `http://localhost:3000`
- [ ] لوحة التحكم تفتح على `/dashboard`
- [ ] صفحة الحجز تفتح على `/book?tenant=...`

---

**🎊 مبروك! المشروع الآن يعمل على جهازك المحلي! 🎊**

لأي أسئلة أو مشاكل، راجع قسم "حل المشاكل" أعلاه.
