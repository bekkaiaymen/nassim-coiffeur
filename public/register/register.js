// Registration Data
let registrationData = {
    businessType: '',
    businessName: '',
    subdomain: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    password: '',
    selectedPlan: 'pro'
};

let currentStep = 1;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupBusinessTypeCards();
    setupSubdomainCheck();
});

// Business Type Selection
function setupBusinessTypeCards() {
    const cards = document.querySelectorAll('.business-type-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove previous selection
            cards.forEach(c => c.classList.remove('selected'));
            
            // Select current
            card.classList.add('selected');
            registrationData.businessType = card.dataset.type;
            
            // Auto proceed to next step after 800ms
            setTimeout(() => {
                nextStep();
            }, 800);
        });
    });
}

// Subdomain Availability Check
function setupSubdomainCheck() {
    const subdomainInput = document.getElementById('subdomain');
    let typingTimer;
    
    subdomainInput.addEventListener('input', (e) => {
        clearTimeout(typingTimer);
        const subdomain = e.target.value.trim().toLowerCase();
        
        if (subdomain.length >= 3) {
            typingTimer = setTimeout(() => {
                checkSubdomain(subdomain);
            }, 500);
        }
    });
}

async function checkSubdomain(subdomain) {
    try {
        const response = await fetch(`/api/businesses/check-subdomain?subdomain=${subdomain}`);
        const data = await response.json();
        
        const checkElement = document.querySelector('.subdomain-check');
        const checkMessage = checkElement.querySelector('.check-message');
        
        if (data.available) {
            checkElement.classList.add('visible');
            checkMessage.textContent = 'متاح ✓';
            checkElement.style.color = '#10b981';
        } else {
            checkElement.classList.add('visible');
            checkMessage.textContent = 'غير متاح ✗';
            checkElement.style.color = '#ef4444';
        }
    } catch (error) {
        console.error('Error checking subdomain:', error);
    }
}

// Password Toggle
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.password-toggle');
    const icon = button.querySelector('.toggle-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = '🙈';
    } else {
        input.type = 'password';
        icon.textContent = '👁️';
    }
}

