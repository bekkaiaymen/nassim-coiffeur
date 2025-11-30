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
let selectedServices = []; // Array to track multiple selected services

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
        // Check for first booking offer after customer data is loaded
        setTimeout(() => {
            checkFirstBookingOffer();
        }, 1000);
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
    if (dateInput) {
        dateInput.min = today;
        // Force French numerals in date/time inputs
        dateInput.setAttribute('lang', 'en');
    }
    
    const timeInput = document.getElementById('appointmentTime');
    if (timeInput) {
        timeInput.setAttribute('lang', 'en');
    }
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
        document.getElementById('loyaltyPoints').textContent = toArabicNumerals(points);
    }
    if (document.getElementById('userPoints')) {
        document.getElementById('userPoints').textContent = toArabicNumerals(points);
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
            populateBookingServices(data.data);
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
        <div class="service-card">
            ${service.image 
                ? `<div class="service-image" onclick="openImageLightbox('${service.image}', '${service.name}')" style="width: 80px; height: 100px; border-radius: 15px; overflow: hidden; margin-left: 15px; flex-shrink: 0; background: linear-gradient(to bottom, #1a1a1a, #2d2d2d); cursor: zoom-in; position: relative;">
                    <img src="${service.image}" alt="${service.name}" style="width: 100%; height: 100%; object-fit: contain;" onerror="console.error('Failed to load service image:', this.src); this.parentElement.outerHTML='<div class=\\'service-icon\\'>${getServiceIcon(service.name)}</div>';">
                    <div class="zoom-icon" style="position: absolute; top: 4px; right: 4px; background: rgba(203, 163, 92, 0.9); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; pointer-events: none;">🔍</div>
                   </div>` 
                : `<div class="service-icon">${getServiceIcon(service.name)}</div>`
            }
            <div class="service-info" onclick="selectService('${service._id}')">
                <div class="service-name">${service.name}</div>
                <div class="service-description">${service.description || ''}</div>
                <div class="service-meta">
                    <span class="service-duration">⏱ ${service.duration} دقيقة</span>
                    <span class="service-price">${service.price} دج</span>
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

// Populate Booking Services Grid
function populateBookingServices(services) {
    const container = document.getElementById('bookingServicesList');
    if (!container) return;
    
    container.innerHTML = services.map(service => `
        <div class="booking-service-card" 
             data-service-id="${service._id}"
             data-service-name="${service.name}"
             data-service-price="${service.price}"
             data-service-duration="${service.duration}">
            ${service.image 
                ? `<div class="booking-service-image" onclick="openImageLightbox('${service.image}', '${service.name}')">
                    <img src="${service.image}" alt="${service.name}">
                    <div class="zoom-overlay">🔍</div>
                   </div>` 
                : `<div class="service-icon" onclick="toggleServiceSelection('${service._id}')">${getServiceIcon(service.name)}</div>`
            }
            <div class="service-name" onclick="toggleServiceSelection('${service._id}')">${service.name}</div>
            <div class="service-meta" onclick="toggleServiceSelection('${service._id}')">
                <span class="service-duration">⏱ ${service.duration} دقيقة</span>
                <span class="service-price">${service.price} دج</span>
            </div>
        </div>
    `).join('');
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

// Select Service (from service cards view)
function selectService(serviceId) {
    openBookingModal();
    // Wait for modal to load services
    setTimeout(() => {
        toggleServiceSelection(serviceId);
    }, 100);
}

// Update Booking Summary
function updateBookingSummary() {
    const container = document.getElementById('selectedServices');
    
    if (selectedServices.length === 0) {
        container.style.display = 'none';
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
}

// Update Service Info (legacy support)
function updateServiceInfo() {
    // This function is now replaced by addService
    addService();
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
    
    select.innerHTML = '<option value="">-- اختر الحلاق --</option>' +
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

// Load Coins and History
async function loadCoins() {
    if (!token) return;
    
    try {
        // Update coins balance from customer data
        const userCoins = customerData?.coins || 0;
        document.getElementById('userCoins').textContent = userCoins;
        
        // Load coins history (transactions)
        displayCoinsHistory();
        
    } catch (error) {
        console.error('Error loading coins:', error);
        showNotification('حدث خطأ في تحميل العملات', 'error');
    }
}

// Display Coins History
function displayCoinsHistory() {
    const container = document.getElementById('coinsHistoryList');
    if (!container) return;
    
    // Sample data - replace with real API call later
    const history = [
        { date: new Date(), type: 'earned', amount: 50, description: 'مكافأة إتمام حجز' },
        { date: new Date(Date.now() - 86400000), type: 'spent', amount: 100, description: 'استبدال مكافأة' },
        { date: new Date(Date.now() - 172800000), type: 'earned', amount: 100, description: 'مكافأة تسجيل جديد' }
    ];
    
    if (history.length === 0) {
        container.innerHTML = '<div class="empty-state">لا يوجد سجل للعملات</div>';
        return;
    }
    
    container.innerHTML = history.map(item => `
        <div class="coin-history-item ${item.type}">
            <div class="coin-icon">${item.type === 'earned' ? '🪙' : '💸'}</div>
            <div class="coin-details">
                <div class="coin-description">${item.description}</div>
                <div class="coin-date">${formatDate(item.date)}</div>
            </div>
            <div class="coin-amount ${item.type}">
                ${item.type === 'earned' ? '+' : '-'}${item.amount}
            </div>
        </div>
    `).join('');
}

// Show Buy Coins Modal
function showBuyCoinsModal() {
    showNotification('ميزة شراء العملات ستتوفر قريباً! 🚀', 'info');
}

// Load Appointments
async function loadAppointments() {
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/appointments/customer`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('📡 [loadAppointments] Response status:', response.status);
        const data = await response.json();
        console.log('📡 [loadAppointments] API response:', data);
        // Defensive: handle both data.data and data
        let appointments = [];
        if (data.success && Array.isArray(data.data)) {
            appointments = data.data;
        } else if (Array.isArray(data)) {
            appointments = data;
        }
        console.log('📡 [loadAppointments] Appointments array:', appointments);
        displayAppointments(appointments);
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
                        <span class="detail-label">الحلاق:</span>
                        <span class="detail-value">${apt.employee?.name || 'غير محدد'}</span>
                    </div>
                    <div class="booking-detail">
                        <span class="detail-label">الوقت:</span>
                        <span class="detail-value">${formatTimeArabic(apt.time)}</span>
                    </div>
                    <div class="booking-detail">
                        <span class="detail-label">السعر:</span>
                        <span class="detail-value">${apt.service?.price || 0} دج</span>
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
        document.getElementById('timeSlots').innerHTML = '<div class="empty-state">اختر التاريخ والحلاق والخدمة أولاً</div>';
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
    
    // Morning shift: 10:00 - 14:00
    for (let hour = 10; hour <= 13; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    slots.push('14:00');
    
    // Evening shift: 16:30 - 21:00
    slots.push('16:30');
    for (let hour = 17; hour <= 20; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < 20) {
            slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
    }
    slots.push('21:00');
    
    return slots;
}

// Check if time slot is VIP only (17:40 - 21:00)
function isTimeVIPOnly(timeString) {
    if (!timeString) return false;
    
    const [hours, minutes] = timeString.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    
    // VIP only: 17:40 (1060 minutes) to 21:00 (1260 minutes)
    const vipStartTime = 17 * 60 + 40; // 17:40 = 1060 minutes
    const vipEndTime = 21 * 60; // 21:00 = 1260 minutes
    
    return timeInMinutes >= vipStartTime && timeInMinutes <= vipEndTime;
}

// Display Time Slots
function displayTimeSlots(slots) {
    const container = document.getElementById('timeSlots');
    
    if (!slots || slots.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد أوقات متاحة في هذا اليوم</div>';
        return;
    }
    
    // Check if customer is VIP (Gold tier = 500+ points)
    const isVIP = customerData && customerData.loyaltyPoints >= 500;
    
    container.innerHTML = slots.map(slot => {
        const isVIPOnly = isTimeVIPOnly(slot);
        const isDisabled = isVIPOnly && !isVIP;
        
        return `
            <button type="button" 
                class="time-slot-btn ${selectedTimeSlot === slot ? 'selected' : ''} ${isDisabled ? 'unavailable' : ''}" 
                data-time="${slot}"
                ${isDisabled ? 'disabled' : ''}>
                ${formatTimeArabic(slot)}
                ${isDisabled ? '<span class="unavailable-badge">🚫 غير متاح</span>' : ''}
            </button>
        `;
    }).join('');
    
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
    
    // Check VIP restriction
    const isVIP = customerData && customerData.loyaltyPoints >= 500;
    if (isTimeVIPOnly(time) && !isVIP) {
        showNotification('⚠️ هذا الوقت غير متاح<br><br>📌 للحجز في هذا الوقت:<br>• كن عضو VIP (ذهبي 🥇)<br>• أو ادفع 50 دج 💰', 'error', 4000);
        return;
    }
    
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
    
    // Check VIP restriction for evening slots (17:40 - 21:00)
    const isVIP = customerData.loyaltyPoints >= 500;
    if (isTimeVIPOnly(selectedTime) && !isVIP && !window.paidForVIPSlot) {
        if (confirm('⚠️ هذا الوقت يتطلب:\n\n🥇 عضوية VIP\n💰 أو دفع 50 دج\n\nهل تؤكد الحجز مع دفع 50 دج؟')) {
            window.paidForVIPSlot = true;
            showNotification('✅ تم التأكيد. ادفع 50 دج عند الحضور', 'success');
            // Continue with booking
        } else {
            return;
        }
    }
    
    // Validate that at least one service is selected
    if (selectedServices.length === 0) {
        showNotification('الرجاء اختيار خدمة واحدة على الأقل', 'error');
        return;
    }
    
    const bookingData = {
        business: NASSIM_BUSINESS_ID,
        customer: customerData._id,
        customerName: customerData.name,
        customerPhone: customerData.phone,
        paidVIPSlot: window.paidForVIPSlot || false,
        extraCharge: window.paidForVIPSlot ? 50 : 0,
        services: selectedServices.map(s => s.id), // Multiple services
        service: selectedServices[0].id, // First service for compatibility
        employee: document.getElementById('employeeSelect').value,
        date: selectedDate,
        time: selectedTime,
        dateTime: dateTime,
        notes: document.getElementById('appointmentNotes').value || '',
        totalPrice: selectedServices.reduce((sum, s) => sum + s.price, 0),
        totalDuration: selectedServices.reduce((sum, s) => sum + s.duration, 0)
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
            // Get booking details for confirmation message
            const servicesNames = selectedServices.map(s => s.name).join(' + ');
            const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
            const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
            const selectedDate = document.getElementById('appointmentDate').value;
            const selectedTime = document.getElementById('timeSlots').querySelector('.time-slot.selected')?.textContent;
            
            // Format date in Arabic
            const dateObj = new Date(selectedDate);
            const formattedDate = dateObj.toLocaleDateString('ar-DZ', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            // Show professional confirmation message
            const extraChargeNote = window.paidForVIPSlot ? '\n\n💰 رسوم إضافية: 50 دج (سيتم التحصيل عند الحضور)' : '';
            const confirmationMessage = `✅ تم إرسال طلب الحجز بنجاح!\n\n📅 ${formattedDate}\n⏰ الساعة ${selectedTime}\n✂️ ${servicesNames}\n💰 ${totalPrice} دج\n⏱ ${totalDuration} دقيقة${extraChargeNote}\n\n⏳ في انتظار تأكيد الحلاق\n\n📱 سنرسل لك إشعاراً عند تأكيد الموعد\n\n⚠️ يمكنك إلغاء الحجز مجاناً قبل 30 دقيقة من الموعد`;
            
            showNotification(confirmationMessage, 'success', 10000);
            
            // Show pending reward notification
            const points = data.pendingPoints || 100;
            setTimeout(() => {
                showPendingRewardNotification(points);
            }, 2000);
            
            // Reset payment flag after successful booking
            window.paidForVIPSlot = false;
            
            closeBookingModal();
            document.getElementById('bookingForm').reset();
            selectedTimeSlot = null;
            selectedServices = []; // Clear selected services
            displaySelectedServices(); // Update display
            await loadAppointments();
            await loadCustomerProfile();
        } else {
            showNotification(data.message || 'فشل حجز الموعد', 'error');
        }
    } catch (error) {
        console.error('Error submitting booking:', error);
        showNotification('حدث خطأ أثناء الحجز', 'error');
    }
}

// Check First Booking Offer
async function checkFirstBookingOffer() {
    if (!customerData) {
        console.log('⚠️ checkFirstBookingOffer: No customerData');
        return;
    }
    console.log('🔍 Checking first booking offer...', {
        hasSeenFirstBookingOffer: customerData.hasSeenFirstBookingOffer,
        customerId: customerData._id
    });
    // Always check appointments to determine correct offer
    try {
        const response = await fetch(`${API_URL}/appointments/customer`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('📅 Appointments response:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('📅 Appointments data:', data);
            // Defensive: data.data for new API, data for legacy
            const appointments = Array.isArray(data.data) ? data.data : data;
            if (appointments && appointments.length === 0) {
                // No appointments yet - NEW CUSTOMER: Show 100 points offer
                if (customerData.hasSeenFirstBookingOffer) {
                    customerData.hasSeenFirstBookingOffer = false;
                    localStorage.setItem('customerData', JSON.stringify(customerData));
                }
                setTimeout(() => {
                    showFirstBookingOfferNotification();
                }, 4000);
            } else {
                // Has appointments - RETURNING CUSTOMER: Always show 50 points offer
                setTimeout(() => {
                    showReturningCustomerOfferNotification();
                }, 4000);
            }
        } else {
            console.log('⚠️ Failed to fetch appointments:', response.status);
            // If we can't check appointments, only show first booking offer if not seen
            if (!customerData.hasSeenFirstBookingOffer) {
                setTimeout(() => {
                    showFirstBookingOfferNotification();
                }, 4000);
            }
        }
    } catch (error) {
        console.error('❌ Error checking appointments:', error);
        if (!customerData.hasSeenFirstBookingOffer) {
            setTimeout(() => {
                showFirstBookingOfferNotification();
            }, 4000);
        }
    }
}

// Show First Booking Offer Notification
function showFirstBookingOfferNotification() {
    console.log('🎁 Showing first booking offer notification');
    
    // Check if notification already exists
    const existing = document.querySelector('.first-booking-offer');
    if (existing) {
        console.log('ℹ️ Notification already exists');
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = 'first-booking-offer';
    notification.innerHTML = `
        <div class="offer-content">
            <div class="offer-icon">🎁</div>
            <div class="offer-text">
                <h3>احصل على 100 نقطة مجاناً!</h3>
                <p>قم بالحجز لموعدك الأول واحصل على 100 نقطة (ما يعادل 100 دينار جزائري)</p>
            </div>
            <button class="offer-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <button class="offer-action" onclick="openBookingModal(); this.parentElement.remove();">
            احجز الآن
        </button>
    `;
    
    document.body.appendChild(notification);
    console.log('✅ First booking offer notification added to DOM');
    
    // Mark as seen
    if (customerData) {
        customerData.hasSeenFirstBookingOffer = true;
        localStorage.setItem('customerData', JSON.stringify(customerData));
        console.log('✅ Marked offer as seen');
    }
    
    // Auto remove after 30 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 30000);
}

// Check Returning Customer Offer (50 points)
async function checkReturningCustomerOffer() {
    if (!customerData) {
        console.log('⚠️ checkReturningCustomerOffer: No customerData');
        return;
    }
    
    // Check if customer has already seen the returning customer offer
    if (customerData.hasSeenReturningCustomerOffer) {
        console.log('ℹ️ Customer has already seen the returning customer offer');
        return;
    }
    
    // Check if customer has any pending appointments (not completed)
    try {
        const response = await fetch(`${API_URL}/appointments/customer`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                // Check if there are any pending appointments
                const pendingAppointments = data.filter(apt => 
                    apt.status !== 'completed' && apt.status !== 'cancelled'
                );
                
                if (pendingAppointments.length === 0) {
                    // No pending appointments - show 50 points offer
                    console.log('✅ No pending appointments, showing returning customer offer (50 points)');
                    setTimeout(() => {
                        showReturningCustomerOfferNotification();
                    }, 2000);
                } else {
                    console.log('ℹ️ Customer has pending appointments, not showing offer');
                }
            }
        }
    } catch (error) {
        console.error('❌ Error checking appointments for returning customer offer:', error);
    }
}

// Show Returning Customer Offer Notification (50 points)
function showReturningCustomerOfferNotification() {
    console.log('🎁 Showing returning customer offer notification (50 points)');
    
    // Check if notification already exists
    const existing = document.querySelector('.returning-customer-offer');
    if (existing) {
        console.log('ℹ️ Notification already exists');
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = 'returning-customer-offer';
    notification.innerHTML = `
        <div class="offer-content">
            <div class="offer-icon">🎉</div>
            <div class="offer-text">
                <h3>احصل على 50 نقطة مجاناً!</h3>
                <p>قم بالحجز لموعدك واحصل على 50 نقطة (ما يعادل 50 دينار جزائري)</p>
            </div>
            <button class="offer-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <button class="offer-action" onclick="openBookingModal(); this.parentElement.remove();">
            احجز الآن
        </button>
    `;
    
    document.body.appendChild(notification);
    console.log('✅ Returning customer offer notification added to DOM');
    
    // Mark as seen
    if (customerData) {
        customerData.hasSeenReturningCustomerOffer = true;
        localStorage.setItem('customerData', JSON.stringify(customerData));
        console.log('✅ Marked returning customer offer as seen');
    }
    
    // Auto remove after 30 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 30000);
}

// Show Pending Reward Notification
function showPendingRewardNotification(points = 100) {
    const notification = document.createElement('div');
    notification.className = 'pending-reward-notification';
    notification.innerHTML = `
        <div class="reward-content">
            <div class="reward-icon">⏳</div>
            <div class="reward-text">
                <h3>مكافأة معلقة: ${points} نقطة</h3>
                <p>ستحصل على ${points} نقطة (${points} دينار جزائري) بعد تأكيد صاحب المحل لإكمال الحلاقة</p>
            </div>
            <button class="reward-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 8 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 8000);
}

// Load Notifications
async function loadNotifications() {
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            if (response.status !== 404) {
                console.log('Notifications endpoint not available yet');
            }
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

function showCoins() {
    if (!token) {
        showNotification('سجل دخول لعرض عملاتك', 'error');
        setTimeout(() => {
            window.location.href = '/customer-login';
        }, 2000);
        return;
    }
    hideAllPages();
    document.getElementById('coinsPage').classList.remove('hidden');
    loadCoins();
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
        
        // Clear selections
        selectedServices = [];
        document.querySelectorAll('.booking-service-card').forEach(card => {
            card.classList.remove('selected');
        });
        updateBookingSummary();
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
    if (diff < 3600) return Math.floor(diff / 60) + ' د';
    if (diff < 86400) return Math.floor(diff / 3600) + ' س';
    if (diff < 604800) return Math.floor(diff / 86400) + ' يوم';
    
    const formatted = date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
    return formatted;
}

function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.getElementById('notification');
    if (notification) {
        // Support multiline messages
        notification.innerHTML = message.replace(/\n/g, '<br>');
        notification.className = `notification ${type} show`;
        notification.style.whiteSpace = 'pre-wrap';
        notification.style.textAlign = 'right';
        notification.style.maxWidth = '90%';
        notification.style.margin = '0 auto';
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }
}

// Convert numbers to Arabic numerals
function toArabicNumerals(text) {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return text.toString().replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
}

// Format time (keep French numerals)
function formatTimeArabic(time) {
    return time;
}

// Format date (keep French numerals)
function formatDateArabic(dateString) {
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString('ar-DZ', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    return formatted;
}

// Image Lightbox - Professional Zoom
function openImageLightbox(imageUrl, serviceName) {
    // Create lightbox if doesn't exist
    let lightbox = document.getElementById('imageLightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'imageLightbox';
        lightbox.className = 'image-lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-overlay" onclick="closeImageLightbox()"></div>
            <div class="lightbox-content">
                <button class="lightbox-close" onclick="closeImageLightbox()">✕</button>
                <img src="" alt="" class="lightbox-image">
                <div class="lightbox-title"></div>
            </div>
        `;
        document.body.appendChild(lightbox);
    }
    
    // Set image and title
    const img = lightbox.querySelector('.lightbox-image');
    const title = lightbox.querySelector('.lightbox-title');
    img.src = imageUrl;
    img.alt = serviceName;
    title.textContent = serviceName;
    
    // Show lightbox
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeImageLightbox() {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
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

// ============================================
// AI Assistant - Floating Icon & Chat
// ============================================

let aiConversationHistory = [];

// Initialize AI Assistant
document.addEventListener('DOMContentLoaded', () => {
    // Wait for splash screen to finish
    setTimeout(() => {
        initAIFloatingIcon();
        initAIChat();
        loadWassimImage();
    }, 4000);
});

// Load saved wassim image
function loadWassimImage() {
    const avatarCircle = document.getElementById('wassimAvatarCircle');
    if (!avatarCircle) return;
    
    // Try to load from localStorage first (user uploaded image)
    const savedImage = localStorage.getItem('wassimAvatarImage');
    const imageUrl = savedImage || '/nassim/wassim-logo.jpg';
    
    // Check if image exists before setting it
    const img = new Image();
    img.onload = function() {
        // Image exists, set it
        avatarCircle.style.backgroundImage = `url(${imageUrl})`;
        avatarCircle.style.backgroundSize = 'cover';
        avatarCircle.style.backgroundPosition = 'center';
        avatarCircle.classList.add('has-image');
        const initial = document.getElementById('wassimInitial');
        if (initial) initial.style.display = 'none';
        
        // Update all avatars in chat
        updateWassimAvatars(imageUrl);
    };
    img.onerror = function() {
        // Image doesn't exist, keep default (W initial)
        console.log('⚠️ wassim-logo.jpg not found, using default avatar');
        avatarCircle.style.backgroundImage = '';
        avatarCircle.classList.remove('has-image');
        const initial = document.getElementById('wassimInitial');
        if (initial) initial.style.display = 'flex';
    };
    img.src = imageUrl;
}

// Handle image upload for wassim avatar
function handleWassimImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('حجم الصورة كبير جداً! يرجى اختيار صورة أصغر من 2MB');
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            alert('الرجاء اختيار ملف صورة صحيح');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            localStorage.setItem('wassimAvatarImage', imageData);
            
            const avatarCircle = document.getElementById('wassimAvatarCircle');
            if (avatarCircle) {
                avatarCircle.style.backgroundImage = `url(${imageData})`;
                avatarCircle.style.backgroundSize = 'cover';
                avatarCircle.style.backgroundPosition = 'center';
                avatarCircle.classList.add('has-image');
                const initial = document.getElementById('wassimInitial');
                if (initial) initial.style.display = 'none';
            }
            
            // Update avatar in chat header and messages
            updateWassimAvatars(imageData);
            
            // Show success message
            if (window.showNotification) {
                showNotification('✅ تم تحديث صورة wassim بنجاح!', 'success');
            } else {
                console.log('✅ تم تحديث صورة wassim بنجاح!');
            }
        };
        reader.onerror = function() {
            alert('حدث خطأ أثناء قراءة الصورة. يرجى المحاولة مرة أخرى.');
        };
        reader.readAsDataURL(file);
    }
    
    // Reset input to allow selecting same file again
    event.target.value = '';
}

// Update all wassim avatars
function updateWassimAvatars(imageData) {
    // Update header avatar (same as floating icon)
    const headerIcon = document.getElementById('wassimHeaderIcon') || document.querySelector('.wassim-ai-header-icon');
    if (headerIcon) {
        headerIcon.style.backgroundImage = `url(${imageData})`;
        headerIcon.style.backgroundSize = 'cover';
        headerIcon.style.backgroundPosition = 'center';
    }
    
    // Update message avatars
    const messageAvatars = document.querySelectorAll('.wassim-message-avatar');
    messageAvatars.forEach(avatar => {
        avatar.style.backgroundImage = `url(${imageData})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        const initial = avatar.querySelector('.wassim-avatar-initial');
        if (initial) initial.style.display = 'none';
    });
    
    // Update typing indicator avatar
    const typingAvatar = document.querySelector('#wassimTypingIndicator .wassim-message-avatar');
    if (typingAvatar) {
        typingAvatar.style.backgroundImage = `url(${imageData})`;
        typingAvatar.style.backgroundSize = 'cover';
        typingAvatar.style.backgroundPosition = 'center';
        const initial = typingAvatar.querySelector('.wassim-avatar-initial');
        if (initial) initial.style.display = 'none';
    }
}

// Add click to upload image - Double click on avatar to upload
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const avatarCircle = document.getElementById('wassimAvatarCircle');
        const uploadInput = document.getElementById('wassimImageUpload');
        
        if (avatarCircle && uploadInput) {
            // Double click to upload image
            avatarCircle.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                e.preventDefault();
                uploadInput.click();
            });
            
            // Add tooltip
            avatarCircle.title = 'انقر مرتين لتغيير الصورة';
        }
    }, 4000);
});

