// ===== Configuration =====
const API_BASE_URL = 'http://localhost:3000/api';
let currentLang = 'ar';
let currentUser = null;

// ===== Language Toggle =====
function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    
    // Update button text
    const langBtn = document.querySelector('.lang-btn');
    langBtn.textContent = currentLang === 'ar' ? 'EN' : 'عربي';
}

// ===== API Helper Functions =====
async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
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

// ===== Smooth Scrolling =====
function scrollToFeatures() {
    document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
}

// ===== Demo Tabs =====
function showDemoTab(tabName) {
    // Hide all panels
    const panels = document.querySelectorAll('.demo-panel');
    panels.forEach(panel => panel.classList.remove('active'));
    
    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.demo-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Show selected panel
    const panel = document.getElementById(`demo-${tabName}`);
    if (panel) {
        panel.classList.add('active');
    }
    
    // Activate clicked tab
    event.target.classList.add('active');
}

// ===== Booking Demo =====
async function confirmBooking() {
    const form = document.querySelector('#demo-booking form');
    const customerName = form.querySelector('input[type="text"]').value;
    const customerPhone = form.querySelector('input[type="tel"]').value;
    const service = form.querySelector('select[name="service"]')?.value || 
                   form.querySelectorAll('select')[0].value;
    const date = form.querySelector('input[type="date"]').value;
    const time = form.querySelectorAll('select')[1].value;
    const barber = form.querySelectorAll('select')[2].value.split(' ')[0];

    if (!customerName || !customerPhone || !service || !date || !time || !barber) {
        showNotification('error', 'الرجاء تعبئة جميع الحقول');
        return;
    }

    try {
        const result = await apiRequest('/appointments', 'POST', {
            customerName,
            customerPhone,
            service,
            date,
            time,
            barber
        });

        showNotification('success', `تم تأكيد الحجز لـ ${customerName} بنجاح! سيتم إرسال رسالة تأكيد عبر الواتساب.`);
        
        // Reset form
        setTimeout(() => {
            form.reset();
        }, 1000);
    } catch (error) {
        showNotification('error', error.message || 'حدث خطأ أثناء الحجز');
    }
}

// ===== Invoice Demo =====
function addInvoiceItem() {
    const container = document.querySelector('.invoice-items');
    const newItem = document.createElement('div');
    newItem.className = 'invoice-item';
    newItem.innerHTML = `
        <select>
            <option>اختر الخدمة</option>
            <option>حلاقة كاملة</option>
            <option>حلاقة + لحية</option>
            <option>تشذيب لحية</option>
            <option>صبغة</option>
        </select>
        <input type="number" placeholder="السعر">
        <button type="button" class="btn-icon" onclick="removeInvoiceItem(this)">❌</button>
    `;
    container.appendChild(newItem);
}

function removeInvoiceItem(button) {
    button.parentElement.remove();
    updateInvoiceTotal();
}

function updateInvoiceTotal() {
    const items = document.querySelectorAll('.invoice-item input[type="number"]');
    let total = 0;
    items.forEach(item => {
        total += parseFloat(item.value) || 0;
    });
    
    const tax = total * 0.15;
    const finalTotal = total + tax;
    
    document.querySelector('.summary-row:nth-child(1) span:last-child').textContent = `${total} ريال`;
    document.querySelector('.summary-row:nth-child(2) span:last-child').textContent = `${tax.toFixed(2)} ريال`;
    document.querySelector('.summary-row.total span:last-child').textContent = `${finalTotal.toFixed(2)} ريال`;
}

async function generateInvoice() {
    const form = document.querySelector('.invoice-form');
    const customerName = form.querySelector('input[type="text"]').value;
    const items = [];
    
    form.querySelectorAll('.invoice-item').forEach(item => {
        const service = item.querySelector('select').value;
        const price = parseFloat(item.querySelector('input[type="number"]').value);
        if (service && price) {
            items.push({ service, price, quantity: 1 });
        }
    });

    const paymentMethod = form.querySelector('select[name="payment"]')?.value || 
                         form.querySelectorAll('select')[items.length].value;

    if (!customerName || items.length === 0) {
        showNotification('error', 'الرجاء تعبئة البيانات والخدمات');
        return;
    }

    try {
        const result = await apiRequest('/invoices', 'POST', {
            customerName,
            customerPhone: '0500000000', // يمكن إضافة حقل للهاتف
            items,
            paymentMethod: paymentMethod === 'نقدي' ? 'cash' : 
                          paymentMethod === 'بطاقة' ? 'card' : 'transfer'
        });

        showNotification('success', `تم إصدار الفاتورة رقم ${result.data.invoiceNumber} بنجاح!`);
        
        setTimeout(() => {
            form.reset();
            document.querySelector('.invoice-items').innerHTML = `
                <div class="invoice-item">
                    <select>
                        <option selected>حلاقة كاملة</option>
                        <option>حلاقة + لحية</option>
                        <option>صبغة</option>
                    </select>
                    <input type="number" value="50" placeholder="السعر">
                    <button type="button" class="btn-icon">❌</button>
                </div>
            `;
        }, 1500);
    } catch (error) {
        showNotification('error', error.message || 'حدث خطأ أثناء إصدار الفاتورة');
    }
}

