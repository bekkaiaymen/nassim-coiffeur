// Nassim Mobile App JavaScript
const BUSINESS_ID = '675f8f18af7df84cc2e5c2d5';
let currentUser = null;
let currentPage = 'home';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadPosts();
});

// Get token from localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Load user info
async function loadUserInfo() {
    try {
        const token = getToken();
        if (!token) {
            document.getElementById('userName').textContent = 'زائر';
            document.getElementById('profileAvatar').textContent = '؟';
            return;
        }

        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            currentUser = result.data;
            
            // Update UI
            const name = currentUser.name || 'عميل';
            document.getElementById('userName').textContent = name;
            document.getElementById('profileAvatar').textContent = name.charAt(0).toUpperCase();
            
            // Load loyalty points
            loadLoyaltyInfo();
        }
    } catch (error) {
        console.error('خطأ في تحميل بيانات المستخدم:', error);
    }
}

// Load loyalty info
async function loadLoyaltyInfo() {
    try {
        const token = getToken();
        if (!token) return;

        const response = await fetch(`/api/customers/business/${BUSINESS_ID}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.data) {
                const points = result.data.loyaltyPoints || 0;
                document.getElementById('pointsNumber').textContent = points;
                
                // Set tier
                let tier = '🥉 برونزي';
                if (points >= 100) tier = '💎 ماسي';
                else if (points >= 50) tier = '🥇 ذهبي';
                else if (points >= 20) tier = '🥈 فضي';
                
                document.getElementById('tierLabel').textContent = tier;
            }
        }
    } catch (error) {
        console.error('خطأ في تحميل النقاط:', error);
    }
}

// Load posts
async function loadPosts() {
    try {
        const response = await fetch(`/api/posts/public/${BUSINESS_ID}`);
        const result = await response.json();
        
        const postsList = document.getElementById('postsList');
        
        if (result.success && result.data && result.data.length > 0) {
            postsList.innerHTML = result.data.slice(0, 3).map(post => `
                <div class="post-card">
                    <span class="post-type-badge">${getPostTypeLabel(post.type)}</span>
                    <h3 class="post-title">${post.title}</h3>
                    <p class="post-content">${post.content}</p>
                </div>
            `).join('');
        } else {
            postsList.innerHTML = '<p style="text-align: center; color: #B0B0B0;">لا توجد إعلانات حالياً</p>';
        }
    } catch (error) {
        console.error('خطأ في تحميل الإعلانات:', error);
        document.getElementById('postsList').innerHTML = '<p style="text-align: center; color: #FF3B30;">حدث خطأ في التحميل</p>';
    }
}

// Load appointments
async function loadAppointments() {
    try {
        const token = getToken();
        if (!token) {
            document.getElementById('appointmentsList').innerHTML = '<p style="text-align: center; color: #B0B0B0;">الرجاء تسجيل الدخول لرؤية المواعيد</p>';
            return;
        }

        const response = await fetch('/api/appointments/my-appointments', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        const appointmentsList = document.getElementById('appointmentsList');
        
        if (result.success && result.data && result.data.length > 0) {
            appointmentsList.innerHTML = result.data.map(apt => {
                const date = new Date(apt.appointmentDate);
                const status = getStatusBadge(apt.status);
                
                return `
                    <div class="post-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span class="post-type-badge">${status}</span>
                            <span style="color: #B0B0B0; font-size: 14px;">${date.toLocaleDateString('ar-SA')}</span>
                        </div>
                        <h3 class="post-title">${apt.service?.name || 'خدمة'}</h3>
                        <p class="post-content">
                            ⏰ ${apt.timeSlot}<br>
                            👤 ${apt.employee?.name || 'موظف'}<br>
                            💰 ${apt.service?.price || 0} دج
                        </p>
                    </div>
                `;
            }).join('');
        } else {
            appointmentsList.innerHTML = '<p style="text-align: center; color: #B0B0B0;">لا توجد مواعيد حالياً</p>';
        }
    } catch (error) {
        console.error('خطأ في تحميل المواعيد:', error);
        document.getElementById('appointmentsList').innerHTML = '<p style="text-align: center; color: #FF3B30;">حدث خطأ في التحميل</p>';
    }
}

// Load rewards
async function loadRewards() {
    try {
        const response = await fetch(`/api/rewards/public/${BUSINESS_ID}`);
        const result = await response.json();
        
        const rewardsList = document.getElementById('rewardsList');
        
        if (result.success && result.data && result.data.length > 0) {
            rewardsList.innerHTML = result.data.map(reward => `
                <div class="reward-card">
                    <div class="reward-icon">🎁</div>
                    <h3 class="reward-name">${reward.name}</h3>
                    <p class="reward-cost">${reward.pointsCost} نقطة</p>
                </div>
            `).join('');
        } else {
            rewardsList.innerHTML = '<p style="text-align: center; color: #B0B0B0; grid-column: 1/-1;">لا توجد مكافآت متاحة</p>';
        }
    } catch (error) {
        console.error('خطأ في تحميل المكافآت:', error);
        document.getElementById('rewardsList').innerHTML = '<p style="text-align: center; color: #FF3B30; grid-column: 1/-1;">حدث خطأ في التحميل</p>';
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const token = getToken();
        if (!token) {
            document.getElementById('notificationsList').innerHTML = '<p style="text-align: center; color: #B0B0B0;">الرجاء تسجيل الدخول لرؤية الإشعارات</p>';
            return;
        }

        const response = await fetch('/api/notifications/my', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        const notificationsList = document.getElementById('notificationsList');
        
        if (result.success && result.data && result.data.length > 0) {
            notificationsList.innerHTML = result.data.map(notif => {
                const date = new Date(notif.createdAt);
                const isUnread = !notif.read;
                
                return `
                    <div class="post-card" style="${isUnread ? 'border-left: 4px solid #FDB714;' : ''}">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span class="post-type-badge">${getNotificationTypeLabel(notif.type)}</span>
                            <span style="color: #B0B0B0; font-size: 12px;">${formatDate(date)}</span>
                        </div>
                        <h3 class="post-title">${notif.title}</h3>
                        <p class="post-content">${notif.message}</p>
                    </div>
                `;
            }).join('');
        } else {
            notificationsList.innerHTML = '<p style="text-align: center; color: #B0B0B0;">لا توجد إشعارات</p>';
        }
    } catch (error) {
        console.error('خطأ في تحميل الإشعارات:', error);
        document.getElementById('notificationsList').innerHTML = '<p style="text-align: center; color: #FF3B30;">حدث خطأ في التحميل</p>';
    }
}

// Show page
function showPage(page) {
    // Hide all sections
    document.getElementById('homeSection').classList.add('hidden');
    document.getElementById('appointmentsSection').classList.add('hidden');
    document.getElementById('rewardsSection').classList.add('hidden');
    document.getElementById('notificationsSection').classList.add('hidden');
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected page
    currentPage = page;
    
    if (page === 'home') {
        document.getElementById('homeSection').classList.remove('hidden');
        document.querySelectorAll('.nav-item')[0].classList.add('active');
        loadPosts();
    } else if (page === 'appointments') {
        document.getElementById('appointmentsSection').classList.remove('hidden');
        document.querySelectorAll('.nav-item')[1].classList.add('active');
        loadAppointments();
    } else if (page === 'rewards') {
        document.getElementById('rewardsSection').classList.remove('hidden');
        document.querySelectorAll('.nav-item')[3].classList.add('active');
        loadRewards();
    } else if (page === 'notifications') {
        document.getElementById('notificationsSection').classList.remove('hidden');
        document.querySelectorAll('.nav-item')[4].classList.add('active');
        loadNotifications();
    }
}

// Helper functions
function getPostTypeLabel(type) {
    const types = {
        announcement: '📢 إعلان',
        offer: '🏷️ عرض',
        news: '📰 خبر',
        tip: '💡 نصيحة'
    };
    return types[type] || '📢 إعلان';
}

function getStatusBadge(status) {
    const badges = {
        pending: '⏳ قيد الانتظار',
        confirmed: '✅ مؤكد',
        completed: '✔️ مكتمل',
        cancelled: '❌ ملغي'
    };
    return badges[status] || status;
}

function getNotificationTypeLabel(type) {
    const types = {
        appointment: '📅 موعد',
        reward: '🎁 مكافأة',
        reminder: '⏰ تذكير',
        general: 'ℹ️ عام'
    };
    return types[type] || 'ℹ️';
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    
    return date.toLocaleDateString('ar-SA');
}

// Show toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
