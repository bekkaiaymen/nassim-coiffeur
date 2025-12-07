// Global State
let currentEmployeeId = null;
let employeeToken = null;
let employeeData = null;
let selectedAppointmentId = null;
let customerRatingValue = 0;
let servicesCache = [];
let timeSlots = [];
let lastPendingAppointmentsIds = null; // Track for notifications
let lastPendingDataHash = ''; // Track for DOM updates
let lastConfirmedDataHash = ''; // Track for DOM updates
const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Professional notification sound

// API Base URL
const API_BASE = '/api';

// Utility: Debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

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
                // Check status after registration
                checkNotificationStatus();
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
    setupNavigation(); // NEW: Setup bottom navigation
    await loadWeeklySchedule(); // NEW: Load weekly schedule
    await loadServices();
    await loadPendingAppointments();
    await loadConfirmedAppointments();
    await loadCompletedAppointments();
    generateTimeSlots();
    setDefaultDate();
    
    // Check Notification Status
    checkNotificationStatus();
    
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

// Navigation Logic
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            // Handle the case where the click is on a child element
            const clickedItem = e.target.closest('.nav-item');
            clickedItem.classList.add('active');
            
            // Hide all views
            views.forEach(view => view.style.display = 'none');
            
            // Show target view
            const targetId = clickedItem.dataset.target;
            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.style.display = 'block';
                
                // Refresh data based on view
                if (targetId === 'home-view') {
                    loadPendingAppointments();
                    loadConfirmedAppointments();
                } else if (targetId === 'timeline-view') {
                    loadTimeline();
                } else if (targetId === 'reviews-view') {
                    loadCompletedAppointments();
                } else if (targetId === 'account-view') {
                    loadWeeklySchedule();
                }
            }
        });
    });
}

