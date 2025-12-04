// Quick Book JavaScript
let customerData = {};
let customerPassword = null; // For auto-login after booking
let selectedTimeSlot = null;
let availableEmployees = [];
let services = [];
let selectedServices = []; // Array to track multiple selected services
let availableServices = [];

// API Base URL
const API_BASE = '/api';
const NASSIM_BUSINESS_ID = '69259331651b1babc1eb83dc';

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
    
    if (dateInput) dateInput.addEventListener('change', () => {
        updateConfirmButton();
        checkAvailability();
    });
    if (timeInput) timeInput.addEventListener('change', () => {
        updateConfirmButton();
        checkAvailability();
    });
    if (employeeSelect) employeeSelect.addEventListener('change', () => {
        updateConfirmButton();
        checkAvailability();
    });
}

// Check Availability
async function checkAvailability() {
    const date = document.getElementById('appointmentDate').value;
    const time = document.getElementById('appointmentTime').value;
    const employeeId = document.getElementById('employeeSelect').value;
    const statusDiv = document.getElementById('availabilityStatus');
    
    // Create status div if not exists
    if (!statusDiv) {
        const timeGroup = document.getElementById('appointmentTime').parentElement;
        const div = document.createElement('div');
        div.id = 'availabilityStatus';
        div.style.marginTop = '5px';
        div.style.fontSize = '13px';
        timeGroup.appendChild(div);
    }
    
    const statusEl = document.getElementById('availabilityStatus');
    statusEl.innerHTML = '';
    
    if (!date || !time) return;
    
    // If "Any Barber" is selected, we assume it's available (or we could check if ALL are busy)
    if (employeeId === 'any') {
        statusEl.innerHTML = '<span style="color: #2ecc71;">✅ متاح (حجز مرن)</span>';
        return;
    }
    
    if (!employeeId) return;
    
    statusEl.innerHTML = '<span style="color: #f39c12;">⏳ جاري التحقق...</span>';
    
    try {
        const nassimBusinessId = NASSIM_BUSINESS_ID || await getNassimBusinessId();
        
        // Calculate total duration
        const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0) || 30;
        
        const response = await fetch(`${API_BASE}/appointments/available-slots?business=${nassimBusinessId}&date=${date}&employee=${employeeId}&checkTime=${time}&duration=${totalDuration}`);
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.success) {
                if (result.available) {
                    statusEl.innerHTML = '<span style="color: #2ecc71;">✅ هذا الوقت متاح</span>';
                } else {
                    statusEl.innerHTML = '<span style="color: #e74c3c;">❌ هذا الوقت محجوز، يرجى اختيار وقت آخر</span>';
                }
            }
        }
    } catch (error) {
        console.error('Availability check failed:', error);
        statusEl.innerHTML = '';
    }
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
    try {
        document.getElementById('welcomeSection').style.display = 'none';
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('bookingSection').style.display = 'block';
        document.getElementById('successSection').style.display = 'none';
        
        // Display customer info
        displayCustomerInfo();
        
        // Scroll to top
        window.scrollTo(0, 0);
    } catch (error) {
        console.error('Error showing booking form:', error);
    }
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
    
    // Store password for auto-login after booking
    customerPassword = password;
    
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
                customerId = loginData.data.user._id || loginData.data.user.id;
                customerName = loginData.data.user.name;
                customerPhone = loginData.data.user.phone;
            } else if (loginData.user) {
                customerId = loginData.user._id || loginData.user.id;
                customerName = loginData.user.name;
                customerPhone = loginData.user.phone;
            } else if (loginData.customer) {
                customerId = loginData.customer._id || loginData.customer.id;
                customerName = loginData.customer.name;
                customerPhone = loginData.customer.phone;
            }
            
            if (!customerId) {
                console.error('Could not extract customer ID from login response:', loginData);
                showLoading(false);
                showToast('حدث خطأ في استخراج بيانات الحساب', 'error');
                return;
            }
            
            customerData = {
                id: customerId,
                name: customerName || name,
                phone: customerPhone || phone
            };
            
            console.log('Customer logged in successfully:', customerData);
            
            // Store token for auto login later
            if (loginData.token) {
                localStorage.setItem('quick_book_token', loginData.token);
            }
            
            showLoading(false);
            showToast('تم تسجيل الدخول بنجاح', 'success');
            
            // Small delay to ensure loading overlay is hidden
            setTimeout(() => {
                showBookingForm();
            }, 100);
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
                    customerId = registerData.data.user._id || registerData.data.user.id;
                    customerName = registerData.data.user.name;
                    customerPhone = registerData.data.user.phone;
                } else if (registerData.user) {
                    customerId = registerData.user._id || registerData.user.id;
                    customerName = registerData.user.name;
                    customerPhone = registerData.user.phone;
                } else if (registerData.customer) {
                    customerId = registerData.customer._id || registerData.customer.id;
                    customerName = registerData.customer.name;
                    customerPhone = registerData.customer.phone;
                }
                
                if (!customerId) {
                    console.error('Could not extract customer ID from registration response:', registerData);
                    showLoading(false);
                    showToast('حدث خطأ في استخراج بيانات الحساب', 'error');
                    return;
                }
                
                customerData = {
                    id: customerId,
                    name: customerName || name,
                    phone: customerPhone || phone
                };
                
                console.log('Customer registered successfully:', customerData);
                
                // Store token for auto login later
                if (registerData.token) {
                    localStorage.setItem('quick_book_token', registerData.token);
                }
                
                showLoading(false);
                showToast('تم التسجيل بنجاح! مرحباً بك 🎉', 'success');
                
                // Small delay to ensure loading overlay is hidden
                setTimeout(() => {
                    showBookingForm();
                }, 100);
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
        const fallbackBusinessId = '69259331651b1babc1eb83dc'; // Replace with actual ID
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
        return '69259331651b1babc1eb83dc'; // Replace with actual ID
    }
}

