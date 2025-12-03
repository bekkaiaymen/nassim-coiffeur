// Quick Book JavaScript
let customerData = {};
let selectedTimeSlot = null;
let availableEmployees = [];
let services = [];
let selectedServices = []; // Array to track multiple selected services
let availableServices = [];

// API Base URL
const API_BASE = '/api';
const NASSIM_BUSINESS_ID = '675088cd09b3d653b6f8a50f';

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
    
    // Booking Form Submit (changed from appointmentForm to bookingForm)
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleAppointmentSubmit);
    }
    
    // Date, Employee, Time change
    const dateInput = document.getElementById('appointmentDate');
    const timeInput = document.getElementById('appointmentTime');
    const employeeSelect = document.getElementById('employeeSelect');
    
    if (dateInput) dateInput.addEventListener('change', updateConfirmButton);
    if (timeInput) timeInput.addEventListener('change', updateConfirmButton);
    if (employeeSelect) employeeSelect.addEventListener('change', updateConfirmButton);
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
            
            // Store token for auto login later
            if (loginData.token) {
                localStorage.setItem('quick_book_token', loginData.token);
            }
            
            showToast('تم تسجيل الدخول بنجاح', 'success');
            showBookingForm();
        } else {
            // Login failed - try to register
            // Get Nassim business ID
            const nassimBusinessId = NASSIM_BUSINESS_ID || await getNassimBusinessId();
            
            if (!nassimBusinessId) {
                showToast('حدث خطأ في تحميل بيانات المحل', 'error');
                showLoading(false);
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
                
                // Store token for auto login later
                if (registerData.token) {
                    localStorage.setItem('quick_book_token', registerData.token);
                }
                
                showToast('تم التسجيل بنجاح! مرحباً بك 🎉', 'success');
                showLoading(false);
                showBookingForm();
            } else {
                const errorData = await registerResponse.json();
                console.error('Registration error:', errorData);
                showToast(errorData.message || 'حدث خطأ في التسجيل', 'error');
                showLoading(false);
            }
        }
    } catch (error) {
        console.error('Error in customer submit:', error);
        showToast('حدث خطأ في الاتصال بالخادم', 'error');
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
            availableEmployees = [];
            populateEmployeeSelect();
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
                console.warn('Unexpected employees response format:', result);
                availableEmployees = [];
            }
        } else {
            console.error('Failed to load employees:', response.status);
            availableEmployees = [];
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        availableEmployees = [];
    } finally {
        // Always call populateEmployeeSelect to ensure UI is updated
        populateEmployeeSelect();
    }
}

function populateEmployeeSelect() {
    const select = document.getElementById('employeeSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- اختر الحلاق --</option>';
    
    // Add "Any Available Barber" option
    const anyOption = document.createElement('option');
    anyOption.value = 'any';
    anyOption.textContent = '🎯 أي حلاق متاح (سيتم التأكيد من قبل أحد الحلاقين)';
    anyOption.style.fontWeight = 'bold';
    anyOption.style.color = '#CBA35C';
    select.appendChild(anyOption);
    
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
            services = [];
            populateServiceSelect();
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
                console.warn('Unexpected services response format:', result);
                services = [];
            }
        } else {
            console.error('Failed to load services:', response.status);
            services = [];
        }
    } catch (error) {
        console.error('Error loading services:', error);
        services = [];
    } finally {
        // Always call populateServiceSelect to ensure UI is updated
        populateServiceSelect();
    }
}

