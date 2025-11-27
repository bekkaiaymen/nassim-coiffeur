// SmartBiz Pro Dashboard - Main JavaScript
const API_URL = '/api';
let token = localStorage.getItem('token');
let currentUser = null;
let currentBusiness = null;
let allAppointments = [];
let allEmployees = [];

// ============================================
// Initialize App
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    if (!token) {
        window.location.href = '/login';
        return;
    }

    await init();
});

async function init() {
    try {
        // Load user data
        await loadUserData();
        
        // Load initial data
        await Promise.all([
            loadDashboardData(),
            loadEmployees(),
            loadTodaySchedule()
        ]);

        // Setup event listeners
        setupEventListeners();
        
        showToast('تم تحميل البيانات بنجاح', 'success');
    } catch (error) {
        console.error('Init error:', error);
        showToast('حدث خطأ في تحميل البيانات', 'error');
    }
}

// ============================================
// User Data
// ============================================
async function loadUserData() {
    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load user');

        const data = await response.json();
        currentUser = data.user;
        currentBusiness = data.business;

        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('businessName').textContent = currentBusiness?.name || 'SmartBiz';
    } catch (error) {
        console.error('Load user error:', error);
        if (error.message.includes('401')) {
            logout();
        }
    }
}

// ============================================
// Dashboard Data
// ============================================
async function loadDashboardData() {
    try {
        const [appointmentsRes, employeesRes] = await Promise.all([
            fetch(`${API_URL}/appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_URL}/employees`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        const appointmentsData = await appointmentsRes.json();
        const employeesData = await employeesRes.json();

        allAppointments = appointmentsData.data || [];
        allEmployees = employeesData.data || [];

        updateDashboardStats();
    } catch (error) {
        console.error('Load dashboard data error:', error);
    }
}

function updateDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Pending appointments
    const pending = allAppointments.filter(apt => 
        apt.status === 'pending' || apt.status === 'appointment_confirmed'
    ).length;
    document.getElementById('pendingAppointments').textContent = pending;

    // Today's appointments
    const todayApts = allAppointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= today && aptDate < tomorrow;
    }).length;
    document.getElementById('todayAppointments').textContent = todayApts;

    // Active employees
    const activeEmps = allEmployees.filter(emp => 
        emp.status === 'active' && emp.isAvailable
    ).length;
    document.getElementById('activeEmployees').textContent = activeEmps;
}

