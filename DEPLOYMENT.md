# دليل نشر المشروع - SmartBiz SaaS Platform 🚀

## نظرة عامة
هذا الدليل يشرح كيفية نشر منصة SmartBiz SaaS على خدمات الاستضافة السحابية. المشروع يدعم:
- ✅ Render.com (مجاني للبداية)
- ✅ Railway.app (مجاني مع $5 شهرياً)
- ✅ أي خدمة تدعم Node.js + MongoDB

---

## 📋 المتطلبات الأساسية

### 1. حساب MongoDB Atlas (قاعدة البيانات)
- سجّل حساب مجاني على [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- أنشئ Cluster جديد (Free Tier كافي للبداية)
- احصل على **Connection String** من شكل:
  ```
  mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
  ```

### 2. حساب Stripe (نظام الدفع)
- سجّل حساب على [Stripe](https://stripe.com)
- احصل على:
  - **Publishable Key** (يبدأ بـ `pk_`)
  - **Secret Key** (يبدأ بـ `sk_`)
  - **Webhook Secret** (يبدأ بـ `whsec_`) - سنحصل عليه بعد النشر

### 3. إنشاء خطط الاشتراك في Stripe
قبل النشر، يجب إنشاء 3 Products في Stripe Dashboard:

#### خطة Basic (99 ريال/شهر)
1. اذهب إلى Stripe Dashboard → Products → Add Product
2. Name: `Basic Plan`
3. Price: `99 SAR` (أو `26.4 USD`)
4. Recurring: Monthly
5. احفظ الـ **Price ID** (يبدأ بـ `price_`)

#### خطة Pro (249 ريال/شهر)
1. نفس الخطوات
2. Name: `Pro Plan`
3. Price: `249 SAR` (أو `66.4 USD`)
4. احفظ الـ **Price ID**

#### خطة Enterprise (599 ريال/شهر)
1. نفس الخطوات
2. Name: `Enterprise Plan`
3. Price: `599 SAR` (أو `159.7 USD`)
4. احفظ الـ **Price ID**

---

## 🚀 طريقة النشر 1: Render.com (موصى به)

### الخطوات:

#### 1. رفع الكود إلى GitHub
```bash
# في مجلد المشروع
git init
git add .
git commit -m "Initial commit - SmartBiz SaaS Platform"

# إنشاء repository جديد على GitHub ثم:
git remote add origin https://github.com/your-username/smartbiz.git
git branch -M main
git push -u origin main
```

#### 2. إنشاء Web Service على Render
1. اذهب إلى [Render Dashboard](https://dashboard.render.com/)
2. اضغط **New** → **Web Service**
3. اربط GitHub repository الخاص بك
4. اختر المشروع **smartbiz**

#### 3. إعدادات Web Service
```yaml
Name: smartbiz-api
Region: Frankfurt (أقرب منطقة للسعودية)
Branch: main
Runtime: Node
Build Command: npm install
Start Command: npm start
Plan: Free (أو Starter للإنتاج)
```

#### 4. Environment Variables (متغيرات البيئة)
أضف المتغيرات التالية في **Environment** tab:

```bash
NODE_ENV=production
PORT=10000

# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smartbiz?retryWrites=true&w=majority

# JWT Secret (اصنع كلمة سر قوية)
JWT_SECRET=your_super_secure_random_string_here_min_32_chars

# Stripe Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (سنضيفه لاحقاً)

# Frontend URL (ضع رابط Render الخاص بك)
FRONTEND_URL=https://smartbiz-api.onrender.com
```

#### 5. Deploy
- اضغط **Create Web Service**
- انتظر 3-5 دقائق حتى يكتمل البناء
- سيكون الموقع متاح على: `https://smartbiz-api.onrender.com`

#### 6. تشغيل Seed Script (تعبئة البيانات)
بعد نجاح Deploy، افتح **Shell** من Render Dashboard:
```bash
node seed.js
```

#### 7. إعداد Stripe Webhook
1. اذهب إلى Stripe Dashboard → Developers → Webhooks
2. اضغط **Add Endpoint**
3. ضع الرابط: `https://smartbiz-api.onrender.com/api/payments/stripe-webhook`
4. اختر Events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. احفظ الـ **Signing Secret** (يبدأ بـ `whsec_`)
6. أضفه في Environment Variables:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
7. أعد Deploy (Manual Deploy من Render Dashboard)

#### 8. تحديث خطط الاشتراك في قاعدة البيانات
افتح **Shell** مرة أخرى:
```bash
node
```
```javascript
const mongoose = require('mongoose');
const SubscriptionPlan = require('./models/SubscriptionPlan');

mongoose.connect(process.env.MONGODB_URI);

// تحديث خطة Basic
await SubscriptionPlan.findOneAndUpdate(
  { slug: 'basic' },
  { stripe_price_id: 'price_... من Stripe' }
);

// تحديث خطة Pro
await SubscriptionPlan.findOneAndUpdate(
  { slug: 'pro' },
  { stripe_price_id: 'price_... من Stripe' }
);

// تحديث خطة Enterprise
await SubscriptionPlan.findOneAndUpdate(
  { slug: 'enterprise' },
  { stripe_price_id: 'price_... من Stripe' }
);

process.exit();
```

---

## 🚂 طريقة النشر 2: Railway.app

### الخطوات:

#### 1. رفع الكود إلى GitHub (نفس الخطوات أعلاه)

#### 2. إنشاء مشروع على Railway
1. اذهب إلى [Railway Dashboard](https://railway.app/)
2. اضغط **New Project**
3. اختر **Deploy from GitHub repo**
4. اختر المشروع **smartbiz**

#### 3. إضافة MongoDB
Railway يوفر MongoDB مدمج:
1. في المشروع، اضغط **New** → **Database** → **Add MongoDB**
2. سيتم إنشاء قاعدة بيانات تلقائياً
3. احصل على `MONGO_URL` من **Variables** tab

#### 4. Environment Variables
```bash
NODE_ENV=production

# MongoDB (من Railway)
MONGODB_URI=${{MONGO_URL}}

# JWT Secret
JWT_SECRET=your_super_secure_random_string_here_min_32_chars

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend URL (سيظهر بعد Deploy)
FRONTEND_URL=${{RAILWAY_STATIC_URL}}
```

#### 5. Deploy
- Railway سيبدأ Deploy تلقائياً
- انتظر 2-3 دقائق
- الموقع سيكون على: `https://smartbiz-production.up.railway.app`

#### 6. تشغيل Seed + إعداد Stripe Webhook
نفس الخطوات من Render أعلاه (6-8)

---

## 🧪 اختبار المشروع بعد النشر

### 1. اختبار API
```bash
# Health Check
curl https://your-app.onrender.com/

# Login كـ Super Admin
curl -X POST https://your-app.onrender.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@smartbiz.com",
    "password": "123456"
  }'
```

### 2. اختبار لوحة التحكم
افتح المتصفح:
```
https://your-app.onrender.com/dashboard
```
سجّل دخول بـ:
- **Basic Tenant Owner:**
  - Email: `owner@alnujoom.com`
  - Password: `123456`
  
- **Pro Tenant Owner:**
  - Email: `owner@alanaka.com`
  - Password: `123456`

### 3. اختبار صفحة الحجز
```
https://your-app.onrender.com/book?tenant=salon-alanaka
```

### 4. اختبار Stripe Checkout
1. سجّل دخول لأي tenant
2. اذهب إلى **الاشتراك**
3. اضغط **اشترك الآن**
4. استخدم بطاقة اختبار Stripe:
   - Card: `4242 4242 4242 4242`
   - Date: أي تاريخ مستقبلي
   - CVC: أي 3 أرقام
   - ZIP: أي رقم

---

## 🔒 أمان الإنتاج (مهم جداً!)

### 1. تغيير كلمات المرور الافتراضية
بعد النشر مباشرة، سجّل دخول وغيّر:
```javascript
// Super Admin Password
// Business Owners Passwords
// Employees Passwords
```

### 2. JWT Secret قوي
```bash
# اصنع JWT Secret عشوائي (32+ حرف)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. CORS في Production
في `server.js`، حدّث:
```javascript
const cors = require('cors');
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-domain.com',
  credentials: true
}));
```

### 4. Rate Limiting
أضف في `server.js`:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 5. Helmet (HTTP Headers Security)
```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## 📊 مراقبة الأداء

### Render Monitoring
- اذهب إلى **Metrics** tab
- راقب:
  - CPU Usage
  - Memory Usage
  - Response Time

### MongoDB Atlas Monitoring
- اذهب إلى **Monitoring** tab
- راقب:
  - Connections
  - Operations per second
  - Storage size

### Stripe Dashboard
- راقب:
  - Successful payments
  - Failed payments
  - Active subscriptions

---

## 🔄 تحديث المشروع

### على Render
```bash
# محلياً
git add .
git commit -m "Update: feature description"
git push origin main

# Render سيُحدّث تلقائياً
```

### على Railway
نفس الخطوات - Railway يراقب GitHub تلقائياً

---

## 🐛 حل المشاكل الشائعة

### 1. "Cannot connect to MongoDB"
**الحل:**
- تأكد من صحة `MONGODB_URI`
- تأكد من Network Access في MongoDB Atlas (اسمح بـ `0.0.0.0/0`)

### 2. "Stripe webhook signature verification failed"
**الحل:**
- تأكد من صحة `STRIPE_WEBHOOK_SECRET`
- تأكد من أن Webhook URL صحيح في Stripe Dashboard

### 3. "App keeps restarting"
**الحل:**
- افحص Logs في Render/Railway
- تأكد من أن `PORT` متغير صحيح
- تأكد من أن جميع Dependencies في `package.json`

### 4. "CORS Error on Frontend"
**الحل:**
```javascript
// في server.js
app.use(cors({
  origin: '*', // للتطوير فقط
  credentials: true
}));
```

---

## 📝 Checklist قبل الإطلاق

- [ ] MongoDB Atlas متصل ويعمل
- [ ] Stripe Keys صحيحة (Live Mode)
- [ ] Stripe Webhook مفعّل ويستقبل Events
- [ ] 3 Subscription Plans منشأة في Stripe
- [ ] `stripe_price_id` محدّث لكل خطة في قاعدة البيانات
- [ ] `seed.js` تم تشغيله بنجاح
- [ ] كلمات المرور الافتراضية تم تغييرها
- [ ] لوحة التحكم تعمل (`/dashboard`)
- [ ] صفحة الحجز تعمل (`/book?tenant=...`)
- [ ] Stripe Checkout يعمل
- [ ] JWT Secret قوي ومميز
- [ ] Environment Variables كلها صحيحة
- [ ] CORS مضبوط للإنتاج
- [ ] Logs تعمل بدون أخطاء

---

## 🎉 بعد الإطلاق

### روابط مهمة:
```bash
# API Base URL
https://your-app.onrender.com/api

# لوحة التحكم
https://your-app.onrender.com/dashboard

# صفحة الحجز (لكل tenant)
https://your-app.onrender.com/book?tenant=salon-slug

# Stripe Dashboard
https://dashboard.stripe.com/

# MongoDB Atlas
https://cloud.mongodb.com/
```

### تواصل مع العملاء:
1. أعطهم رابط لوحة التحكم
2. أعطهم بيانات تسجيل الدخول
3. أعطهم رابط صفحة الحجز الخاصة بهم
4. وضّح كيفية الاشتراك في خطة مدفوعة

---

## 🚀 التوسع المستقبلي

### Upgrade Plans:
- **Render:** Free → Starter ($7/mo) → Standard ($25/mo)
- **Railway:** Free → Hobby ($5/mo) → Pro ($20/mo)
- **MongoDB Atlas:** Free → Shared ($9/mo) → Dedicated ($57/mo)

### إضافة Domain مخصص:
1. اشترِ Domain (Namecheap, GoDaddy)
2. في Render/Railway: Settings → Custom Domain
3. أضف DNS Records:
   ```
   Type: CNAME
   Name: @
   Value: your-app.onrender.com
   ```

---

## 📞 الدعم الفني

### مصادر مفيدة:
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app/)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Stripe Docs](https://stripe.com/docs)

### Community:
- Render Discord: https://discord.gg/render
- Railway Discord: https://discord.gg/railway

---

## ✅ خلاصة سريعة

1. ✅ رفع الكود إلى GitHub
2. ✅ إنشاء MongoDB Atlas Cluster
3. ✅ إنشاء Stripe Products + Price IDs
4. ✅ Deploy على Render/Railway
5. ✅ إضافة Environment Variables
6. ✅ تشغيل `seed.js`
7. ✅ إعداد Stripe Webhook
8. ✅ تحديث `stripe_price_id` في قاعدة البيانات
9. ✅ تغيير كلمات المرور الافتراضية
10. ✅ اختبار شامل للنظام

---

**🎊 مبروك! المشروع الآن جاهز للإنتاج والاستخدام الفعلي 🎊**

للأسئلة أو المشاكل: افتح Issue على GitHub أو تواصل مع الدعم الفني.
