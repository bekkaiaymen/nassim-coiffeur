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
    await loadAttendanceStatus(); // NEW: Load attendance status
    await loadServices();
    await loadPendingAppointments();
    await loadConfirmedAppointments();
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
    
    // Auto-refresh appointments every 30 seconds
    setInterval(() => {
        loadPendingAppointments();
        loadConfirmedAppointments();
    }, 30000);
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

// Attendance Functions (NEW)
async function loadAttendanceStatus() {
    const statusDiv = document.getElementById('attendanceStatus');
    if (!statusDiv) return;
    
    try {
        if (!employeeData || !employeeData.todayAttendance) {
            statusDiv.innerHTML = '<p style="margin: 0; color: #888;">لم يتم تسجيل الحضور اليوم</p>';
            return;
        }
        
        const attendance = employeeData.todayAttendance;
        const today = new Date().toISOString().split('T')[0];
        
        if (attendance.isPresent && attendance.date === today) {
            statusDiv.innerHTML = `
                <p style="margin: 0; color: #27ae60; font-weight: bold; font-size: 18px;">✅ أنت حاضر اليوم</p>
                <p style="margin: 5px 0 0 0; color: #ccc;">من ${attendance.checkInTime} إلى ${attendance.checkOutTime}</p>
                <button onclick="handleCheckOut()" style="margin-top: 10px; background: #e74c3c; color: white; border: none; padding: 8px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    🚪 تسجيل انصراف
                </button>
            `;
            
            // Update check-in inputs
            document.getElementById('checkInTime').value = attendance.checkInTime;
            document.getElementById('checkOutTime').value = attendance.checkOutTime;
            document.getElementById('checkInBtn').style.display = 'none';
        } else {
            statusDiv.innerHTML = '<p style="margin: 0; color: #888;">لم يتم تسجيل الحضور اليوم</p>';
        }
    } catch (error) {
        console.error('Load attendance error:', error);
    }
}

