# SmartBiz AI - API Testing

هذا الملف يحتوي على أمثلة لاختبار جميع API endpoints

## تشغيل الاختبارات

يمكنك استخدام أي من:
- PowerShell
- cURL
- Postman
- Insomnia

## 1. تسجيل الدخول

```powershell
$body = @{
    email = "admin@smartbiz.com"
    password = "123456"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/users/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.data.token
Write-Host "Token: $token"
```

## 2. حجز موعد جديد

```powershell
$body = @{
    customerName = "أحمد محمد"
    customerPhone = "0551234567"
    service = "حلاقة كاملة"
    date = "2025-11-22"
    time = "15:00"
    barber = "محمد"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/appointments" -Method POST -Body $body -ContentType "application/json"
```

## 3. جلب جميع المواعيد

```powershell
# جميع المواعيد
Invoke-RestMethod -Uri "http://localhost:3000/api/appointments" -Method GET

# مواعيد اليوم
$today = Get-Date -Format "yyyy-MM-dd"
Invoke-RestMethod -Uri "http://localhost:3000/api/appointments?date=$today" -Method GET

# مواعيد موظف محدد
Invoke-RestMethod -Uri "http://localhost:3000/api/appointments?barber=محمد" -Method GET
```

## 4. إنشاء فاتورة

```powershell
$body = @{
    customerName = "سعيد أحمد"
    customerPhone = "0551234568"
    items = @(
        @{ service = "حلاقة كاملة"; price = 50; quantity = 1 }
        @{ service = "تشذيب لحية"; price = 30; quantity = 1 }
    )
    paymentMethod = "cash"
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3000/api/invoices" -Method POST -Body $body -ContentType "application/json"
```

## 5. جلب العملاء

```powershell
# جميع العملاء
Invoke-RestMethod -Uri "http://localhost:3000/api/customers" -Method GET

# البحث عن عميل
Invoke-RestMethod -Uri "http://localhost:3000/api/customers?search=أحمد" -Method GET

# عميل محدد برقم الجوال
Invoke-RestMethod -Uri "http://localhost:3000/api/customers/phone/0551234567" -Method GET
```

## 6. محادثة مع الذكاء الاصطناعي

```powershell
$body = @{
    message = "أريد حجز موعد"
    customerPhone = "0551234567"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/ai/chat" -Method POST -Body $body -ContentType "application/json"
```

## 7. إحصائيات لوحة التحكم

```powershell
# إحصائيات عامة
Invoke-RestMethod -Uri "http://localhost:3000/api/stats/dashboard" -Method GET

# إحصائيات الإيرادات
Invoke-RestMethod -Uri "http://localhost:3000/api/stats/revenue" -Method GET

# إحصائيات المواعيد
Invoke-RestMethod -Uri "http://localhost:3000/api/stats/appointments" -Method GET

# إحصائيات العملاء
Invoke-RestMethod -Uri "http://localhost:3000/api/stats/customers" -Method GET
```

## 8. إدارة الخدمات

```powershell
# جلب جميع الخدمات
Invoke-RestMethod -Uri "http://localhost:3000/api/services" -Method GET

# إضافة خدمة جديدة
$body = @{
    name = "ماسك للشعر"
    category = "spa"
    price = 80
    duration = 40
    available = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/services" -Method POST -Body $body -ContentType "application/json"
```

## 9. تحديث موعد

```powershell
# احصل على ID الموعد أولاً
$appointments = Invoke-RestMethod -Uri "http://localhost:3000/api/appointments" -Method GET
$appointmentId = $appointments.data[0]._id

# تحديث الحالة
$body = @{
    status = "completed"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/appointments/$appointmentId" -Method PUT -Body $body -ContentType "application/json"
```

## 10. إلغاء موعد

```powershell
$appointmentId = "YOUR_APPOINTMENT_ID"
Invoke-RestMethod -Uri "http://localhost:3000/api/appointments/$appointmentId/cancel" -Method PATCH
```