// Plan Selection
function selectPlan(plan) {
    // Remove previous selection
    document.querySelectorAll('.pricing-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select current
    const selectedCard = document.querySelector(`[data-plan="${plan}"]`);
    selectedCard.classList.add('selected');
    
    registrationData.selectedPlan = plan;
}

// Navigation
function nextStep() {
    // Validate current step
    if (!validateStep(currentStep)) {
        return;
    }
    
    // Update progress
    const currentStepElement = document.querySelector(`[data-step="${currentStep}"]`);
    currentStepElement.classList.add('completed');
    currentStepElement.classList.remove('active');
    
    // Move to next step
    currentStep++;
    
    // Hide current step
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show next step
    document.getElementById(`step-${currentStep}`).classList.add('active');
    
    // Update progress bar
    const nextStepElement = document.querySelector(`[data-step="${currentStep}"]`);
    nextStepElement.classList.add('active');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function previousStep() {
    // Update progress
    const currentStepElement = document.querySelector(`[data-step="${currentStep}"]`);
    currentStepElement.classList.remove('active');
    
    // Move to previous step
    currentStep--;
    
    // Hide current step
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show previous step
    document.getElementById(`step-${currentStep}`).classList.add('active');
    
    // Update progress bar
    const prevStepElement = document.querySelector(`[data-step="${currentStep}"]`);
    prevStepElement.classList.remove('completed');
    prevStepElement.classList.add('active');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Validation
function validateStep(step) {
    switch(step) {
        case 1:
            if (!registrationData.businessType) {
                showNotification('الرجاء اختيار نوع المحل', 'error');
                return false;
            }
            break;
            
        case 2:
            // Collect data
            registrationData.businessName = document.getElementById('businessName').value.trim();
            registrationData.subdomain = document.getElementById('subdomain').value.trim().toLowerCase();
            registrationData.phone = document.getElementById('phone').value.trim();
            registrationData.email = document.getElementById('email').value.trim();
            registrationData.city = document.getElementById('city').value;
            registrationData.address = document.getElementById('address').value.trim();
            
            // Validate
            if (!registrationData.businessName) {
                showNotification('الرجاء إدخال اسم المحل', 'error');
                return false;
            }
            
            if (!registrationData.subdomain || registrationData.subdomain.length < 3) {
                showNotification('الرجاء إدخال عنوان صحيح (3 أحرف على الأقل)', 'error');
                return false;
            }
            
            if (!registrationData.phone) {
                showNotification('الرجاء إدخال رقم الجوال', 'error');
                return false;
            }
            
            // Remove spaces and validate
            registrationData.phone = registrationData.phone.replace(/\s/g, '');
            if (!/^(05|5)[0-9]{8}$/.test(registrationData.phone)) {
                showNotification('الرجاء إدخال رقم جوال صحيح (مثال: 0512345678)', 'error');
                return false;
            }
            
            // Ensure it starts with 05
            if (registrationData.phone.startsWith('5')) {
                registrationData.phone = '0' + registrationData.phone;
            }
            
            if (!registrationData.email || !isValidEmail(registrationData.email)) {
                showNotification('الرجاء إدخال بريد إلكتروني صحيح', 'error');
                return false;
            }
            
            if (!registrationData.city) {
                showNotification('الرجاء اختيار المدينة', 'error');
                return false;
            }
            break;
            
        case 3:
            // Collect data
            registrationData.ownerName = document.getElementById('ownerName').value.trim();
            registrationData.ownerEmail = document.getElementById('ownerEmail').value.trim();
            registrationData.ownerPhone = document.getElementById('ownerPhone').value.trim();
            registrationData.password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validate
            if (!registrationData.ownerName) {
                showNotification('الرجاء إدخال اسمك', 'error');
                return false;
            }
            
            if (!registrationData.ownerEmail || !isValidEmail(registrationData.ownerEmail)) {
                showNotification('الرجاء إدخال بريد إلكتروني صحيح', 'error');
                return false;
            }
            
            if (!registrationData.ownerPhone) {
                showNotification('الرجاء إدخال رقم جوالك', 'error');
                return false;
            }
            
            // Remove spaces and validate
            registrationData.ownerPhone = registrationData.ownerPhone.replace(/\s/g, '');
            if (!/^(05|5)[0-9]{8}$/.test(registrationData.ownerPhone)) {
                showNotification('الرجاء إدخال رقم جوال صحيح (مثال: 0512345678)', 'error');
                return false;
            }
            
            // Ensure it starts with 05
            if (registrationData.ownerPhone.startsWith('5')) {
                registrationData.ownerPhone = '0' + registrationData.ownerPhone;
            }
            
            if (!registrationData.password || registrationData.password.length < 6) {
                showNotification('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
                return false;
            }
            
            if (registrationData.password !== confirmPassword) {
                showNotification('كلمة المرور غير متطابقة', 'error');
                return false;
            }
            break;
    }
    
    return true;
}

// Submit Registration
async function submitRegistration() {
    // Check terms agreement
    const agreeTerms = document.getElementById('agreeTerms').checked;
    if (!agreeTerms) {
        showNotification('يجب الموافقة على شروط الخدمة', 'error');
        return;
    }
    
    // Show loading
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    
    try {
        // Prepare data
        const payload = {
            businessType: registrationData.businessType,
            businessName: registrationData.businessName,
            subdomain: registrationData.subdomain,
            phone: registrationData.phone,
            email: registrationData.email,
            city: registrationData.city,
            address: registrationData.address,
            ownerName: registrationData.ownerName,
            ownerEmail: registrationData.ownerEmail,
            ownerPhone: registrationData.ownerPhone,
            ownerPassword: registrationData.password,
            plan: registrationData.selectedPlan
        };
        
        // Send request
        const response = await fetch('/api/businesses/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success modal
            const modal = document.getElementById('successModal');
            const shopUrl = document.getElementById('shopUrl');
            shopUrl.textContent = `${registrationData.subdomain}.smartbiz.com`;
            
            modal.classList.add('show');
            
            // Store token
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('businessId', data.data.business._id);
        } else {
            showNotification(data.message || 'حدث خطأ، حاول مرة أخرى', 'error');
            
            // Re-enable button
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('حدث خطأ في الاتصال، حاول مرة أخرى', 'error');
        
        // Re-enable button
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// Go to Dashboard
function goToDashboard() {
    window.location.href = '/dashboard';
}

// Helper Functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}