async function handleCheckIn() {
    const checkInTime = document.getElementById('checkInTime').value;
    const checkOutTime = document.getElementById('checkOutTime').value;
    
    if (!checkInTime || !checkOutTime) {
        showToast('يرجى تحديد أوقات العمل', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/employees/check-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employeeToken}`
            },
            body: JSON.stringify({ checkInTime, checkOutTime })
        });
        
        if (response.status === 401) {
            handleUnauthorized();
            return;
        }
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        
        // Update local storage
        employeeData.todayAttendance = data.data;
        localStorage.setItem('employeeData', JSON.stringify(employeeData));
        
        showToast('✅ تم تسجيل حضورك بنجاح! الآن يمكن للزبائن حجز مواعيد معك', 'success');
        await loadAttendanceStatus();
        await loadTimeline();
        
    } catch (error) {
        console.error('Check-in error:', error);
        showToast(error.message || 'فشل في تسجيل الحضور', 'error');
    }
}

async function handleCheckOut() {
    if (!confirm('هل أنت متأكد من تسجيل الانصراف؟ لن يتمكن الزبائن من حجز مواعيد معك بعد ذلك.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/employees/check-out`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employeeToken}`
            }
        });
        
        if (response.status === 401) {
            handleUnauthorized();
            return;
        }
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        
        // Update local storage
        employeeData.todayAttendance = data.data;
        localStorage.setItem('employeeData', JSON.stringify(employeeData));
        
        showToast('تم تسجيل الانصراف', 'success');
        await loadAttendanceStatus();
        await loadTimeline();
        
    } catch (error) {
        console.error('Check-out error:', error);
        showToast(error.message || 'فشل في تسجيل الانصراف', 'error');
    }
}

// Setup Forms
function setupForms() {
    const quickAddForm = document.getElementById('quickAddForm');
    const ratingForm = document.getElementById('employeeRatingForm');
    
    if (quickAddForm) {
        quickAddForm.addEventListener('submit', handleAddCustomer);
        
        // Add listeners for availability check
        const dateInput = document.getElementById('appointmentDate');
        const timeInput = document.getElementById('appointmentTime');
        const serviceSelect = document.getElementById('serviceType');
        
        if (dateInput) dateInput.addEventListener('change', checkEmployeeAvailability);
        if (timeInput) timeInput.addEventListener('change', checkEmployeeAvailability);
        if (serviceSelect) serviceSelect.addEventListener('change', checkEmployeeAvailability);
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

// Check Employee Availability
async function checkEmployeeAvailability() {
    const date = document.getElementById('appointmentDate').value;
    const time = document.getElementById('appointmentTime').value;
    const serviceId = document.getElementById('serviceType').value;
    const statusDiv = document.getElementById('empAvailabilityStatus');
    
    // Create status div if not exists
    if (!statusDiv) {
        const timeGroup = document.getElementById('appointmentTime').parentElement;
        const div = document.createElement('div');
        div.id = 'empAvailabilityStatus';
        div.style.marginTop = '5px';
        div.style.fontSize = '13px';
        timeGroup.appendChild(div);
    }
    
    const statusEl = document.getElementById('empAvailabilityStatus');
    statusEl.innerHTML = '';
    
    if (!date || !time || !employeeData) return;
    
    statusEl.innerHTML = '<span style="color: #f39c12;">⏳ جاري التحقق...</span>';
    
    try {
        // Use the employee's business ID or fallback
        const businessId = employeeData.business || '69259331651b1babc1eb83dc';
        const empId = employeeData._id || employeeData.id;
        
        // Get service duration
        let duration = 30;
        if (serviceId && servicesCache) {
            const service = servicesCache.find(s => s._id === serviceId);
            if (service) duration = service.duration || 30;
        }
        
        const response = await fetch(`${API_BASE}/appointments/available-slots?business=${businessId}&date=${date}&employee=${empId}&checkTime=${time}&duration=${duration}`, {
            headers: {
                'Authorization': `Bearer ${employeeToken}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                if (result.available) {
                    statusEl.innerHTML = '<span style="color: #2ecc71;">✅ هذا الوقت متاح</span>';
                } else {
                    statusEl.innerHTML = '<span style="color: #e74c3c;">❌ لديك موعد آخر في هذا الوقت</span>';
                }
            }
        }
    } catch (error) {
        console.error('Availability check failed:', error);
        statusEl.innerHTML = '';
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
            status: 'confirmed', // Set to confirmed so employee can mark as completed
            employeeId: employeeData ? (employeeData._id || employeeData.id) : null,
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
        
        // Refresh lists and scroll to confirmed section
        await loadConfirmedAppointments();
        await loadTimeline();
        
        // Scroll to confirmed appointments section
        const confirmedSection = document.getElementById('confirmedAppointmentsList');
        if (confirmedSection) {
            confirmedSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight the section briefly
            confirmedSection.parentElement.style.transition = 'box-shadow 0.5s';
            confirmedSection.parentElement.style.boxShadow = '0 0 20px rgba(39, 174, 96, 0.5)';
            setTimeout(() => {
                confirmedSection.parentElement.style.boxShadow = 'none';
            }, 2000);
        }
        
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
            
            const customerPhoto = (apt.customerId && apt.customerId.photo) 
                ? apt.customerId.photo 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.customerName)}&background=random&color=fff`;

            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                    <img src="${customerPhoto}" alt="${apt.customerName}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #cba35c; font-weight: bold;">${apt.customerName}</span>
                            <span style="color: #888; font-size: 12px;">${dateStr}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #ccc;">
                            <span>${apt.serviceName || 'خدمة'}</span>
                            <span>${apt.time}</span>
                        </div>
                    </div>
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
    if (!listContainer) {
        console.warn('pendingAppointmentsList container not found');
        return;
    }

    try {
        const empId = employeeData ? employeeData._id : null;
        if (!empId) {
            console.warn('No employee ID found');
            listContainer.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">يرجى تسجيل الدخول</div>';
            return;
        }

        console.log('Loading pending appointments for employee:', empId);

        // Load appointments assigned to this employee
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
        console.log('Direct appointments:', appointments.length);
        
        // Load flexible appointments (any barber) - always check this
        const flexResponse = await fetch(`${API_BASE}/appointments?status=pending&isFlexibleEmployee=true`, {
            headers: {
                'Authorization': `Bearer ${employeeToken}`
            }
        });
        
        let flexAppointments = [];
        if (flexResponse.ok) {
            const flexResult = await flexResponse.json();
            flexAppointments = flexResult.data || [];
            console.log('Flexible appointments:', flexAppointments.length);
        }

        // Combine both lists
        const allAppointments = [...appointments, ...flexAppointments];
        console.log('Total appointments:', allAppointments.length);

        if (allAppointments.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">لا توجد مواعيد في انتظار التأكيد</div>';
            return;
        }

        listContainer.innerHTML = '';
        allAppointments.forEach(apt => {
            const item = document.createElement('div');
            item.className = 'pending-appointment-item';
            const isFlexible = apt.isFlexibleEmployee;
            item.style.cssText = `background: ${isFlexible ? '#2a2a3e' : '#2d2d2d'}; padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 2px solid ${isFlexible ? '#9b59b6' : '#444'};`;

            const date = new Date(apt.date);
            const dateStr = date.toLocaleDateString('ar-DZ');
            
            const customerPhoto = (apt.customerId && apt.customerId.photo) 
                ? apt.customerId.photo 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.customerName)}&background=random&color=fff`;

            item.innerHTML = `
                ${isFlexible ? '<div style="color: #9b59b6; font-weight: bold; font-size: 12px; margin-bottom: 5px;">🎯 حجز مرن - يمكن لأي حلاق تأكيده</div>' : ''}
                <div style="display: flex; align-items: center; margin-bottom: 10px; gap: 12px;">
                    <img src="${customerPhoto}" alt="${apt.customerName}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #cba35c;">
                    <div style="flex: 1;">
                        <div style="color: #cba35c; font-weight: bold; font-size: 16px;">${apt.customerName}</div>
                        <div style="color: #aaa; font-size: 13px; margin-top: 3px;">${dateStr} | ${apt.time}</div>
                        <div style="color: #ccc; font-size: 14px; margin-top: 3px;">${apt.service || 'خدمة'} | ${apt.price || 50} دج</div>
                        ${apt.customerPhone ? `<div style="color: #888; font-size: 12px; margin-top: 2px;">📞 ${apt.customerPhone}</div>` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="confirmAppointment('${apt._id}')" style="flex: 1; background: #27ae60; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        ✅ ${isFlexible ? 'قبول وتأكيد' : 'تأكيد'}
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

// Load Confirmed Appointments
async function loadConfirmedAppointments() {
    const listContainer = document.getElementById('confirmedAppointmentsList');
    if (!listContainer) {
        console.warn('confirmedAppointmentsList container not found');
        return;
    }

    try {
        const empId = employeeData ? employeeData._id : null;
        if (!empId) {
            console.warn('No employee ID found');
            listContainer.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">يرجى تسجيل الدخول</div>';
            return;
        }

        console.log('Loading confirmed appointments for employee:', empId);

        // Load confirmed appointments assigned to this employee
        const response = await fetch(`${API_BASE}/appointments?status=confirmed&employee=${empId}`, {
            headers: {
                'Authorization': `Bearer ${employeeToken}`
            }
        });
        
        if (response.status === 401) {
            handleUnauthorized();
            return;
        }
        
        if (!response.ok) throw new Error('فشل في تحميل المواعيد المؤكدة');
        
        const result = await response.json();
        const appointments = result.data || [];
        console.log('Confirmed appointments:', appointments.length);

        if (appointments.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">لا توجد مواعيد مؤكدة حالياً</div>';
            return;
        }

        listContainer.innerHTML = '';
        appointments.forEach(apt => {
            const item = document.createElement('div');
            item.className = 'confirmed-appointment-item';
            item.style.cssText = 'background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 2px solid #27ae60; box-shadow: 0 4px 8px rgba(39, 174, 96, 0.2);';

            const date = new Date(apt.date);
            const dateStr = date.toLocaleDateString('ar-DZ');
            
            // Calculate if appointment is today
            const today = new Date();
            const isToday = date.toDateString() === today.toDateString();

            const customerPhoto = (apt.customerId && apt.customerId.photo) 
                ? apt.customerId.photo 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.customerName)}&background=random&color=fff`;
            
            item.innerHTML = `
                ${isToday ? '<div style="color: #2ecc71; font-weight: bold; font-size: 12px; margin-bottom: 5px;">📍 موعد اليوم</div>' : ''}
                <div style="display: flex; align-items: center; margin-bottom: 10px; gap: 12px;">
                    <img src="${customerPhoto}" alt="${apt.customerName}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #2ecc71;">
                    <div style="flex: 1;">
                        <div style="color: #2ecc71; font-weight: bold; font-size: 18px;">✅ ${apt.customerName}</div>
                        <div style="color: #aaa; font-size: 13px; margin-top: 3px;">📅 ${dateStr} | ⏰ ${apt.time}</div>
                        <div style="color: #fff; font-size: 14px; margin-top: 5px;">✂️ ${apt.service || 'خدمة'} | 💰 ${apt.price || 50} دج</div>
                        ${apt.customerPhone ? `<div style="color: #3498db; font-size: 13px; margin-top: 3px;">📞 ${apt.customerPhone}</div>` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="completeAppointment('${apt._id}')" style="flex: 1; background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px; box-shadow: 0 2px 8px rgba(39, 174, 96, 0.3); transition: all 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        ✔️ إكمال الخدمة
                    </button>
                </div>
            `;
            listContainer.appendChild(item);
        });

    } catch (error) {
        console.error('Error loading confirmed appointments:', error);
        listContainer.innerHTML = '<div style="text-align: center; color: #e74c3c; padding: 20px;">حدث خطأ في تحميل المواعيد المؤكدة</div>';
    }
}

