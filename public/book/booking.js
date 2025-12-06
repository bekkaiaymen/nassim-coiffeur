// Get tenant slug from URL
const urlParams = new URLSearchParams(window.location.search);
const tenantSlug = urlParams.get('tenant') || 'salon-alanaka'; // Default demo tenant

// Configuration
const API_URL = '/api';
let currentStep = 1;
let bookingData = {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    service: null,
    employee: null,
    date: '',
    time: ''
};

let services = [];
let employees = [];
let businessInfo = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadBusinessInfo();
    loadServices();
    loadEmployees();
    setMinDate();
});

// Load Business Info
async function loadBusinessInfo() {
    try {
        const response = await fetch(`${API_URL}/tenants/slug/${tenantSlug}`);
        const data = await response.json();
        
        if (data.success && data.data) {
            businessInfo = data.data;
            displayBusinessInfo();
        } else {
            document.getElementById('business-info').innerHTML = `
                <p style="color: #EF4444;">لم يتم العثور على المتجر</p>
            `;
        }
    } catch (error) {
        console.error('Error loading business:', error);
        document.getElementById('business-info').innerHTML = `
            <p style="color: #EF4444;">حدث خطأ في تحميل معلومات المتجر</p>
        `;
    }
}

function displayBusinessInfo() {
    const container = document.getElementById('business-info');
    container.innerHTML = `
        <h2>${businessInfo.name}</h2>
        <p>نظام حجز المواعيد الإلكتروني</p>
        <div class="business-features">
            <div class="feature-item">
                <i class="fas fa-clock"></i>
                <span>حجز سريع وسهل</span>
            </div>
            <div class="feature-item">
                <i class="fas fa-bell"></i>
                <span>إشعارات تذكيرية</span>
            </div>
            <div class="feature-item">
                <i class="fas fa-star"></i>
                <span>خدمة احترافية</span>
            </div>
        </div>
    `;
}

// Load Services
async function loadServices() {
    try {
        const response = await fetch(`${API_URL}/businesses/${tenantSlug}/services`);
        const data = await response.json();
        
        if (data.success && data.data) {
            services = data.data;
            displayServices();
        }
    } catch (error) {
        console.error('Error loading services:', error);
        document.getElementById('services-list').innerHTML = `
            <p style="text-align: center; color: #EF4444;">حدث خطأ في تحميل الخدمات</p>
        `;
    }
}

function displayServices() {
    const container = document.getElementById('services-list');
    
    if (services.length === 0) {
        container.innerHTML = `
            <p style="text-align: center; color: #6B7280;">لا توجد خدمات متاحة حالياً</p>
        `;
        return;
    }
    
    container.innerHTML = services.map(service => `
        <div class="service-card" onclick="selectService('${service._id}')">
            <i class="fas fa-scissors"></i>
            <h4>${service.name}</h4>
            <div class="price">${service.price} ريال</div>
            <div class="duration"><i class="fas fa-clock"></i> ${service.duration} دقيقة</div>
        </div>
    `).join('');
}

function selectService(serviceId) {
    // Remove previous selection
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selection
    event.target.closest('.service-card').classList.add('selected');
    
    bookingData.service = services.find(s => s._id === serviceId);
    document.getElementById('next-to-step-3').disabled = false;
}

// Load Employees
async function loadEmployees() {
    try {
        const response = await fetch(`${API_URL}/businesses/${tenantSlug}/employees`);
        const data = await response.json();
        
        if (data.success && data.data) {
            employees = data.data;
            displayEmployees();
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        document.getElementById('employees-list').innerHTML = `
            <p style="text-align: center; color: #EF4444;">حدث خطأ في تحميل الحلاقين</p>
        `;
    }
}

function displayEmployees() {
    const container = document.getElementById('employees-list');
    
    if (employees.length === 0) {
        container.innerHTML = `
            <p style="text-align: center; color: #6B7280;">لا يوجد حلاقين متاحين حالياً</p>
        `;
        return;
    }
    
    container.innerHTML = employees.map(employee => `
        <div class="employee-card" onclick="selectEmployee('${employee._id}')">
            <div class="employee-avatar">
                <i class="fas fa-user"></i>
            </div>
            <h4>${employee.name}</h4>
            <div class="rating">
                ${employee.rating ? '⭐'.repeat(Math.round(employee.rating)) : 'جديد'}
            </div>
        </div>
    `).join('');
}

function selectEmployee(employeeId) {
    // Remove previous selection
    document.querySelectorAll('.employee-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selection
    event.target.closest('.employee-card').classList.add('selected');
    
    bookingData.employee = employees.find(e => e._id === employeeId);
    document.getElementById('next-to-step-4').disabled = false;
}

// Date & Time
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('appointment-date');
    dateInput.setAttribute('min', today);
    
    // Set max date to 30 days from now
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    dateInput.setAttribute('max', maxDate.toISOString().split('T')[0]);
}

async function loadAvailableTimes() {
    const date = document.getElementById('appointment-date').value;
    if (!date || !bookingData.service || !bookingData.employee) {
        return;
    }
    
    bookingData.date = date;
    
    const container = document.getElementById('available-times');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>جاري تحميل الأوقات المتاحة...</p></div>';
    
    try {
        const response = await fetch(
            `${API_URL}/businesses/${tenantSlug}/available-times?date=${date}&employeeId=${bookingData.employee._id}&serviceId=${bookingData.service._id}`
        );
        const data = await response.json();
        
        if (data.success && data.data) {
            displayAvailableTimes(data.data);
        } else {
            container.innerHTML = '<p style="text-align: center; color: #EF4444;">لا توجد أوقات متاحة في هذا التاريخ</p>';
        }
    } catch (error) {
        console.error('Error loading times:', error);
        // Display default times if API not available
        const defaultTimes = generateDefaultTimes();
        displayAvailableTimes(defaultTimes);
    }
}

function generateDefaultTimes() {
    const times = [];
    for (let hour = 9; hour <= 20; hour++) {
        times.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < 20) {
            times.push(`${hour.toString().padStart(2, '0')}:30`);
        }
    }
    return times;
}

