// Global State
let currentEmployeeId = null;
let employeeToken = localStorage.getItem('employeeToken');
let employeeData = JSON.parse(localStorage.getItem('employeeData') || 'null');
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
    if (!checkAuth()) return;

    setupForms();
    await loadServices();
    // await loadRecentCustomers(); // Removed as per new design
    await loadCompletedAppointments();
    generateTimeSlots();
    setDefaultDate();
}

function checkAuth() {
    if (!employeeToken) {
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('loginForm').addEventListener('submit', handleLogin);
        return false;
    }
    return true;
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE}/employees/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'فشل تسجيل الدخول');

        localStorage.setItem('employeeToken', data.token);
        localStorage.setItem('employeeData', JSON.stringify(data.employee));
        employeeToken = data.token;
        employeeData = data.employee;

        document.getElementById('loginModal').style.display = 'none';
        showToast('تم تسجيل الدخول بنجاح', 'success');
        initEmployeeApp();

    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Setup Forms
function setupForms() {
    const quickAddForm = document.getElementById('quickAddForm');
    const ratingForm = document.getElementById('employeeRatingForm');
    
    if (quickAddForm) {
        quickAddForm.addEventListener('submit', handleAddCustomer);
    }
    
    if (ratingForm) {
        ratingForm.addEventListener('submit', handleRatingSubmit);
    }
    
    // Setup star rating
    setupStarRating('starsContainer', 'ratingValue', (value) => {
        customerRatingValue = value;
    });
}