// Confirm Appointment (NEW)
async function confirmAppointment(appointmentId) {
    try {
        // Assign employee to flexible appointments
        const updateData = {
            status: 'confirmed',
            employee: employeeData._id,
            isFlexibleEmployee: false // Remove flexible flag after assignment
        };
        
        const response = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employeeToken}`
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) throw new Error('فشل في تأكيد الموعد');
        
        showToast('✅ تم تأكيد الموعد بنجاح وتم تعيينه لك', 'success');
        await loadPendingAppointments();
        await loadConfirmedAppointments();
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
        await loadConfirmedAppointments();
        await loadCompletedAppointments();
        await loadTimeline();
        
        // Scroll to rating section
        const ratingSection = document.getElementById('completedAppointmentsList');
        if (ratingSection) {
            ratingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight
            ratingSection.parentElement.style.transition = 'box-shadow 0.5s';
            ratingSection.parentElement.style.boxShadow = '0 0 20px rgba(203, 163, 92, 0.5)';
            setTimeout(() => {
                ratingSection.parentElement.style.boxShadow = 'none';
            }, 2000);
        }
        
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
        // Get appointments
        const apptResponse = await fetch(`${API_BASE}/appointments?date=${date}`, {
            headers: { 'Authorization': `Bearer ${employeeToken}` }
        });
        
        if (apptResponse.status === 401) {
            handleUnauthorized();
            return;
        }
        
        const apptData = await apptResponse.json();
        const appointments = apptData.data || [];

        // Get available employees (those who checked in today)
        const empResponse = await fetch(`${API_BASE}/employees/available`);
        const empData = await empResponse.json();
        let employees = empData.data || [];
        
        // Map to simpler format
        employees = employees.map(emp => ({
            name: emp.name,
            id: emp._id,
            checkInTime: emp.todayAttendance?.checkInTime || '09:00',
            checkOutTime: emp.todayAttendance?.checkOutTime || '21:00'
        }));

        // Filter employees if logged in (show only my timeline)
        if (employeeData && employeeData.name) {
            const myEmployee = employees.find(e => e.name === employeeData.name);
            if (myEmployee) {
                employees = [myEmployee];
            } else {
                // If logged-in employee is not present, show message
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;"><p style="font-size: 18px; margin-bottom: 10px;">⚠️ لم تسجل حضورك اليوم</p><p style="color: #aaa;">يرجى تسجيل الحضور لعرض الجدول الزمني</p></div>';
                return;
            }
        }
        
        // If no employees are present today
        if (employees.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;"><p style="font-size: 18px;">لا يوجد حلاقين حاضرين اليوم</p></div>';
            return;
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
    headerRow.style.width = `${180 + (totalHours * pixelsPerHour)}px`;
    
    // Empty corner
    const corner = document.createElement('div');
    corner.style.width = '180px';
    corner.style.flexShrink = '0';
    corner.style.position = 'sticky';
    corner.style.left = '0';
    corner.style.background = '#222';
    corner.style.zIndex = '30';
    corner.style.boxShadow = '2px 0 8px rgba(0,0,0,0.3)';
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
        row.style.width = `${180 + (totalHours * pixelsPerHour)}px`;

        const nameCol = document.createElement('div');
        nameCol.className = 'barber-name';
        nameCol.style.width = '180px';
        nameCol.style.display = 'flex';
        nameCol.style.flexDirection = 'column';
        nameCol.style.alignItems = 'center';
        nameCol.style.justifyContent = 'center';
        nameCol.style.gap = '8px';
        nameCol.style.position = 'sticky';
        nameCol.style.left = '0';
        nameCol.style.background = '#2d2d2d';
        nameCol.style.zIndex = '30';
        nameCol.style.boxShadow = '2px 0 8px rgba(0,0,0,0.3)';
        
        // Avatar
        if (employeeData && employeeData.avatar) {
            const avatar = document.createElement('img');
            avatar.src = employeeData.avatar || '/images/default-avatar.png';
            avatar.alt = emp.name;
            avatar.style.width = '50px';
            avatar.style.height = '50px';
            avatar.style.borderRadius = '50%';
            avatar.style.objectFit = 'cover';
            avatar.style.border = '2px solid #cba35c';
            avatar.style.boxShadow = '0 2px 8px rgba(203, 163, 92, 0.3)';
            avatar.onerror = function() {
                this.src = '/images/default-avatar.png';
            };
            nameCol.appendChild(avatar);
        }
        
        // Name text
        const nameText = document.createElement('div');
        nameText.textContent = emp.name;
        nameText.style.fontSize = '14px';
        nameText.style.textAlign = 'center';
        nameCol.appendChild(nameText);
        
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
                const customerPhoto = (appt.customerId && appt.customerId.photo) 
                    ? appt.customerId.photo 
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.customerName)}&background=random&color=fff`;

                slot.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 5px; height: 100%; overflow: hidden; padding: 0 4px;">
                        <img src="${customerPhoto}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.5);">
                        <div style="display: flex; flex-direction: column; justify-content: center; overflow: hidden;">
                            <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 11px; font-weight: bold; line-height: 1.2;">
                                ${appt.customerName || 'زبون'}
                            </div>
                            <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 10px; opacity: 0.8; line-height: 1.2;">
                                ${appt.service}
                            </div>
                        </div>
                    </div>
                `;
                
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

