@echo off
chcp 65001 > nul
echo ========================================
echo    SmartBiz AI - نظام إدارة الأعمال
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js غير مثبت!
    echo يرجى تحميله من: https://nodejs.org
    pause
    exit /b 1
)

REM Check if MongoDB is running
echo 🔍 فحص MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  MongoDB غير مشغل!
    echo 🚀 محاولة تشغيل MongoDB...
    start "" mongod --dbpath="%CD%\data\db"
    timeout /t 3 >nul
)

REM Check if node_modules exists
if not exist "node_modules\" (
    echo 📦 تثبيت المكتبات...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ فشل تثبيت المكتبات
        pause
        exit /b 1
    )
)

REM Check if database is seeded
echo 🌱 فحص قاعدة البيانات...
echo هل تريد تعبئة قاعدة البيانات ببيانات تجريبية؟ (y/n)
set /p SEED_DB=
if /i "%SEED_DB%"=="y" (
    echo 🌱 تعبئة قاعدة البيانات...
    call npm run seed
)

echo.
echo ✅ جاهز للتشغيل!
echo 🌐 سيتم فتح المتصفح على: http://localhost:3000
echo.
echo 📝 بيانات تسجيل الدخول:
echo    البريد: admin@smartbiz.com
echo    كلمة المرور: 123456
echo.
echo ⏹️  للإيقاف اضغط Ctrl+C
echo ========================================
echo.

REM Start the server
start "" http://localhost:3000
call npm start