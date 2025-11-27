// Nassim Customer Portal - Professional JavaScript
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://nassim-coiffeur.onrender.com/api';
const NASSIM_BUSINESS_ID = '69259331651b1babc1eb83dc'; // Nassim Business ID
let customerData = null;
let token = localStorage.getItem('customerToken');
let selectedTimeSlot = null;
let availableServices = [];
let availableEmployees = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Nassim App initialized');
    console.log('🔑 Token:', token ? 'exists' : 'missing');
    
    // Hide splash screen and show main page after 3.5 seconds
    setTimeout(() => {
        const splashScreen = document.getElementById('splashScreen');
        const homePage = document.getElementById('homePage');
        
        if (splashScreen) {
            splashScreen.style.display = 'none';
        }
        if (homePage) {
            homePage.style.display = 'block';
            homePage.style.animation = 'fadeIn 0.5s ease-in';
        }
    }, 3500);
    
    if (!token) {
        // Guest mode - show limited features
        showGuestMode();
    } else {
        await loadCustomerProfile();
    }
    
    await loadServices();
    await loadEmployees();
    await loadPosts();
    await loadRewards();
    await loadNotifications();
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
        searchContent(e.target.value);
    });
    
    // Booking form
    document.getElementById('bookingForm')?.addEventListener('submit', submitBooking);
    
    // Edit profile form
    document.getElementById('editProfileForm')?.addEventListener('submit', updateProfile);
}

// Guest Mode
function showGuestMode() {
    console.log('👤 Guest mode activated');
    // Load public content
    loadPosts();
    loadRewards();
}

