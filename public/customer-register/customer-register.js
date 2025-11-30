// Registration data
let currentStep = 1;
let registrationData = {
    name: '',
    phone: '',
    email: '',
    password: '',
    photo: null,
    followedBusinesses: []
};
let allBusinesses = [];
let currentFilter = 'all';

// Preview uploaded photo
function previewPhoto(event) {
    const file = event.target.files[0];
    if (file) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت', 'error');
            return;
        }

        // Validate file type
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
            
            registrationData.photo = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadBusinesses();
});

// Load all businesses
async function loadBusinesses() {
    // API URL based on environment
    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : 'https://nassim-coiffeur.onrender.com/api';
    
    try {
        const response = await fetch(`${API_URL}/businesses/public`);
        const data = await response.json();

        if (data.success) {
            allBusinesses = data.data;
            displayBusinesses(allBusinesses);
        } else {
            showNotification('فشل تحميل المحلات', 'error');
        }
    } catch (error) {
        console.error('Error loading businesses:', error);
        showNotification('حدث خطأ في تحميل المحلات', 'error');
    }
}

// Display businesses
function displayBusinesses(businesses) {
    const businessesList = document.getElementById('businessesList');
    
    if (businesses.length === 0) {
        businessesList.innerHTML = '<div class="loading">لا توجد محلات متاحة</div>';
        return;
    }

    const businessTypeIcons = {
        barbershop: '✂️',
        salon: '💇',
        restaurant: '🍽️',
        cafe: '☕',
        workshop: '🔧',
        spa: '💆',
        gym: '💪',
        other: '🏪'
    };

    const businessTypeNames = {
        barbershop: 'صالون حلاقة',
        salon: 'صالون تجميل',
        restaurant: 'مطعم',
        cafe: 'مقهى',
        workshop: 'ورشة',
        spa: 'سبا',
        gym: 'نادي رياضي',
        other: 'أخرى'
    };

    businessesList.innerHTML = businesses.map(business => `
        <div class="business-card ${registrationData.followedBusinesses.includes(business._id) ? 'selected' : ''}" 
             data-id="${business._id}" 
             data-type="${business.businessType}"
             onclick="toggleBusiness('${business._id}', '${business.businessName}', '${business.businessType}')">
            <div class="business-icon">${businessTypeIcons[business.businessType] || '🏪'}</div>
            <div class="business-name">${business.businessName}</div>
            <div class="business-type">${businessTypeNames[business.businessType] || business.businessType}</div>
            <div class="business-city">${business.city || 'المملكة العربية السعودية'}</div>
        </div>
    `).join('');
}

// Toggle business selection
function toggleBusiness(businessId, businessName, businessType) {
    const index = registrationData.followedBusinesses.findIndex(b => b.id === businessId);
    
    if (index > -1) {
        registrationData.followedBusinesses.splice(index, 1);
    } else {
        registrationData.followedBusinesses.push({
            id: businessId,
            name: businessName,
            type: businessType
        });
    }

    updateSelectedBusinesses();
    
    // Update card visual
    const card = document.querySelector(`.business-card[data-id="${businessId}"]`);
    if (card) {
        card.classList.toggle('selected');
    }
}

// Update selected businesses display
function updateSelectedBusinesses() {
    const count = registrationData.followedBusinesses.length;
    document.getElementById('selectedCount').textContent = count;

    const selectedList = document.getElementById('selectedList');
    if (count === 0) {
        selectedList.innerHTML = '<p style="color: #999; text-align: center;">لم تقم باختيار أي محل بعد</p>';
        return;
    }

    const businessTypeIcons = {
        barbershop: '✂️',
        salon: '💇',
        restaurant: '🍽️',
        cafe: '☕',
        workshop: '🔧',
        spa: '💆',
        gym: '💪',
        other: '🏪'
    };

    selectedList.innerHTML = registrationData.followedBusinesses.map(business => `
        <div class="selected-tag">
            <span>${businessTypeIcons[business.type] || '🏪'} ${business.name}</span>
            <button class="remove-btn" onclick="toggleBusiness('${business.id}', '${business.name}', '${business.type}')">×</button>
        </div>
    `).join('');
}

// Filter businesses by type
function filterByType(type) {
    currentFilter = type;

    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.filter-btn[data-filter="${type}"]`).classList.add('active');

    // Filter businesses
    let filtered = allBusinesses;
    if (type !== 'all') {
        filtered = allBusinesses.filter(b => b.businessType === type);
    }

    displayBusinesses(filtered);
}

// Search businesses
function filterBusinesses() {
    const searchTerm = document.getElementById('searchBusiness').value.toLowerCase();
    
    let filtered = allBusinesses;
    
    // Apply type filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(b => b.businessType === currentFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(b => 
            b.businessName.toLowerCase().includes(searchTerm) ||
            (b.city && b.city.toLowerCase().includes(searchTerm))
        );
    }

    displayBusinesses(filtered);
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Next step
function nextStep() {
    if (!validateStep(currentStep)) {
        return;
    }

    // Update progress
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.add('completed');
    document.querySelector(`.step-content[data-step="${currentStep}"]`).classList.remove('active');
    
    currentStep++;
    
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.add('active');
    document.querySelector(`.step-content[data-step="${currentStep}"]`).classList.add('active');

    // Update confirmation if on step 3
    if (currentStep === 3) {
        updateConfirmation();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Previous step
function previousStep() {
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.step-content[data-step="${currentStep}"]`).classList.remove('active');
    
    currentStep--;
    
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('completed');
    document.querySelector(`.step-content[data-step="${currentStep}"]`).classList.add('active');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Validate step
