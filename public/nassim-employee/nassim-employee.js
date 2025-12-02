// Global State
let currentEmployeeId = null;
let employeeToken = null;
let employeeData = null;
let selectedAppointmentId = null;
let customerRatingValue = 0;
let servicesCache = [];
let timeSlots = [];

// API Base URL
const API_BASE = '/api';

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initEmployeeApp();
    registerServiceWorker();
});

// Register Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
                // Request notification permission
                if (Notification.permission !== 'granted') {
                    Notification.requestPermission();
                }
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
}

// Initialize App
async function initEmployeeApp() {
    if (!checkAuth()) return;

    setupForms();
    await loadServices();
    await loadPendingAppointments(); // NEW: Load pending appointments
    await loadCompletedAppointments();
    generateTimeSlots();
    setDefaultDate();
    
    // Initialize Timeline
    const dateInput = document.getElementById('timelineDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
        dateInput.addEventListener('change', loadTimeline);
    }
    loadTimeline();
    
    // Auto-refresh pending appointments every 30 seconds
    setInterval(loadPendingAppointments, 30000);
}

function checkAuth() {
    // Check if we have stored credentials
    const storedToken = localStorage.getItem('employeeToken');
    const storedData = localStorage.getItem('employeeData');
    
    if (storedToken && storedData) {
        employeeToken = storedToken;
        employeeData = JSON.parse(storedData);
        return true;
    }
    
    // Show login modal if no valid credentials
    document.getElementById('loginModal').style.display = 'flex';
    const loginForm = document.getElementById('loginForm');
    if (loginForm && !loginForm.dataset.listenerAdded) {
        loginForm.addEventListener('submit', handleLogin);
        loginForm.dataset.listenerAdded = 'true';
    }
    return false;
}

function handleUnauthorized() {
    localStorage.removeItem('employeeToken');
    localStorage.removeItem('employeeData');
    employeeToken = null;
    employeeData = null;
    showToast('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً', 'error');
    setTimeout(() => {
        window.location.reload();
    }, 1500);
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
        
        if (response.status === 401) {
            handleUnauthorized();
            return;
        }
        
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
        const empId = employeeData ? employeeData._id : null;
        if (!empId) return;

        const response = await fetch(`${API_BASE}/appointments?status=completed&limit=20&employee=${empId}`, {
            headers: {
                'Authorization': `Bearer ${employeeToken}`
            }
        });
        
        if (response.status === 401) {
            handleUnauthorized();
            return;
        }
        
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

// Load Pending Appointments (NEW)
async function loadPendingAppointments() {
    const listContainer = document.getElementById('pendingAppointmentsList');
    if (!listContainer) return;

    try {
        const empId = employeeData ? employeeData._id : null;
        if (!empId) return;

        const response = await fetch(`${API_BASE}/appointments?status=pending&employee=${empId}`, {
            headers: {
                'Authorization': `Bearer ${employeeToken}`
            }
        });
        
        if (response.status === 401) {
            handleUnauthorized();
            return;
        }
        
        if (!response.ok) throw new Error('فشل في تحميل المواعيد');
        
        const result = await response.json();
        const appointments = result.data || [];
        
        if (!appointments || appointments.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">لا توجد مواعيد في انتظار التأكيد</div>';
            return;
        }

        listContainer.innerHTML = '';
        appointments.forEach(apt => {
            const item = document.createElement('div');
            item.className = 'pending-appointment-item';
            item.style.cssText = 'background: #2d2d2d; padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 1px solid #444;';

            const date = new Date(apt.date);
            const dateStr = date.toLocaleDateString('ar-DZ');
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <div style="color: #cba35c; font-weight: bold; font-size: 16px;">${apt.customerName}</div>
                        <div style="color: #aaa; font-size: 13px; margin-top: 3px;">${dateStr} | ${apt.time}</div>
                        <div style="color: #ccc; font-size: 14px; margin-top: 3px;">${apt.service || 'خدمة'} | ${apt.price || 50} دج</div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="confirmAppointment('${apt._id}')" style="flex: 1; background: #27ae60; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        ✅ تأكيد
                    </button>
                    <button onclick="completeAppointment('${apt._id}')" style="flex: 1; background: #3498db; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        ✔️ مكتمل
                    </button>
                    <button onclick="rejectAppointment('${apt._id}')" style="flex: 0.5; background: #e74c3c; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        ❌
                    </button>
                </div>
            `;
            listContainer.appendChild(item);
        });

    } catch (error) {
        console.error('Error loading pending appointments:', error);
        listContainer.innerHTML = '<div style="text-align: center; color: #e74c3c; padding: 20px;">حدث خطأ في تحميل المواعيد</div>';
    }
}

// Confirm Appointment (NEW)
async function confirmAppointment(appointmentId) {
    try {
        const response = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employeeToken}`
            },
            body: JSON.stringify({ status: 'confirmed' })
        });
        
        if (!response.ok) throw new Error('فشل في تأكيد الموعد');
        
        showToast('✅ تم تأكيد الموعد بنجاح', 'success');
        await loadPendingAppointments();
        await loadTimeline();
        
    } catch (error) {
        console.error('Confirm error:', error);
        showToast('حدث خطأ أثناء التأكيد', 'error');
    }
}