// Load Services
async function loadServices() {
    try {
        const response = await fetch(`${API_BASE}/services`, {
            headers: {
                'Authorization': `Bearer ${employeeToken}`
            }
        });
        
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
    
    // Fixed: Inputs removed from HTML, use defaults directly
    const name = 'زبون سريع';
    const phone = '0000000000';
    
    // Auto-set date to today if empty
    let date = document.getElementById('appointmentDate').value;
    if (!date) {
        date = new Date().toISOString().split('T')[0];
    }

    const time = document.getElementById('appointmentTime').value;
    
    // Handle service selection
    const serviceSelect = document.getElementById('serviceType');
    const serviceId = serviceSelect.value;
    
    // Get service name safely
    let serviceName = 'خدمة';
    if (serviceSelect.selectedIndex >= 0) {
        serviceName = serviceSelect.options[serviceSelect.selectedIndex].text.split(' - ')[0];
    }
    
    if (!time || !serviceId) {
        showToast('الرجاء اختيار الخدمة والوقت', 'error');
        return;
    }
    
    try {
        const payload = {
            customerName: name,
            customerPhone: phone,
            phone: phone,
            date: date,
            time: time,
            serviceId: serviceId,
            serviceName: serviceName,
            status: 'completed', // Auto-complete for quick add so it appears in rating list
            employeeId: employeeData ? employeeData.id : null,
            employeeName: employeeData ? employeeData.name : null
        };

        const response = await fetch(`${API_BASE}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employeeToken}`
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'فشل في إضافة الموعد');
        
        showToast('تم إضافة الموعد بنجاح ✅', 'success');
        document.getElementById('quickAddForm').reset();
        setDefaultDate();
        
        // Refresh completed appointments just in case (though this is a new appointment)
        // If the user marks it as completed later, it will show up.
        
    } catch (error) {
        console.error('Add error:', error);
        showToast(error.message || 'حدث خطأ أثناء إضافة الموعد', 'error');
    }
}

// Load Completed Appointments for Rating
async function loadCompletedAppointments() {
    const listContainer = document.getElementById('completedAppointmentsList');
    if (!listContainer) return;

    try {
        // Fetch completed appointments for this employee
        const empId = employeeData ? employeeData.id : null;
        if (!empId) return;

        const response = await fetch(`${API_BASE}/appointments?status=completed&limit=20&employee=${empId}`, {
            headers: {
                'Authorization': `Bearer ${employeeToken}`
            }
        });
        
        if (!response.ok) throw new Error('فشل في تحميل المواعيد');
        
        const result = await response.json();
        const appointments = result.data || [];
        
        if (!appointments || appointments.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">لا توجد مواعيد مكتملة للتقييم</div>';
            return;
        }

        // Filter out already rated appointments if needed, or show them as rated
        const unratedAppointments = appointments.filter(apt => !apt.employeeFeedback || !apt.employeeFeedback.rating);

        if (unratedAppointments.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">جميع المواعيد المكتملة تم تقييمها ✅</div>';
            return;
        }

        listContainer.innerHTML = '';
        unratedAppointments.forEach(apt => {
            const item = document.createElement('div');
            item.className = 'appointment-item';
            item.style.cssText = 'background: #2d2d2d; padding: 15px; border-radius: 10px; cursor: pointer; border: 1px solid #444; transition: all 0.2s;';
            item.onmouseover = () => item.style.borderColor = '#cba35c';
            item.onmouseout = () => item.style.borderColor = '#444';
            item.onclick = () => selectAppointmentForRating(apt);

            const date = new Date(apt.date);
            const dateStr = date.toLocaleDateString('en-GB');
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="color: #cba35c; font-weight: bold;">${apt.customerName}</span>
                    <span style="color: #888; font-size: 12px;">${dateStr}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; color: #ccc;">
                    <span>${apt.serviceName || 'خدمة'}</span>
                    <span>${apt.time}</span>
                </div>
            `;
            listContainer.appendChild(item);
        });

    } catch (error) {
        console.error('Error loading appointments:', error);
        listContainer.innerHTML = '<div style="text-align: center; color: #e74c3c; padding: 20px;">حدث خطأ في تحميل المواعيد</div>';
    }
}

function selectAppointmentForRating(apt) {
    selectedAppointmentId = apt._id;
    
    // Show form
    document.getElementById('ratingFormSection').style.display = 'block';
    document.getElementById('ratingAppointmentId').value = apt._id;
    
    // Update display
    const display = document.getElementById('selectedAppointmentDisplay');
    display.innerHTML = `
        <div style="color: #cba35c; font-weight: bold; margin-bottom: 5px;">${apt.customerName}</div>
        <div style="font-size: 13px; color: #aaa;">
            ${apt.serviceName} | ${apt.time} | ${new Date(apt.date).toLocaleDateString('en-GB')}
        </div>
    `;
    
    // Scroll to form
    document.getElementById('ratingFormSection').scrollIntoView({ behavior: 'smooth' });
}

function cancelRating() {
    selectedAppointmentId = null;
    document.getElementById('ratingFormSection').style.display = 'none';
    document.getElementById('employeeRatingForm').reset();
    resetStars('starsContainer');
    customerRatingValue = 0;
}

async function handleRatingSubmit(e) {
    e.preventDefault();
    
    if (!selectedAppointmentId) {
        showToast('الرجاء اختيار موعد للتقييم', 'error');
        return;
    }
    
    if (customerRatingValue === 0) {
        showToast('الرجاء اختيار التقييم (النجوم)', 'error');
        return;
    }
    
    const comment = document.getElementById('ratingComment').value;
    
    try {
        const payload = {
            employeeFeedback: {
                rating: customerRatingValue,
                comment: comment,
                ratedAt: new Date().toISOString()
            }
        };
        
        const response = await fetch(`${API_BASE}/appointments/${selectedAppointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employeeToken}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('فشل في حفظ التقييم');
        
        showToast('تم حفظ التقييم بنجاح ✅', 'success');
        cancelRating();
        await loadCompletedAppointments(); // Refresh list
        
    } catch (error) {
        console.error('Rating error:', error);
        showToast('حدث خطأ أثناء حفظ التقييم', 'error');
    }
}

// Star Rating Setup
function setupStarRating(containerId, inputId, callback) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId); // Can be null if using variable
    
    if (!container) return;
    
    const stars = container.querySelectorAll('.star');
    
    stars.forEach((star, index) => {
        star.addEventListener('click', function() {
            const value = parseInt(this.dataset.rating);
            if (input) input.value = value;
            callback(value);
            
            stars.forEach((s, i) => {
                if (i < value) {
                    s.style.color = '#f39c12'; // Gold
                } else {
                    s.style.color = '#444'; // Dark grey
                }
            });
        });
    });
}

// Reset Stars
function resetStars(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const stars = container.querySelectorAll('.star');
    stars.forEach(star => {
        star.style.color = '#444';
    });
}

// Utility Functions
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
