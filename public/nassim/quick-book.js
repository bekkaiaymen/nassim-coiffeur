// Quick Book JavaScript
let customerData = {};
let selectedTimeSlot = null;
let availableEmployees = [];
let services = [];

// API Base URL
const API_BASE = '/api';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initQuickBook();
});

function initQuickBook() {
    setupEventListeners();
    loadEmployees();
    loadServices();
    
    // Set min date to today
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.value = today;
    }
}

function setupEventListeners() {
    // Customer Form Submit
    const customerForm = document.getElementById('customerForm');
    if (customerForm) {
        customerForm.addEventListener('submit', handleCustomerSubmit);
    }
    
    // Appointment Form Submit
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', handleAppointmentSubmit);
    }
    
    // Date, Employee, Service change
    const dateInput = document.getElementById('appointmentDate');
    const employeeSelect = document.getElementById('employeeSelect');
    const serviceSelect = document.getElementById('serviceSelect');
    
    if (dateInput) dateInput.addEventListener('change', loadAvailableSlots);
    if (employeeSelect) employeeSelect.addEventListener('change', loadAvailableSlots);
    if (serviceSelect) serviceSelect.addEventListener('change', updateConfirmButton);
}

// Navigation Functions
function showWelcome() {
    document.getElementById('welcomeSection').style.display = 'block';
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('bookingSection').style.display = 'none';
    document.getElementById('successSection').style.display = 'none';
}