// Also initialize after page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            initAIFloatingIcon();
            initAIChat();
        }, 4000);
    });
} else {
    setTimeout(() => {
        initAIFloatingIcon();
        initAIChat();
    }, 4000);
}

// Initialize Floating Icon - Draggable
function initAIFloatingIcon() {
    const icon = document.getElementById('aiFloatingIcon');
    if (!icon) {
        console.warn('⚠️ AI Floating Icon not found in DOM');
        return;
    }
    
    console.log('✅ AI Floating Icon initialized');
    // Ensure icon is visible
    icon.style.display = 'flex';
    icon.style.visibility = 'visible';
    icon.style.opacity = '1';

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    let dragStartTime = 0;
    let hasMoved = false;

    // Load saved position
    const savedPos = localStorage.getItem('aiIconPosition');
    if (savedPos) {
        const pos = JSON.parse(savedPos);
        xOffset = pos.x;
        yOffset = pos.y;
        icon.style.left = pos.x + 'px';
        icon.style.bottom = 'auto';
        icon.style.top = pos.y + 'px';
    }

    // Mouse events
    icon.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // Touch events
    icon.addEventListener('touchstart', dragStart);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', dragEnd);

    // Click to open chat (only if not dragged)
    icon.addEventListener('click', (e) => {
        // إذا كان النقر على الصورة (avatar circle)، لا تفتح المحادثة
        if (e.target.closest('.wassim-avatar-circle') || e.target.closest('#wassimImageUpload')) {
            return; // دع handleWassimImageUpload يتعامل معه
        }
        
        const timeSinceDrag = Date.now() - dragStartTime;
        if (!isDragging && !hasMoved && timeSinceDrag > 100) {
            // فتح محادثة wassim القديمة
            if (window.wassimAI) {
                window.wassimAI.toggle();
            } else {
                openAIChat();
            }
        }
        hasMoved = false;
    });

    function dragStart(e) {
        e.stopPropagation();
        dragStartTime = Date.now();
        hasMoved = false;
        
        if (e.type === 'touchstart') {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }

        if (e.target === icon || icon.contains(e.target)) {
            isDragging = true;
            icon.style.cursor = 'grabbing';
            icon.style.transition = 'none';
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = true;
            
            if (e.type === 'touchmove') {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }

            xOffset = currentX;
            yOffset = currentY;

            // Constrain to viewport
            const maxX = window.innerWidth - icon.offsetWidth;
            const maxY = window.innerHeight - icon.offsetHeight;

            xOffset = Math.max(0, Math.min(xOffset, maxX));
            yOffset = Math.max(0, Math.min(yOffset, maxY));

            icon.style.left = xOffset + 'px';
            icon.style.top = yOffset + 'px';
            icon.style.bottom = 'auto';
            icon.style.right = 'auto';
        }
    }

    function dragEnd(e) {
        if (isDragging) {
            isDragging = false;
            icon.style.cursor = 'move';
            icon.style.transition = 'all 0.3s ease';
            
            // Save position
            localStorage.setItem('aiIconPosition', JSON.stringify({
                x: xOffset,
                y: yOffset
            }));
        }
    }
}