function validateStep(step) {
    if (step === 1) {
        // Validate personal information
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const password = document.getElementById('customerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!name) {
            showNotification('الرجاء إدخال الاسم الكامل', 'error');
            return false;
        }

        if (!phone) {
            showNotification('الرجاء إدخال رقم الجوال', 'error');
            return false;
        }

        // Remove spaces and validate phone (Algerian numbers: 05, 06, 07)
        const cleanPhone = phone.replace(/\s/g, '');
        if (!/^(0[567]|[567])[0-9]{8}$/.test(cleanPhone)) {
            showNotification('الرجاء إدخال رقم جوال جزائري صحيح (مثال: 0512345678 أو 0612345678 أو 0712345678)', 'error');
            return false;
        }

        if (!password || password.length < 6) {
            showNotification('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
            return false;
        }

        if (password !== confirmPassword) {
            showNotification('كلمة المرور غير متطابقة', 'error');
            return false;
        }

        // Store data
        registrationData.name = name;
        registrationData.phone = cleanPhone.startsWith('5') ? '0' + cleanPhone : cleanPhone;
        registrationData.email = document.getElementById('customerEmail').value.trim();
        registrationData.password = password;

        return true;
    }

    if (step === 2) {
        // Validate business selection
        if (registrationData.followedBusinesses.length === 0) {
            showNotification('الرجاء اختيار محل واحد على الأقل', 'error');
            return false;
        }

        return true;
    }

    return true;
}

// Update confirmation
function updateConfirmation() {
    document.getElementById('confirmName').textContent = registrationData.name;
    document.getElementById('confirmPhone').textContent = registrationData.phone;
    document.getElementById('confirmEmail').textContent = registrationData.email || 'غير محدد';
    
    const count = registrationData.followedBusinesses.length;
    document.getElementById('confirmCount').textContent = count;

    const businessTypeIcons = {
        barbershop: '✂️',
        salon: '💇',
        restaurant: '🍽️',
        cafe: '☕',
        workshop: '🔧',
        spa: '💆',
        gym: '💪',
        other: '🏪'
    };

    const businessTypeNames = {
        barbershop: 'صالون حلاقة',
        salon: 'صالون تجميل',
        restaurant: 'مطعم',
        cafe: 'مقهى',
        workshop: 'ورشة',
        spa: 'سبا',
        gym: 'نادي رياضي',
        other: 'أخرى'
    };

    const confirmBusinesses = document.getElementById('confirmBusinesses');
    confirmBusinesses.innerHTML = registrationData.followedBusinesses.map(business => `
        <div class="confirm-business-item">
            <div class="icon">${businessTypeIcons[business.type] || '🏪'}</div>
            <div class="info">
                <div class="name">${business.name}</div>
                <div class="type">${businessTypeNames[business.type] || business.type}</div>
            </div>
        </div>
    `).join('');
}

// Submit registration
async function submitRegistration() {
    // Validate terms
    if (!document.getElementById('acceptTerms').checked) {
        showNotification('يجب الموافقة على الشروط والأحكام', 'error');
        return;
    }

    // Get submit button
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    
    try {
        // Show loading
        submitBtn.innerHTML = '⏳ جاري التسجيل...';
        submitBtn.disabled = true;

        // Prepare data
        const data = {
            name: registrationData.name,
            phone: registrationData.phone,
            email: registrationData.email || undefined,
            password: registrationData.password,
            followedBusinesses: registrationData.followedBusinesses.map(b => b.id)
        };

        console.log('Sending registration data:', data);

        // API URL based on environment
        const API_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api'
            : 'https://nassim-coiffeur.onrender.com/api';

        // Send request
        const response = await fetch(`${API_URL}/customers/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log('Registration result:', result);

        if (result.success) {
            // Show success modal
            showSuccessModal();
        } else {
            showNotification(result.message || 'فشل التسجيل', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('حدث خطأ في التسجيل: ' + error.message, 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Show success modal
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    const followedBusinesses = document.getElementById('followedBusinesses');

    followedBusinesses.innerHTML = `
        <h4>المحلات المتابعة:</h4>
        <ul>
            ${registrationData.followedBusinesses.map(b => `<li>${b.name}</li>`).join('')}
        </ul>
    `;

    modal.classList.add('show');
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