function handleLogout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('employeeToken');
        localStorage.removeItem('employeeData');
        window.location.reload();
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
        
        const debouncedCheck = debounce(checkEmployeeAvailability, 500);

        if (dateInput) dateInput.addEventListener('change', debouncedCheck);
        if (timeInput) timeInput.addEventListener('change', debouncedCheck);
        if (serviceSelect) serviceSelect.addEventListener('change', debouncedCheck);
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
    console.log('🚀 Quick Add Customer triggered');
    
    // Ensure employee data is loaded
    if (!employeeData) {
        const storedData = localStorage.getItem('employeeData');
        if (storedData) {
            employeeData = JSON.parse(storedData);
        } else {
            showToast('يرجى تسجيل الدخول أولاً', 'error');
            return;
        }
    }
    
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
    if (!serviceSelect) {
        console.error('Service select not found');
        return;
    }

    const serviceId = serviceSelect.value;
    
    // Get service name safely
    let serviceName = 'خدمة';
    if (serviceSelect.selectedIndex >= 0) {
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        if (selectedOption.value) {
            serviceName = selectedOption.text.split(' - ')[0];
        }
    }
    
    if (!time) {
        showToast('الرجاء اختيار الوقت', 'error');
        return;
    }

    if (!serviceId) {
        showToast('الرجاء اختيار الخدمة', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'تأكيد الحجز';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'جاري الحجز...';
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
            employeeId: employeeData._id || employeeData.id,
            employeeName: employeeData.name,
            notes: 'حجز سريع من واجهة الموظف'
        };

        console.log('Sending payload:', payload);

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
            if (confirmedSection.parentElement) {
                confirmedSection.parentElement.style.transition = 'box-shadow 0.5s';
                confirmedSection.parentElement.style.boxShadow = '0 0 20px rgba(39, 174, 96, 0.5)';
                setTimeout(() => {
                    confirmedSection.parentElement.style.boxShadow = 'none';
                }, 2000);
            }
        }
        
    } catch (error) {
        console.error('Add customer error:', error);
        showToast(error.message || 'حدث خطأ أثناء إضافة الموعد', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
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
            // Only update if changed
            if (listContainer.innerHTML.includes('يرجى تسجيل الدخول')) return;
            listContainer.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">يرجى تسجيل الدخول</div>';
            return;
        }

        // Parallel fetch
        const [pendingResponse, flexResponse] = await Promise.all([
            fetch(`${API_BASE}/appointments?status=pending&employee=${empId}`, {
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            }),
            fetch(`${API_BASE}/appointments?status=pending&isFlexibleEmployee=true`, {
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            })
        ]);
        
        if (pendingResponse.status === 401) {
            handleUnauthorized();
            return;
        }
        
        let appointments = [];
        if (pendingResponse.ok) {
            const result = await pendingResponse.json();
            appointments = result.data || [];
        }

        let flexAppointments = [];
        if (flexResponse.ok) {
            const flexResult = await flexResponse.json();
            flexAppointments = flexResult.data || [];
        }

        // Combine both lists
        const allAppointments = [...appointments, ...flexAppointments];
        
        // Check if data changed to avoid re-render
        const currentDataHash = JSON.stringify(allAppointments.map(a => ({id: a._id, status: a.status})));
        if (currentDataHash === lastPendingDataHash) {
            return; // No changes, skip DOM update
        }
        lastPendingDataHash = currentDataHash;

        // --- Notification Logic ---
        const currentIds = allAppointments.map(a => a._id);
        if (lastPendingAppointmentsIds !== null) {
            const newAppointments = allAppointments.filter(a => !lastPendingAppointmentsIds.includes(a._id));
            if (newAppointments.length > 0) {
                const latest = newAppointments[0];
                showNotificationBanner(
                    '🔔 حجز جديد!',
                    `${latest.customerName} - ${latest.service || 'خدمة'} (${latest.time})`
                );
            }
        }
        lastPendingAppointmentsIds = currentIds;
        // --------------------------

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
                    ${apt.customerPhone ? `
                    <a href="tel:${apt.customerPhone}" style="flex: 0.5; background: #3498db; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold; text-decoration: none; display: flex; align-items: center; justify-content: center;">
                        📞
                    </a>` : ''}
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
            if (listContainer.innerHTML.includes('يرجى تسجيل الدخول')) return;
            listContainer.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">يرجى تسجيل الدخول</div>';
            return;
        }

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

        // Check if data changed
        const currentDataHash = JSON.stringify(appointments.map(a => ({id: a._id, status: a.status})));
        if (currentDataHash === lastConfirmedDataHash) {
            return; // No changes
        }
        lastConfirmedDataHash = currentDataHash;

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
                    ${apt.customerPhone ? `
                    <a href="tel:${apt.customerPhone}" style="flex: 0.3; background: #3498db; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 15px; text-decoration: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);">
                        📞
                    </a>` : ''}
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
    
    // Only show loading if empty
    if (!container.innerHTML.trim() || container.innerHTML.includes('جاري تحميل الجدول')) {
        container.innerHTML = '<div style="text-align: center; padding: 20px;">جاري تحميل الجدول...</div>';
    }

    try {
        // Parallel fetch for appointments and employees
        const [apptResponse, empResponse] = await Promise.all([
            fetch(`${API_BASE}/appointments?date=${date}`, {
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            }),
            fetch(`${API_BASE}/employees/available`)
        ]);
        
        if (apptResponse.status === 401) {
            handleUnauthorized();
            return;
        }
        
        const apptData = await apptResponse.json();
        const appointments = apptData.data || [];

        const empData = await empResponse.json();
        let employees = empData.data || [];
        
        // Map to simpler format
        employees = employees.map(emp => ({
            name: emp.name,
            id: emp._id,
            checkInTime: emp.todayAttendance?.checkInTime || '09:00',
            checkOutTime: emp.todayAttendance?.checkOutTime || '21:00'
        }));

        // ALWAYS filter to show only logged-in employee's timeline
        if (employeeData && employeeData.name) {
            const myEmployee = employees.find(e => e.name === employeeData.name || e.id === employeeData._id);
            if (myEmployee) {
                employees = [myEmployee];
            } else {
                // If logged-in employee is not present, show message
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;"><p style="font-size: 18px; margin-bottom: 10px;">⚠️ لم تسجل حضورك اليوم</p><p style="color: #aaa;">يرجى تسجيل الحضور لعرض الجدول الزمني</p></div>';
                return;
            }
        } else {
            // If no employee data, don't show anything
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;"><p style="font-size: 18px;">يرجى تسجيل الدخول لعرض الجدول الزمني</p></div>';
            return;
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
                slot.innerHTML = `
                    <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; overflow: hidden; padding: 0 4px;">
                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 11px; font-weight: bold; line-height: 1.2;">
                            ${appt.customerName || 'زبون'}
                        </div>
                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 10px; opacity: 0.8; line-height: 1.2;">
                            ${appt.service}
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

// Weekly Schedule Functions

async function loadWeeklySchedule() {
    try {
        const response = await fetch(`${API_BASE}/employees/me`, {
            headers: { 'Authorization': `Bearer ${employeeToken}` }
        });
        const data = await response.json();
        
        if (data.success && data.data.workingHours) {
            renderWeeklySchedule(data.data.workingHours);
        } else {
            // Default schedule if none exists
            renderWeeklySchedule(getDefaultSchedule());
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
        showToast('فشل تحميل الجدول الأسبوعي', 'error');
    }
}

function getDefaultSchedule() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const schedule = {};
    days.forEach(day => {
        schedule[day] = {
            enabled: day !== 'friday', // Friday off by default
            shifts: [{ start: '09:00', end: '21:00' }]
        };
    });
    return schedule;
}

function renderWeeklySchedule(schedule) {
    const container = document.querySelector('.schedule-grid');
    if (!container) return;
    
    const daysMap = {
        'sunday': 'الأحد',
        'monday': 'الاثنين',
        'tuesday': 'الثلاثاء',
        'wednesday': 'الأربعاء',
        'thursday': 'الخميس',
        'friday': 'الجمعة',
        'saturday': 'السبت'
    };
    
    // Order: Saturday to Friday
    const daysOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    container.innerHTML = daysOrder.map(day => {
        // Handle legacy data format (start/end strings) vs new format (shifts array)
        let dayData = schedule[day] || { enabled: true, shifts: [{ start: '09:00', end: '21:00' }] };
        
        // Migration for legacy data
        if (!dayData.shifts && dayData.start && dayData.end) {
            dayData.shifts = [{ start: dayData.start, end: dayData.end }];
        }
        if (!dayData.shifts) {
            dayData.shifts = [{ start: '09:00', end: '21:00' }];
        }

        const statusColor = dayData.enabled ? '#27ae60' : '#c0392b'; // Green or Red
        const statusText = dayData.enabled ? 'يعمل' : 'لا يعمل';

        return `
            <div class="schedule-day-row" style="background: #2A2A2A; padding: 15px; border-radius: 8px; border: 1px solid #333; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <div style="font-weight: bold; color: #E9E9E9; font-size: 16px;">
                        ${daysMap[day]}
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span id="status-text-${day}" style="color: ${statusColor}; font-weight: bold; font-size: 14px;">${statusText}</span>
                        <label class="switch">
                            <input type="checkbox" class="day-enabled" data-day="${day}" ${dayData.enabled ? 'checked' : ''} onchange="toggleDayStatus(this)">
                            <span class="slider round" style="background-color: ${dayData.enabled ? '#27ae60' : '#c0392b'};"></span>
                        </label>
                    </div>
                </div>
                
                <div id="shifts-container-${day}" class="shifts-container ${dayData.enabled ? '' : 'disabled'}" style="opacity: ${dayData.enabled ? '1' : '0.5'}; pointer-events: ${dayData.enabled ? 'auto' : 'none'}; transition: opacity 0.3s;">
                    ${dayData.shifts.map((shift, index) => `
                        <div class="shift-row" style="display: flex; gap: 10px; margin-bottom: 8px; align-items: center;">
                            <div style="flex: 1;">
                                <span style="font-size: 12px; color: #888; display: block;">من</span>
                                <input type="time" class="form-input shift-start" data-day="${day}" value="${shift.start}" style="padding: 8px; width: 100%; background: #333; border: 1px solid #444; color: white; border-radius: 4px;">
                            </div>
                            <div style="flex: 1;">
                                <span style="font-size: 12px; color: #888; display: block;">إلى</span>
                                <input type="time" class="form-input shift-end" data-day="${day}" value="${shift.end}" style="padding: 8px; width: 100%; background: #333; border: 1px solid #444; color: white; border-radius: 4px;">
                            </div>
                            ${index > 0 ? `
                            <button onclick="removeShift(this)" style="background: #c0392b; color: white; border: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer; margin-top: 18px; display: flex; align-items: center; justify-content: center;">✕</button>
                            ` : `<div style="width: 30px;"></div>`}
                        </div>
                    `).join('')}
                </div>
                
                <button onclick="addShift('${day}')" class="add-shift-btn ${dayData.enabled ? '' : 'disabled'}" style="background: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 5px; opacity: ${dayData.enabled ? '1' : '0.5'}; pointer-events: ${dayData.enabled ? 'auto' : 'none'};">
                    + إضافة فترة عمل
                </button>
            </div>
        `;
    }).join('');
    
    // Add CSS for switch if not exists
    if (!document.getElementById('switch-style')) {
        const style = document.createElement('style');
        style.id = 'switch-style';
        style.textContent = `
            .switch { position: relative; display: inline-block; width: 50px; height: 24px; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; -webkit-transition: .4s; transition: .4s; }
            .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; -webkit-transition: .4s; transition: .4s; border-radius: 50%; }
            input:checked + .slider { background-color: #27ae60; }
            input:focus + .slider { box-shadow: 0 0 1px #27ae60; }
            input:checked + .slider:before { -webkit-transform: translateX(26px); -ms-transform: translateX(26px); transform: translateX(26px); }
            .slider.round { border-radius: 34px; }
            .slider.round:before { border-radius: 50%; }
        `;
        document.head.appendChild(style);
    }
}

function toggleDayStatus(checkbox) {
    const day = checkbox.dataset.day;
    const shiftsContainer = document.getElementById(`shifts-container-${day}`);
    const addBtn = checkbox.closest('.schedule-day-row').querySelector('.add-shift-btn');
    const statusText = document.getElementById(`status-text-${day}`);
    const slider = checkbox.nextElementSibling;

    if (checkbox.checked) {
        shiftsContainer.style.opacity = '1';
        shiftsContainer.style.pointerEvents = 'auto';
        shiftsContainer.classList.remove('disabled');
        addBtn.style.opacity = '1';
        addBtn.style.pointerEvents = 'auto';
        addBtn.classList.remove('disabled');
        statusText.textContent = 'يعمل';
        statusText.style.color = '#27ae60';
        slider.style.backgroundColor = '#27ae60';
    } else {
        shiftsContainer.style.opacity = '0.5';
        shiftsContainer.style.pointerEvents = 'none';
        shiftsContainer.classList.add('disabled');
        addBtn.style.opacity = '0.5';
        addBtn.style.pointerEvents = 'none';
        addBtn.classList.add('disabled');
        statusText.textContent = 'لا يعمل';
        statusText.style.color = '#c0392b';
        slider.style.backgroundColor = '#c0392b';
    }
}

function addShift(day) {
    const container = document.getElementById(`shifts-container-${day}`);
    const div = document.createElement('div');
    div.className = 'shift-row';
    div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 8px; align-items: center;';
    div.innerHTML = `
        <div style="flex: 1;">
            <span style="font-size: 12px; color: #888; display: block;">من</span>
            <input type="time" class="form-input shift-start" data-day="${day}" value="09:00" style="padding: 8px; width: 100%; background: #333; border: 1px solid #444; color: white; border-radius: 4px;">
        </div>
        <div style="flex: 1;">
            <span style="font-size: 12px; color: #888; display: block;">إلى</span>
            <input type="time" class="form-input shift-end" data-day="${day}" value="13:00" style="padding: 8px; width: 100%; background: #333; border: 1px solid #444; color: white; border-radius: 4px;">
        </div>
        <button onclick="removeShift(this)" style="background: #c0392b; color: white; border: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer; margin-top: 18px; display: flex; align-items: center; justify-content: center;">✕</button>
    `;
    container.appendChild(div);
}

function removeShift(btn) {
    btn.closest('.shift-row').remove();
}

async function saveWeeklySchedule() {
    const schedule = {};
    const days = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    days.forEach(day => {
        const enabled = document.querySelector(`.day-enabled[data-day="${day}"]`).checked;
        const shiftsContainer = document.getElementById(`shifts-container-${day}`);
        const shiftRows = shiftsContainer.querySelectorAll('.shift-row');
        
        const shifts = [];
        shiftRows.forEach(row => {
            const start = row.querySelector('.shift-start').value;
            const end = row.querySelector('.shift-end').value;
            if (start && end) {
                shifts.push({ start, end });
            }
        });
        
        schedule[day] = { enabled, shifts };
    });
    
    try {
        const response = await fetch(`${API_BASE}/employees/schedule`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employeeToken}`
            },
            body: JSON.stringify({ workingHours: schedule })
        });
        
        const data = await response.json();
        if (data.success) {
            showToast('تم حفظ البرنامج الأسبوعي بنجاح', 'success');
        } else {
            showToast(data.message || 'فشل حفظ البرنامج', 'error');
        }
    } catch (error) {
        console.error('Error saving schedule:', error);
        showToast('حدث خطأ في الاتصال', 'error');
    }
}

