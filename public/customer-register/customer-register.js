// Nassim Customer Registration - Simplified
const NASSIM_BUSINESS_ID = '69259331651b1babc1eb83dc';

// Preview uploaded photo
function previewPhoto(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            showNotification('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت', 'error');
            return;
        }
        if (!file.type.startsWith('image/')) {
            showNotification('الرجاء اختيار ملف صورة فقط', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('previewImage');
            const icon = document.querySelector('.photo-icon');
            preview.src = e.target.result;
            preview.style.display = 'block';
            if (icon) icon.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Submit registration
async function submitRegistration() {
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const password = document.getElementById('customerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const photoFile = document.getElementById('profilePhoto').files[0];

    // Validation
    if (!name) {
        showNotification('الرجاء إدخال الاسم الكامل', 'error');
        return;
    }
    if (!phone) {
        showNotification('الرجاء إدخال رقم الجوال', 'error');
        return;
    }
    const cleanPhone = phone.replace(/\s/g, '');
    if (!/^(0[567]|[567])[0-9]{8}$/.test(cleanPhone)) {
        showNotification('الرجاء إدخال رقم جوال جزائري صحيح', 'error');
        return;
    }
    if (!password || password.length < 6) {
        showNotification('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    if (password !== confirmPassword) {
        showNotification('كلمة المرور غير متطابقة', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.innerHTML = '⏳ جاري إنشاء الحساب...';
        submitBtn.disabled = true;

        const formData = new FormData();
        formData.append('name', name);
        formData.append('phone', cleanPhone.startsWith('5') ? '0' + cleanPhone : cleanPhone);
        // Email removed as per request
        formData.append('password', password);
        // Hardcode Nassim Business ID
        formData.append('followedBusinesses', JSON.stringify([NASSIM_BUSINESS_ID]));
        
        if (photoFile) {
            formData.append('photo', photoFile);
        }

        const API_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api'
            : 'https://nassim-coiffeur.onrender.com/api';

        const response = await fetch(`${API_URL}/customers/register`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            showNotification('✓ تم إنشاء الحساب بنجاح!', 'success');
            
            // Auto Login
            localStorage.setItem('customerToken', result.data.token);
            localStorage.setItem('customerData', JSON.stringify(result.data.user));
            
            // Redirect to Nassim app immediately
            setTimeout(() => {
                window.location.href = '/nassim';
            }, 1000);
        } else {
            showNotification(result.message || 'فشل التسجيل', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('حدث خطأ في الاتصال', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