// Initialize AI Chat
function initAIChat() {
    const chatInput = document.getElementById('aiChatInput');
    const sendButton = document.getElementById('aiSendButton');
    
    if (!chatInput || !sendButton) return;

    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    // Send on Enter (Shift+Enter for new line)
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAIMessage();
        }
    });
}

// Open AI Chat - استخدام wassim القديم
function openAIChat() {
    if (window.wassimAI) {
        window.wassimAI.toggle();
    } else {
        // Fallback: فتح النافذة الجديدة
        const modal = document.getElementById('aiChatModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('aiChatInput')?.focus();
        }
    }
}

// Close AI Chat
function closeAIChat() {
    if (window.wassimAI) {
        window.wassimAI.close();
    } else {
        const modal = document.getElementById('aiChatModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
}

// Send AI Message
async function sendAIMessage() {
    const chatInput = document.getElementById('aiChatInput');
    const sendButton = document.getElementById('aiSendButton');
    const messagesContainer = document.getElementById('aiChatMessages');
    const typingIndicator = document.getElementById('aiTypingIndicator');
    
    if (!chatInput || !sendButton) return;

    const message = chatInput.value.trim();
    if (!message) return;

    // Remove welcome message
    const welcomeMsg = messagesContainer.querySelector('.ai-welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    // Add user message
    addAIMessage('user', message);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Disable input
    sendButton.disabled = true;
    chatInput.disabled = true;

    // Show typing indicator
    if (typingIndicator) {
        typingIndicator.classList.add('active');
    }
    scrollAIChatToBottom();

    try {
        const response = await fetch(`${API_URL}/ai/chat/customer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message,
                businessId: NASSIM_BUSINESS_ID,
                conversationHistory: aiConversationHistory
            })
        });

        const data = await response.json();

        if (data.success) {
            aiConversationHistory = data.data.conversationHistory;
            addAIMessage('assistant', data.data.response);
        } else {
            addAIMessage('assistant', '❌ عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.');
        }
    } catch (error) {
        console.error('AI Chat Error:', error);
        addAIMessage('assistant', '❌ عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.');
    } finally {
        if (typingIndicator) {
            typingIndicator.classList.remove('active');
        }
        sendButton.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
    }
}

// Add AI Message
function addAIMessage(role, content) {
    const messagesContainer = document.getElementById('aiChatMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${role}`;

    const avatar = role === 'user' ? '👤' : '🤖';
    const time = new Date().toLocaleTimeString('ar-SA', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    messageDiv.innerHTML = `
        <div class="ai-message-avatar">${avatar}</div>
        <div>
            <div class="ai-message-bubble">${content.replace(/\n/g, '<br>')}</div>
            <div class="ai-message-time">${time}</div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    scrollAIChatToBottom();
}

// Scroll AI Chat to Bottom
function scrollAIChatToBottom() {
    const messagesContainer = document.getElementById('aiChatMessages');
    if (messagesContainer) {
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }
}