// --- Notification System ---

function showNotificationBanner(title, body, time = 'الآن') {
    // Remove existing banner
    const existing = document.querySelector('.notification-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'notification-banner';
    banner.innerHTML = `
        <div class="notification-icon">🔔</div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-body">${body}</div>
            <div class="notification-time">${time}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.classList.remove('show'); setTimeout(() => this.parentElement.remove(), 500);">✕</button>
    `;

    document.body.appendChild(banner);

    // Trigger animation
    requestAnimationFrame(() => {
        banner.classList.add('show');
    });

    // Auto hide
    setTimeout(() => {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 500);
    }, 5000);
    
    // Play sound
    playNotificationSound();
}

function playNotificationSound() {
    // User interaction is required for audio playback in most browsers.
    // This will work if the user has interacted with the page (clicked anywhere).
    notificationSound.play().catch(e => console.log('Audio play failed (user interaction needed):', e));
}



// Notification Logic
async function checkNotificationStatus() {
    const btn = document.getElementById('notificationBtn');
    if (!btn) {
        console.warn('Notification button not found');
        return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications not supported');
        btn.style.display = 'none';
        return;
    }

    console.log('📊 Notification Permission:', Notification.permission);

    if (Notification.permission === 'granted') {
        btn.style.display = 'none';
        // Silent update to ensure token is fresh
        setTimeout(() => subscribeToPushNotifications(false), 2000);
    } else if (Notification.permission === 'denied') {
        btn.style.display = 'block';
        btn.innerHTML = '🔕';
        btn.onclick = showPermissionGuide;
    } else {
        // Default - Show button to request permission
        btn.style.display = 'block';
        btn.innerHTML = '🔔';
        btn.onclick = toggleNotifications;
        // Auto-prompt after 3 seconds if still default
        setTimeout(() => {
            if (Notification.permission === 'default') {
                showNotificationPrompt();
            }
        }, 3000);
    }
}