function displayAvailableTimes(times) {
    const container = document.getElementById('available-times');
    
    if (times.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6B7280;">لا توجد أوقات متاحة</p>';
        return;
    }
    
    container.innerHTML = times.map(time => `
        <div class="time-slot" onclick="selectTime('${time}')">
            ${time}
        </div>
    `).join('');
}

function selectTime(time) {
    // Remove previous selection
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Add selection
    event.target.classList.add('selected');
    
    bookingData.time = time;
    document.getElementById('next-to-step-5').disabled = false;
}

// Navigation
function nextStep(step) {
    // Validate current step
    if (step === 2) {
        const name = document.getElementById('customer-name').value.trim();
        const phone = document.getElementById('customer-phone').value.trim();
        
        if (!name || !phone) {
            showNotification('يرجى إدخال الاسم ورقم الجوال', 'error');
            return;
        }
        
        if (!phone.match(/^05[0-9]{8}$/)) {
            showNotification('رقم الجوال غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام', 'error');
            return;
        }
        
        bookingData.customerName = name;
        bookingData.customerPhone = phone;
        bookingData.customerEmail = document.getElementById('customer-email').value.trim();
    }
    
    if (step === 3 && !bookingData.service) {
        showNotification('يرجى اختيار الخدمة', 'error');
        return;
    }
    
    if (step === 4 && !bookingData.employee) {
        showNotification('يرجى اختيار الحلاق', 'error');
        return;
    }
    
    if (step === 5) {
        if (!bookingData.date || !bookingData.time) {
            showNotification('يرجى اختيار التاريخ والوقت', 'error');
            return;
        }
        displaySummary();
    }
    
    // Hide current step
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    
    // Show next step
    currentStep = step;
    document.getElementById(`step-${step}`).classList.add('active');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep(step) {
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    currentStep = step;
    document.getElementById(`step-${step}`).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Summary
function displaySummary() {
    document.getElementById('summary-name').textContent = bookingData.customerName;
    document.getElementById('summary-phone').textContent = bookingData.customerPhone;
    document.getElementById('summary-service').textContent = bookingData.service.name;
    document.getElementById('summary-employee').textContent = bookingData.employee.name;
    document.getElementById('summary-date').textContent = formatDate(bookingData.date);
    document.getElementById('summary-time').textContent = bookingData.time;
    document.getElementById('summary-price').textContent = `${bookingData.service.price} ريال`;
}

// Submit Booking
async function submitBooking(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submit-booking');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحجز...';
    
    try {
        const response = await fetch(`${API_URL}/businesses/${tenantSlug}/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customerName: bookingData.customerName,
                customerPhone: bookingData.customerPhone,
                customerEmail: bookingData.customerEmail,
                service: bookingData.service.name,
                serviceId: bookingData.service._id,
                barber: bookingData.employee.name,
                barberId: bookingData.employee._id,
                date: bookingData.date,
                time: bookingData.time
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccessModal();
        } else {
            showNotification(data.message || 'حدث خطأ في الحجز', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> تأكيد الحجز';
        }
    } catch (error) {
        console.error('Error submitting booking:', error);
        showNotification('حدث خطأ في الحجز. يرجى المحاولة مرة أخرى', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check"></i> تأكيد الحجز';
    }
}

// Success Modal
function showSuccessModal() {
    document.getElementById('success-details').innerHTML = `
        <p><strong>العميل:</strong> ${bookingData.customerName}</p>
        <p><strong>الخدمة:</strong> ${bookingData.service.name}</p>
        <p><strong>الحلاق:</strong> ${bookingData.employee.name}</p>
        <p><strong>التاريخ:</strong> ${formatDate(bookingData.date)}</p>
        <p><strong>الوقت:</strong> ${bookingData.time}</p>
        <p><strong>السعر:</strong> ${bookingData.service.price} ريال</p>
    `;
    
    document.getElementById('success-modal').classList.add('active');
}

function closeSuccessModal() {
    document.getElementById('success-modal').classList.remove('active');
}

function resetBooking() {
    closeSuccessModal();
    
    // Reset booking data
    bookingData = {
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        service: null,
        employee: null,
        date: '',
        time: ''
    };
    
    // Reset form
    document.getElementById('booking-form').reset();
    
    // Remove selections
    document.querySelectorAll('.service-card, .employee-card, .time-slot').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Disable next buttons
    document.getElementById('next-to-step-3').disabled = true;
    document.getElementById('next-to-step-4').disabled = true;
    document.getElementById('next-to-step-5').disabled = true;
    
    // Go to step 1
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    currentStep = 1;
    document.getElementById('step-1').classList.add('active');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Utilities
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
