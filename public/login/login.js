// تعبئة بيانات الحساب التجريبي
function fillDemo(email) {
    document.getElementById('email').value = email;
    document.getElementById('password').value = '123456';
}

// عرض الإشعارات
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// معالجة تسجيل الدخول
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    const spinner = loginBtn.querySelector('.spinner');
    
    // تعطيل الزر وعرض loader
    loginBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'inline-block';
    
    // API URL based on environment
    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : 'https://nassim-coiffeur.onrender.com/api';
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // حفظ التوكن (التوكن موجود في data.data.token)
            const token = data.data?.token || data.token;
            localStorage.setItem('token', token);
            
            // إظهار رسالة نجاح
            showNotification('تم تسجيل الدخول بنجاح! جاري التحويل...', 'success');
            
            // Check if user is Nassim owner
            let redirectTo;
            if (email === 'aymenbekkai179@gmail.com') {
                redirectTo = 'nassim-owner';
            } else {
                // Get redirect URL from query params or default to dashboard
                const urlParams = new URLSearchParams(window.location.search);
                redirectTo = urlParams.get('redirect') || 'dashboard';
            }
            
            // الانتقال للصفحة المطلوبة
            setTimeout(() => {
                window.location.href = `/${redirectTo}`;
            }, 1000);
        } else {
            showNotification(data.message || 'خطأ في تسجيل الدخول', 'error');
            
            // إعادة تفعيل الزر
            loginBtn.disabled = false;
            btnText.style.display = 'inline';
            spinner.style.display = 'none';
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('حدث خطأ في الاتصال. حاول مرة أخرى.', 'error');
        
        // إعادة تفعيل الزر
        loginBtn.disabled = false;
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
    }
});

// التحقق من وجود token عند تحميل الصفحة
if (localStorage.getItem('token')) {
    // إذا كان المستخدم مسجل دخول بالفعل، انتقل للـ dashboard
    window.location.href = '/dashboard';
}