function showLoginForm() {
    document.getElementById('welcomeSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('bookingSection').style.display = 'none';
    document.getElementById('successSection').style.display = 'none';
}

function showBookingForm() {
    document.getElementById('welcomeSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('bookingSection').style.display = 'block';
    document.getElementById('successSection').style.display = 'none';
    
    // Display customer info
    displayCustomerInfo();
}

function showSuccess() {
    document.getElementById('welcomeSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('bookingSection').style.display = 'none';
    document.getElementById('successSection').style.display = 'block';
}

// Customer Form Handler
async function handleCustomerSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const password = document.getElementById('customerPassword').value;
    
    if (!name || !phone || !password) {
        showToast('الرجاء ملء جميع الحقول', 'error');
        return;
    }
    
    if (phone.length !== 10 || !phone.startsWith('0')) {
        showToast('رقم الهاتف يجب أن يكون 10 أرقام ويبدأ بـ 0', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Try to login first
        const loginResponse = await fetch(`${API_BASE}/customers/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password })
        });
        
        if (loginResponse.ok) {
            // Login successful
            const loginData = await loginResponse.json();
            
            // Extract customer info from response
            let customerId, customerName, customerPhone;
            
            if (loginData.data && loginData.data.user) {
                customerId = loginData.data.user.id;
                customerName = loginData.data.user.name;
                customerPhone = loginData.data.user.phone;
            } else if (loginData.user) {
                customerId = loginData.user._id || loginData.user.id;
                customerName = loginData.user.name;
                customerPhone = loginData.user.phone;
            }
            
            customerData = {
                id: customerId,
                name: customerName || name,
                phone: customerPhone || phone
            };
            
            showToast('تم تسجيل الدخول بنجاح', 'success');
            showBookingForm();
        } else {
            // Login failed - try to register
            // Get Nassim business ID
            const nassimBusinessId = await getNassimBusinessId();
            
            if (!nassimBusinessId) {
                showToast('حدث خطأ في تحميل بيانات المحل', 'error');
                return;
            }
            
            const registerResponse = await fetch(`${API_BASE}/customers/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name, 
                    phone, 
                    password,
                    followedBusinesses: [nassimBusinessId]
                })
            });
            
            if (registerResponse.ok) {
                const registerData = await registerResponse.json();
                
                // Extract customer info
                let customerId, customerName, customerPhone;
                
                if (registerData.data && registerData.data.user) {
                    customerId = registerData.data.user.id;
                    customerName = registerData.data.user.name;
                    customerPhone = registerData.data.user.phone;
                } else if (registerData.user) {
                    customerId = registerData.user._id || registerData.user.id;
                    customerName = registerData.user.name;
                    customerPhone = registerData.user.phone;
                }
                
                customerData = {
                    id: customerId,
                    name: customerName || name,
                    phone: customerPhone || phone
                };
                
                showToast('تم التسجيل بنجاح', 'success');
                showBookingForm();
            } else {
                const errorData = await registerResponse.json();
                showToast(errorData.message || 'حدث خطأ في التسجيل', 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
        showLoading(false);
    }
}

// Get Nassim Business ID
async function getNassimBusinessId() {
    try {
        // First try: Get from URL parameter (if passed)
        const urlParams = new URLSearchParams(window.location.search);
        const businessIdParam = urlParams.get('businessId');
        if (businessIdParam) {
            return businessIdParam;
        }
        
        // Second try: Get from localStorage (cached)
        const cachedBusinessId = localStorage.getItem('nassim_business_id');
        if (cachedBusinessId) {
            return cachedBusinessId;
        }
        
        // Third try: Fetch from API
        const response = await fetch(`${API_BASE}/businesses/public`);
        if (response.ok) {
            const result = await response.json();
            // Handle different response formats
            let businesses = [];
            if (Array.isArray(result)) {
                businesses = result;
            } else if (result.data && Array.isArray(result.data)) {
                businesses = result.data;
            } else if (result.businesses && Array.isArray(result.businesses)) {
                businesses = result.businesses;
            }
            
            if (Array.isArray(businesses) && businesses.length > 0) {
                const nassim = businesses.find(b => 
                    b.businessName && (
                        b.businessName.toLowerCase().includes('nassim') ||
                        b.businessName.toLowerCase().includes('ناسيم')
                    )
                );
                if (nassim) {
                    // Cache the business ID
                    localStorage.setItem('nassim_business_id', nassim._id);
                    return nassim._id;
                }
            }
        }
        
        // Fallback: Use hardcoded business ID
        // TODO: Update this with actual Nassim business ID from database
        // You can find it by logging into the owner dashboard
        const fallbackBusinessId = '675088cd09b3d653b6f8a50f'; // Replace with actual ID
        localStorage.setItem('nassim_business_id', fallbackBusinessId);
        return fallbackBusinessId;
        
    } catch (error) {
        console.error('Error getting business ID:', error);
        
        // Return cached or fallback
        const cachedBusinessId = localStorage.getItem('nassim_business_id');
        if (cachedBusinessId) {
            return cachedBusinessId;
        }
        
        // Last resort fallback
        return '675088cd09b3d653b6f8a50f'; // Replace with actual ID
    }
}

// Display Customer Info
function displayCustomerInfo() {
    const card = document.getElementById('customerInfoCard');
    if (!card || !customerData.name) return;
    
    const initial = customerData.name.charAt(0).toUpperCase();
    
    card.innerHTML = `
        <div class="customer-avatar">${initial}</div>
        <div class="customer-details">
            <h3>${customerData.name}</h3>
            <p>📱 ${customerData.phone}</p>
        </div>
    `;
}

// Load Employees
async function loadEmployees() {
    try {
        const nassimBusinessId = await getNassimBusinessId();
        if (!nassimBusinessId) {
            console.error('No business ID found');
            return;
        }
        
        const response = await fetch(`${API_BASE}/employees/public/by-business/${nassimBusinessId}`);
        if (response.ok) {
            const result = await response.json();
            // Handle different response formats
            if (Array.isArray(result)) {
                availableEmployees = result;
            } else if (result.data && Array.isArray(result.data)) {
                availableEmployees = result.data;
            } else if (result.employees && Array.isArray(result.employees)) {
                availableEmployees = result.employees;
            } else {
                availableEmployees = [];
            }
            populateEmployeeSelect();
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        availableEmployees = [];
    }
}

function populateEmployeeSelect() {
    const select = document.getElementById('employeeSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- اختر الحلاق --</option>';
    
    if (!Array.isArray(availableEmployees)) {
        console.error('availableEmployees is not an array:', availableEmployees);
        return;
    }
    
    availableEmployees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp._id;
        const isPresent = emp.todayAttendance && emp.todayAttendance.isPresent;
        option.textContent = `${emp.name} ${isPresent ? '✅' : '❌'}`;
        if (!isPresent) {
            option.disabled = true;
        }
        select.appendChild(option);
    });
}

// Load Services
async function loadServices() {
    try {
        const nassimBusinessId = await getNassimBusinessId();
        if (!nassimBusinessId) {
            console.error('No business ID found');
            return;
        }
        
        const response = await fetch(`${API_BASE}/services/public/by-business/${nassimBusinessId}`);
        if (response.ok) {
            const result = await response.json();
            // Handle different response formats
            if (Array.isArray(result)) {
                services = result;
            } else if (result.data && Array.isArray(result.data)) {
                services = result.data;
            } else if (result.services && Array.isArray(result.services)) {
                services = result.services;
            } else {
                services = [];
            }
            populateServiceSelect();
        }
    } catch (error) {
        console.error('Error loading services:', error);
        services = [];
    }
}

function populateServiceSelect() {
    const select = document.getElementById('serviceSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- اختر الخدمة --</option>';
    
    if (!Array.isArray(services)) {
        console.error('services is not an array:', services);
        return;
    }
    
    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service._id;
        option.textContent = `${service.name} - ${service.price} دج (${service.duration} دقيقة)`;
        select.appendChild(option);
    });
}

// Load Available Time Slots
async function loadAvailableSlots() {
    const date = document.getElementById('appointmentDate').value;
    const employeeId = document.getElementById('employeeSelect').value;
    
    const container = document.getElementById('timeSlotsContainer');
    if (!date || !employeeId) {
        container.innerHTML = '<p class="loading-text">اختر التاريخ والحلاق لعرض الأوقات المتاحة</p>';
        selectedTimeSlot = null;
        updateConfirmButton();
        return;
    }
    
    container.innerHTML = '<p class="loading-text">جاري تحميل الأوقات المتاحة...</p>';
    
    // Get Nassim business ID
    const nassimBusinessId = await getNassimBusinessId();
    
    if (!nassimBusinessId) {
        container.innerHTML = '<p class="loading-text">حدث خطأ في تحميل البيانات</p>';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/appointments/available-slots?business=${nassimBusinessId}&date=${date}&barber=${employeeId}`);
        if (response.ok) {
            const result = await response.json();
            const slots = result.data || result;
            renderTimeSlots(slots);
        } else {
            container.innerHTML = '<p class="loading-text">لا توجد أوقات متاحة في هذا التاريخ</p>';
        }
    } catch (error) {
        console.error('Error loading slots:', error);
        container.innerHTML = '<p class="loading-text">حدث خطأ في تحميل الأوقات</p>';
    }
}

function renderTimeSlots(slots) {
    const container = document.getElementById('timeSlotsContainer');
    container.innerHTML = '';
    
    if (!slots || slots.length === 0) {
        container.innerHTML = '<p class="loading-text">لا توجد أوقات متاحة</p>';
        return;
    }
    
    slots.forEach(slot => {
        const slotEl = document.createElement('div');
        slotEl.className = `time-slot ${slot.available ? '' : 'disabled'}`;
        slotEl.textContent = slot.time;
        
        if (slot.available) {
            slotEl.onclick = () => selectTimeSlot(slot.time, slotEl);
        }
        
        container.appendChild(slotEl);
    });
}

function selectTimeSlot(time, element) {
    // Remove previous selection
    document.querySelectorAll('.time-slot').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selection
    element.classList.add('selected');
    selectedTimeSlot = time;
    
    updateConfirmButton();
}

function updateConfirmButton() {
    const btn = document.getElementById('confirmBookingBtn');
    const serviceId = document.getElementById('serviceSelect').value;
    
    if (btn) {
        btn.disabled = !selectedTimeSlot || !serviceId;
    }
}

// Handle Appointment Submit
async function handleAppointmentSubmit(e) {
    e.preventDefault();
    
    const date = document.getElementById('appointmentDate').value;
    const employeeId = document.getElementById('employeeSelect').value;
    const serviceId = document.getElementById('serviceSelect').value;
    
    if (!date || !employeeId || !serviceId || !selectedTimeSlot) {
        showToast('الرجاء ملء جميع الحقول واختيار الوقت', 'error');
        return;
    }
    
    showLoading(true);
    
    // Get Nassim business ID
    const nassimBusinessId = await getNassimBusinessId();
    
    if (!nassimBusinessId) {
        showToast('حدث خطأ في تحميل بيانات المحل', 'error');
        showLoading(false);
        return;
    }
    
    const appointmentData = {
        business: nassimBusinessId,
        customer: customerData.id,
        customerName: customerData.name,
        customerPhone: customerData.phone,
        employee: employeeId,
        service: serviceId,
        date: date,
        time: selectedTimeSlot,
        status: 'pending'
    };
    
    try {
        const response = await fetch(`${API_BASE}/appointments/public/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentData)
        });
        
        if (response.ok) {
            const result = await response.json();
            displaySuccessDetails(result.appointment || result);
            showSuccess();
            showToast('تم حجز الموعد بنجاح!', 'success');
        } else {
            const errorData = await response.json();
            showToast(errorData.message || 'فشل في حجز الموعد', 'error');
        }
    } catch (error) {
        console.error('Error booking appointment:', error);
        showToast('حدث خطأ في الحجز', 'error');
    } finally {
        showLoading(false);
    }
}

function displaySuccessDetails(appointment) {
    const container = document.getElementById('appointmentDetails');
    if (!container) return;
    
    const employee = availableEmployees.find(e => e._id === appointment.employeeId);
    const service = services.find(s => s._id === (appointment.serviceId._id || appointment.serviceId));
    
    const dateObj = new Date(appointment.appointmentDate);
    const dateStr = dateObj.toLocaleDateString('ar-SA', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    container.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">التاريخ</span>
            <span class="detail-value">${dateStr}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">الوقت</span>
            <span class="detail-value">${appointment.time}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">الحلاق</span>
            <span class="detail-value">${employee ? employee.name : 'غير محدد'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">الخدمة</span>
            <span class="detail-value">${service ? service.name : 'غير محدد'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">المدة</span>
            <span class="detail-value">${service ? service.duration : 30} دقيقة</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">السعر</span>
            <span class="detail-value">${service ? service.price : 0} دج</span>
        </div>
    `;
}

// Utility Functions
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
