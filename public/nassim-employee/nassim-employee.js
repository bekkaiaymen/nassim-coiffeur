// Global State
let currentEmployeeId = null;
let selectedAppointmentId = null;
let customerRatingValue = 0;
let servicesCache = [];
let timeSlots = [];

// API Base URL
const API_BASE = '/api';

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initEmployeeApp();
});

// Initialize App
async function initEmployeeApp() {
    setupForms();
    await loadServices();
    await loadRecentCustomers();
    generateTimeSlots();
    setDefaultDate();
}

// Setup Forms
function setupForms() {
    const quickAddForm = document.getElementById('quickAddForm');
    const feedbackForm = document.getElementById('customerFeedbackForm');
    const searchBtn = document.getElementById('searchCustomer');
    const refreshBtn = document.getElementById('refreshRecent');
    
    if (quickAddForm) {
        quickAddForm.addEventListener('submit', handleAddCustomer);
    }
    
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', handleCustomerFeedback);
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', searchCustomerAppointment);
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadRecentCustomers);
    }
    
    // Setup star rating
    setupStarRating('customerRatingStars', 'customerRating', (value) => {
        customerRatingValue = value;
    });
}

// Load Services
async function loadServices() {
    try {
        const response = await fetch(`${API_BASE}/services`);
        
        if (!response.ok) {
            throw new Error('فشل في تحميل الخدمات');
        }
        
        servicesCache = await response.json();
        populateServiceSelect();
        
    } catch (error) {
        console.error('Load services error:', error);
        showToast('فشل في تحميل الخدمات', 'error');
    }
}

// Populate Service Select
function populateServiceSelect() {
    const select = document.getElementById('serviceType');
    if (!select) return;
    
    if (servicesCache && servicesCache.length > 0) {
        select.innerHTML = '<option value="">اختر الخدمة</option>';
        servicesCache.forEach(service => {
            const option = document.createElement('option');
            option.value = service._id;
            option.textContent = `${service.name} - ${service.price} دج`;
            option.dataset.name = service.name;
            select.appendChild(option);
        });
    }
}

// Generate Time Slots
function generateTimeSlots() {
    const startHour = 9;
    const endHour = 21;
    const intervalMinutes = 30;
    
    timeSlots = [];
    
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += intervalMinutes) {
            const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            timeSlots.push(timeString);
        }
    }
    
    populateTimeSelect();
}

// Populate Time Select
function populateTimeSelect() {
    const select = document.getElementById('appointmentTime');
    if (!select || select.tagName === 'INPUT') return;
    
    select.innerHTML = '<option value="">اختر الوقت</option>';
    
    timeSlots.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        select.appendChild(option);
    });
}

// Set Default Date
function setDefaultDate() {
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        dateInput.value = formatDateForInput(new Date());
    }
}

// Handle Add Customer
async function handleAddCustomer(event) {
    event.preventDefault();
    
    // Get values (some are hidden defaults)
    const name = document.getElementById('customerName').value || 'زبون سريع';
    const phone = document.getElementById('customerPhone').value || '0000000000';
    
    // Auto-set date to today if empty
    let date = document.getElementById('appointmentDate').value;
    if (!date) {
        date = new Date().toISOString().split('T')[0];
    }

    const time = document.getElementById('appointmentTime').value;
    
    // Handle service selection (ID is serviceType in HTML)
    const serviceSelect = document.getElementById('serviceType');
    const serviceId = serviceSelect.value;
    const serviceName = serviceSelect.options[serviceSelect.selectedIndex].text;
    
    // Notes are optional/removed
    const notes = ''; 
    
    if (!time || !serviceId) {
        showToast('الرجاء اختيار الخدمة والوقت', 'error');
        return;
    }
    
    try {
        const payload = {
            customerName: name,
            customerPhone: phone, // Backend expects customerPhone
            phone: phone,         // Some endpoints might expect phone
            date: date,
            time: time,
            serviceId: serviceId, // This is actually the name in the select values (e.g. "حلاقة")
            service: serviceName, // Backend expects service name
            serviceName: serviceName,
            notes: notes,
            status: 'confirmed'
        };
        
        // If serviceId is not an ObjectId (it's a string like "حلاقة"), backend might complain if it expects ID.
        // But the select options in HTML are simple strings: <option value="حلاقة">
        // So we should send serviceName as serviceId or handle it.
        // The backend `routes/appointments.js` says:
        // const serviceLabel = serviceName || (typeof service === 'string' ? service : service?.name);
        // const serviceObjectId = serviceId || service?._id || req.body.serviceId;
        // It seems flexible.
        
        const response = await fetch(`${API_BASE}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('employeeToken')}` // Ensure auth
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || error.error || 'فشل في حفظ الموعد');
        }
        
        showToast('تم إضافة الزبون وحجز الموعد بنجاح ✅', 'success');
        
        // Reset form
        document.getElementById('quickAddForm').reset();
        
        // Reload recent customers/appointments if function exists
        if (typeof loadRecentCustomers === 'function') loadRecentCustomers();
        
    } catch (error) {
        console.error('Add customer error:', error);
        showToast(error.message || 'حدث خطأ أثناء الحفظ', 'error');
    }
}