// Complete Appointment (NEW)
async function completeAppointment(appointmentId) {
    try {
        const response = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employeeToken}`
            },
            body: JSON.stringify({ status: 'completed' })
        });
        
        if (!response.ok) throw new Error('فشل في تحديث الموعد');
        
        showToast('✔️ تم وضع علامة الاكتمال على الموعد', 'success');
        await loadPendingAppointments();
        await loadCompletedAppointments();
        await loadTimeline();
        
    } catch (error) {
        console.error('Complete error:', error);
        showToast('حدث خطأ أثناء التحديث', 'error');
    }
}

// Reject Appointment (NEW)
async function rejectAppointment(appointmentId) {
    if (!confirm('هل أنت متأكد من رفض هذا الموعد؟')) return;
    
    try {
        const response = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employeeToken}`
            },
            body: JSON.stringify({ status: 'cancelled' })
        });
        
        if (!response.ok) throw new Error('فشل في إلغاء الموعد');
        
        showToast('❌ تم إلغاء الموعد', 'success');
        await loadPendingAppointments();
        await loadTimeline();
        
    } catch (error) {
        console.error('Reject error:', error);
        showToast('حدث خطأ أثناء الإلغاء', 'error');
    }
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

// Timeline Logic
let timelineInterval;

async function loadTimeline() {
    const dateInput = document.getElementById('timelineDate');
    const date = dateInput.value || new Date().toISOString().split('T')[0];
    
    const container = document.getElementById('timelineContainer');
    container.innerHTML = '<div style="text-align: center; padding: 20px;">جاري تحميل الجدول...</div>';

    try {
        const response = await fetch(`${API_BASE}/appointments?date=${date}`, {
            headers: { 'Authorization': `Bearer ${employeeToken}` }
        });
        
        if (response.status === 401) {
            handleUnauthorized();
            return;
        }
        
        const data = await response.json();
        const appointments = data.data || [];

        // Hardcoded employees for now as per requirement
        let employees = [
            { name: 'نسيم', id: 'nassim' },
            { name: 'وسيم', id: 'wassim' },
            { name: 'محمد', id: 'mohamed' }
        ];

        // Filter employees if logged in
        if (employeeData && employeeData.name) {
            // Find the employee object that matches the logged-in user's name
            // Note: This relies on the name matching exactly. Ideally use IDs.
            const myEmployee = employees.find(e => e.name === employeeData.name);
            if (myEmployee) {
                employees = [myEmployee];
            }
        }

        renderTimeline(appointments, employees);

    } catch (error) {
        console.error('Timeline error:', error);
        container.innerHTML = `<div style="color: red; text-align: center;">فشل تحميل الجدول: ${error.message}</div>`;
    }
}