// ============================================
// Today's Schedule
// ============================================
async function loadTodaySchedule() {
    const container = document.getElementById('todaySchedule');
    
    try {
        const response = await fetch(`${API_URL}/appointments?filter=today`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load schedule');

        const data = await response.json();
        const appointments = data.data || [];

        if (appointments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <p>لا توجد مواعيد لليوم</p>
                </div>
            `;
            return;
        }

        container.innerHTML = appointments.map(apt => `
            <div class="schedule-item" onclick="openAppointmentDetails('${apt._id}')">
                <div class="schedule-item-header">
                    <span class="schedule-time">
                        <i class="fas fa-clock"></i> ${apt.time}
                    </span>
                    <span class="schedule-badge badge ${apt.status}">
                        ${getStatusText(apt.status)}
                    </span>
                </div>
                <div class="schedule-customer">${apt.customerName}</div>
                <div class="schedule-service">
                    <i class="fas fa-scissors"></i> ${apt.service}
                </div>
                ${apt.employeeName ? `
                    <div class="schedule-employee">
                        <i class="fas fa-user-tie"></i> ${apt.employeeName}
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Load schedule error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>حدث خطأ في تحميل المواعيد</p>
            </div>
        `;
    }
}

// ============================================
// Appointments Management
// ============================================
async function loadAppointments(status = 'all') {
    const container = document.getElementById('appointmentsList');
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>جاري التحميل...</p></div>';

    try {
        const response = await fetch(`${API_URL}/appointments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load appointments');

        const data = await response.json();
        let appointments = data.data || [];
        allAppointments = appointments;

        // Filter by status
        if (status !== 'all') {
            appointments = appointments.filter(apt => apt.status === status);
        }

        // Update badge counts
        updateAppointmentBadges();

        if (appointments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>لا توجد مواعيد</p>
                </div>
            `;
            return;
        }

        // Sort by date and time
        appointments.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + a.time);
            const dateB = new Date(b.date + ' ' + b.time);
            return dateB - dateA;
        });

        container.innerHTML = appointments.map(apt => renderAppointmentCard(apt)).join('');
    } catch (error) {
        console.error('Load appointments error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>حدث خطأ في تحميل المواعيد</p>
            </div>
        `;
    }
}

function renderAppointmentCard(apt) {
    const date = new Date(apt.date);
    const formattedDate = date.toLocaleDateString('ar-SA');
    
    // Check confirmations
    const appointmentConfirmed = apt.confirmations?.appointmentConfirmed || false;
    const employeeConfirmed = apt.confirmations?.employeeConfirmed || false;
    
    return `
        <div class="appointment-card ${apt.status}" onclick="openAppointmentDetails('${apt._id}')">
            <div class="appointment-header">
                <div class="appointment-customer-info">
                    <h4>${apt.customerName}</h4>
                    <p><i class="fas fa-phone"></i> ${apt.customerPhone}</p>
                </div>
                <span class="appointment-status-badge ${apt.status}">
                    ${getStatusText(apt.status)}
                </span>
            </div>
            <div class="appointment-body">
                <div class="appointment-info-row">
                    <i class="fas fa-calendar"></i>
                    <span>${formattedDate}</span>
                </div>
                <div class="appointment-info-row">
                    <i class="fas fa-clock"></i>
                    <span>${apt.time}</span>
                </div>
                <div class="appointment-info-row">
                    <i class="fas fa-scissors"></i>
                    <span>${apt.service}</span>
                </div>
                ${apt.employeeName ? `
                    <div class="appointment-info-row">
                        <i class="fas fa-user-tie"></i>
                        <span>${apt.employeeName}</span>
                    </div>
                ` : ''}
            </div>
            ${renderAppointmentActions(apt, appointmentConfirmed, employeeConfirmed)}
        </div>
    `;
}

function renderAppointmentActions(apt, appointmentConfirmed, employeeConfirmed) {
    if (apt.status === 'completed' || apt.status === 'cancelled') {
        return '';
    }

    let actions = '<div class="appointment-actions">';

    // Appointment confirmation button
    if (!appointmentConfirmed) {
        actions += `
            <button class="btn-action confirm" onclick="confirmAppointment(event, '${apt._id}')">
                <i class="fas fa-check"></i> تأكيد الطلب
            </button>
        `;
    }

    // Employee confirmation button
    if (appointmentConfirmed && apt.employee && !employeeConfirmed) {
        actions += `
            <button class="btn-action confirm-employee" onclick="confirmEmployee(event, '${apt._id}')">
                <i class="fas fa-user-check"></i> تأكيد الموظف
            </button>
        `;
    }

    // Assign employee button (if not assigned)
    if (appointmentConfirmed && !apt.employee) {
        actions += `
            <button class="btn-action confirm-employee" onclick="assignEmployee(event, '${apt._id}')">
                <i class="fas fa-user-plus"></i> تعيين موظف
            </button>
        `;
    }

    // Cancel button
    if (apt.status !== 'cancelled') {
        actions += `
            <button class="btn-action cancel" onclick="cancelAppointment(event, '${apt._id}')">
                <i class="fas fa-times"></i> إلغاء
            </button>
        `;
    }

    actions += '</div>';
    return actions;
}

// ============================================
// Appointment Actions
// ============================================
async function confirmAppointment(appointmentId) {
    try {
        const response = await fetch(`${API_URL}/appointments/${appointmentId}/confirm-appointment`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to confirm appointment');

        showToast('تم تأكيد الطلب بنجاح', 'success');
        closeAppointmentModal();
        await loadAppointments();
        await loadTodaySchedule();
        updateDashboardStats();
    } catch (error) {
        console.error('Confirm appointment error:', error);
        showToast('حدث خطأ في تأكيد الطلب', 'error');
    }
}

async function confirmEmployee(appointmentId) {
    try {
        const response = await fetch(`${API_URL}/appointments/${appointmentId}/confirm-employee`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to confirm employee');

        showToast('تم تأكيد الموظف بنجاح', 'success');
        closeAppointmentModal();
        await loadAppointments();
        await loadTodaySchedule();
        updateDashboardStats();
    } catch (error) {
        console.error('Confirm employee error:', error);
        showToast('حدث خطأ في تأكيد الموظف', 'error');
    }
}

async function assignEmployee(appointmentId) {
    const modal = document.getElementById('assignEmployeeModal');
    const container = document.getElementById('assignEmployeeContent');
    
    // Show loading
    container.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>جاري تحميل الموظفين...</p>
        </div>
    `;
    modal.classList.add('active');
    
    try {
        const token = localStorage.getItem('token');
        
        // Get appointment details first
        const aptResponse = await fetch(`${API_URL}/appointments/${appointmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!aptResponse.ok) throw new Error('Failed to load appointment');
        const aptData = await aptResponse.json();
        const appointment = aptData.data;
        
        // Get available employees
        const empResponse = await fetch(`${API_URL}/employees`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!empResponse.ok) throw new Error('Failed to load employees');
        const empData = await empResponse.json();
        const employees = empData.data || [];
        
        // Filter only active employees
        const activeEmployees = employees.filter(emp => emp.status === 'active' && emp.isAvailable);
        
        if (activeEmployees.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-friends"></i>
                    <p>لا يوجد موظفين متاحين حالياً</p>
                    <button class="btn-secondary" onclick="closeAssignEmployeeModal()">إغلاق</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="assign-employee-content">
                <div class="appointment-info-bar">
                    <div class="info-item">
                        <i class="fas fa-user"></i>
                        <span>${appointment.customerName}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-cut"></i>
                        <span>${appointment.service}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>${new Date(appointment.date).toLocaleDateString('ar-EG')} - ${appointment.time}</span>
                    </div>
                </div>
                
                <h4 style="margin: 20px 0 15px; color: var(--dark-color);">اختر الموظف المناسب:</h4>
                
                <div class="employee-selection-grid">
                    ${activeEmployees.map(emp => `
                        <div class="employee-selection-card" onclick="selectEmployeeForAppointment('${appointmentId}', '${emp._id}', '${emp.name}')">
                            <div class="emp-avatar">
                                ${emp.avatar ? `
                                    <img src="${emp.avatar}" alt="${emp.name}">
                                ` : `
                                    <div class="emp-avatar-placeholder">${emp.name.charAt(0)}</div>
                                `}
                            </div>
                            <div class="emp-info">
                                <div class="emp-name">${emp.name}</div>
                                <div class="emp-title">${emp.jobTitle || 'حلاق'}</div>
                                ${emp.specialties && emp.specialties.length > 0 ? `
                                    <div class="emp-specialties">
                                        ${emp.specialties.slice(0, 2).map(s => `<span class="specialty-mini">${s}</span>`).join('')}
                                    </div>
                                ` : ''}
                                <div class="emp-stats-mini">
                                    <span><i class="fas fa-star"></i> ${emp.stats?.rating?.toFixed(1) || '5.0'}</span>
                                    <span><i class="fas fa-calendar-check"></i> ${emp.stats?.completedAppointments || 0}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn-secondary" onclick="closeAssignEmployeeModal()">إلغاء</button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Assign employee error:', error);
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>حدث خطأ أثناء تحميل الموظفين</p>
                <button class="btn-secondary" onclick="closeAssignEmployeeModal()">إغلاق</button>
            </div>
        `;
    }
}

function closeAssignEmployeeModal() {
    document.getElementById('assignEmployeeModal').classList.remove('active');
}

async function selectEmployeeForAppointment(appointmentId, employeeId, employeeName) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                employee: employeeId,
                employeeName: employeeName
            })
        });

        if (!response.ok) throw new Error('Failed to assign employee');

        showToast('تم تعيين الموظف بنجاح', 'success');
        closeAssignEmployeeModal();
        closeAppointmentModal();
        await loadAppointments();
        await loadTodaySchedule();
    } catch (error) {
        console.error('Select employee error:', error);
        showToast('حدث خطأ في تعيين الموظف', 'error');
    }
}

async function cancelAppointment(appointmentId) {
    if (!confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'cancelled' })
        });

        if (!response.ok) throw new Error('Failed to cancel appointment');

        showToast('تم إلغاء الحجز', 'success');
        closeAppointmentModal();
        await loadAppointments();
        await loadTodaySchedule();
        updateDashboardStats();
    } catch (error) {
        console.error('Cancel appointment error:', error);
        showToast('حدث خطأ في إلغاء الحجز', 'error');
    }
}

async function completeAppointment(appointmentId) {
    if (!confirm('هل تم إتمام هذا الموعد بنجاح؟')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'completed' })
        });

        if (!response.ok) throw new Error('Failed to complete appointment');

        showToast('تم إكمال الموعد بنجاح', 'success');
        closeAppointmentModal();
        await loadAppointments();
        await loadTodaySchedule();
        updateDashboardStats();
    } catch (error) {
        console.error('Complete appointment error:', error);
        showToast('حدث خطأ في إكمال الموعد', 'error');
    }
}

// ============================================
// Employees Management
// ============================================
async function loadEmployees() {
    const container = document.getElementById('employeesList');
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>جاري التحميل...</p></div>';

    try {
        const response = await fetch(`${API_URL}/employees`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load employees');

        const data = await response.json();
        const employees = data.data || [];
        allEmployees = employees;

        if (employees.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-friends"></i>
                    <p>لا يوجد موظفين. ابدأ بإضافة موظف</p>
                </div>
            `;
            return;
        }

        container.innerHTML = employees.map(emp => `
            <div class="employee-card" onclick="openEmployeeDetails('${emp._id}')">
                <div style="position: relative; display: inline-block;">
                    ${emp.avatar ? `
                        <img src="${emp.avatar}" alt="${emp.name}" class="employee-avatar">
                    ` : `
                        <div class="employee-avatar-placeholder">
                            ${emp.name.charAt(0)}
                        </div>
                    `}
                    <span class="employee-status ${emp.status}"></span>
                </div>
                <div class="employee-name">${emp.name}</div>
                <div class="employee-job">${emp.jobTitle}</div>
                <div class="employee-stats">
                    <div class="employee-stat">
                        <i class="fas fa-star"></i>
                        ${emp.stats?.rating?.toFixed(1) || '5.0'}
                    </div>
                    <div class="employee-stat">
                        <i class="fas fa-calendar-check"></i>
                        ${emp.stats?.completedAppointments || 0}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Load employees error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>حدث خطأ في تحميل الموظفين</p>
            </div>
        `;
    }
}

async function addEmployee(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('empName').value,
        phone: document.getElementById('empPhone').value,
        email: document.getElementById('empEmail').value || undefined,
        jobTitle: document.getElementById('empJobTitle').value || 'حلاق',
        experience: parseInt(document.getElementById('empExperience').value) || 0,
        specialties: document.getElementById('empSpecialties').value
            .split('،')
            .map(s => s.trim())
            .filter(s => s),
        bio: document.getElementById('empBio').value || undefined
    };

    try {
        const response = await fetch(`${API_URL}/employees`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Failed to add employee');

        showToast('تم إضافة الموظف بنجاح', 'success');
        closeAddEmployeeModal();
        await loadEmployees();
        updateDashboardStats();
    } catch (error) {
        console.error('Add employee error:', error);
        showToast('حدث خطأ في إضافة الموظف', 'error');
    }
}

// ============================================
// Filters & Navigation
// ============================================
function filterAppointments(status) {
    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    // Load filtered appointments
    loadAppointments(status);
}

function updateAppointmentBadges() {
    const pending = allAppointments.filter(apt => apt.status === 'pending').length;
    const pendingBadge = document.getElementById('pendingBadge');
    if (pendingBadge) {
        pendingBadge.textContent = pending;
    }
}

function openSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update mobile nav
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });

    // Load section data
    if (sectionName === 'appointments') {
        loadAppointments();
    } else if (sectionName === 'employees') {
        loadEmployees();
    }
}