## اختبار شامل

```powershell
# سكريبت اختبار شامل
Write-Host "🧪 بدء الاختبارات..." -ForegroundColor Green

# 1. تسجيل الدخول
Write-Host "`n1️⃣ اختبار تسجيل الدخول..."
$loginBody = @{
    email = "admin@smartbiz.com"
    password = "123456"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/users/login" -Method POST -Body $loginBody -ContentType "application/json"
Write-Host "✅ تم تسجيل الدخول: $($loginResponse.data.name)" -ForegroundColor Green

# 2. جلب الإحصائيات
Write-Host "`n2️⃣ اختبار جلب الإحصائيات..."
$stats = Invoke-RestMethod -Uri "http://localhost:3000/api/stats/dashboard" -Method GET
Write-Host "✅ مواعيد اليوم: $($stats.data.todayAppointments)" -ForegroundColor Green
Write-Host "✅ إيرادات اليوم: $($stats.data.todayRevenue) ر.س" -ForegroundColor Green

# 3. حجز موعد
Write-Host "`n3️⃣ اختبار حجز موعد..."
$bookingBody = @{
    customerName = "عميل تجريبي"
    customerPhone = "0559999999"
    service = "حلاقة كاملة"
    date = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
    time = "14:00"
    barber = "محمد"
} | ConvertTo-Json

$booking = Invoke-RestMethod -Uri "http://localhost:3000/api/appointments" -Method POST -Body $bookingBody -ContentType "application/json"
Write-Host "✅ تم حجز الموعد بنجاح" -ForegroundColor Green

# 4. إنشاء فاتورة
Write-Host "`n4️⃣ اختبار إنشاء فاتورة..."
$invoiceBody = @{
    customerName = "عميل تجريبي"
    customerPhone = "0559999999"
    items = @(
        @{ service = "حلاقة كاملة"; price = 50; quantity = 1 }
    )
    paymentMethod = "cash"
} | ConvertTo-Json -Depth 3

$invoice = Invoke-RestMethod -Uri "http://localhost:3000/api/invoices" -Method POST -Body $invoiceBody -ContentType "application/json"
Write-Host "✅ تم إنشاء الفاتورة: $($invoice.data.invoiceNumber)" -ForegroundColor Green

# 5. اختبار الذكاء الاصطناعي
Write-Host "`n5️⃣ اختبار الذكاء الاصطناعي..."
$aiBody = @{
    message = "ما هي أسعاركم؟"
} | ConvertTo-Json

$aiResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/ai/chat" -Method POST -Body $aiBody -ContentType "application/json"
Write-Host "✅ رد الذكاء الاصطناعي: $($aiResponse.data.message.Substring(0, 50))..." -ForegroundColor Green

Write-Host "`n✅ جميع الاختبارات نجحت!" -ForegroundColor Green
```

## نصائح للاختبار

1. **تأكد من تشغيل الخادم أولاً:**
   ```powershell
   npm start
   ```

2. **استخدم Postman لواجهة رسومية:**
   - استيراد المجموعة من: https://www.postman.com

3. **مراقبة السجلات:**
   - افتح نافذة منفصلة للسجلات
   - راقب الأخطاء في الوقت الفعلي

4. **اختبار الأداء:**
   ```powershell
   # اختبار تحميل
   1..100 | ForEach-Object {
       Start-Job -ScriptBlock {
           Invoke-RestMethod -Uri "http://localhost:3000/api/stats/dashboard" -Method GET
       }
   }
   ```

## الأخطاء الشائعة

### خطأ 401
```
"message": "غير مصرح. يرجى تسجيل الدخول"
```
**الحل:** أضف token للرأس Authorization

### خطأ 400
```
"message": "هذا الموعد محجوز بالفعل"
```
**الحل:** اختر وقتاً مختلفاً

### خطأ 404
```
"message": "العميل غير موجود"
```
**الحل:** تأكد من صحة المعرف