// ===== Notification System =====
function showNotification(type, message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 1.5rem 2rem;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// ===== Dashboard Functions =====
function showDashboard() {
    // Navigate to the actual dashboard page
    window.location.href = '/dashboard';
}

function showDemo() {
    // Scroll to demo section
    document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
}

// ===== Chat Demo =====
async function sendMessage() {
    const input = document.querySelector('.chat-input input');
    const message = input.value.trim();
    
    if (message) {
        // Add customer message
        addChatMessage('customer', message);
        input.value = '';
        
        // Get AI response from backend
        try {
            const result = await apiRequest('/ai/chat', 'POST', {
                message,
                customerPhone: null // يمكن تمرير رقم العميل إذا كان متاحاً
            });

            setTimeout(() => {
                addChatMessage('ai', result.data.message);
            }, 500);
        } catch (error) {
            setTimeout(() => {
                addChatMessage('ai', 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.');
            }, 500);
        }
    }
}

function addChatMessage(type, text) {
    const messagesContainer = document.querySelector('.chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const time = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    
    if (type === 'ai') {
        messageDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <p>${text}</p>
                <span class="message-time">${time}</span>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${text}</p>
                <span class="message-time">${time}</span>
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ===== Load Dashboard Data =====
async function loadDashboardData() {
    // Only load if we're on a page with stat cards (demo section)
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length === 0) {
        return; // Not on dashboard demo page, skip loading
    }
    
    try {
        const stats = await apiRequest('/stats/dashboard');
        
        if (stats.success) {
            // Update stats
            if (statCards[0]) statCards[0].querySelector('.stat-number').textContent = stats.data.todayAppointments;
            if (statCards[1]) statCards[1].querySelector('.stat-number').textContent = `${stats.data.todayRevenue.toFixed(0)} ر.س`;
            if (statCards[2]) statCards[2].querySelector('.stat-number').textContent = stats.data.monthCustomers;
            if (statCards[3]) statCards[3].querySelector('.stat-number').textContent = stats.data.avgRating;
            
            // Update chart
            const chartBars = document.querySelectorAll('.chart-bar');
            stats.data.weeklyRevenue.forEach((day, index) => {
                if (chartBars[index]) {
                    const maxRevenue = Math.max(...stats.data.weeklyRevenue.map(d => d.revenue));
                    const height = maxRevenue > 0 ? (day.revenue / maxRevenue * 100) : 20;
                    chartBars[index].style.height = `${Math.max(height, 20)}%`;
                }
            });
            
            // Update service list
            const serviceList = document.querySelector('.service-list');
            if (serviceList && stats.data.topServices.length > 0) {
                serviceList.innerHTML = stats.data.topServices.map(service => {
                    const maxCount = stats.data.topServices[0].count;
                    const width = (service.count / maxCount * 100);
                    return `
                        <div class="service-item">
                            <span class="service-name">${service.service}</span>
                            <div class="service-bar" style="width: ${width}%"></div>
                            <span class="service-count">${service.count}</span>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    // Don't load dashboard data on marketing page (index.html)
    // Only load on actual dashboard page
    const isMarketingPage = document.querySelector('.hero') !== null;
    if (!isMarketingPage && document.querySelectorAll('.stat-card').length > 0) {
        loadDashboardData();
    }
    
    // Chat input enter key
    const chatInput = document.querySelector('.chat-input input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // Chat send button
    const chatSendBtn = document.querySelector('.chat-input button');
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', sendMessage);
    }
    
    // Invoice items change listener
    const invoiceInputs = document.querySelectorAll('.invoice-item input[type="number"]');
    invoiceInputs.forEach(input => {
        input.addEventListener('input', updateInvoiceTotal);
    });
    
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all cards
    const cards = document.querySelectorAll('.feature-card, .business-card, .pricing-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
    
    // Animate chart bars
    const chartBars = document.querySelectorAll('.chart-bar');
    chartBars.forEach((bar, index) => {
        setTimeout(() => {
            const currentHeight = bar.style.height;
            bar.style.height = '0';
            setTimeout(() => {
                bar.style.height = currentHeight;
            }, 100);
        }, index * 100);
    });
    
    // Animate service bars
    const serviceBars = document.querySelectorAll('.service-bar');
    serviceBars.forEach((bar, index) => {
        const targetWidth = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => {
            bar.style.width = targetWidth;
        }, index * 200);
    });
});

// ===== Smooth scroll for all anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ===== Navbar scroll effect =====
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    }
    
    lastScroll = currentScroll;
});

// ===== Add CSS for notifications =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(-100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===== Sample Data for Demo =====
const sampleAppointments = [
    { customer: 'أحمد محمد', service: 'حلاقة كاملة', time: '10:00 صباحاً', barber: 'محمد' },
    { customer: 'خالد علي', service: 'حلاقة + لحية', time: '11:00 صباحاً', barber: 'خالد' },
    { customer: 'سعيد أحمد', service: 'صبغة', time: '1:00 مساءً', barber: 'محمد' },
    { customer: 'عمر حسن', service: 'حلاقة كاملة', time: '3:00 مساءً', barber: 'علي' },
];

const sampleServices = [
    { name: 'حلاقة كاملة', price: 50 },
    { name: 'حلاقة + لحية', price: 70 },
    { name: 'تشذيب لحية', price: 30 },
    { name: 'صبغة', price: 100 },
    { name: 'حلاقة أطفال', price: 40 },
];

// ===== Initialize =====
console.log('SmartBiz AI - Ready! 🚀');
console.log('Current Language:', currentLang);
console.log('Sample Appointments:', sampleAppointments.length);
console.log('Sample Services:', sampleServices.length);