// ============================================
// Modals
// ============================================
async function openAppointmentDetails(appointmentId) {
    const modal = document.getElementById('appointmentModal');
    const detailsContainer = document.getElementById('appointmentDetails');
    
    // Show loading
    detailsContainer.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>جاري التحميل...</p>
        </div>
    `;
    modal.classList.add('active');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load appointment');

        const data = await response.json();
        const apt = data.data;
        
        // Format date and time
        const appointmentDate = new Date(apt.date).toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        detailsContainer.innerHTML = `
            <div class="appointment-details-content">
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> معلومات الحجز</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">رقم الحجز:</span>
                            <span class="detail-value">#${apt._id.slice(-6).toUpperCase()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">الحالة:</span>
                            <span class="detail-value">
                                <span class="status-badge ${apt.status}">${getStatusText(apt.status)}</span>
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">التاريخ:</span>
                            <span class="detail-value">${appointmentDate}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">الوقت:</span>
                            <span class="detail-value"><i class="fas fa-clock"></i> ${apt.time}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4><i class="fas fa-user"></i> بيانات العميل</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">الاسم:</span>
                            <span class="detail-value">${apt.customerName}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">الهاتف:</span>
                            <span class="detail-value">
                                <a href="tel:${apt.customerPhone}" class="phone-link">
                                    <i class="fas fa-phone"></i> ${apt.customerPhone}
                                </a>
                            </span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4><i class="fas fa-cut"></i> تفاصيل الخدمة</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">الخدمة:</span>
                            <span class="detail-value">${apt.service}</span>
                        </div>
                        ${apt.employeeName ? `
                            <div class="detail-item">
                                <span class="detail-label">الموظف:</span>
                                <span class="detail-value">
                                    <i class="fas fa-user-tie"></i> ${apt.employeeName}
                                </span>
                            </div>
                        ` : ''}
                        ${apt.notes ? `
                            <div class="detail-item full-width">
                                <span class="detail-label">ملاحظات:</span>
                                <span class="detail-value">${apt.notes}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${apt.confirmations ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-check-circle"></i> حالة التأكيد</h4>
                        <div class="confirmation-status">
                            <div class="confirmation-item ${apt.confirmations.appointmentConfirmed ? 'confirmed' : ''}">
                                <i class="fas ${apt.confirmations.appointmentConfirmed ? 'fa-check-circle' : 'fa-circle'}"></i>
                                <span>تأكيد الموعد</span>
                                ${apt.confirmations.appointmentConfirmedAt ? `
                                    <small>${new Date(apt.confirmations.appointmentConfirmedAt).toLocaleString('ar-EG')}</small>
                                ` : ''}
                            </div>
                            <div class="confirmation-item ${apt.confirmations.employeeConfirmed ? 'confirmed' : ''}">
                                <i class="fas ${apt.confirmations.employeeConfirmed ? 'fa-check-circle' : 'fa-circle'}"></i>
                                <span>تأكيد الموظف</span>
                                ${apt.confirmations.employeeConfirmedAt ? `
                                    <small>${new Date(apt.confirmations.employeeConfirmedAt).toLocaleString('ar-EG')}</small>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                ` : ''}

                <div class="detail-actions">
                    ${apt.status === 'pending' ? `
                        <button class="btn-primary" onclick="confirmAppointment('${apt._id}')">
                            <i class="fas fa-check"></i> تأكيد الموعد
                        </button>
                    ` : ''}
                    
                    ${apt.status === 'appointment_confirmed' ? `
                        <button class="btn-primary" onclick="confirmEmployee('${apt._id}')">
                            <i class="fas fa-user-check"></i> تأكيد الموظف
                        </button>
                    ` : ''}
                    
                    ${!apt.employee && apt.status !== 'cancelled' && apt.status !== 'completed' ? `
                        <button class="btn-secondary" onclick="assignEmployee('${apt._id}')">
                            <i class="fas fa-user-plus"></i> تعيين موظف
                        </button>
                    ` : ''}
                    
                    ${apt.status === 'fully_confirmed' ? `
                        <button class="btn-success" onclick="completeAppointment('${apt._id}')">
                            <i class="fas fa-check-double"></i> إكمال الموعد
                        </button>
                    ` : ''}
                    
                    ${apt.status !== 'cancelled' && apt.status !== 'completed' ? `
                        <button class="btn-link danger" onclick="cancelAppointment('${apt._id}')">
                            <i class="fas fa-times"></i> إلغاء الموعد
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Load appointment details error:', error);
        detailsContainer.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>حدث خطأ أثناء تحميل التفاصيل</p>
                <button class="btn-secondary" onclick="closeAppointmentModal()">إغلاق</button>
            </div>
        `;
    }
}

function closeAppointmentModal() {
    document.getElementById('appointmentModal').classList.remove('active');
}

function openAddEmployeeModal() {
    document.getElementById('addEmployeeModal').classList.add('active');
}

function closeAddEmployeeModal() {
    document.getElementById('addEmployeeModal').classList.remove('active');
    document.getElementById('addEmployeeForm').reset();
}

async function openEmployeeDetails(employeeId) {
    const modal = document.getElementById('employeeDetailsModal');
    const detailsContainer = document.getElementById('employeeDetailsContent');
    
    // Show loading
    detailsContainer.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>جاري التحميل...</p>
        </div>
    `;
    modal.classList.add('active');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/employees/${employeeId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load employee');

        const data = await response.json();
        const emp = data.data;
        
        // Get working days
        const workingDays = Object.entries(emp.workingHours || {})
            .filter(([day, hours]) => hours.enabled)
            .map(([day, hours]) => ({
                day: getDayName(day),
                start: hours.start,
                end: hours.end
            }));
        
        detailsContainer.innerHTML = `
            <div class="employee-details-content">
                <div class="employee-header">
                    <div class="employee-avatar-large">
                        ${emp.avatar ? `
                            <img src="${emp.avatar}" alt="${emp.name}">
                        ` : `
                            <div class="avatar-placeholder-large">${emp.name.charAt(0)}</div>
                        `}
                        <span class="employee-status-indicator ${emp.status}"></span>
                    </div>
                    <div class="employee-header-info">
                        <h2>${emp.name}</h2>
                        <p class="job-title">${emp.jobTitle || 'حلاق'}</p>
                        <div class="employee-badges">
                            <span class="badge ${emp.isAvailable ? 'success' : 'warning'}">
                                ${emp.isAvailable ? 'متاح' : 'غير متاح'}
                            </span>
                            <span class="badge ${emp.status === 'active' ? 'primary' : 'secondary'}">
                                ${getEmployeeStatusText(emp.status)}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> معلومات الاتصال</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">الهاتف:</span>
                            <span class="detail-value">
                                <a href="tel:${emp.phone}" class="phone-link">
                                    <i class="fas fa-phone"></i> ${emp.phone}
                                </a>
                            </span>
                        </div>
                        ${emp.email ? `
                            <div class="detail-item">
                                <span class="detail-label">البريد:</span>
                                <span class="detail-value">
                                    <a href="mailto:${emp.email}" class="email-link">
                                        <i class="fas fa-envelope"></i> ${emp.email}
                                    </a>
                                </span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${emp.specialties && emp.specialties.length > 0 ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-star"></i> التخصصات</h4>
                        <div class="specialties-list">
                            ${emp.specialties.map(s => `<span class="specialty-tag">${s}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                ${emp.bio ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-user"></i> نبذة</h4>
                        <p class="bio-text">${emp.bio}</p>
                    </div>
                ` : ''}

                <div class="detail-section">
                    <h4><i class="fas fa-clock"></i> ساعات العمل</h4>
                    ${workingDays.length > 0 ? `
                        <div class="working-hours-list">
                            ${workingDays.map(day => `
                                <div class="working-day">
                                    <span class="day-name">${day.day}</span>
                                    <span class="day-hours">${day.start} - ${day.end}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>لم يتم تحديد ساعات العمل</p>'}
                </div>

                <div class="detail-section">
                    <h4><i class="fas fa-chart-bar"></i> الإحصائيات</h4>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <i class="fas fa-calendar-check"></i>
                            <div class="stat-value">${emp.stats?.completedAppointments || 0}</div>
                            <div class="stat-label">مواعيد مكتملة</div>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-star"></i>
                            <div class="stat-value">${emp.stats?.rating?.toFixed(1) || '5.0'}</div>
                            <div class="stat-label">التقييم</div>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-comment"></i>
                            <div class="stat-value">${emp.stats?.reviewCount || 0}</div>
                            <div class="stat-label">المراجعات</div>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-calendar"></i>
                            <div class="stat-value">${emp.stats?.totalAppointments || 0}</div>
                            <div class="stat-label">إجمالي المواعيد</div>
                        </div>
                    </div>
                </div>

                <div class="detail-actions">
                    <button class="btn-primary" onclick="editEmployee('${emp._id}')">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    
                    ${emp.status === 'active' ? `
                        <button class="btn-secondary" onclick="toggleEmployeeStatus('${emp._id}', 'inactive')">
                            <i class="fas fa-pause"></i> تعطيل
                        </button>
                    ` : `
                        <button class="btn-success" onclick="toggleEmployeeStatus('${emp._id}', 'active')">
                            <i class="fas fa-play"></i> تفعيل
                        </button>
                    `}
                    
                    <button class="btn-link danger" onclick="deleteEmployee('${emp._id}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Load employee details error:', error);
        detailsContainer.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>حدث خطأ أثناء تحميل التفاصيل</p>
                <button class="btn-secondary" onclick="closeEmployeeDetailsModal()">إغلاق</button>
            </div>
        `;
    }
}

function closeEmployeeDetailsModal() {
    document.getElementById('employeeDetailsModal').classList.remove('active');
}

function getDayName(day) {
    const days = {
        'monday': 'الإثنين',
        'tuesday': 'الثلاثاء',
        'wednesday': 'الأربعاء',
        'thursday': 'الخميس',
        'friday': 'الجمعة',
        'saturday': 'السبت',
        'sunday': 'الأحد'
    };
    return days[day] || day;
}

function getEmployeeStatusText(status) {
    const statusMap = {
        'active': 'نشط',
        'inactive': 'غير نشط',
        'on_leave': 'في إجازة',
        'busy': 'مشغول'
    };
    return statusMap[status] || status;
}

async function editEmployee(employeeId) {
    showToast('قريباً: تعديل بيانات الموظف', 'warning');
}

async function toggleEmployeeStatus(employeeId, newStatus) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/employees/${employeeId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error('Failed to update status');

        showToast('تم تحديث حالة الموظف', 'success');
        closeEmployeeDetailsModal();
        await loadEmployees();
    } catch (error) {
        console.error('Toggle employee status error:', error);
        showToast('حدث خطأ في تحديث الحالة', 'error');
    }
}

async function deleteEmployee(employeeId) {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/employees/${employeeId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to delete employee');
        }

        showToast('تم حذف الموظف بنجاح', 'success');
        closeEmployeeDetailsModal();
        await loadEmployees();
    } catch (error) {
        console.error('Delete employee error:', error);
        showToast(error.message || 'حدث خطأ في حذف الموظف', 'error');
    }
}

async function openNewAppointmentModal() {
    const modal = document.getElementById('newAppointmentModal');
    const employeeSelect = document.getElementById('aptEmployee');
    const dateInput = document.getElementById('aptDate');
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
    dateInput.value = today;
    
    // Load employees for selection
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/employees`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const employees = data.data || [];
            const activeEmployees = employees.filter(emp => emp.status === 'active');
            
            employeeSelect.innerHTML = '<option value="">أي موظف متاح</option>' +
                activeEmployees.map(emp => `<option value="${emp._id}">${emp.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Load employees error:', error);
    }
    
    modal.classList.add('active');
}

function closeNewAppointmentModal() {
    document.getElementById('newAppointmentModal').classList.remove('active');
    document.getElementById('newAppointmentForm').reset();
}

async function createNewAppointment(event) {
    event.preventDefault();
    
    const customerName = document.getElementById('aptCustomerName').value;
    const customerPhone = document.getElementById('aptCustomerPhone').value;
    const service = document.getElementById('aptService').value;
    const employeeId = document.getElementById('aptEmployee').value;
    const date = document.getElementById('aptDate').value;
    const time = document.getElementById('aptTime').value;
    const notes = document.getElementById('aptNotes').value;
    
    // Get employee name if selected
    let employeeName = '';
    if (employeeId) {
        const employeeSelect = document.getElementById('aptEmployee');
        employeeName = employeeSelect.options[employeeSelect.selectedIndex].text;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customerName,
                customerPhone,
                service,
                employee: employeeId || undefined,
                employeeName: employeeName || undefined,
                date,
                time,
                notes,
                status: 'pending'
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create appointment');
        }
        
        showToast('تم إضافة الحجز بنجاح', 'success');
        closeNewAppointmentModal();
        await loadAppointments();
        await loadTodaySchedule();
        updateDashboardStats();
    } catch (error) {
        console.error('Create appointment error:', error);
        showToast(error.message || 'حدث خطأ في إضافة الحجز', 'error');
    }
}

async function openNotifications() {
    const modal = document.getElementById('notificationsModal');
    const container = document.getElementById('notificationsContent');
    
    // Show loading
    container.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>جاري تحميل الإشعارات...</p>
        </div>
    `;
    modal.classList.add('active');
    
    try {
        const token = localStorage.getItem('token');
        
        // Get recent appointments (new, pending confirmation)
        const response = await fetch(`${API_URL}/appointments?status=pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load notifications');
        
        const data = await response.json();
        const pendingAppointments = data.data || [];
        
        // Get appointments waiting for employee confirmation
        const confirmResponse = await fetch(`${API_URL}/appointments?status=appointment_confirmed`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const confirmData = await confirmResponse.json();
        const waitingConfirm = confirmData.data || [];
        
        const totalNotifications = pendingAppointments.length + waitingConfirm.length;
        
        if (totalNotifications === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <p>لا توجد إشعارات جديدة</p>
                </div>
            `;
            return;
        }
        
        let notificationsHTML = '<div class="notifications-list">';
        
        // Pending appointments
        if (pendingAppointments.length > 0) {
            notificationsHTML += `
                <div class="notification-section">
                    <h4><i class="fas fa-clock"></i> حجوزات معلقة (${pendingAppointments.length})</h4>
            `;
            
            pendingAppointments.forEach(apt => {
                const aptDate = new Date(apt.date).toLocaleDateString('ar-EG');
                notificationsHTML += `
                    <div class="notification-item" onclick="openAppointmentDetails('${apt._id}')">
                        <div class="notification-icon pending">
                            <i class="fas fa-calendar-plus"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">حجز جديد من ${apt.customerName}</div>
                            <div class="notification-text">${apt.service} - ${aptDate} ${apt.time}</div>
                            <div class="notification-time">${getTimeAgo(apt.createdAt)}</div>
                        </div>
                        <div class="notification-action">
                            <i class="fas fa-chevron-left"></i>
                        </div>
                    </div>
                `;
            });
            
            notificationsHTML += '</div>';
        }
        
        // Waiting for employee confirmation
        if (waitingConfirm.length > 0) {
            notificationsHTML += `
                <div class="notification-section">
                    <h4><i class="fas fa-user-check"></i> بانتظار تأكيد الموظف (${waitingConfirm.length})</h4>
            `;
            
            waitingConfirm.forEach(apt => {
                const aptDate = new Date(apt.date).toLocaleDateString('ar-EG');
                notificationsHTML += `
                    <div class="notification-item" onclick="openAppointmentDetails('${apt._id}')">
                        <div class="notification-icon info">
                            <i class="fas fa-user-clock"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">${apt.customerName} - ${apt.service}</div>
                            <div class="notification-text">يحتاج تأكيد ${apt.employeeName || 'الموظف'}</div>
                            <div class="notification-time">${aptDate} ${apt.time}</div>
                        </div>
                        <div class="notification-action">
                            <i class="fas fa-chevron-left"></i>
                        </div>
                    </div>
                `;
            });
            
            notificationsHTML += '</div>';
        }
        
        notificationsHTML += '</div>';
        
        container.innerHTML = notificationsHTML;
        
        // Update notification badge in header
        const notificationBadge = document.querySelector('.notification-badge');
        if (notificationBadge && totalNotifications > 0) {
            notificationBadge.textContent = totalNotifications;
            notificationBadge.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Load notifications error:', error);
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>حدث خطأ أثناء تحميل الإشعارات</p>
                <button class="btn-secondary" onclick="closeNotificationsModal()">إغلاق</button>
            </div>
        `;
    }
}

function closeNotificationsModal() {
    document.getElementById('notificationsModal').classList.remove('active');
}

function getTimeAgo(dateString) {
    if (!dateString) return 'الآن';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString('ar-EG');
}

// ============================================
// Utilities
// ============================================
function getStatusText(status) {
    const statusMap = {
        'pending': 'معلق',
        'appointment_confirmed': 'تأكيد أولي',
        'employee_confirmed': 'تأكيد الموظف',
        'fully_confirmed': 'مؤكد كلياً',
        'completed': 'مكتمل',
        'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function refreshDashboard() {
    init();
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Mobile navigation
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            openSection(section);
        });
    });

    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}