function populateServiceSelect() {
    const container = document.getElementById('bookingServicesList');
    if (!container) return;
    
    if (!Array.isArray(services)) {
        console.error('services is not an array:', services);
        container.innerHTML = '<p style="text-align: center; color: #A7A7A7; padding: 20px;">لا توجد خدمات متاحة</p>';
        return;
    }
    
    availableServices = services;
    
    // Filter out packages from the service list
    const regularServices = services.filter(service => !service.isPackage);
    
    if (regularServices.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #A7A7A7; padding: 20px;">لا توجد خدمات متاحة</p>';
        return;
    }
    
    container.innerHTML = regularServices.map(service => {
        const hasValidImage = service.image && service.image.trim() !== '';
        
        return `
        <div class="booking-service-card" 
             data-service-id="${service._id}"
             data-service-name="${service.name}"
             data-service-price="${service.price}"
             data-service-duration="${service.duration}"
             onclick="toggleServiceSelection('${service._id}')">
            ${hasValidImage
                ? `<div class="booking-service-image">
                    <img src="${service.image}" alt="${service.name}">
                   </div>` 
                : `<div class="service-icon">${getServiceIcon(service.name)}</div>`
            }
            <div class="service-name">${service.name}</div>
            <div class="service-meta">
                <span class="service-duration">⏱ ${service.duration} دقيقة</span>
            </div>
        </div>
        `;
    }).join('');
}

// Get Service Icon
function getServiceIcon(serviceName) {
    const name = serviceName.toLowerCase();
    if (name.includes('قص') || name.includes('حلاقة')) return '✂️';
    if (name.includes('صبغ')) return '🎨';
    if (name.includes('لحية')) return '🪒';
    if (name.includes('شامبو')) return '🧴';
    return '💈';
}

// Toggle Service Selection
function toggleServiceSelection(serviceId) {
    const card = document.querySelector(`[data-service-id="${serviceId}"]`);
    if (!card) return;
    
    // Check if already selected
    const existingIndex = selectedServices.findIndex(s => s.id === serviceId);
    
    if (existingIndex !== -1) {
        // Remove from selection
        selectedServices.splice(existingIndex, 1);
        card.classList.remove('selected');
    } else {
        // Add to selection
        const serviceName = card.dataset.serviceName;
        const servicePrice = parseInt(card.dataset.servicePrice);
        const serviceDuration = parseInt(card.dataset.serviceDuration);
        
        selectedServices.push({
            id: serviceId,
            name: serviceName,
            price: servicePrice,
            duration: serviceDuration
        });
        
        card.classList.add('selected');
    }
    
    // Update summary display
    updateBookingSummary();
}

// Update Booking Summary
function updateBookingSummary() {
    const container = document.getElementById('selectedServices');
    
    if (selectedServices.length === 0) {
        container.style.display = 'none';
        updateConfirmButton();
        return;
    }
    
    container.style.display = 'block';
    
    // Calculate totals
    const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
    
    // Update summary
    document.getElementById('servicesCount').textContent = selectedServices.length;
    document.getElementById('totalDuration').textContent = totalDuration + ' دقيقة';
    document.getElementById('totalPrice').textContent = totalPrice + ' دج';
    
    updateConfirmButton();
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
    const employeeId = document.getElementById('employeeSelect').value;
    const date = document.getElementById('appointmentDate').value;
    const time = document.getElementById('appointmentTime').value;
    
    if (btn) {
        btn.disabled = !date || !time || !employeeId || selectedServices.length === 0;
    }
}

