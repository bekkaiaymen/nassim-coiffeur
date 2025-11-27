// ===== API Configuration =====
const API_CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api' 
        : 'https://nassim-coiffeur.onrender.com/api',
    TIMEOUT: 10000
};

// ===== Enhanced API Helper =====
class APIClient {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    async request(endpoint, method = 'GET', data = null, options = {}) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            },
            ...options
        };

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'حدث خطأ');
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Convenience methods
    get(endpoint) { return this.request(endpoint, 'GET'); }
    post(endpoint, data) { return this.request(endpoint, 'POST', data); }
    put(endpoint, data) { return this.request(endpoint, 'PUT', data); }
    patch(endpoint, data) { return this.request(endpoint, 'PATCH', data); }
    delete(endpoint) { return this.request(endpoint, 'DELETE'); }
}

const api = new APIClient();

// ===== Real-time Updates =====
class RealtimeManager {
    constructor() {
        this.updateInterval = null;
        this.isActive = false;
    }

    start(callback, interval = 30000) {
        if (this.isActive) return;
        
        this.isActive = true;
        this.updateInterval = setInterval(callback, interval);
    }

    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            this.isActive = false;
        }
    }
}

const realtimeManager = new RealtimeManager();

// ===== Enhanced Appointment Functions =====
async function loadTodayAppointments() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const result = await api.get(`/appointments?date=${today}`);
        
        if (result.success) {
            updateAppointmentsList(result.data);
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

function updateAppointmentsList(appointments) {
    // Update appointments count
    const countElement = document.querySelector('.stat-card .stat-number');
    if (countElement) {
        countElement.textContent = appointments.filter(a => a.status !== 'cancelled').length;
    }

    // You can add more UI updates here
}

// ===== Enhanced Customer Management =====
async function searchCustomer(query) {
    try {
        const result = await api.get(`/customers?search=${encodeURIComponent(query)}`);
        return result.data;
    } catch (error) {
        console.error('Error searching customer:', error);
        return [];
    }
}

async function getCustomerHistory(customerId) {
    try {
        const result = await api.get(`/customers/${customerId}`);
        return result.data;
    } catch (error) {
        console.error('Error loading customer history:', error);
        return null;
    }
}

// ===== Service Management =====
async function loadServices() {
    try {
        const result = await api.get('/services');
        
        if (result.success) {
            updateServicesDropdowns(result.data);
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

function updateServicesDropdowns(services) {
    const serviceSelects = document.querySelectorAll('select[name="service"]');
    
    serviceSelects.forEach(select => {
        select.innerHTML = services
            .filter(s => s.available)
            .map(s => `<option value="${s.name}" data-price="${s.price}">${s.name} - ${s.price} ر.س</option>`)
            .join('');
    });
}

// ===== Analytics & Charts =====
async function loadAnalytics(period = 'week') {
    try {
        const result = await api.get(`/stats/dashboard?period=${period}`);
        
        if (result.success) {
            updateDashboardCharts(result.data);
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function updateDashboardCharts(data) {
    // Update revenue chart
    if (data.weeklyRevenue) {
        const chartBars = document.querySelectorAll('.chart-bar');
        const maxRevenue = Math.max(...data.weeklyRevenue.map(d => d.revenue), 1);
        
        data.weeklyRevenue.forEach((day, index) => {
            if (chartBars[index]) {
                const height = (day.revenue / maxRevenue * 100);
                chartBars[index].style.height = `${Math.max(height, 20)}%`;
                
                // Add tooltip
                chartBars[index].title = `${day.date}: ${day.revenue.toFixed(0)} ر.س`;
            }
        });
    }

    // Update top services
    if (data.topServices) {
        const serviceList = document.querySelector('.service-list');
        if (serviceList) {
            const maxCount = data.topServices[0]?.count || 1;
            
            serviceList.innerHTML = data.topServices.map(service => `
                <div class="service-item">
                    <span class="service-name">${service.service}</span>
                    <div class="service-bar" style="width: ${(service.count / maxCount * 100)}%"></div>
                    <span class="service-count">${service.count}</span>
                </div>
            `).join('');
        }
    }
}

// ===== Notifications System =====
class NotificationManager {
    constructor() {
        this.container = this.createContainer();
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
        return container;
    }

    show(type, message, duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
            cursor: pointer;
        `;
        notification.textContent = message;

        notification.onclick = () => this.hide(notification);

        this.container.appendChild(notification);

        setTimeout(() => this.hide(notification), duration);
    }

    hide(notification) {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }
}

const notifications = new NotificationManager();

// Override the old showNotification function
function showNotification(type, message) {
    notifications.show(type, message);
}

// ===== Form Validation =====
class FormValidator {
    static validatePhone(phone) {
        const phoneRegex = /^(0[567]|[567])\d{8}$/;
        return phoneRegex.test(phone);
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateRequired(value) {
        return value && value.trim().length > 0;
    }

    static validateForm(formData, rules) {
        const errors = {};

        for (const [field, rule] of Object.entries(rules)) {
            const value = formData[field];

            if (rule.required && !this.validateRequired(value)) {
                errors[field] = `${rule.label} مطلوب`;
                continue;
            }

            if (rule.type === 'phone' && value && !this.validatePhone(value)) {
                errors[field] = 'رقم الجوال غير صحيح (يجب أن يبدأ بـ 05)';
            }

            if (rule.type === 'email' && value && !this.validateEmail(value)) {
                errors[field] = 'البريد الإلكتروني غير صحيح';
            }

            if (rule.min && value && value.length < rule.min) {
                errors[field] = `${rule.label} يجب أن يكون ${rule.min} أحرف على الأقل`;
            }
        }

        return errors;
    }
}

// ===== Loading State Manager =====
class LoadingManager {
    static show(element) {
        if (!element) return;
        
        element.disabled = true;
        element.dataset.originalText = element.textContent;
        element.innerHTML = '<span class="spinner"></span> جاري التحميل...';
    }

    static hide(element) {
        if (!element) return;
        
        element.disabled = false;
        element.textContent = element.dataset.originalText || 'تأكيد';
    }
}

// ===== Enhanced Booking with Validation =====
async function confirmBooking() {
    const form = document.querySelector('#demo-booking form');
    const submitBtn = event?.target || form.querySelector('button[type="button"]');
    
    const formData = {
        customerName: form.querySelector('input[type="text"]').value,
        customerPhone: form.querySelector('input[type="tel"]').value,
        service: form.querySelectorAll('select')[0].value,
        date: form.querySelector('input[type="date"]').value,
        time: form.querySelectorAll('select')[1].value,
        barber: form.querySelectorAll('select')[2].value.split(' ')[0]
    };

    // Validate
    const errors = FormValidator.validateForm(formData, {
        customerName: { required: true, label: 'اسم العميل' },
        customerPhone: { required: true, type: 'phone', label: 'رقم الجوال' },
        service: { required: true, label: 'نوع الخدمة' },
        date: { required: true, label: 'التاريخ' },
        time: { required: true, label: 'الوقت' },
        barber: { required: true, label: 'الموظف' }
    });

    if (Object.keys(errors).length > 0) {
        const errorMessage = Object.values(errors).join('\n');
        showNotification('error', errorMessage);
        return;
    }

    LoadingManager.show(submitBtn);

    try {
        const result = await api.post('/appointments', formData);
        showNotification('success', `تم تأكيد الحجز لـ ${formData.customerName} بنجاح!`);
        
        form.reset();
        
        // Reload appointments
        await loadTodayAppointments();
        
    } catch (error) {
        showNotification('error', error.message || 'حدث خطأ أثناء الحجز');
    } finally {
        LoadingManager.hide(submitBtn);
    }
}

// ===== Export Functions =====
window.api = api;
window.notifications = notifications;
window.FormValidator = FormValidator;
window.LoadingManager = LoadingManager;