function renderTimeline(appointments, employees) {
    const container = document.getElementById('timelineContainer');
    container.innerHTML = '';
    
    // Ensure container is relative
    if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
    }

    // Time Axis (09:00 to 23:00)
    const startHour = 9;
    const endHour = 23;
    const totalHours = endHour - startHour;
    const pixelsPerHour = 120; // Width of one hour

    const headerRow = document.createElement('div');
    headerRow.className = 'timeline-header-row';
    headerRow.style.width = `${150 + (totalHours * pixelsPerHour)}px`;
    
    // Empty corner
    const corner = document.createElement('div');
    corner.style.width = '150px';
    corner.style.flexShrink = '0';
    headerRow.appendChild(corner);

    for (let h = startHour; h <= endHour; h++) {
        const marker = document.createElement('div');
        marker.className = 'time-marker';
        marker.style.width = `${pixelsPerHour}px`;
        marker.textContent = `${h}:00`;
        headerRow.appendChild(marker);
    }
    container.appendChild(headerRow);

    // Rows for each barber
    employees.forEach(emp => {
        const row = document.createElement('div');
        row.className = 'timeline-row';
        row.style.width = `${150 + (totalHours * pixelsPerHour)}px`;

        const nameCol = document.createElement('div');
        nameCol.className = 'barber-name';
        nameCol.textContent = emp.name;
        row.appendChild(nameCol);

        const track = document.createElement('div');
        track.className = 'timeline-track';
        track.style.width = `${totalHours * pixelsPerHour}px`;
        
        // Filter appointments for this barber
        const empAppts = appointments.filter(a => {
            return (a.barber === emp.name) || (a.employee && a.employee.name === emp.name);
        });

        empAppts.forEach(appt => {
            if (!appt.time) return;
            
            const [h, m] = appt.time.split(':').map(Number);
            const startMinutes = (h - startHour) * 60 + m;
            const duration = appt.duration || 30; 
            
            if (startMinutes >= 0) {
                const left = (startMinutes / 60) * pixelsPerHour;
                const width = (duration / 60) * pixelsPerHour;

                const slot = document.createElement('div');
                slot.className = 'timeline-slot';
                if (appt.price && appt.price >= 100) slot.classList.add('critical'); // Highlight surge pricing
                
                slot.style.left = `${left}px`;
                slot.style.width = `${width}px`;
                
                // Content
                const content = document.createElement('div');
                content.textContent = `${appt.customerName || 'زبون'} (${appt.service})`;
                slot.appendChild(content);
                
                // Tooltip
                slot.title = `${appt.time} - ${appt.customerName} - ${appt.service} - ${appt.price}DA`;
                
                track.appendChild(slot);
            }
        });

        row.appendChild(track);
        container.appendChild(row);
    });

    // --- Current Time Indicator ---
    const timeLine = document.createElement('div');
    timeLine.className = 'current-time-line';
    timeLine.id = 'currentTimeLine';
    
    const timeHead = document.createElement('div');
    timeHead.className = 'current-time-head';
    timeLine.appendChild(timeHead);
    
    container.appendChild(timeLine);

    const updateLine = () => {
        const now = new Date();
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        
        // Calculate minutes from start (9:00)
        const minutesFromStart = (currentH - startHour) * 60 + currentM;
        
        if (minutesFromStart >= 0 && minutesFromStart <= (totalHours * 60)) {
            const left = 150 + (minutesFromStart / 60) * pixelsPerHour;
            timeLine.style.left = `${left}px`;
            timeLine.style.display = 'block';
        } else {
            timeLine.style.display = 'none';
        }
    };

    updateLine();
    
    if (timelineInterval) clearInterval(timelineInterval);
    timelineInterval = setInterval(updateLine, 60000); // Update every minute
}