// Handle Appointment Submit (using bookingForm instead of appointmentForm)
async function handleAppointmentSubmit(e) {
    e.preventDefault();
    
    const date = document.getElementById('appointmentDate').value;
    const time = document.getElementById('appointmentTime').value;
    const employeeId = document.getElementById('employeeSelect').value;
    const notes = document.getElementById('appointmentNotes')?.value || '';
    
    if (!date || !time || !employeeId) {
        showToast('الرجاء ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    // Validate that at least one service is selected
    if (!selectedServices || selectedServices.length === 0) {
        showToast('الرجاء اختيار خدمة واحدة على الأقل', 'error');
        return;
    }
    
    showLoading(true);
    
    // Get Nassim business ID
    const nassimBusinessId = NASSIM_BUSINESS_ID || await getNassimBusinessId();
    
    if (!nassimBusinessId) {
        showToast('حدث خطأ في تحميل بيانات المحل', 'error');
        showLoading(false);
        return;
    }
    
    const dateTime = `${date}T${time}:00`;
    
    // Check if booking is for a package
    const isPackageBooking = selectedServices.length === 1 && selectedServices[0].isPackage;
    
    const appointmentData = {
        business: nassimBusinessId,
        customer: customerData.id,
        customerName: customerData.name,
        customerPhone: customerData.phone,
        services: isPackageBooking ? selectedServices[0].packageServices.map(s => s.id) : selectedServices.map(s => s.id),
        service: isPackageBooking ? selectedServices[0].id : selectedServices[0].id,
        serviceName: selectedServices.map(s => s.name).join(' + '),
        employee: employeeId === 'any' ? null : employeeId,
        isFlexibleEmployee: employeeId === 'any',
        date: date,
        time: time,
        dateTime: dateTime,
        notes: notes,
        totalPrice: selectedServices.reduce((sum, s) => sum + s.price, 0),
        totalDuration: selectedServices.reduce((sum, s) => sum + s.duration, 0),
        status: 'pending'
    };
    
    console.log('Booking data:', appointmentData);
    
    try {
        const response = await fetch(`${API_BASE}/appointments/public/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            displaySuccessDetails(result.appointment || result.data || result);
            showLoading(false);
            showSuccess();
            showToast('تم حجز الموعد بنجاح! 🎉', 'success');
            
            // Auto login after successful booking
            setTimeout(() => {
                autoLoginAfterBooking();
            }, 3000);
        } else {
            showToast(result.message || 'فشل حجز الموعد', 'error');
            showLoading(false);
        }
    } catch (error) {
        console.error('Error booking appointment:', error);
        showToast('حدث خطأ أثناء الحجز', 'error');
        showLoading(false);
    }
}

// Auto Login After Booking
async function autoLoginAfterBooking() {
    if (!customerData || !customerData.phone) {
        console.error('No customer data available for auto login');
        return;
    }
    
    // Store customer token from registration/login
    const token = localStorage.getItem('quick_book_token');
    
    if (token) {
        // Save token for nassim customer interface
        localStorage.setItem('customerToken', token);
        localStorage.setItem('customerData', JSON.stringify(customerData));
        
        showToast('جاري تسجيل الدخول إلى حسابك...', 'success');
        
        // Redirect to nassim customer interface
        setTimeout(() => {
            window.location.href = '/nassim/index.html';
        }, 1500);
    } else {
        console.error('No token available for auto login');
    }
}

function displaySuccessDetails(appointment) {
    const container = document.getElementById('appointmentDetails');
    if (!container) return;
    
    // Safe extraction of IDs
    const employeeId = appointment.employee?._id || appointment.employee || appointment.employeeId;
    const serviceId = appointment.service?._id || appointment.service || appointment.serviceId?._id || appointment.serviceId;
    
    // Find employee and service safely
    const employee = Array.isArray(availableEmployees) 
        ? availableEmployees.find(e => e._id === employeeId) 
        : null;
    const service = Array.isArray(services) 
        ? services.find(s => s._id === serviceId) 
        : null;
    
    // Get date from different possible fields
    const dateValue = appointment.date || appointment.appointmentDate;
    const dateObj = new Date(dateValue);
    const dateStr = dateObj.toLocaleDateString('ar-SA', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Get employee name from different sources
    const employeeName = employee?.name || appointment.barber || appointment.employeeName || 'غير محدد';
    
    // Get service details
    const serviceName = service?.name || appointment.serviceName || 'غير محدد';
    const serviceDuration = service?.duration || appointment.duration || 30;
    const servicePrice = service?.price || appointment.price || 0;
    
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
            <span class="detail-value">${employeeName}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">الخدمة</span>
            <span class="detail-value">${serviceName}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">المدة</span>
            <span class="detail-value">${serviceDuration} دقيقة</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">السعر</span>
            <span class="detail-value">${servicePrice} دج</span>
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