function showPermissionGuide() {
    const guide = `
لتفعيل الإشعارات:

1. افتح إعدادات المتصفح/التطبيق
2. ابحث عن "الإشعارات" أو "Notifications"
3. ابحث عن هذا الموقع في القائمة
4. فعّل خيار "السماح" أو "Allow"
5. أعد تحميل الصفحة
    `;
    alert(guide);
}

function showNotificationPrompt() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const prompt = document.createElement('div');
    prompt.style.cssText = `
        background: #1a1a1a;
        border: 2px solid #CBA35C;
        border-radius: 20px;
        padding: 30px;
        max-width: 90%;
        text-align: center;
        color: #fff;
    `;
    
    prompt.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">🔔</div>
        <h2 style="color: #CBA35C; margin-bottom: 15px;">تفعيل الإشعارات</h2>
        <p style="color: #ccc; margin-bottom: 25px; line-height: 1.6;">
            احصل على إشعارات فورية عند حجز موعد جديد<br>
            حتى لو كان التطبيق مغلقاً
        </p>
        <button id="enableNotifBtn" style="
            background: linear-gradient(135deg, #CBA35C 0%, #D4AF37 100%);
            color: #121212;
            border: none;
            padding: 15px 40px;
            border-radius: 12px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            margin: 10px;
        ">تفعيل الآن</button>
        <button id="cancelNotifBtn" style="
            background: transparent;
            color: #888;
            border: 1px solid #444;
            padding: 15px 40px;
            border-radius: 12px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px;
        ">لاحقاً</button>
    `;
    
    overlay.appendChild(prompt);
    document.body.appendChild(overlay);
    
    document.getElementById('enableNotifBtn').onclick = () => {
        document.body.removeChild(overlay);
        toggleNotifications();
    };
    
    document.getElementById('cancelNotifBtn').onclick = () => {
        document.body.removeChild(overlay);
    };
}

async function toggleNotifications() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            showToast('تم تفعيل الإشعارات بنجاح', 'success');
            await subscribeToPushNotifications(true);
            checkNotificationStatus();
        } else {
            showToast('تم رفض الإذن بالإشعارات', 'error');
            checkNotificationStatus();
        }
    } catch (error) {
        console.error('Permission request failed', error);
        showToast('حدث خطأ أثناء طلب الإذن', 'error');
    }
}

// Push Notification Subscription
async function subscribeToPushNotifications(showUi = false) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error('❌ Push API not supported');
        return;
    }

    try {
        console.log('🔄 Starting push subscription...');
        const registration = await navigator.serviceWorker.ready;
        console.log('✅ Service Worker ready');
        
        // Check existing subscription
        let subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            console.log('📌 Existing subscription found, unsubscribing...');
            await subscription.unsubscribe();
        }
        
        // Get VAPID Key
        console.log('🔑 Fetching VAPID key...');
        const response = await fetch(`${API_BASE}/notifications/vapid-public-key`);
        const data = await response.json();
        if (!data.success) throw new Error('Failed to get VAPID key');
        console.log('✅ VAPID key received');
        
        const convertedVapidKey = urlBase64ToUint8Array(data.publicKey);

        // Subscribe
        console.log('📝 Subscribing to push...');
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
        });
        console.log('✅ Push subscription created');

        // Send to backend
        console.log('📤 Sending subscription to server...');
        const saveResponse = await fetch(`${API_BASE}/employees/subscriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${employeeToken}`
            },
            body: JSON.stringify({
                subscription,
                deviceInfo: {
                    os: navigator.platform,
                    browser: navigator.userAgent,
                    language: navigator.language,
                    timestamp: new Date().toISOString()
                }
            })
        });
        
        const saveData = await saveResponse.json();
        if (!saveData.success) throw new Error(saveData.message || 'Failed to save subscription');
        
        console.log('✅ Subscription saved to server');
        if (showUi) {
            showToast('✅ تم تفعيل الإشعارات بنجاح', 'success');
            // Test notification
            setTimeout(() => {
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('صالون نسيم', {
                        body: 'الإشعارات تعمل بنجاح! 🎉',
                        icon: '/nassim/logo.jpg'
                    });
                }
            }, 1000);
        }
    } catch (error) {
        console.error('❌ Push subscription failed:', error);
        console.error('Error details:', error.stack);
        if (showUi) showToast('⚠️ فشل الاشتراك: ' + error.message, 'error');
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

