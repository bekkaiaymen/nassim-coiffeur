// Modern Customer Portal - Professional JavaScript
const API_URL = '/api';
let customerData = null;
let token = localStorage.getItem('customerToken');
let selectedTimeSlot = null;
let availableServices = [];
let currentBusinessId = null;
let allBusinesses = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 App initialized');
    console.log('🔑 Token:', token ? 'exists' : 'missing');
    
    if (!token) {
        window.location.href = '/customer-login';
        return;
    }
    
    await loadCustomerProfile();
    console.log('👤 After loadCustomerProfile, customerData:', customerData);
    
    await loadBusinesses();
    await loadUserFavorites();
    setupEventListeners();
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) dateInput.min = today;
});

// Setup Event Listeners
function setupEventListeners() {
    // Search
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        filterShops(e.target.value);
    });
    
    // Category filter
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            filterByCategory(item.dataset.category);
        });
    });
    
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterByCategory(tab.dataset.filter);
        });
    });
    
    // Booking form
    document.getElementById('bookingForm')?.addEventListener('submit', submitBooking);
}

// Load Customer Profile
async function loadCustomerProfile() {
    try {
        console.log('📡 Loading customer profile...');
        console.log('🔑 Using token:', token);
        
        // Always try to load from server first if we have a token
        if (!token) {
            console.log('❌ No token, redirecting to login');
            window.location.href = '/customer-login';
            return;
        }
        
        const response = await fetch(`${API_URL}/customers/public/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📥 Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Response data:', data);
            
            if (data.success && data.data) {
                customerData = data.data;
                console.log('✅ Customer data loaded:', customerData);
                localStorage.setItem('customerData', JSON.stringify(customerData));
                // تحديث البيانات في الصفحة إذا كانت صفحة الحساب مفتوحة
                if (!document.getElementById('accountPage')?.classList.contains('hidden')) {
                    loadAccountData();
                }
                return;
            }
        } else if (response.status === 401) {
            // Token expired or invalid
            console.log('❌ Token expired, redirecting to login...');
            localStorage.removeItem('customerToken');
            localStorage.removeItem('customerData');
            window.location.href = '/customer-login';
            return;
        } else {
            console.error('❌ Failed to load profile:', response.status);
        }
        
        // Fallback to stored data if server request fails
        const storedData = localStorage.getItem('customerData');
        if (storedData) {
            customerData = JSON.parse(storedData);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        // Try to use stored data
        const storedData = localStorage.getItem('customerData');
        if (storedData) {
            customerData = JSON.parse(storedData);
        }
    }
}

// Load Businesses with Skeleton
async function loadBusinesses() {
    try {
        // Skeleton loaders already showing
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate loading
        
        const response = await fetch(`${API_URL}/businesses/public`);
        const data = await response.json();
        
        if (data.success && data.data) {
            allBusinesses = data.data;
            displayShops(data.data);
            populateBusinessSelect(data.data);
        }
    } catch (error) {
        console.error('Error loading businesses:', error);
        showNotification('فشل تحميل المحلات', 'error');
    }
}

// Display Shops
function displayShops(businesses) {
    const container = document.getElementById('shopsList');
    
    if (!businesses || businesses.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد محلات متاحة</div>';
        return;
    }
    
    container.innerHTML = businesses.map((business, index) => {
        // استخدام صور placeholder احترافية من Unsplash
        const shopImages = [
            'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1622286346003-c44e89f87f70?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1521490878633-1b3a89b4e1d9?w=400&h=400&fit=crop'
        ];
        const shopImage = shopImages[index % shopImages.length];
        
        return `
        <div class="shop-card" onclick="showShopDetails('${business._id}')">
            <img src="${shopImage}" alt="${business.businessName}" class="shop-image" loading="lazy">
            <div class="shop-info">
                <div class="shop-header">
                    <div>
                        <div class="shop-name">${business.businessName}</div>
                        <div class="shop-address">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            </svg>
                            <span>${business.address?.city || 'المدينة'}</span>
                        </div>
                    </div>
                    <span class="shop-badge">مفتوح</span>
                </div>
                <div class="shop-meta">
                    <div class="meta-item rating">
                        <svg fill="currentColor" viewBox="0 0 20 20" width="14" height="14">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        <span>4.8</span>
                    </div>
                    <div class="meta-item">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        </svg>
                        <span>1.2 كم</span>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Show Shop Details
async function showShopDetails(businessId) {
    currentBusinessId = businessId;
    const business = allBusinesses.find(b => b._id === businessId);
    
    if (!business) return;
    
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('detailsPage').classList.remove('hidden');
    
    // صورة خلفية احترافية للتفاصيل
    const detailsImages = [
        'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1622286346003-c44e89f87f70?w=1200&h=800&fit=crop'
    ];
    const randomImage = detailsImages[Math.floor(Math.random() * detailsImages.length)];
    document.getElementById('detailsImage').src = randomImage;
    
    document.getElementById('detailsTitle').textContent = business.businessName;
    document.getElementById('detailsAddress').querySelector('span').textContent = 
        `${business.address?.street || ''}, ${business.address?.city || 'المدينة'}`;
    
    // Check favorite status
    checkFavoriteStatus();
    
    // جلب المختصين من قاعدة البيانات
    loadBusinessEmployees(businessId);
    
    // Load reviews from database
    loadBusinessReviews(businessId);
    
    window.scrollTo(0, 0);
}

// Load Business Employees from Database
async function loadBusinessEmployees(businessId) {
    const specialistsList = document.getElementById('specialistsList');
    
    // عرض skeleton loader
    specialistsList.innerHTML = `
        <div class="specialist-card skeleton">
            <div class="specialist-avatar skeleton-img"></div>
            <div class="specialist-name skeleton-text"></div>
        </div>
    `.repeat(4);
    
    try {
        const response = await fetch(`${API_URL}/employees/available/${businessId}`);
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
            const employees = data.data;
            
            // صور احترافية افتراضية
            const defaultImages = [
                'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300&h=300&fit=crop&crop=faces',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=faces',
                'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop&crop=faces',
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=faces'
            ];
            
            specialistsList.innerHTML = employees.map((emp, index) => {
                const imgSrc = emp.avatar || defaultImages[index % defaultImages.length];
                const rating = emp.stats?.rating ? emp.stats.rating.toFixed(1) : '5.0';
                const totalJobs = emp.stats?.totalAppointments || 0;
                
                return `
                    <div class="specialist-card">
                        <img src="${imgSrc}" alt="${emp.name}" class="specialist-avatar" loading="lazy" onerror="this.src='${defaultImages[0]}'">
                        <div class="specialist-name">${emp.name}</div>
                        <div class="specialist-role">${emp.jobTitle || 'حلاق'}</div>
                        ${emp.stats?.rating ? `
                            <div class="specialist-rating">
                                <span class="rating-stars">⭐</span>
                                <span>${rating}</span>
                                <span class="rating-count">(${totalJobs})</span>
                            </div>
                        ` : ''}
                        ${emp.specialties && emp.specialties.length > 0 ? `
                            <div class="specialist-specialties">
                                ${emp.specialties.slice(0, 2).map(s => `<span class="specialty-tag">${s}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        } else {
            specialistsList.innerHTML = '<div class="empty-state">لا يوجد موظفين متاحين حالياً</div>';
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        specialistsList.innerHTML = '<div class="empty-state">خطأ في تحميل الموظفين</div>';
    }
}

// Go Back to Home
function goBackToHome() {
    document.getElementById('detailsPage').classList.add('hidden');
    document.getElementById('homePage').classList.remove('hidden');
    currentBusinessId = null;
}

// Filter Functions
function filterShops(searchTerm) {
    const filtered = allBusinesses.filter(b => 
        b.businessName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    displayShops(filtered);
}

function filterByCategory(category) {
    if (category === 'all') {
        displayShops(allBusinesses);
    } else {
        // Filter logic here
        displayShops(allBusinesses);
    }
}

// Booking Modal
function openBookingModal() {
    const modal = document.getElementById('bookingModal');
    modal.classList.add('show');
    
    if (currentBusinessId) {
        document.getElementById('businessSelect').value = currentBusinessId;
        loadServices();
        loadAvailableEmployees();
    }
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    modal.classList.remove('show');
    document.getElementById('bookingForm').reset();
    selectedTimeSlot = null;
    document.getElementById('timeSlots').innerHTML = '<div class="empty-state">اختر التاريخ أولاً</div>';
}

// Populate Business Select
function populateBusinessSelect(businesses) {
    const select = document.getElementById('businessSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- اختر المحل --</option>';
    businesses.forEach(business => {
        const option = document.createElement('option');
        option.value = business._id;
        option.textContent = business.businessName;
        select.appendChild(option);
    });
}

// Load Services
async function loadServices() {
    const businessId = document.getElementById('businessSelect').value;
    const serviceSelect = document.getElementById('serviceSelect');
    
    if (!businessId) {
        serviceSelect.innerHTML = '<option value="">-- اختر الخدمة --</option>';
        serviceSelect.disabled = true;
        return;
    }
    
    serviceSelect.innerHTML = '<option value="">جاري التحميل...</option>';
    serviceSelect.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/services/public/by-business/${businessId}`);
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
            availableServices = data.data;
            populateServiceSelect(data.data);
            serviceSelect.disabled = false;
            // Load employees when business is selected
            loadAvailableEmployees();
        } else {
            serviceSelect.innerHTML = '<option value="">لا توجد خدمات متاحة</option>';
            showNotification('لا توجد خدمات متاحة لهذا المحل', 'error');
        }
    } catch (error) {
        console.error('Error loading services:', error);
        serviceSelect.innerHTML = '<option value="">خطأ في تحميل الخدمات</option>';
        showNotification('خطأ في تحميل الخدمات', 'error');
    }
}

// Populate Service Select
function populateServiceSelect(services) {
    const select = document.getElementById('serviceSelect');
    select.innerHTML = '<option value="">-- اختر الخدمة --</option>';
    
    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service._id;
        option.textContent = `${service.name} - ${service.duration} دقيقة`;
        select.appendChild(option);
    });
}

// Load Available Employees
async function loadAvailableEmployees() {
    const businessId = document.getElementById('businessSelect')?.value;
    const employeeContainer = document.getElementById('employeeSelection');
    
    if (!businessId || !employeeContainer) {
        return;
    }
    
    employeeContainer.innerHTML = '<p style="text-align:center;color:#999;">جاري تحميل الحلاقين...</p>';
    
    try {
        const response = await fetch(`${API_URL}/employees/available/${businessId}`);
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
            renderEmployees(data.data);
        } else {
            employeeContainer.innerHTML = '<p style="text-align:center;color:#999;">لا يوجد حلاقين متاحين حالياً</p>';
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        employeeContainer.innerHTML = '<p style="text-align:center;color:#999;">خطأ في تحميل الحلاقين</p>';
    }
}

// Render Employees
function renderEmployees(employees) {
    const container = document.getElementById('employeeSelection');
    if (!container) return;
    
    container.innerHTML = `
        <h4 style="margin-bottom:12px;font-size:15px;font-weight:600;">اختر الحلاق (اختياري)</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;">
            ${employees.map(emp => `
                <div class="employee-option" data-employee-id="${emp._id}" onclick="selectEmployee('${emp._id}', '${emp.name}')">
                    <div style="width:60px;height:60px;border-radius:50%;margin:0 auto 8px;background:linear-gradient(135deg,#6366f1,#4f46e5);display:flex;align-items:center;justify-content:center;color:white;font-size:24px;font-weight:600;">
                        ${emp.name.charAt(0)}
                    </div>
                    <div style="font-size:13px;font-weight:600;text-align:center;color:#333;">${emp.name}</div>
                    <div style="font-size:11px;color:#666;text-align:center;margin-top:4px;">${emp.jobTitle || 'حلاق'}</div>
                    ${emp.stats?.rating ? `
                        <div style="font-size:11px;color:#f59e0b;text-align:center;margin-top:4px;">
                            <i class="fas fa-star"></i> ${emp.stats.rating.toFixed(1)}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
            <div class="employee-option" data-employee-id="" onclick="selectEmployee('', 'أي حلاق')">
                <div style="width:60px;height:60px;border-radius:50%;margin:0 auto 8px;background:#e5e7eb;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:24px;">
                    <i class="fas fa-user-friends"></i>
                </div>
                <div style="font-size:13px;font-weight:600;text-align:center;color:#333;">أي حلاق</div>
                <div style="font-size:11px;color:#666;text-align:center;margin-top:4px;">متاح</div>
            </div>
        </div>
    `;
}

// Select Employee
let selectedEmployeeId = '';
let selectedEmployeeName = '';

function selectEmployee(employeeId, employeeName) {
    selectedEmployeeId = employeeId;
    selectedEmployeeName = employeeName;
    
    // Update UI
    document.querySelectorAll('.employee-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    event.target.closest('.employee-option').classList.add('selected');
}

// Update Service Info
function updateServiceInfo() {
    const serviceId = document.getElementById('serviceSelect').value;
    const serviceInfo = document.getElementById('serviceInfo');
    
    if (!serviceId) {
        serviceInfo.classList.add('hidden');
        return;
    }
    
    const service = availableServices.find(s => s._id === serviceId);
    if (service) {
        document.getElementById('serviceDuration').textContent = `${service.duration} دقيقة`;
        document.getElementById('servicePrice').textContent = `${service.price} ريال`;
        serviceInfo.classList.remove('hidden');
    }
}

// Load Available Slots
async function loadAvailableSlots() {
    const businessId = document.getElementById('businessSelect').value;
    const date = document.getElementById('appointmentDate').value;
    const timeSlotsContainer = document.getElementById('timeSlots');
    
    if (!businessId || !date) {
        timeSlotsContainer.innerHTML = '<div class="empty-state">اختر المحل والتاريخ</div>';
        return;
    }
    
    timeSlotsContainer.innerHTML = '<div class="loading">جاري التحميل...</div>';
    
    try {
        const response = await fetch(`${API_URL}/appointments/available-slots?business=${businessId}&date=${date}`);
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
            displayTimeSlots(data.data);
        } else {
            generateDefaultTimeSlots();
        }
    } catch (error) {
        console.error('Error loading slots:', error);
        generateDefaultTimeSlots();
    }
}

// Generate Default Time Slots
function generateDefaultTimeSlots() {
    const slots = [];
    for (let hour = 9; hour <= 21; hour++) {
        const hourStr = hour.toString().padStart(2, '0');
        slots.push({ time: `${hourStr}:00`, available: true });
        if (hour < 21) {
            slots.push({ time: `${hourStr}:30`, available: true });
        }
    }
    displayTimeSlots(slots);
}

// Display Time Slots
function displayTimeSlots(slots) {
    const container = document.getElementById('timeSlots');
    container.innerHTML = '';
    
    slots.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.className = `time-slot ${!slot.available ? 'unavailable' : ''}`;
        slotElement.textContent = slot.time;
        
        if (slot.available) {
            slotElement.onclick = () => selectTimeSlot(slot.time, slotElement);
        }
        
        container.appendChild(slotElement);
    });
}

// Select Time Slot
function selectTimeSlot(time, element) {
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    element.classList.add('selected');
    selectedTimeSlot = time;
}

// Submit Booking
async function submitBooking(e) {
    e.preventDefault();
    
    const businessId = document.getElementById('businessSelect').value;
    const serviceId = document.getElementById('serviceSelect').value;
    const date = document.getElementById('appointmentDate').value;
    const notes = document.getElementById('appointmentNotes').value;
    
    if (!selectedTimeSlot) {
        showNotification('الرجاء اختيار الوقت', 'error');
        return;
    }
    
    if (!customerData) {
        showNotification('الرجاء تسجيل الدخول', 'error');
        return;
    }
    
    const confirmBtn = document.getElementById('confirmBookingBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'جاري الحجز...';
    
    try {
        const appointmentData = {
            business: businessId,
            service: serviceId,
            customer: customerData._id,
            customerName: customerData.name,
            customerPhone: customerData.phone,
            date: date,
            time: selectedTimeSlot,
            notes: notes || '',
            employee: selectedEmployeeId || undefined,
            employeeName: selectedEmployeeName || undefined
        };
        
        const response = await fetch(`${API_URL}/appointments/public/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('✓ تم حجز الموعد بنجاح!', 'success');
            closeBookingModal();
            setTimeout(() => goBackToHome(), 1000);
        } else {
            showNotification(data.message || 'فشل حجز الموعد', 'error');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showNotification('حدث خطأ أثناء الحجز', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'تأكيد الحجز';
    }
}

// Navigation Functions
function showHome() {
    document.getElementById('detailsPage').classList.add('hidden');
    document.getElementById('homePage').classList.remove('hidden');
    updateNav('home');
}

function showExplore() {
    hideAllPages();
    document.getElementById('homePage')?.classList.remove('hidden');
    updateNav('explore');
    
    // Scroll to shops section
    setTimeout(() => {
        const shopsSection = document.getElementById('shopsList');
        if (shopsSection) {
            shopsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

function showMessages() {
    hideAllPages();
    const messagesPage = document.getElementById('messagesPage');
    if (messagesPage) {
        messagesPage.classList.remove('hidden');
        loadMessagesPage();
    } else {
        showNotification('صفحة الرسائل غير متوفرة حالياً', 'info');
    }
    updateNav('messages');
}

function showAccount() {
    window.location.href = '/customer';
}

function updateNav(active) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
}

// Action Functions
function sendMessage() {
    if (!currentBusinessId) {
        showNotification('الرجاء اختيار محل أولاً', 'error');
        return;
    }
    
    const messageText = prompt('اكتب رسالتك:');
    if (messageText && messageText.trim()) {
        sendMessageToBusiness(currentBusinessId, messageText.trim());
    }
}

async function sendMessageToBusiness(businessId, message) {
    if (!customerData) {
        showNotification('الرجاء تسجيل الدخول', 'error');
        return;
    }
    
    try {
        const currentToken = localStorage.getItem('customerToken');
        const response = await fetch(`${API_URL}/messages/send`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customerId: customerData._id,
                businessId: businessId,
                content: message
            })
        });
        
        if (response.ok) {
            showNotification('تم إرسال الرسالة بنجاح ✉️', 'success');
        } else {
            throw new Error('Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('فشل إرسال الرسالة', 'error');
    }
}

function makeCall() {
    if (!currentBusinessId) {
        showNotification('الرجاء اختيار محل أولاً', 'error');
        return;
    }
    
    const business = allBusinesses.find(b => b._id === currentBusinessId);
    if (business && business.phone) {
        window.location.href = `tel:${business.phone}`;
    } else {
        showNotification('رقم الهاتف غير متوفر', 'error');
    }
}

function getDirections() {
    if (!currentBusinessId) {
        showNotification('الرجاء اختيار محل أولاً', 'error');
        return;
    }
    
    const business = allBusinesses.find(b => b._id === currentBusinessId);
    if (business && business.address) {
        const address = `${business.address.street || ''}, ${business.address.city || ''}`;
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        window.open(mapsUrl, '_blank');
    } else {
        showNotification('العنوان غير متوفر', 'error');
    }
}

function shareShop() {
    if (!currentBusinessId) {
        showNotification('الرجاء اختيار محل أولاً', 'error');
        return;
    }
    
    const business = allBusinesses.find(b => b._id === currentBusinessId);
    if (!business) return;
    
    const shareData = {
        title: business.businessName,
        text: `تحقق من ${business.businessName} - خدمات رائعة!`,
        url: window.location.href
    };
    
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => showNotification('تمت المشاركة بنجاح', 'success'))
            .catch(() => copyToClipboard(window.location.href));
    } else {
        copyToClipboard(window.location.href);
    }
}

function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showNotification('تم نسخ الرابط 📋', 'success');
}

function showAllCategories() {
    const categoriesModal = document.createElement('div');
    categoriesModal.className = 'modal show';
    categoriesModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">جميع التصنيفات</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="categories-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; padding: 20px;">
                <div class="category-card" onclick="filterByCategory('barbershop'); this.closest('.modal').remove();" style="padding: 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 10px;">✂️</div>
                    <div style="font-weight: 600;">صالونات حلاقة</div>
                </div>
                <div class="category-card" onclick="filterByCategory('salon'); this.closest('.modal').remove();" style="padding: 20px; text-align: center; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 12px; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 10px;">💇</div>
                    <div style="font-weight: 600;">صالونات تجميل</div>
                </div>
                <div class="category-card" onclick="filterByCategory('spa'); this.closest('.modal').remove();" style="padding: 20px; text-align: center; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; border-radius: 12px; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🧖</div>
                    <div style="font-weight: 600;">سبا</div>
                </div>
                <div class="category-card" onclick="filterByCategory('all'); this.closest('.modal').remove();" style="padding: 20px; text-align: center; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; border-radius: 12px; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🏪</div>
                    <div style="font-weight: 600;">الكل</div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(categoriesModal);
}

function showAllShops() {
    hideAllPages();
    document.getElementById('homePage')?.classList.remove('hidden');
    displayShops(allBusinesses);
    showNotification(`عرض ${allBusinesses.length} محل`, 'success');
}

function showAllSpecialists() {
    showNotification('قائمة المختصين ستتوفر قريباً', 'info');
}

function showNotifications() {
    showNotificationsPage();
}

function toggleFilters() {
    const modal = document.getElementById('filtersModal');
    modal.classList.add('show');
}

function closeFiltersModal() {
    const modal = document.getElementById('filtersModal');
    modal.classList.remove('show');
}

// Filter Functions
let currentFilters = {
    minPrice: 0,
    maxPrice: 1000,
    rating: 0,
    distance: 100,
    openNow: false,
    availableToday: false,
    services: []
};

function filterByRating(rating) {
    currentFilters.rating = rating;
    document.querySelectorAll('.rating-filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.rating-filter-btn').classList.add('active');
}

function filterByDistance(distance) {
    currentFilters.distance = distance;
    document.querySelectorAll('.distance-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.distance-btn').classList.add('active');
}

function resetFilters() {
    currentFilters = {
        minPrice: 0,
        maxPrice: 1000,
        rating: 0,
        distance: 100,
        openNow: false,
        availableToday: false,
        services: []
    };
    
    // Reset UI
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.querySelectorAll('.rating-filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.distance-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    showNotification('تم إعادة تعيين الفلاتر', 'success');
}

function applyFilters() {
    // Get price values
    const minPrice = parseInt(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseInt(document.getElementById('maxPrice').value) || 10000;
    currentFilters.minPrice = minPrice;
    currentFilters.maxPrice = maxPrice;
    
    // Get checkbox values
    currentFilters.openNow = document.getElementById('openNow').checked;
    currentFilters.availableToday = document.getElementById('availableToday').checked;
    
    // Get selected services
    currentFilters.services = Array.from(document.querySelectorAll('.services-filters input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    // Apply filters to shops list
    let filteredShops = [...allBusinesses];
    
    // Real filter implementation
    // Filter by rating (if selected)
    if (currentFilters.rating > 0) {
        filteredShops = filteredShops.filter(shop => {
            // Mock rating - in real app would come from shop data
            const shopRating = 4.8; // Default rating
            return shopRating >= currentFilters.rating;
        });
    }
    
    // Filter by distance (if not default)
    if (currentFilters.distance < 100) {
        filteredShops = filteredShops.filter(shop => {
            // Mock distance - in real app would calculate from user location
            const shopDistance = Math.random() * 15; // Random distance 0-15km
            return shopDistance <= currentFilters.distance;
        });
    }
    
    // Filter by open now
    if (currentFilters.openNow) {
        // In real app, would check shop's actual opening hours
        filteredShops = filteredShops; // Mock - assume all open
    }
    
    // Filter by services
    if (currentFilters.services.length > 0) {
        // Mock - in real app would check shop's actual services
        filteredShops = filteredShops; // Keep all for demo
    }
    
    closeFiltersModal();
    
    const filterCount = [
        currentFilters.rating > 0,
        currentFilters.distance < 100,
        currentFilters.openNow,
        currentFilters.availableToday,
        currentFilters.services.length > 0
    ].filter(Boolean).length;
    
    if (filterCount > 0) {
        showNotification(`✓ تم العثور على ${filteredShops.length} محل (${filterCount} فلتر مطبق)`, 'success');
    } else {
        showNotification('تم إلغاء جميع الفلاتر', 'success');
    }
    
    // Update display
    displayShops(filteredShops);
}

// Notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Navigation Functions
function showHome() {
    hideAllPages();
    document.getElementById('homePage')?.classList.remove('hidden');
    updateNavState(0);
}

function showExplore() {
    hideAllPages();
    document.getElementById('explorePage')?.classList.remove('hidden');
    updateNavState(1);
    loadExploreContent();
}

function showMessages() {
    hideAllPages();
    document.getElementById('messagesPage')?.classList.remove('hidden');
    updateNavState(3);
}

async function showAccount() {
    console.log('🔵 showAccount called');
    console.log('👤 Current customerData:', customerData);
    
    hideAllPages();
    document.getElementById('accountPage')?.classList.remove('hidden');
    updateNavState(4);
    
    // تحديث البيانات من localStorage أولاً
    const storedData = localStorage.getItem('customerData');
    console.log('💾 Stored data:', storedData);
    
    if (storedData) {
        try {
            customerData = JSON.parse(storedData);
            console.log('✅ Parsed customerData:', customerData);
        } catch (e) {
            console.error('❌ Error parsing customer data:', e);
        }
    }
    
    // إذا لم تكن هناك بيانات، تحميلها من السيرفر
    if (!customerData) {
        console.log('⚠️ No customerData, loading from server...');
        await loadCustomerProfile();
    }
    
    console.log('🎯 About to call loadAccountData');
    
    // تحديث واجهة الحساب
    setTimeout(() => {
        loadAccountData();
    }, 100);
}

function hideAllPages() {
    document.getElementById('homePage')?.classList.add('hidden');
    document.getElementById('detailsPage')?.classList.add('hidden');
    document.getElementById('explorePage')?.classList.add('hidden');
    document.getElementById('messagesPage')?.classList.add('hidden');
    document.getElementById('accountPage')?.classList.add('hidden');
    document.getElementById('notificationsPage')?.classList.add('hidden');
    document.getElementById('favoritesPage')?.classList.add('hidden');
    document.getElementById('bookingHistoryPage')?.classList.add('hidden');
    document.getElementById('editProfilePage')?.classList.add('hidden');
}

function updateNavState(index) {
    const navItems = document.querySelectorAll('.nav-item:not(.center)');
    navItems.forEach((item, i) => {
        if (i === index) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Notifications Page
function showNotificationsPage() {
    hideAllPages();
    document.getElementById('notificationsPage')?.classList.remove('hidden');
    loadNotifications();
}

async function loadNotifications() {
    const container = document.getElementById('notificationsList');
    const emptyState = document.querySelector('.empty-notifications');
    
    if (!customerData) {
        container.innerHTML = '<div style="text-align: center; padding: 20px;">جاري التحميل...</div>';
        return;
    }
    
    try {
        const currentToken = localStorage.getItem('customerToken');
        const response = await fetch(`${API_URL}/notifications/user`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (!response.ok) throw new Error('Failed to load notifications');
        
        const data = await response.json();
        const notifications = data.data || [];
        
        if (notifications.length === 0) {
            emptyState?.classList.remove('hidden');
            container.innerHTML = '';
            return;
        }
        
        emptyState?.classList.add('hidden');
        
        // Update badge
        const badge = document.querySelector('.badge');
        if (badge) badge.textContent = data.unreadCount || 0;
        
        container.innerHTML = notifications.map(notif => {
            const timeAgo = getTimeAgo(new Date(notif.createdAt));
            return `
                <div class="notification-item ${!notif.read ? 'unread' : ''}" onclick="markAsRead('${notif._id}')">
                    <div class="notification-icon">${notif.icon || '🔔'}</div>
                    <div class="notification-content">
                        <div class="notification-title">${notif.title}</div>
                        <div class="notification-text">${notif.message}</div>
                        <div class="notification-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading notifications:', error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">فشل تحميل الإشعارات</div>';
    }
}

async function markAsRead(notificationId) {
    try {
        const currentToken = localStorage.getItem('customerToken');
        const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            loadNotifications();
        }
    } catch (error) {
        console.error('Error marking as read:', error);
    }
}

// Helper function to calculate time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' سنة';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' شهر';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' يوم';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' ساعة';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' دقيقة';
    
    return 'الآن';
}

// Favorites Page
function showFavorites() {
    hideAllPages();
    document.getElementById('favoritesPage')?.classList.remove('hidden');
    loadFavoritesPage();
}

async function loadFavoritesPage() {
    const container = document.getElementById('favoritesList');
    const emptyState = document.querySelector('.empty-favorites');
    
    if (!customerData) {
        container.innerHTML = '<div style="text-align: center; padding: 20px;">جاري التحميل...</div>';
        return;
    }
    
    try {
        const currentToken = localStorage.getItem('customerToken');
        const response = await fetch(`${API_URL}/favorites/user`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (!response.ok) throw new Error('Failed to load favorites');
        
        const data = await response.json();
        const favoritesData = data.data || [];
        
        if (favoritesData.length === 0) {
            emptyState?.classList.remove('hidden');
            container.innerHTML = '';
            return;
        }
        
        emptyState?.classList.add('hidden');
        
        // Extract business data from favorites
        const favoriteBusinesses = favoritesData.map(fav => fav.business).filter(b => b);
        
        // Update local favorites array for toggleFavorite
        favorites = favoritesData.map(fav => fav.business?._id).filter(id => id);
        
        displayShopsInContainer(favoriteBusinesses, container);
    } catch (error) {
        console.error('Error loading favorites:', error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">فشل تحميل المفضلة</div>';
    }
}

function displayShopsInContainer(businesses, container) {
    const shopImages = [
        'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1622286346003-c44e89f87f70?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1521490878633-1b3a89b4e1d9?w=400&h=400&fit=crop'
    ];
    
    container.innerHTML = businesses.map((business, index) => {
        const shopImage = shopImages[index % shopImages.length];
        const isFavorite = favorites.includes(business._id);
        
        return `
        <div class="shop-card" onclick="showShopDetails('${business._id}')">
            <img src="${shopImage}" alt="${business.businessName}" class="shop-image" loading="lazy">
            <div class="shop-info">
                <div class="shop-header">
                    <div>
                        <div class="shop-name">${business.businessName}</div>
                        <div class="shop-address">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            </svg>
                            <span>${business.address?.city || 'المدينة'}</span>
                        </div>
                    </div>
                    <span class="shop-badge">مفتوح</span>
                </div>
                <div class="shop-meta">
                    <div class="meta-item rating">
                        <svg fill="currentColor" viewBox="0 0 20 20" width="14" height="14">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        <span>4.8</span>
                    </div>
                    <div class="meta-item">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        </svg>
                        <span>1.2 كم</span>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Booking History Page
function showBookingHistory() {
    hideAllPages();
    document.getElementById('bookingHistoryPage')?.classList.remove('hidden');
    loadBookingHistory('all');
}

let currentBookingFilter = 'all';

function filterBookings(filter) {
    currentBookingFilter = filter;
    document.querySelectorAll('.booking-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    loadBookingHistory(filter);
}

async function loadBookingHistory(filter = 'all') {
    const container = document.getElementById('bookingsList');
    const emptyState = document.querySelector('.empty-bookings');
    
    if (!customerData) {
        container.innerHTML = '<div style="text-align: center; padding: 20px;">جاري التحميل...</div>';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/appointments/public/customer/${customerData.phone}`);
        
        if (!response.ok) throw new Error('Failed to load bookings');
        
        const data = await response.json();
        let allBookings = data.data || [];
        
        // Map status for filtering
        allBookings = allBookings.map(booking => {
            let status = 'upcoming';
            const bookingDate = new Date(booking.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (booking.status === 'cancelled') {
                status = 'cancelled';
            } else if (booking.status === 'completed' || bookingDate < today) {
                status = 'completed';
            } else if (booking.status === 'confirmed' || booking.status === 'pending') {
                status = 'upcoming';
            }
            
            return { ...booking, displayStatus: status };
        });
        
        // Apply filter
        let bookings = allBookings;
        if (filter !== 'all') {
            bookings = allBookings.filter(b => b.displayStatus === filter);
        }
        
        if (bookings.length === 0) {
            emptyState?.classList.remove('hidden');
            container.innerHTML = '';
            return;
        }
        
        emptyState?.classList.add('hidden');
        container.innerHTML = bookings.map(booking => {
            const business = allBusinesses.find(b => b._id === booking.business);
            const shopName = business?.businessName || booking.customerName || 'غير محدد';
            
            return `
                <div class="booking-card ${booking.displayStatus}">
                    <div class="booking-header">
                        <div class="booking-shop-name">${shopName}</div>
                        <span class="booking-status ${booking.displayStatus}">
                            ${booking.displayStatus === 'upcoming' ? 'قادم' : booking.displayStatus === 'completed' ? 'مكتمل' : 'ملغي'}
                        </span>
                    </div>
                    <div class="booking-details">
                        <div class="booking-detail-item">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span>${booking.service || 'خدمة'}</span>
                        </div>
                        <div class="booking-detail-item">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            <span>${booking.date} - ${booking.time}</span>
                        </div>
                        ${booking.price ? `
                        <div class="booking-detail-item">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span>${booking.price} ريال</span>
                        </div>
                        ` : ''}
                    </div>
                    <div class="booking-actions">
                        ${booking.displayStatus === 'upcoming' ? `
                            <button class="booking-action-btn" onclick="cancelBooking('${booking._id}')">إلغاء الحجز</button>
                            <button class="booking-action-btn primary" onclick="viewBookingDetails('${booking._id}')">التفاصيل</button>
                        ` : booking.displayStatus === 'completed' ? `
                            <button class="booking-action-btn primary" onclick="rebookAppointment('${booking._id}')">إعادة الحجز</button>
                            <button class="booking-action-btn" onclick="writeReviewForBooking('${booking._id}', '${booking.business}')">اكتب تقييم</button>
                        ` : `
                            <button class="booking-action-btn primary" onclick="rebookAppointment('${booking._id}')">إعادة الحجز</button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading bookings:', error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">فشل تحميل الحجوزات</div>';
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) return;
    
    try {
        const currentToken = localStorage.getItem('customerToken');
        const response = await fetch(`${API_URL}/appointments/${bookingId}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('تم إلغاء الحجز بنجاح', 'success');
            setTimeout(() => loadBookingHistory(currentBookingFilter), 500);
        } else {
            throw new Error('Failed to cancel booking');
        }
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showNotification('فشل إلغاء الحجز', 'error');
    }
}

function viewBookingDetails(bookingId) {
    showNotification('عرض تفاصيل الحجز...', 'success');
}

function rebookAppointment(bookingId) {
    openBookingModal();
    showNotification('املأ البيانات لإعادة الحجز', 'success');
}

function writeReviewForBooking(bookingId, businessId) {
    if (businessId) {
        currentBusinessId = businessId;
    }
    writeReview(bookingId);
}

// Explore Page Functions
function loadExploreContent() {
    // Load featured shops
    const featuredShops = allBusinesses.slice(0, 4);
    displayFeaturedShops(featuredShops);
    
    // Load all shops in explore
    displayExploreShops(allBusinesses);
}

function displayFeaturedShops(shops) {
    const container = document.getElementById('featuredShops');
    if (!container) return;
    
    const shopImages = [
        'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1622286346003-c44e89f87f70?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop'
    ];
    
    container.innerHTML = shops.map((shop, index) => `
        <div class="shop-card" onclick="showShopDetails('${shop._id}')">
            <img src="${shopImages[index]}" alt="${shop.businessName}" class="shop-image" loading="lazy">
            <div class="shop-info">
                <div class="shop-name">${shop.businessName}</div>
                <div class="shop-meta">
                    <div class="meta-item rating">
                        <svg fill="currentColor" viewBox="0 0 20 20" width="14" height="14">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        4.9
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function displayExploreShops(shops) {
    const container = document.getElementById('allExploreShops');
    if (!container) return;
    displayShops(shops);
}

function showListView() {
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.toggle-btn').classList.add('active');
    showNotification('عرض القائمة', 'success');
}

function showMapView() {
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.toggle-btn').classList.add('active');
    
    // Create map modal
    const mapModal = document.createElement('div');
    mapModal.className = 'modal show';
    mapModal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; height: 80vh;">
            <div class="modal-header">
                <h2 class="modal-title">🗺️ خريطة المحلات</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 20px; text-align: center; height: calc(100% - 80px); display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <div style="font-size: 100px; margin-bottom: 20px;">🗺️</div>
                <h3 style="color: #333; margin-bottom: 15px;">خريطة تفاعلية</h3>
                <p style="color: #666; max-width: 500px; line-height: 1.8;">
                    سيتم إضافة خريطة تفاعلية تعرض جميع المحلات القريبة منك مع إمكانية الفلترة والبحث
                </p>
                <button onclick="this.closest('.modal').remove(); showListView();" style="margin-top: 30px; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
                    العودة لعرض القائمة
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(mapModal);
}

// Account Page Functions
function loadAccountData() {
    console.log('🎨 loadAccountData called');
    console.log('👤 customerData:', customerData);
    
    if (!customerData) {
        console.log('⚠️ No customerData, trying localStorage...');
        // محاولة التحميل من localStorage
        const stored = localStorage.getItem('customerData');
        console.log('💾 localStorage data:', stored);
        
        if (stored) {
            try {
                customerData = JSON.parse(stored);
                console.log('✅ Loaded from localStorage:', customerData);
            } catch (e) {
                console.error('❌ Error parsing:', e);
                return;
            }
        } else {
            console.error('❌ No data in localStorage either!');
            return;
        }
    }
    
    // عرض المعلومات الحقيقية - استخدام innerHTML لضمان التحديث
    const nameElement = document.getElementById('profileName');
    const emailElement = document.getElementById('profileEmail');
    const phoneElement = document.getElementById('profilePhone');
    
    console.log('🔍 Elements:', {
        nameElement: nameElement ? 'found' : 'NOT FOUND',
        emailElement: emailElement ? 'found' : 'NOT FOUND',
        phoneElement: phoneElement ? 'found' : 'NOT FOUND'
    });
    
    if (nameElement) {
        const name = customerData.name || 'غير محدد';
        nameElement.innerHTML = name;
        console.log('✅ Name set to:', name);
    }
    
    if (emailElement) {
        const email = customerData.email || customerData.phone || 'غير محدد';
        emailElement.innerHTML = email;
        console.log('✅ Email set to:', email);
    }
    
    if (phoneElement) {
        const phone = customerData.phone || 'غير محدد';
        phoneElement.innerHTML = phone;
        console.log('✅ Phone set to:', phone);
    }
    
    // تحديث صورة الملف الشخصي
    if (customerData.profileImage) {
        const imgElement = document.getElementById('profileImage');
        if (imgElement) {
            imgElement.src = customerData.profileImage;
            console.log('✅ Profile image updated');
        }
    }
    
    console.log('✅ loadAccountData completed');
}

// Edit Profile
function editProfile() {
    hideAllPages();
    document.getElementById('editProfilePage')?.classList.remove('hidden');
    
    // Populate form with current data
    if (customerData) {
        document.getElementById('editName').value = customerData.name || '';
        document.getElementById('editPhone').value = customerData.phone || '';
        document.getElementById('editEmail').value = customerData.email || '';
        document.getElementById('editAddress').value = customerData.address || '';
    }
    
    // Setup form submit
    const form = document.getElementById('editProfileForm');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const updatedData = {
                name: document.getElementById('editName').value,
                phone: document.getElementById('editPhone').value,
                email: document.getElementById('editEmail').value,
                address: document.getElementById('editAddress').value
            };
            
            try {
                if (!customerData || !customerData._id) {
                    showNotification('الرجاء تسجيل الدخول مرة أخرى', 'error');
                    return;
                }
                
                const response = await fetch(`${API_URL}/customers/public/profile/${customerData._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedData)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        customerData = { ...customerData, ...updatedData };
                        localStorage.setItem('customerData', JSON.stringify(customerData));
                        showNotification('تم حفظ التغييرات بنجاح! ✓', 'success');
                        setTimeout(() => showAccount(), 1000);
                    } else {
                        showNotification(data.message || 'فشل حفظ التغييرات', 'error');
                    }
                } else if (response.status === 401) {
                    showNotification('انتهت صلاحية الجلسة. الرجاء تسجيل الدخول مرة أخرى', 'error');
                    setTimeout(() => {
                        localStorage.clear();
                        window.location.href = '/customer-login';
                    }, 2000);
                } else {
                    const errorData = await response.json();
                    showNotification(errorData.message || 'فشل حفظ التغييرات', 'error');
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                showNotification('حدث خطأ أثناء حفظ التغييرات', 'error');
            }
        };
    }
}

function showNotificationSettings() {
    notificationSettings();
}

function showLanguageSettings() {
    languageSettings();
}

function showHelp() {
    helpSupport();
}

function showAbout() {
    const aboutModal = document.createElement('div');
    aboutModal.className = 'modal show';
    aboutModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">ℹ️ حول التطبيق</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 30px; text-align: center;">
                <div style="font-size: 80px; margin-bottom: 20px;">✂️</div>
                <h2 style="color: #333; margin-bottom: 10px;">SmartBiz</h2>
                <p style="color: #666; margin-bottom: 20px;">نظام إدارة حجوزات احترافي</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="font-size: 14px; color: #666; margin-bottom: 8px;">الإصدار</div>
                    <div style="font-size: 20px; font-weight: 600; color: #667eea;">2.0.0</div>
                </div>
                <div style="font-size: 13px; color: #999;">© 2025 SmartBiz. جميع الحقوق محفوظة</div>
            </div>
        </div>
    `;
    document.body.appendChild(aboutModal);
}

function showAllCategories() {
    showAllCategories();
}

function notificationSettings() {
    const settingsModal = document.createElement('div');
    settingsModal.className = 'modal show';
    settingsModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">🔔 إعدادات الإشعارات</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee;">
                    <div>
                        <div style="font-weight: 600; margin-bottom: 5px;">إشعارات الحجوزات</div>
                        <div style="font-size: 13px; color: #666;">تلقي إشعارات عند تأكيد أو إلغاء الحجز</div>
                    </div>
                    <input type="checkbox" checked style="width: 20px; height: 20px; cursor: pointer;">
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee;">
                    <div>
                        <div style="font-weight: 600; margin-bottom: 5px;">تذكير بالمواعيد</div>
                        <div style="font-size: 13px; color: #666;">تذكيرك قبل موعدك بـ 24 ساعة</div>
                    </div>
                    <input type="checkbox" checked style="width: 20px; height: 20px; cursor: pointer;">
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee;">
                    <div>
                        <div style="font-weight: 600; margin-bottom: 5px;">العروض الخاصة</div>
                        <div style="font-size: 13px; color: #666;">إشعارات بالعروض والخصومات</div>
                    </div>
                    <input type="checkbox" checked style="width: 20px; height: 20px; cursor: pointer;">
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0;">
                    <div>
                        <div style="font-weight: 600; margin-bottom: 5px;">الرسائل الجديدة</div>
                        <div style="font-size: 13px; color: #666;">إشعارات عند استلام رسالة جديدة</div>
                    </div>
                    <input type="checkbox" checked style="width: 20px; height: 20px; cursor: pointer;">
                </div>
                <button onclick="this.closest('.modal').remove(); showNotification('تم حفظ الإعدادات', 'success');" style="width: 100%; margin-top: 20px; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
                    حفظ الإعدادات
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(settingsModal);
}

function languageSettings() {
    const langModal = document.createElement('div');
    langModal.className = 'modal show';
    langModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">🌍 اللغة</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div onclick="this.closest('.modal').remove(); showNotification('تم تغيير اللغة إلى العربية', 'success');" style="padding: 20px; margin-bottom: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; font-size: 18px; margin-bottom: 5px;">العربية</div>
                        <div style="font-size: 13px; opacity: 0.9;">اللغة الحالية</div>
                    </div>
                    <div style="font-size: 24px;">✓</div>
                </div>
                <div onclick="showNotification('ستتوفر اللغة الإنجليزية قريباً', 'info');" style="padding: 20px; background: #f5f5f5; color: #333; border-radius: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; font-size: 18px; margin-bottom: 5px;">English</div>
                        <div style="font-size: 13px; color: #666;">Coming soon</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(langModal);
}

function helpSupport() {
    const helpModal = document.createElement('div');
    helpModal.className = 'modal show';
    helpModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">💬 المساعدة والدعم</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="font-size: 60px; margin-bottom: 15px;">🎧</div>
                    <h3 style="color: #333; margin-bottom: 10px;">كيف يمكننا مساعدتك؟</h3>
                    <p style="color: #666;">نحن هنا لمساعدتك في أي وقت</p>
                </div>
                <div onclick="window.location.href='mailto:support@smartbiz.sa'" style="padding: 15px; margin-bottom: 10px; background: #f8f9fa; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 30px;">📧</div>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 3px;">البريد الإلكتروني</div>
                        <div style="font-size: 13px; color: #666;">support@smartbiz.sa</div>
                    </div>
                </div>
                <div onclick="window.location.href='tel:+966920000000'" style="padding: 15px; margin-bottom: 10px; background: #f8f9fa; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 30px;">📞</div>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 3px;">الهاتف</div>
                        <div style="font-size: 13px; color: #666;">920000000</div>
                    </div>
                </div>
                <div onclick="window.open('https://wa.me/966500000000', '_blank')" style="padding: 15px; background: #f8f9fa; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 30px;">💬</div>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 3px;">واتساب</div>
                        <div style="font-size: 13px; color: #666;">تواصل معنا</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(helpModal);
}

// Favorites System
let favorites = [];

// Load favorites from database
async function loadUserFavorites() {
    const currentToken = localStorage.getItem('customerToken');
    if (!currentToken || !customerData) {
        favorites = [];
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/favorites/user`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            favorites = data.data.map(fav => fav.business?._id).filter(id => id);
        } else if (response.status === 401) {
            console.log('Token expired or invalid');
            favorites = [];
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
        favorites = [];
    }
}

async function toggleFavorite(event) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const businessId = currentBusinessId;
    
    if (!customerData) {
        showNotification('الرجاء تسجيل الدخول', 'error');
        return;
    }
    
    try {
        const currentToken = localStorage.getItem('customerToken');
        const response = await fetch(`${API_URL}/favorites/toggle`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customerId: customerData._id,
                businessId: businessId
            })
        });
        
        if (!response.ok) throw new Error('Failed to toggle favorite');
        
        const data = await response.json();
        
        if (data.isFavorite) {
            // Added to favorites
            favorites.push(businessId);
            btn.classList.add('active');
            showNotification('تم الإضافة إلى المفضلة ❤️', 'success');
        } else {
            // Removed from favorites
            favorites = favorites.filter(id => id !== businessId);
            btn.classList.remove('active');
            showNotification('تم الإزالة من المفضلة', 'success');
        }
        
        // Refresh favorites page if currently viewing
        if (!document.getElementById('favoritesPage').classList.contains('hidden')) {
            setTimeout(() => loadFavoritesPage(), 500);
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showNotification('حدث خطأ', 'error');
    }
}

function checkFavoriteStatus() {
    const btn = document.querySelector('.favorite-btn');
    if (btn && currentBusinessId) {
        if (favorites.includes(currentBusinessId)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
}

// Advanced Search with Debounce
let searchTimeout;
function setupAdvancedSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            hideSuggestions();
            return;
        }
        
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300); // Debounce 300ms
    });
}

function performSearch(query) {
    const filtered = allBusinesses.filter(b => 
        b.businessName.toLowerCase().includes(query.toLowerCase()) ||
        b.address?.city?.toLowerCase().includes(query.toLowerCase())
    );
    
    displayShops(filtered);
    showNotification(`تم العثور على ${filtered.length} نتيجة`, 'success');
}

function hideSuggestions() {
    const suggestions = document.querySelector('.search-suggestions');
    if (suggestions) {
        suggestions.classList.remove('show');
    }
}

// Reviews System
function writeReview() {
    const reviewModal = document.createElement('div');
    reviewModal.className = 'modal show';
    reviewModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">✍️ اكتب تقييمك</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <form id="reviewForm" onsubmit="submitReview(event)">
                <div class="form-group">
                    <label class="form-label">التقييم *</label>
                    <div class="rating-selector">
                        <button type="button" class="star-btn" data-rating="1">⭐</button>
                        <button type="button" class="star-btn" data-rating="2">⭐</button>
                        <button type="button" class="star-btn" data-rating="3">⭐</button>
                        <button type="button" class="star-btn" data-rating="4">⭐</button>
                        <button type="button" class="star-btn" data-rating="5">⭐</button>
                    </div>
                    <input type="hidden" id="reviewRating" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">عنوان التقييم *</label>
                    <input type="text" id="reviewTitle" class="form-input" placeholder="مثال: خدمة ممتازة!" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">تفاصيل التقييم *</label>
                    <textarea id="reviewText" rows="5" class="form-input" placeholder="شارك تجربتك مع الآخرين..." required></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">تقييم سريع</label>
                    <div class="quick-tags">
                        <label class="tag-label">
                            <input type="checkbox" value="service">
                            <span>خدمة ممتازة</span>
                        </label>
                        <label class="tag-label">
                            <input type="checkbox" value="clean">
                            <span>نظافة عالية</span>
                        </label>
                        <label class="tag-label">
                            <input type="checkbox" value="price">
                            <span>سعر مناسب</span>
                        </label>
                        <label class="tag-label">
                            <input type="checkbox" value="time">
                            <span>سرعة إنجاز</span>
                        </label>
                    </div>
                </div>
                
                <button type="submit" class="book-now-btn">نشر التقييم</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(reviewModal);
    
    // Setup star rating
    const starBtns = reviewModal.querySelectorAll('.star-btn');
    starBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            const rating = parseInt(btn.dataset.rating);
            document.getElementById('reviewRating').value = rating;
            
            starBtns.forEach((b, i) => {
                if (i < rating) {
                    b.style.opacity = '1';
                    b.style.transform = 'scale(1.2)';
                } else {
                    b.style.opacity = '0.3';
                    b.style.transform = 'scale(1)';
                }
            });
        });
    });
}

async function submitReview(e) {
    e.preventDefault();
    
    const rating = document.getElementById('reviewRating').value;
    const title = document.getElementById('reviewTitle').value;
    const text = document.getElementById('reviewText').value;
    
    if (!rating) {
        showNotification('الرجاء اختيار التقييم', 'error');
        return;
    }
    
    if (!customerData) {
        showNotification('الرجاء تسجيل الدخول', 'error');
        return;
    }
    
    const reviewData = {
        customerId: customerData._id,
        businessId: currentBusinessId,
        rating: parseInt(rating),
        title: title,
        comment: text,
        tags: Array.from(document.querySelectorAll('.quick-tags input:checked')).map(cb => cb.value)
    };
    
    try {
        showNotification('جاري نشر التقييم...', 'success');
        
        const currentToken = localStorage.getItem('customerToken');
        const response = await fetch(`${API_URL}/reviews/create`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reviewData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to submit review');
        }
        
        const data = await response.json();
        showNotification('شكراً! تم نشر تقييمك بنجاح ⭐', 'success');
        document.querySelector('.modal')?.remove();
        
        // Refresh reviews if on details page
        if (!document.getElementById('detailsPage').classList.contains('hidden')) {
            setTimeout(() => {
                loadBusinessReviews(currentBusinessId);
            }, 500);
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showNotification(error.message || 'حدث خطأ أثناء نشر التقييم', 'error');
    }
}

async function loadReviews(businessId) {
    try {
        const response = await fetch(`${API_URL}/reviews/business/${businessId}`);
        
        if (!response.ok) {
            console.error('Failed to load reviews');
            return [];
        }
        
        const data = await response.json();
        const reviews = data.data || [];
        
        // Transform to match UI format
        return reviews.map(review => ({
            id: review._id,
            name: review.customer?.name || review.user?.name || 'عميل',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
            rating: review.rating,
            date: getTimeAgo(new Date(review.createdAt)),
            text: review.comment,
            title: review.title,
            tags: review.tags
        }));
    } catch (error) {
        console.error('Error loading reviews:', error);
        return [];
    }
}

async function loadBusinessReviews(businessId) {
    const reviews = await loadReviews(businessId);
    const container = document.querySelector('.reviews-list');
    
    if (!container) return;
    
    if (reviews.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">لا توجد تقييمات بعد</div>';
        return;
    }
    
    container.innerHTML = reviews.map(review => `
        <div class="review-item">
            <div class="review-header">
                <img src="${review.avatar}" alt="${review.name}" class="review-avatar">
                <div class="review-info">
                    <div class="review-name">${review.name}</div>
                    <div class="review-rating">${'⭐'.repeat(review.rating)}</div>
                </div>
                <div class="review-date">${review.date}</div>
            </div>
            ${review.title ? `<div class="review-title">${review.title}</div>` : ''}
            <div class="review-text">${review.text}</div>
            ${review.tags && review.tags.length > 0 ? `
                <div class="review-tags">
                    ${review.tags.map(tag => `<span class="review-tag">${getTagLabel(tag)}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

function getTagLabel(tag) {
    const labels = {
        'service': 'خدمة ممتازة',
        'clean': 'نظافة عالية',
        'price': 'سعر مناسب',
        'time': 'سرعة إنجاز',
        'quality': 'جودة عالية',
        'friendly': 'تعامل راقي'
    };
    return labels[tag] || tag;
}

// Load Messages Page
async function loadMessagesPage() {
    if (!customerData) {
        showNotification('الرجاء تسجيل الدخول', 'error');
        return;
    }
    
    const container = document.getElementById('messagesList') || document.querySelector('.messages-list');
    if (!container) {
        showNotification('صفحة الرسائل قيد التطوير', 'info');
        return;
    }
    
    container.innerHTML = '<div style="text-align: center; padding: 20px;">جاري التحميل...</div>';
    
    try {
        const response = await fetch(`${API_URL}/messages/customer/${customerData._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load messages');
        }
        
        const data = await response.json();
        const conversations = data.data?.conversations || [];
        
        if (conversations.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 60px; margin-bottom: 15px;">💬</div>
                    <h3 style="color: #333; margin-bottom: 10px;">لا توجد رسائل</h3>
                    <p style="color: #666;">ابدأ محادثة مع محل لترى رسائلك هنا</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = conversations.map(conv => `
            <div class="conversation-item" onclick="openConversation('${conv._id._id}')" style="padding: 15px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 40px;">🏪</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 5px;">${conv._id.businessName || 'محل'}</div>
                    <div style="font-size: 14px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${conv.lastMessage}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; color: #999; margin-bottom: 5px;">${getTimeAgo(new Date(conv.lastMessageTime))}</div>
                    ${conv.unreadCount > 0 ? `<span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${conv.unreadCount}</span>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading messages:', error);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">فشل تحميل الرسائل</div>';
    }
}

function openConversation(businessId) {
    showNotification('فتح المحادثة...', 'info');
    // TODO: Implement full conversation view
}

// Pull to Refresh
let startY = 0;
let isPulling = false;

function setupPullToRefresh() {
    const homePage = document.getElementById('homePage');
    if (!homePage) return;
    
    homePage.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            startY = e.touches[0].pageY;
            isPulling = true;
        }
    });
    
    homePage.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        
        const currentY = e.touches[0].pageY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 80) {
            refreshContent();
            isPulling = false;
        }
    });
    
    homePage.addEventListener('touchend', () => {
        isPulling = false;
    });
}

function refreshContent() {
    showNotification('جاري التحديث...', 'success');
    loadBusinesses();
}

// Initialize advanced features
document.addEventListener('DOMContentLoaded', () => {
    setupAdvancedSearch();
    setupPullToRefresh();
});

// These are defined earlier in the file - removing duplicates

// Shop Actions (defined earlier but keeping for reference)
// sendMessage, makeCall, getDirections, shareShop are already implemented

function makeCall() {
    // Get current business phone
    const business = allBusinesses.find(b => b._id === currentBusinessId);
    
    if (business && business.phone) {
        // Open phone dialer
        window.location.href = `tel:${business.phone}`;
        showNotification('جاري الاتصال...', 'success');
    } else {
        // Mock phone number for demo
        const confirmed = confirm('هل تريد الاتصال بالمحل؟\n\nرقم الهاتف: 0500000000');
        if (confirmed) {
            window.location.href = 'tel:0500000000';
        }
    }
}

function getDirections() {
    const business = allBusinesses.find(b => b._id === currentBusinessId);
    
    if (business && business.address) {
        // Create Google Maps URL
        const address = `${business.address.street || ''}, ${business.address.city || 'الرياض'}`;
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
        
        // Open in new tab
        window.open(mapsUrl, '_blank');
        showNotification('فتح خرائط جوجل...', 'success');
    } else {
        showNotification('عذراً، العنوان غير متوفر', 'error');
    }
}

function shareShop() {
    const business = allBusinesses.find(b => b._id === currentBusinessId);
    
    if (!business) {
        showNotification('عذراً، حدث خطأ', 'error');
        return;
    }
    
    const shareData = {
        title: business.businessName,
        text: `تحقق من ${business.businessName} - صالون حلاقة احترافي!`,
        url: window.location.href
    };
    
    // Check if Web Share API is supported
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => showNotification('تمت المشاركة بنجاح!', 'success'))
            .catch((err) => {
                if (err.name !== 'AbortError') {
                    fallbackShare(shareData);
                }
            });
    } else {
        fallbackShare(shareData);
    }
}

function fallbackShare(shareData) {
    // Create share modal
    const shareModal = document.createElement('div');
    shareModal.className = 'modal show';
    shareModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">📤 مشاركة المحل</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
                    <button onclick="shareToWhatsApp('${encodeURIComponent(shareData.text + ' ' + shareData.url)}')" 
                            style="padding: 16px; background: #25D366; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600;">
                        واتساب
                    </button>
                    <button onclick="shareToTwitter('${encodeURIComponent(shareData.text)}', '${encodeURIComponent(shareData.url)}')" 
                            style="padding: 16px; background: #1DA1F2; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600;">
                        تويتر
                    </button>
                    <button onclick="shareToFacebook('${encodeURIComponent(shareData.url)}')" 
                            style="padding: 16px; background: #1877F2; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600;">
                        فيسبوك
                    </button>
                    <button onclick="copyToClipboard('${shareData.url}')" 
                            style="padding: 16px; background: var(--gradient-primary); color: var(--text-dark); border: none; border-radius: 12px; cursor: pointer; font-weight: 600;">
                        نسخ الرابط
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(shareModal);
}

function shareToWhatsApp(text) {
    window.open(`https://wa.me/?text=${text}`, '_blank');
    document.querySelector('.modal')?.remove();
    showNotification('فتح واتساب...', 'success');
}

function shareToTwitter(text, url) {
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    document.querySelector('.modal')?.remove();
    showNotification('فتح تويتر...', 'success');
}

function shareToFacebook(url) {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    document.querySelector('.modal')?.remove();
    showNotification('فتح فيسبوك...', 'success');
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(() => {
                document.querySelector('.modal')?.remove();
                showNotification('تم نسخ الرابط! ✓', 'success');
            })
            .catch(() => {
                fallbackCopyToClipboard(text);
            });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        document.querySelector('.modal')?.remove();
        showNotification('تم نسخ الرابط! ✓', 'success');
    } catch (err) {
        showNotification('فشل نسخ الرابط', 'error');
    }
    
    document.body.removeChild(textArea);
}

// Logout
function logout() {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerData');
    window.location.href = '/';
}