// Display Customer Info
function displayCustomerInfo() {
    const card = document.getElementById('customerInfoCard');
    if (!card) {
        console.warn('customerInfoCard element not found');
        return;
    }
    
    if (!customerData || !customerData.name) {
        console.warn('customerData or name not available');
        return;
    }
    
    const initial = customerData.name.charAt(0).toUpperCase();
    
    card.innerHTML = `
        <div class="customer-avatar">${initial}</div>
        <div class="customer-details">
            <h3>${customerData.name}</h3>
            <p>📱 ${customerData.phone}</p>
        </div>
    `;
    card.style.display = 'flex';
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
    
    // Ensure availableEmployees is always an array
    if (!Array.isArray(availableEmployees)) {
        console.error('availableEmployees is not an array:', availableEmployees);
        availableEmployees = [];
        return;
    }
    
    if (availableEmployees.length === 0) {
        console.warn('No employees available');
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
    
    // Ensure services is always an array
    if (!Array.isArray(services)) {
        console.error('services is not an array:', services);
        services = [];
        container.innerHTML = '<p style="text-align: center; color: #A7A7A7; padding: 20px;">لا توجد خدمات متاحة</p>';
        return;
    }
    
    if (services.length === 0) {
        console.warn('No services available');
        container.innerHTML = '<p style="text-align: center; color: #A7A7A7; padding: 20px;">لا توجد خدمات متاحة</p>';
        return;
    }
    
    availableServices = services;
    
    // Filter out packages from the initial list (they will be auto-detected)
    const displayServices = services.filter(s => !s.isPackage);
    
    if (displayServices.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #A7A7A7; padding: 20px;">لا توجد خدمات متاحة</p>';
        return;
    }
    
    container.innerHTML = displayServices.map(service => {
        const hasValidImage = service.image && service.image.trim() !== '';
        const isPackage = service.isPackage || false;
        const hasVariants = service.hasVariants || false;
        
        return `
        <div class="booking-service-card ${isPackage ? 'package-card' : ''}" 
             data-service-id="${service._id}"
             data-service-name="${service.name}"
             data-service-price="${service.price}"
             data-service-duration="${service.duration}"
             data-is-package="${isPackage}"
             data-has-variants="${hasVariants}"
             onclick="toggleServiceSelection('${service._id}')">
            ${hasValidImage
                ? `<div class="booking-service-image">
                    <img src="${service.image}" alt="${service.name}">
                   </div>` 
                : `<div class="service-icon">${getServiceIcon(service.name)}</div>`
            }
            <div class="service-name">
                ${isPackage ? '<span style="background:#e74c3c; color:white; padding:2px 6px; border-radius:4px; font-size:0.8em; margin-left:5px;">باقة</span>' : ''}
                ${service.name}
                ${hasVariants ? '<span style="font-size:0.8em; color:#3498db; display:block;">(اضغط للاختيارات)</span>' : ''}
            </div>
            <div class="service-meta">
                <span class="service-duration">⏱ ${service.duration} دقيقة</span>
                <span class="service-price" style="margin-right: auto; font-weight: bold; color: #2ecc71;">${service.price} دج</span>
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
        
        // Re-check packages after removal
        checkPackageAvailability();
    } else {
        // Check for variants
        const hasVariants = card.dataset.hasVariants === 'true';
        if (hasVariants) {
            showVariantsModal(serviceId);
            return;
        }

        // Add to selection
        const serviceName = card.dataset.serviceName;
        const servicePrice = parseInt(card.dataset.servicePrice);
        const serviceDuration = parseInt(card.dataset.serviceDuration);
        const isPackage = card.dataset.isPackage === 'true';
        
        selectedServices.push({
            id: serviceId,
            name: serviceName,
            price: servicePrice,
            duration: serviceDuration,
            isPackage: isPackage
        });
        
        card.classList.add('selected');
        
        // Check for packages after addition
        checkPackageAvailability();
    }
    
    // Update summary display
    updateBookingSummary();
}

// Show Variants Modal
function showVariantsModal(serviceId) {
    const service = availableServices.find(s => s._id === serviceId);
    if (!service || !service.variants) return;
    
    // Create modal if not exists
    let modal = document.getElementById('variantsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'variantsModal';
        modal.className = 'modal';
        modal.style.display = 'none';
        document.body.appendChild(modal);
    }
    
    const variantsHtml = service.variants.map((variant, index) => `
        <div class="variant-option" onclick="selectVariant('${serviceId}', ${index})" 
             style="padding: 15px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: bold;">${variant.name}</div>
                <div style="font-size: 0.9em; color: #666;">${variant.duration} دقيقة</div>
            </div>
            <div style="font-weight: bold; color: #2ecc71;">${variant.price} دج</div>
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>${service.name}</h3>
                <span class="close-btn" onclick="document.getElementById('variantsModal').style.display='none'">&times;</span>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 15px; color: #666;">اختر نوع الخدمة:</p>
                <div class="variants-list" style="border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                    ${variantsHtml}
                    <div class="variant-option" onclick="selectVariant('${serviceId}', -1)" 
                         style="padding: 15px; background: #f9f9f9; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold;">سأختار مع الحلاق</div>
                            <div style="font-size: 0.9em; color: #666;">تحديد السعر والوقت لاحقاً</div>
                        </div>
                        <div style="font-weight: bold; color: #999;">--</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Select Variant
function selectVariant(serviceId, variantIndex) {
    const service = availableServices.find(s => s._id === serviceId);
    if (!service) return;
    
    let name = service.name;
    let price = service.price;
    let duration = service.duration;
    
    if (variantIndex >= 0 && service.variants[variantIndex]) {
        const variant = service.variants[variantIndex];
        name = `${service.name} - ${variant.name}`;
        price = variant.price;
        duration = variant.duration;
    } else {
        name = `${service.name} (تحديد مع الحلاق)`;
        // Keep base price/duration or set to defaults if needed
    }
    
    // Add to selection
    selectedServices.push({
        id: serviceId,
        name: name,
        price: price,
        duration: duration,
        isPackage: false,
        variantIndex: variantIndex
    });
    
    // Mark card as selected
    const card = document.querySelector(`[data-service-id="${serviceId}"]`);
    if (card) card.classList.add('selected');
    
    // Close modal
    document.getElementById('variantsModal').style.display = 'none';
    
    updateBookingSummary();
    checkPackageAvailability();
}

// Check Package Availability
function checkPackageAvailability() {
    // Get IDs of selected services (excluding packages themselves)
    const selectedIds = selectedServices.filter(s => !s.isPackage).map(s => s.id);
    
    if (selectedIds.length < 2) return;
    
    // Find packages that match selected services
    const packages = availableServices.filter(s => s.isPackage && s.packageServices && s.packageServices.length > 0);
    
    for (const pkg of packages) {
        // Check if all package services are selected
        // We assume packageServices contains objects with _id or just IDs. 
        // Based on schema, it's ObjectId ref, so likely populated objects or just IDs.
        // Let's handle both.
        const pkgServiceIds = pkg.packageServices.map(s => s._id || s);
        
        const isMatch = pkgServiceIds.every(id => selectedIds.includes(id.toString()));
        
        if (isMatch && pkgServiceIds.length === selectedIds.length) {
            // Exact match found!
            showPackageToast(pkg);
            return; // Show one at a time
        }
    }
}

function showPackageToast(pkg) {
    // Check if already showing
    if (document.getElementById('packageToast')) return;
    
    const toast = document.createElement('div');
    toast.id = 'packageToast';
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #2c3e50;
        color: white;
        padding: 15px 20px;
        border-radius: 30px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 15px;
        animation: slideUp 0.3s ease-out;
        width: 90%;
        max-width: 400px;
    `;
    
    toast.innerHTML = `
        <div style="flex: 1;">
            <div style="font-weight: bold; color: #f1c40f;">باقة متاحة!</div>
            <div style="font-size: 0.9em;">${pkg.name} بسعر ${pkg.price} دج</div>
        </div>
        <button onclick="applyPackage('${pkg._id}')" style="
            background: #f1c40f;
            color: #2c3e50;
            border: none;
            padding: 8px 15px;
            border-radius: 20px;
            font-weight: bold;
            cursor: pointer;
        ">تطبيق</button>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;font-size:1.2em;">&times;</button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 10000);
}

function applyPackage(packageId) {
    const pkg = availableServices.find(s => s._id === packageId);
    if (!pkg) return;
    
    // Remove component services
    const pkgServiceIds = pkg.packageServices.map(s => (s._id || s).toString());
    
    // Filter out services that are part of the package
    // We need to be careful not to remove services that are NOT part of the package
    // But here we only matched if ALL selected services are in the package (exact match logic above)
    // If we want to support partial match + others, we need to be more selective.
    // For now, let's remove the ones that match.
    
    // Find indices to remove (reverse order to not mess up indices)
    for (let i = selectedServices.length - 1; i >= 0; i--) {
        if (pkgServiceIds.includes(selectedServices[i].id)) {
            // Remove visual selection
            const card = document.querySelector(`[data-service-id="${selectedServices[i].id}"]`);
            if (card) card.classList.remove('selected');
            
            selectedServices.splice(i, 1);
        }
    }
    
    // Add package
    selectedServices.push({
        id: pkg._id,
        name: pkg.name,
        price: pkg.price,
        duration: pkg.duration,
        isPackage: true
    });
    
    // Note: We don't have a card for the package visible, so we can't select it visually.
    // But it will appear in the summary.
    
    updateBookingSummary();
    
    // Remove toast
    const toast = document.getElementById('packageToast');
    if (toast) toast.remove();
    
    showToast(`تم تطبيق باقة ${pkg.name}`, 'success');
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
    checkAvailability(); // Re-check availability with new duration

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
        // Calculate total duration
        const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0) || 30;
        
        const response = await fetch(`${API_BASE}/appointments/available-slots?business=${nassimBusinessId}&date=${date}&barber=${employeeId}&duration=${totalDuration}`);
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
        status: 'pending',
        isQuickBooking: true // Flag to indicate in-store quick booking (no welcome bonus)
    };
    
    console.log('Customer data:', customerData);
    console.log('Booking data to send:', appointmentData);
    
    try {
        const response = await fetch(`${API_BASE}/appointments/public/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentData)
        });
        
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response result:', result);
        
        if (response.ok && result.success) {
            const appointmentData = result.data || result.appointment || result;
            console.log('Appointment created successfully:', appointmentData);
            console.log('Appointment ID:', appointmentData._id);
            displaySuccessDetails(appointmentData);
            showLoading(false);
            showSuccess();
            showToast('تم حجز الموعد بنجاح! 🎉', 'success');
            
            // Auto login after successful booking
            setTimeout(() => {
                autoLoginAfterBooking();
            }, 100);
        } else {
            console.error('Booking failed:', result.message);
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
    
    // Try to get token from localStorage
    let token = localStorage.getItem('quick_book_token');
    
    // If no token, try to login again using stored password
    if (!token && customerPassword) {
        console.log('No token found, attempting to create session with stored password...');
        
        try {
            const loginResponse = await fetch(`${API_BASE}/customers/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    phone: customerData.phone, 
                    password: customerPassword 
                })
            });
            
            if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                token = loginData.token;
                if (token) {
                    localStorage.setItem('quick_book_token', token);
                    console.log('Session created successfully with stored password');
                }
            } else {
                console.error('Login failed:', await loginResponse.text());
            }
        } catch (error) {
            console.error('Error getting token:', error);
        }
    }
    
    if (token) {
        // Save token for nassim customer interface
        localStorage.setItem('customerToken', token);
        localStorage.setItem('customerData', JSON.stringify(customerData));
        
        // Clear password from memory for security
        customerPassword = null;
        
        showToast('جاري تسجيل الدخول إلى حسابك...', 'success');
        
        // Redirect to nassim customer interface
        setTimeout(() => {
            window.location.href = '/nassim/index.html';
        }, 100);
    } else {
        console.log('Could not get token, redirecting without auto-login');
        // Clear password from memory for security
        customerPassword = null;
        
        // Redirect anyway
        setTimeout(() => {
            window.location.href = '/nassim/index.html';
        }, 100);
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