// Search Customer Appointment
async function searchCustomerAppointment() {
    const phone = document.getElementById('searchPhone').value.trim();
    
    if (!phone) {
        showToast('الرجاء إدخال رقم الهاتف', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/appointments?phone=${encodeURIComponent(phone)}&status=completed`);
        
        if (!response.ok) {
            throw new Error('فشل في البحث');
        }
        
        const appointments = await response.json();
        
        if (!appointments || appointments.length === 0) {
            showToast('لم يتم العثور على مواعيد مكتملة', 'error');
            return;
        }
        
        // Get most recent completed appointment
        const latestAppointment = appointments.sort((a, b) => {
            const dateA = new Date(a.date + 'T' + a.time);
            const dateB = new Date(b.date + 'T' + b.time);
            return dateB - dateA;
        })[0];
        
        // Check if already has customer feedback
        if (latestAppointment.customerFeedback && latestAppointment.customerFeedback.rating) {
            showToast('تم تقييم هذا الزبون مسبقاً', 'error');
            return;
        }
        
        // Display appointment info
        selectedAppointmentId = latestAppointment._id;
        document.getElementById('foundCustomerName').textContent = latestAppointment.customerName || '-';
        document.getElementById('foundAppointmentDate').textContent = formatDateArabic(latestAppointment.date);
        document.getElementById('foundAppointmentTime').textContent = latestAppointment.time;
        document.getElementById('foundService').textContent = latestAppointment.serviceName || '-';
        
        document.getElementById('customerInfoCard').style.display = 'block';
        document.getElementById('feedbackSection').style.display = 'block';
        
        showToast('تم العثور على الموعد!', 'success');
        
    } catch (error) {
        console.error('Search error:', error);
        showToast('حدث خطأ أثناء البحث', 'error');
    }
}

// Handle Customer Feedback
async function handleCustomerFeedback(event) {
    event.preventDefault();
    
    if (!selectedAppointmentId) {
        showToast('الرجاء البحث عن الزبون أولاً', 'error');
        return;
    }
    
    if (customerRatingValue === 0) {
        showToast('الرجاء تقييم الزبون', 'error');
        return;
    }
    
    const punctuality = document.getElementById('punctuality').value;
    const comment = document.getElementById('feedbackComment').value.trim();
    const photoConsent = document.getElementById('photoConsent').checked;
    
    // Get selected behaviors
    const behaviors = Array.from(document.querySelectorAll('input[name="behavior"]:checked'))
        .map(cb => cb.value);
    
    if (!punctuality) {
        showToast('الرجاء اختيار الالتزام بالموعد', 'error');
        return;
    }
    
    try {
        const payload = {
            customerFeedback: {
                rating: customerRatingValue,
                comment: comment,
                punctuality: punctuality,
                photoConsent: photoConsent,
                behaviourNotes: behaviors,
                submittedAt: new Date().toISOString()
            }
        };
        
        const response = await fetch(`${API_BASE}/appointments/${selectedAppointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error('فشل في حفظ التقييم');
        }
        
        showToast('تم حفظ تقييم الزبون بنجاح ✅', 'success');
        
        // Reset form
        document.getElementById('customerFeedbackForm').reset();
        document.getElementById('customerInfoCard').style.display = 'none';
        document.getElementById('feedbackSection').style.display = 'none';
        resetStars('customerRatingStars');
        customerRatingValue = 0;
        selectedAppointmentId = null;
        
        // Reload recent customers
        await loadRecentCustomers();
        
    } catch (error) {
        console.error('Feedback error:', error);
        showToast('حدث خطأ أثناء حفظ التقييم', 'error');
    }
}

// Load Recent Customers
async function loadRecentCustomers() {
    try {
        const response = await fetch(`${API_BASE}/appointments?limit=12`);
        
        if (!response.ok) {
            throw new Error('فشل في تحميل الزبائن');
        }
        
        const appointments = await response.json();
        renderRecentCustomers(appointments);
        
    } catch (error) {
        console.error('Load recent error:', error);
        showToast('فشل في تحميل الزبائن الأخيرين', 'error');
    }
}

// Render Recent Customers
function renderRecentCustomers(appointments) {
    const grid = document.getElementById('recentCustomers');
    if (!grid) return;
    
    if (!appointments || appointments.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <div class="empty-text">لا توجد مواعيد حالياً</div>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    
    appointments.forEach(appointment => {
        const item = document.createElement('div');
        item.className = 'customer-item';
        
        const statusText = getStatusText(appointment.status);
        const statusClass = appointment.status === 'completed' ? 'completed' : 'confirmed';
        
        item.innerHTML = `
            <div class="customer-header">
                <div class="customer-name">${appointment.customerName || 'زبون'}</div>
                <div class="customer-status ${statusClass}">${statusText}</div>
            </div>
            <div class="customer-details">
                <div class="detail-row">
                    <span class="detail-label">التاريخ:</span>
                    <span class="detail-value">${formatDateShort(appointment.date)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">الوقت:</span>
                    <span class="detail-value">${appointment.time}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">الخدمة:</span>
                    <span class="detail-value">${appointment.serviceName || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">الهاتف:</span>
                    <span class="detail-value">${appointment.phone || '-'}</span>
                </div>
            </div>
        `;
        
        grid.appendChild(item);
    });
}

// Get Status Text
function getStatusText(status) {
    const statusMap = {
        'pending': 'قيد الانتظار',
        'confirmed': 'مؤكد',
        'completed': 'مكتمل',
        'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
}

// Star Rating Setup
function setupStarRating(containerId, inputId, callback) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    
    if (!container || !input) return;
    
    const stars = container.querySelectorAll('.star');
    
    stars.forEach((star, index) => {
        star.addEventListener('click', function() {
            const value = parseInt(this.dataset.value);
            input.value = value;
            callback(value);
            
            stars.forEach((s, i) => {
                if (i < value) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
        
        star.addEventListener('mouseenter', function() {
            const value = parseInt(this.dataset.value);
            stars.forEach((s, i) => {
                if (i < value) {
                    s.style.color = '#f39c12';
                } else {
                    s.style.color = '#dfe6e9';
                }
            });
        });
    });
    
    container.addEventListener('mouseleave', function() {
        const currentValue = parseInt(input.value) || 0;
        stars.forEach((s, i) => {
            if (i < currentValue) {
                s.style.color = '#f39c12';
            } else {
                s.style.color = '#dfe6e9';
            }
        });
    });
}

// Reset Stars
function resetStars(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const stars = container.querySelectorAll('.star');
    stars.forEach(star => {
        star.classList.remove('active');
        star.style.color = '#dfe6e9';
    });
}

// Utility Functions
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateArabic(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('ar-SA', options);
}

function formatDateShort(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('ar-SA', options);
}

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}