// Load Customer Profile
async function loadCustomerProfile() {
    try {
        console.log('📡 Loading customer profile...');
        
        const response = await fetch(`${API_URL}/customers/public/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
                customerData = data.data;
                console.log('✅ Customer data loaded:', customerData);
                localStorage.setItem('customerData', JSON.stringify(customerData));
                updateUIWithCustomerData();
                await loadAppointments();
                return;
            }
        } else if (response.status === 401) {
            console.log('❌ Token expired, redirecting to login...');
            localStorage.removeItem('customerToken');
            localStorage.removeItem('customerData');
            showGuestMode();
            return;
        }
        
        // Fallback to stored data
        const storedData = localStorage.getItem('customerData');
        if (storedData) {
            customerData = JSON.parse(storedData);
            updateUIWithCustomerData();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showGuestMode();
    }
}

// Update UI with Customer Data
function updateUIWithCustomerData() {
    if (!customerData) return;
    
    // Update loyalty points
    const points = customerData.loyaltyPoints || 0;
    if (document.getElementById('loyaltyPoints')) {
        document.getElementById('loyaltyPoints').textContent = points;
    }
    if (document.getElementById('userPoints')) {
        document.getElementById('userPoints').textContent = points;
    }
    
    // Update tier
    let tier = 'برونزي';
    let tierBadge = '🥉';
    if (points >= 100) {
        tier = 'ذهبي';
        tierBadge = '🥇';
    } else if (points >= 50) {
        tier = 'فضي';
        tierBadge = '🥈';
    }
    if (document.getElementById('loyaltyTier')) {
        document.getElementById('loyaltyTier').innerHTML = `${tier} ${tierBadge}`;
    }
    
    // Update profile page
    if (document.getElementById('profileName')) {
        document.getElementById('profileName').textContent = customerData.name || 'عميل';
    }
    if (document.getElementById('profileEmail')) {
        document.getElementById('profileEmail').textContent = customerData.email || '';
    }
    if (document.getElementById('profilePhone')) {
        document.getElementById('profilePhone').textContent = customerData.phone || '';
    }
}

// Load Services
async function loadServices() {
    try {
        const response = await fetch(`${API_URL}/services/public/by-business/${NASSIM_BUSINESS_ID}`);
        const data = await response.json();
        
        console.log('✅ Loaded services for nassim:', data);
        
        if (data.success && data.data) {
            availableServices = data.data;
            displayServices(data.data);
            populateServiceSelect(data.data);
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

// Display Services
function displayServices(services) {
    const container = document.getElementById('servicesList');
    if (!container) return;
    
    if (!services || services.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد خدمات متاحة</div>';
        return;
    }
    
    container.innerHTML = services.map(service => `
        <div class="service-card" onclick="selectService('${service._id}')">
            ${service.image ? `<div class="service-image" style="width: 80px; height: 80px; border-radius: 15px; overflow: hidden; margin-left: 15px; flex-shrink: 0;"><img src="${service.image}" alt="${service.name}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : `<div class="service-icon">${getServiceIcon(service.name)}</div>`}
            <div class="service-info">
                <div class="service-name">${service.name}</div>
                <div class="service-description">${service.description || ''}</div>
                <div class="service-meta">
                    <span class="service-duration">⏱ ${service.duration} دقيقة</span>
                    <span class="service-price">${service.price} ريال</span>
                </div>
            </div>
        </div>
    `).join('');
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

// Populate Service Select
function populateServiceSelect(services) {
    const select = document.getElementById('serviceSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- اختر الخدمة --</option>' +
        services.map(s => `<option value="${s._id}" data-price="${s.price}" data-duration="${s.duration}">${s.name} - ${s.price} ريال</option>`).join('');
}

// Select Service
function selectService(serviceId) {
    if (document.getElementById('serviceSelect')) {
        document.getElementById('serviceSelect').value = serviceId;
        updateServiceInfo();
    }
    openBookingModal();
}

// Update Service Info
function updateServiceInfo() {
    const select = document.getElementById('serviceSelect');
    const infoDiv = document.getElementById('serviceInfo');
    
    if (!select || !infoDiv) return;
    
    if (select.value) {
        const option = select.options[select.selectedIndex];
        document.getElementById('serviceDuration').textContent = option.dataset.duration + ' دقيقة';
        document.getElementById('servicePrice').textContent = option.dataset.price + ' ريال';
        infoDiv.classList.remove('hidden');
    } else {
        infoDiv.classList.add('hidden');
    }
}

// Load Employees
async function loadEmployees() {
    try {
        const response = await fetch(`${API_URL}/employees/public/by-business/${NASSIM_BUSINESS_ID}`);
        const data = await response.json();
        
        console.log('✅ Loaded employees for nassim:', data);
        
        if (data.success && data.data) {
            availableEmployees = data.data;
            displayEmployees(data.data);
            populateEmployeeSelect(data.data);
        }
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// Display Employees
function displayEmployees(employees) {
    const container = document.getElementById('specialistsList');
    if (!container) return;
    
    if (!employees || employees.length === 0) {
        container.innerHTML = '<div class="empty-state">لا يوجد موظفين</div>';
        return;
    }
    
    container.innerHTML = employees.map((emp, index) => {
        const defaultImages = [
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop'
        ];
        const employeeImage = emp.photo || defaultImages[index % defaultImages.length];
        return `
        <div class="specialist-card" onclick="selectEmployee('${emp._id}')">
            <img src="${employeeImage}" alt="${emp.name}" class="specialist-image" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=FDB714&color=1A1A1A&size=200'">
            <div class="specialist-name">${emp.name}</div>
            <div class="specialist-title">${emp.role || 'حلاق محترف'}</div>
            <div class="specialist-rating">
                <span class="stars">⭐⭐⭐⭐⭐</span>
            </div>
        </div>
        `;
    }).join('');
}

// Populate Employee Select
function populateEmployeeSelect(employees) {
    const select = document.getElementById('employeeSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- اختر الموظف --</option>' +
        employees.map(e => `<option value="${e._id}">${e.name}</option>`).join('');
}

// Select Employee
function selectEmployee(employeeId) {
    if (document.getElementById('employeeSelect')) {
        document.getElementById('employeeSelect').value = employeeId;
    }
    openBookingModal();
}

// Load Posts
async function loadPosts() {
    try {
        const response = await fetch(`${API_URL}/posts/public/by-business/${NASSIM_BUSINESS_ID}`);
        const data = await response.json();
        
        console.log('✅ Loaded posts for nassim:', data);
        
        if (data.success && data.data) {
            displayPosts(data.data.slice(0, 3)); // Show only 3 on home
            displayAllPosts(data.data); // Show all on posts page
        }
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

// Display Posts
function displayPosts(posts) {
    const container = document.getElementById('postsList');
    if (!container) return;
    
    if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد أخبار</div>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="post-card full">
            ${post.image ? `<div class="post-image-wrapper"><img src="${post.image}" alt="${post.title}" class="post-img" onerror="this.style.display='none'"></div>` : ''}
            <div class="post-body">
                <div class="post-header">
                    <span class="post-type ${post.type}">${getPostTypeText(post.type)}</span>
                    <span class="post-date">${formatDate(post.createdAt)}</span>
                </div>
                <h3 class="post-title">${post.title}</h3>
                <p class="post-content">${post.content}</p>
                <div class="post-actions">
                    <button class="post-action-btn ${post.myReaction ? 'active' : ''}" onclick="handleReaction('${post._id}', 'like')">
                        <svg class="icon" fill="${post.myReaction ? '#ff4757' : 'currentColor'}" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        <span class="count">${post.stats?.totalLikes || 0}</span>
                    </button>
                    <button class="post-action-btn">
                        <svg class="icon" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
                        <span class="count">${post.stats?.totalComments || 0}</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Display All Posts
function displayAllPosts(posts) {
    const container = document.getElementById('allPostsList');
    if (!container) return;
    
    if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد أخبار</div>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="post-card">
            ${post.image ? `<div class="post-image-wrapper"><img src="${post.image}" alt="${post.title}" class="post-img" onerror="this.style.display='none'"></div>` : ''}
            <div class="post-body">
                <div class="post-header">
                    <span class="post-type ${post.type}">${getPostTypeText(post.type)}</span>
                    <span class="post-date">${formatDate(post.createdAt)}</span>
                </div>
                <h3 class="post-title">${post.title}</h3>
                <p class="post-content">${post.content}</p>
                <div class="post-actions">
                    <button class="post-action-btn ${post.myReaction ? 'active' : ''}" onclick="handleReaction('${post._id}', 'like')">
                        <svg class="icon" fill="${post.myReaction ? '#ff4757' : 'currentColor'}" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        <span class="count">${post.stats?.totalLikes || 0}</span>
                    </button>
                    <button class="post-action-btn">
                        <svg class="icon" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
                        <span class="count">${post.stats?.totalComments || 0}</span>
                    </button>
            </div>
        </div>
    `).join('');
}

// Get Post Type Text
function getPostTypeText(type) {
    const types = {
        'announcement': '📢 إعلان',
        'offer': '🎉 عرض خاص',
        'update': '✨ تحديث',
        'news': '📰 خبر'
    };
    return types[type] || '📢 منشور';
}

// Handle Reaction
async function handleReaction(postId, type) {
    if (!token) {
        showNotification('سجل دخول للتفاعل مع المنشورات', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/reactions/${postId}/react`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ type })
        });
        
        if (response.ok) {
            loadPosts();
            showNotification('تم التفاعل بنجاح', 'success');
        }
    } catch (error) {
        console.error('Error reacting:', error);
    }
}

// Load Rewards
async function loadRewards() {
    try {
        const response = await fetch(`${API_URL}/rewards/public/by-business/${NASSIM_BUSINESS_ID}`);
        const data = await response.json();
        
        console.log('✅ Loaded rewards for nassim:', data);
        
        if (data.success && data.data) {
            const activeRewards = data.data.filter(r => r.isActive);
            displayRewards(activeRewards.slice(0, 3)); // Show only 3 on home
            displayAllRewards(activeRewards); // Show all on rewards page
        }
    } catch (error) {
        console.error('Error loading rewards:', error);
    }
}

// Display Rewards
function displayRewards(rewards) {
    const container = document.getElementById('rewardsList');
    if (!container) return;
    
    if (!rewards || rewards.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد مكافآت متاحة</div>';
        return;
    }
    
    container.innerHTML = rewards.map(reward => {
        const imageHtml = reward.image 
            ? `<img src="${reward.image}" alt="${reward.name}" class="reward-img" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\"reward-icon-large\\">🎁</div>';">`
            : `<div class="reward-icon-large">🎁</div>`;
        
        return `
        <div class="reward-card">
            <div class="reward-image-container">
                ${imageHtml}
            </div>
            <div class="reward-info">
                <h3 class="reward-name">${reward.name}</h3>
                <p class="reward-description">${reward.description}</p>
                <div class="reward-footer">
                    <div class="reward-cost">⭐ ${reward.pointsCost} نقطة</div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Display All Rewards
function displayAllRewards(rewards) {
    const container = document.getElementById('allRewardsList');
    if (!container) return;
    
    if (!rewards || rewards.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد مكافآت متاحة</div>';
        return;
    }
    
    const userPoints = customerData?.loyaltyPoints || 0;
    
    container.innerHTML = rewards.map(reward => {
        const canRedeem = userPoints >= reward.pointsCost;
        return `
        <div class="reward-card ${canRedeem ? '' : 'disabled'}">
            <div class="reward-image-container">
                ${reward.image ? `<img src="${reward.image}" alt="${reward.name}" class="reward-img">` : `<div class="reward-icon-large">🎁</div>`}
                ${!canRedeem ? '<div class="reward-overlay"><span>🔒</span></div>' : ''}
            </div>
            <div class="reward-info">
                <h3 class="reward-name">${reward.name}</h3>
                <p class="reward-description">${reward.description}</p>
                <div class="reward-footer">
                    <div class="reward-cost">⭐ ${reward.pointsCost} نقطة</div>
                    ${canRedeem ? '<button class="redeem-btn" onclick="redeemReward(\'' + reward._id + '\')"><span>🎁</span> استبدال</button>' : '<span class="need-points">تحتاج ' + (reward.pointsCost - userPoints) + ' نقطة</span>'}
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Redeem Reward
async function redeemReward(rewardId) {
    if (!token) {
        showNotification('سجل دخول لاستبدال المكافآت', 'error');
        return;
    }
    
    if (!confirm('هل تريد استبدال هذه المكافأة؟')) return;
    
    try {
        const response = await fetch(`${API_URL}/rewards/${rewardId}/redeem`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showNotification('تم استبدال المكافأة بنجاح!', 'success');
            await loadCustomerProfile();
            await loadRewards();
        } else {
            const data = await response.json();
            showNotification(data.message || 'فشل استبدال المكافأة', 'error');
        }
    } catch (error) {
        console.error('Error redeeming reward:', error);
        showNotification('حدث خطأ', 'error');
    }
}

// Load Appointments
async function loadAppointments() {
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/appointments/customer`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (data.success && data.data) {
            displayAppointments(data.data);
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// Display Appointments
function displayAppointments(appointments) {
    const container = document.getElementById('bookingsList');
    if (!container) return;
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-bookings">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="80" height="80">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h3>لا توجد حجوزات</h3>
                <p>ابدأ بحجز موعدك الأول الآن</p>
                <button class="book-now-btn" onclick="openBookingModal()">احجز الآن</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appointments
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(apt => `
            <div class="booking-card ${apt.status}">
                <div class="booking-header">
                    <span class="booking-status">${getStatusText(apt.status)}</span>
                    <span class="booking-date">${formatDate(apt.date)}</span>
                </div>
                <h3 class="booking-service">${apt.service?.name || 'خدمة'}</h3>
                <div class="booking-details">
                    <div class="booking-detail">
                        <span class="detail-label">الموظف:</span>
                        <span class="detail-value">${apt.employee?.name || 'غير محدد'}</span>
                    </div>
                    <div class="booking-detail">
                        <span class="detail-label">الوقت:</span>
                        <span class="detail-value">${apt.time}</span>
                    </div>
                    <div class="booking-detail">
                        <span class="detail-label">السعر:</span>
                        <span class="detail-value">${apt.service?.price || 0} ريال</span>
                    </div>
                </div>
                ${apt.status === 'pending' ? `<button class="cancel-booking-btn" onclick="cancelBooking('${apt._id}')">إلغاء الموعد</button>` : ''}
            </div>
        `).join('');
}

// Get Status Text
function getStatusText(status) {
    const statuses = {
        'pending': '⏳ قيد الانتظار',
        'confirmed': '✅ مؤكد',
        'completed': '✔️ مكتمل',
        'cancelled': '❌ ملغي'
    };
    return statuses[status] || status;
}

// Filter Bookings
function filterBookings(filter) {
    // Update active tab
    document.querySelectorAll('.booking-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Filter logic here
    loadAppointments();
}

// Cancel Booking
async function cancelBooking(appointmentId) {
    if (!confirm('هل أنت متأكد من إلغاء هذا الموعد؟')) return;
    
    try {
        const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showNotification('تم إلغاء الموعد بنجاح', 'success');
            loadAppointments();
        } else {
            showNotification('فشل إلغاء الموعد', 'error');
        }
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showNotification('حدث خطأ', 'error');
    }
}

// Load Available Slots
async function loadAvailableSlots() {
    const date = document.getElementById('appointmentDate').value;
    const employeeId = document.getElementById('employeeSelect').value;
    const serviceId = document.getElementById('serviceSelect').value;
    
    if (!date || !employeeId || !serviceId) {
        document.getElementById('timeSlots').innerHTML = '<div class="empty-state">اختر التاريخ والموظف والخدمة أولاً</div>';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/appointments/available-slots?business=${NASSIM_BUSINESS_ID}&employee=${employeeId}&date=${date}&service=${serviceId}`);
        const data = await response.json();
        
        console.log('Available slots response:', data);
        
        if (data.success && data.data) {
            // تحويل objects إلى strings إذا لزم الأمر
            const slots = Array.isArray(data.data) ? data.data.map(slot => {
                if (typeof slot === 'string') return slot;
                if (slot.time) return slot.time;
                if (slot.slot) return slot.slot;
                return String(slot);
            }) : [];
            
            console.log('Processed slots:', slots);
            displayTimeSlots(slots);
        } else {
            // إنشاء أوقات افتراضية إذا لم يكن هناك استجابة
            const defaultSlots = generateDefaultSlots();
            displayTimeSlots(defaultSlots);
        }
    } catch (error) {
        console.error('Error loading slots:', error);
        // إنشاء أوقات افتراضية عند الخطأ
        const defaultSlots = generateDefaultSlots();
        displayTimeSlots(defaultSlots);
    }
}

// Generate default time slots
function generateDefaultSlots() {
    const slots = [];
    for (let hour = 9; hour <= 20; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < 20) {
            slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
    }
    return slots;
}

// Display Time Slots
function displayTimeSlots(slots) {
    const container = document.getElementById('timeSlots');
    
    if (!slots || slots.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد أوقات متاحة في هذا اليوم</div>';
        return;
    }
    
    container.innerHTML = slots.map(slot => `
        <button type="button" class="time-slot-btn ${selectedTimeSlot === slot ? 'selected' : ''}" data-time="${slot}">
            ${slot}
        </button>
    `).join('');
    
    // إضافة event listeners للأزرار
    setTimeout(() => {
        container.querySelectorAll('.time-slot-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const timeValue = this.getAttribute('data-time');
                console.log('Button clicked, time:', timeValue);
                selectTimeSlot(timeValue);
            });
        });
    }, 100);
}

// Select Time Slot
function selectTimeSlot(time) {
    console.log('Selecting time slot:', time);
    selectedTimeSlot = time;
    
    // تحديث input الوقت
    const timeInput = document.getElementById('appointmentTime');
    if (timeInput && typeof time === 'string') {
        timeInput.value = time;
    }
    
    // تحديث الأزرار
    document.querySelectorAll('.time-slot-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.getAttribute('data-time') === time) {
            btn.classList.add('selected');
        }
    });
}

// Submit Booking
async function submitBooking(e) {
    e.preventDefault();
    
    console.log('📋 Submit booking called');
    console.log('🔑 Token:', token ? 'exists' : 'missing');
    console.log('👤 CustomerData:', customerData);
    
    if (!token) {
        showNotification('يجب تسجيل الدخول للحجز', 'error');
        setTimeout(() => {
            window.location.href = '/customer-login';
        }, 2000);
        return;
    }
    
    if (!customerData) {
        showNotification('جاري تحميل بياناتك...', 'error');
        await loadCustomerProfile();
        if (!customerData) {
            showNotification('خطأ في تحميل البيانات', 'error');
            return;
        }
    }
    
    const selectedDate = document.getElementById('appointmentDate').value;
    const timeInput = document.getElementById('appointmentTime').value;
    
    if (!selectedDate || !timeInput) {
        showNotification('اختر التاريخ والوقت', 'error');
        return;
    }
    
    // استخدام الوقت من input أو من time slot إذا كان محدد
    const selectedTime = selectedTimeSlot || timeInput;
    const dateTime = `${selectedDate}T${selectedTime}:00`;
    
    if (!customerData) {
        showNotification('الرجاء تسجيل الدخول', 'error');
        return;
    }
    
    const bookingData = {
        business: NASSIM_BUSINESS_ID,
        customer: customerData._id,
        customerName: customerData.name,
        customerPhone: customerData.phone,
        service: document.getElementById('serviceSelect').value,
        employee: document.getElementById('employeeSelect').value,
        date: selectedDate,
        time: selectedTime,
        dateTime: dateTime,
        notes: document.getElementById('appointmentNotes').value || ''
    };
    
    try {
        const response = await fetch(`${API_URL}/appointments/public/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bookingData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('تم حجز الموعد بنجاح! 🎉', 'success');
            closeBookingModal();
            document.getElementById('bookingForm').reset();
            selectedTimeSlot = null;
            await loadAppointments();
            await loadCustomerProfile(); // Refresh points
        } else {
            showNotification(data.message || 'فشل حجز الموعد', 'error');
        }
    } catch (error) {
        console.error('Error submitting booking:', error);
        showNotification('حدث خطأ أثناء الحجز', 'error');
    }
}

// Load Notifications
async function loadNotifications() {
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            console.log('Notifications endpoint not available yet');
            return;
        }
        
        const data = await response.json();
        if (data.success && data.data) {
            displayNotifications(data.data);
            updateNotificationBadge(data.data.filter(n => !n.read).length);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Display Notifications
function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-notifications">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="80" height="80">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                <h3>لا توجد إشعارات</h3>
                <p>سنعلمك بأي تحديثات مهمة</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.read ? 'read' : ''}">
            <div class="notification-icon">${getNotificationIcon(notif.type)}</div>
            <div class="notification-content">
                <h3 class="notification-title">${notif.title}</h3>
                <p class="notification-message">${notif.message}</p>
                <span class="notification-date">${formatDate(notif.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

// Get Notification Icon
function getNotificationIcon(type) {
    const icons = {
        'booking': '📅',
        'reminder': '⏰',
        'promotion': '🎉',
        'update': '✨'
    };
    return icons[type] || '🔔';
}

// Update Notification Badge
function updateNotificationBadge(count) {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Update Profile
async function updateProfile(e) {
    e.preventDefault();
    
    if (!token) {
        showNotification('يجب تسجيل الدخول', 'error');
        return;
    }
    
    const profileData = {
        name: document.getElementById('editName').value,
        phone: document.getElementById('editPhone').value,
        email: document.getElementById('editEmail').value
    };
    
    try {
        const response = await fetch(`${API_URL}/customers/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(profileData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('تم تحديث الملف الشخصي بنجاح', 'success');
            await loadCustomerProfile();
            showAccount();
        } else {
            showNotification(data.message || 'فشل تحديث الملف الشخصي', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('حدث خطأ', 'error');
    }
}

// Navigation Functions
function showHome() {
    hideAllPages();
    document.getElementById('homePage').classList.remove('hidden');
    updateActiveNav(0);
}

function showPosts() {
    hideAllPages();
    document.getElementById('postsPage').classList.remove('hidden');
    updateActiveNav(1);
}

function showRewards() {
    hideAllPages();
    document.getElementById('rewardsPage').classList.remove('hidden');
    updateActiveNav(3);
}

function showAccount() {
    if (!token) {
        showNotification('سجل دخول لعرض حسابك', 'error');
        setTimeout(() => {
            window.location.href = '/customer-login';
        }, 2000);
        return;
    }
    hideAllPages();
    document.getElementById('accountPage').classList.remove('hidden');
    updateActiveNav(4);
}

function showBookingHistory() {
    if (!token) {
        showNotification('سجل دخول لعرض حجوزاتك', 'error');
        return;
    }
    hideAllPages();
    document.getElementById('bookingHistoryPage').classList.remove('hidden');
    loadAppointments();
}

function showNotifications() {
    if (!token) {
        showNotification('سجل دخول لعرض الإشعارات', 'error');
        return;
    }
    hideAllPages();
    document.getElementById('notificationsPage').classList.remove('hidden');
    loadNotifications();
}

function editProfile() {
    if (!customerData) return;
    
    document.getElementById('editName').value = customerData.name || '';
    document.getElementById('editPhone').value = customerData.phone || '';
    document.getElementById('editEmail').value = customerData.email || '';
    
    hideAllPages();
    document.getElementById('editProfilePage').classList.remove('hidden');
}

function goBackToHome() {
    showHome();
}

function hideAllPages() {
    document.querySelectorAll('.page-container, #homePage').forEach(page => {
        page.classList.add('hidden');
    });
}

function updateActiveNav(index) {
    document.querySelectorAll('.nav-item').forEach((item, i) => {
        if (i === index) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Modal Functions
function openBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Logout
function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customerData');
        window.location.href = '/customer-login';
    }
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `${Math.floor(diff / 60)} د`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} س`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} يوم`;
    
    return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

function searchContent(query) {
    console.log('Searching for:', query);
    // Implement search logic
}

// ==================== PWA Setup ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('✅ PWA: Service Worker registered successfully');
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available
                            if (confirm('🆕 تحديث جديد متوفر! هل تريد التحديث الآن؟')) {
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('❌ PWA: Service Worker registration failed:', error);
            });
    });
}

// Request Notification Permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
            console.log('✅ PWA: Notification permission granted');
        }
    });
}

// Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button
    showInstallPrompt();
});

function showInstallPrompt() {
    const installBtn = document.createElement('button');
    installBtn.className = 'install-app-btn';
    installBtn.innerHTML = `
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        <span>ثبت التطبيق</span>
    `;
    installBtn.onclick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                showNotification('✅ تم بنجاح! التطبيق مثبت على هاتفك', 'success');
            } else {
                showNotification('ℹ️ يمكنك التثبيت لاحقاً من قائمة المتصفح', 'info');
            }
            
            deferredPrompt = null;
            installBtn.remove();
        } else {
            // Show manual installation instructions
            showManualInstallInstructions();
        }
    };
    
    // Add to page after short delay
    setTimeout(() => {
        const header = document.querySelector('.header-top');
        if (header && !document.querySelector('.install-app-btn')) {
            header.appendChild(installBtn);
        }
    }, 3000);
}

// Show manual installation instructions
function showManualInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let message = '';
    if (isIOS) {
        message = '📱 لتثبيت التطبيق على iPhone:\n\n1️⃣ اضغط على زر المشاركة ⬆️ في الأسفل\n2️⃣ مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية"\n3️⃣ اضغط "إضافة"\n\n✨ سيظهر التطبيق كأيقونة على شاشتك الرئيسية';
    } else if (isAndroid) {
        message = '📱 لتثبيت التطبيق على Android:\n\n1️⃣ افتح قائمة المتصفح (⋮) في الزاوية\n2️⃣ اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"\n3️⃣ اضغط "تثبيت"\n\n✨ سيتم تثبيت التطبيق مثل تطبيقات الجوال العادية';
    } else {
        message = '📱 لتثبيت التطبيق:\n\nافتح قائمة المتصفح واختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"';
    }
    
    alert(message);
}

// Online/Offline Status
window.addEventListener('online', () => {
    showNotification('✅ عدت متصلاً بالإنترنت', 'success');
});

window.addEventListener('offline', () => {
    showNotification('⚠️ لا يوجد اتصال بالإنترنت', 'warning');
});

// Placeholder functions for missing features
function showAllSpecialists() {
    showNotification('قريباً', 'info');
}

function showAllServices() {
    showNotification('قريباً', 'info');
}

function showNotificationSettings() {
    showNotification('قريباً', 'info');
}
