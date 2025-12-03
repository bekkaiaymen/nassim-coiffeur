// ==================== Configuration ====================
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://nassim-coiffeur.onrender.com/api';
const NASSIM_BUSINESS_ID = '69259331651b1babc1eb83dc';
let currentUser = null;
let currentPage = 'dashboard';
let servicesCache = null;
let employeesCache = null;
let appointmentsCache = null;
let appointmentsCacheTimestamp = 0;
let timelineSelectedDate = new Date();

function isProductItem(item) {
    return item?.metadata?.isProduct === true || item?.icon === '🛍️';
}

const PRODUCT_CATEGORY_LABELS = {
    'hair-care': 'عناية بالشعر',
    'beard-care': 'عناية باللحية',
    'styling': 'تصفيف',
    'tools': 'أدوات',
    'other': 'أخرى'
};

function formatProductCategory(category) {
    return PRODUCT_CATEGORY_LABELS[category] || category || '';
}

async function fetchBusinessAppointments({ useCache = true } = {}) {
    const now = Date.now();
    if (useCache && appointmentsCache && (now - appointmentsCacheTimestamp) < 60000) {
        return appointmentsCache;
    }

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/appointments/business/${NASSIM_BUSINESS_ID}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error('فشل تحميل المواعيد');
    }

    const result = await response.json();
    const appointments = Array.isArray(result) ? result : (result.data || result || []);

    appointmentsCache = appointments;
    appointmentsCacheTimestamp = now;
    return appointments;
}

async function fetchEmployeesData({ useCache = true } = {}) {
    if (useCache && Array.isArray(employeesCache)) {
        return employeesCache;
    }

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/employees?business=${NASSIM_BUSINESS_ID}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error('فشل تحميل الموظفين');
    }

    const result = await response.json();
    const employees = Array.isArray(result) ? result : (result.data || result || []);
    employeesCache = employees;
    return employees;
}

async function fetchServicesData({ useCache = true } = {}) {
    if (useCache && Array.isArray(servicesCache)) {
        return servicesCache;
    }

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/services?business=${NASSIM_BUSINESS_ID}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error('فشل تحميل الخدمات');
    }

    const result = await response.json();
    const services = Array.isArray(result) ? result : (result.data || result || []);
    servicesCache = services;
    return services;
}

function invalidateAppointmentsCache() {
    appointmentsCacheTimestamp = 0;
}

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
    initOwnerDashboard().catch(error => {
        console.error('Initialization error:', error);
        showToast('حدث خطأ أثناء تحميل الصفحة', 'error');
    });
});

async function initOwnerDashboard() {
    await checkAuth();
    await loadDashboardData();
    setupEventListeners(); // Initialize event listeners
    loadServices(); // Load services on page load
    prepareQuickBookingForm().catch(error => console.error('Quick booking init error:', error));
    prepareCompletionForm().catch(error => console.error('Completion init error:', error));
    prepareCustomerFeedbackForm().catch(error => console.error('Feedback init error:', error));
    loadTimelineView(timelineSelectedDate).catch(error => console.error('Timeline init error:', error));
}

// ==================== Authentication ====================
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Authentication failed');
        }

        currentUser = await response.json();
        
        // Check if user is owner of this business
        if (!currentUser.business || currentUser.business._id !== NASSIM_BUSINESS_ID) {
            showToast('غير مصرح لك بالوصول إلى هذه الصفحة', 'error');
            setTimeout(() => window.location.href = '/dashboard', 2000);
            return;
        }

        document.getElementById('ownerName').textContent = currentUser.name || 'المالك';
    } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
}

// ==================== Event Listeners ====================
function setupEventListeners() {
    // Reminder settings form
    const reminderForm = document.getElementById('reminderSettingsForm');
    if (reminderForm) {
        reminderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveReminderSettings();
        });
    }

    const timelineDateInput = document.getElementById('timelineDate');
    if (timelineDateInput) {
        timelineDateInput.value = formatDateForInput(timelineSelectedDate);
        timelineDateInput.addEventListener('change', (event) => {
            const value = event.target.value;
            if (value) {
                timelineSelectedDate = new Date(value);
                loadTimelineView(timelineSelectedDate);
            }
        });
    }

    const quickBookingForm = document.getElementById('quickBookingForm');
    if (quickBookingForm) {
        quickBookingForm.addEventListener('submit', handleQuickBookingSubmit);
    }

    const quickBookingDateInput = document.getElementById('quickBookingDate');
    if (quickBookingDateInput && !quickBookingDateInput.value) {
        quickBookingDateInput.value = formatDateForInput(new Date());
    }
    if (quickBookingDateInput) {
        quickBookingDateInput.addEventListener('change', () => {
            prepareQuickBookingForm();
        });
    }

    const quickBookingTimeSelect = document.getElementById('quickBookingTime');
    if (quickBookingTimeSelect) {
        populateTimeSelect(
            quickBookingTimeSelect,
            quickBookingTimeSelect.value || null,
            quickBookingDateInput ? new Date(quickBookingDateInput.value) : timelineSelectedDate
        );
    }

    const completionForm = document.getElementById('completionForm');
    if (completionForm) {
        completionForm.addEventListener('submit', handleCompletionSubmit);
    }

    const completionAppointmentSelect = document.getElementById('completionAppointmentSelect');
    if (completionAppointmentSelect) {
        completionAppointmentSelect.addEventListener('change', handleCompletionAppointmentChange);
    }

    const customerFeedbackForm = document.getElementById('customerFeedbackForm');
    if (customerFeedbackForm) {
        customerFeedbackForm.addEventListener('submit', handleCustomerFeedbackSubmit);
    }
}

// ==================== Navigation ====================
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected page
    const page = document.getElementById(`${pageName}Page`);
    if (page) {
        page.classList.add('active');
        currentPage = pageName;
    }

    // Add active to nav item
    const navItem = document.querySelector(`[data-page="${pageName}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    // Load page data
    switch(pageName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'appointments':
            loadAppointments();
            break;
        case 'timeline':
            loadTimelineView(timelineSelectedDate);
            break;
        case 'quickBooking':
            prepareQuickBookingForm();
            break;
        case 'serviceCompletion':
            prepareCompletionForm();
            break;
        case 'customerFeedback':
            prepareCustomerFeedbackForm();
            break;
        case 'employees':
            loadEmployees();
            break;
        case 'services':
            loadServices();
            break;
        case 'posts':
            loadPosts();
            break;
        case 'rewards':
            loadRewards();
            break;
        case 'products':
            loadProducts();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'reminders':
            loadReminderSettings();
            loadRecentReminders();
            break;
    }

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
    sidebar.classList.toggle('collapsed');
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('active');
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('userDropdown').classList.remove('active');
    }
});

// ==================== Dashboard ====================
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('token');
        
        // Load appointments
        const appointmentsRes = await fetch(`${API_URL}/appointments/business/${NASSIM_BUSINESS_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const appointmentsData = await appointmentsRes.json();
        const appointments = Array.isArray(appointmentsData) ? appointmentsData : (appointmentsData.data || []);

        // Load customers
        const customersRes = await fetch(`${API_URL}/customers/business/${NASSIM_BUSINESS_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const customersData = await customersRes.json();
        const customers = Array.isArray(customersData) ? customersData : (customersData.data || []);

        // Calculate stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayAppointments = appointments.filter(apt => {
            const aptDate = new Date(apt.dateTime);
            aptDate.setHours(0, 0, 0, 0);
            return aptDate.getTime() === today.getTime();
        });

        const thisMonth = appointments.filter(apt => {
            const aptDate = new Date(apt.dateTime);
            return aptDate.getMonth() === today.getMonth() && 
                   aptDate.getFullYear() === today.getFullYear() &&
                   apt.status === 'completed';
        });

        const monthRevenue = thisMonth.reduce((sum, apt) => {
            return sum + (apt.service?.price || 0);
        }, 0);

        // Update stats
        document.getElementById('todayAppointments').textContent = todayAppointments.length;
        document.getElementById('monthRevenue').textContent = `${monthRevenue.toLocaleString('ar-DZ')} دج`;
        document.getElementById('totalCustomers').textContent = customers.length;

        // Load today's appointments
        displayTodayAppointments(todayAppointments);

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('حدث خطأ في تحميل البيانات', 'error');
    }
}

function displayTodayAppointments(appointments) {
    const container = document.getElementById('todayAppointmentsList');
    
    if (appointments.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">لا توجد مواعيد اليوم</div></div>';
        return;
    }

    const html = `
        <div class="appointments-scroll-container">
            ${appointments.map(apt => `
                <div class="appointment-item">
                    <div class="appointment-info">
                        <div class="appointment-customer">${apt.customer?.name || 'عميل'}</div>
                        <div class="appointment-details">${apt.service?.name || 'خدمة'} - ${apt.employee?.name || 'موظف'}</div>
                        <div class="appointment-time">${formatTime(apt.dateTime)}</div>
                    </div>
                    <div class="appointment-status">
                        <span class="badge badge-${getStatusColor(apt.status)}">${getStatusText(apt.status)}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = html;
}

// ==================== Appointments ====================
// Sort appointments by selected option
function sortAppointmentsByOption(appointments, option) {
    const sorted = [...appointments];
    
    switch(option) {
        case 'createdAt-desc': // آخر طلب (الأحدث أولاً)
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'createdAt-asc': // أول طلب (الأقدم أولاً)
            sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'date-asc': // تاريخ الموعد (الأقرب)
            sorted.sort((a, b) => {
                const dateA = new Date(a.date + 'T' + a.time);
                const dateB = new Date(b.date + 'T' + b.time);
                return dateA - dateB;
            });
            break;
        case 'date-desc': // تاريخ الموعد (الأبعد)
            sorted.sort((a, b) => {
                const dateA = new Date(a.date + 'T' + a.time);
                const dateB = new Date(b.date + 'T' + b.time);
                return dateB - dateA;
            });
            break;
        case 'price-desc': // السعر (الأعلى)
            sorted.sort((a, b) => (b.totalPrice || b.service?.price || 0) - (a.totalPrice || a.service?.price || 0));
            break;
        case 'price-asc': // السعر (الأقل)
            sorted.sort((a, b) => (a.totalPrice || a.service?.price || 0) - (b.totalPrice || b.service?.price || 0));
            break;
        default:
            // Default: newest booking first
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    return sorted;
}

// Sort appointments function (called from UI)
function sortAppointments(sortOption) {
    loadAppointments(window.currentAppointmentFilter || 'all');
}

async function loadAppointments(filter = 'all') {
    window.currentAppointmentFilter = filter;
    try {
        const allAppointments = await fetchBusinessAppointments({ useCache: false });
        let appointments = [...allAppointments];

        // Filter appointments
        if (filter !== 'all') {
            appointments = appointments.filter(apt => apt.status === filter);
        }

        // Get current sort option (default: newest booking first)
        const sortOption = document.getElementById('appointmentSort')?.value || 'createdAt-desc';
        appointments = sortAppointmentsByOption(appointments, sortOption);

        displayAppointments(appointments);

    } catch (error) {
        console.error('Error loading appointments:', error);
        showToast('حدث خطأ في تحميل المواعيد', 'error');
    }
}

function displayAppointments(appointments) {
    const container = document.getElementById('appointmentsList');
    
    if (appointments.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">لا توجد مواعيد</div></div>';
        return;
    }

    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>التاريخ والوقت</th>
                    <th>العميل</th>
                    <th>الخدمة</th>
                    <th>الموظف</th>
                    <th>الحالة</th>
                    <th>السعر</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
                ${appointments.map(apt => `
                    <tr>
                        <td>${formatDateTime(apt.date, apt.time)}</td>
                        <td>${apt.customerId?.name || apt.customerName || 'عميل'}</td>
                        <td>${apt.serviceId?.name || apt.service || 'خدمة'}</td>
                        <td>${apt.employee?.name || apt.employeeName || 'موظف'}</td>
                        <td><span class="badge badge-${getStatusColor(apt.status)}">${getStatusText(apt.status)}</span></td>
                        <td>${apt.serviceId?.price || 0} دج</td>
                        <td>
                            <button class="btn-icon" onclick='viewAppointmentDetails(${JSON.stringify(apt)})' title="عرض التفاصيل">👁️</button>
                            ${apt.status === 'pending' ? `<button class="btn-icon" onclick="updateAppointmentStatus('${apt._id}', 'confirmed')" title="تأكيد">✅</button>` : ''}
                            ${apt.status === 'confirmed' ? `<button class="btn-icon" onclick="updateAppointmentStatus('${apt._id}', 'completed')" title="اكتمل">✔️</button>` : ''}
                            ${apt.status !== 'cancelled' && apt.status !== 'completed' ? `<button class="btn-icon" onclick="updateAppointmentStatus('${apt._id}', 'cancelled')" title="إلغاء">❌</button>` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function filterAppointments(filter) {
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    loadAppointments(filter);
}

async function updateAppointmentStatus(appointmentId, newStatus) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error('Failed to update');

        showToast('تم تحديث حالة الموعد', 'success');
        loadAppointments();
        loadDashboardData();

    } catch (error) {
        console.error('Error updating appointment:', error);
        showToast('حدث خطأ في التحديث', 'error');
    }
}

function viewAppointmentDetails(appointment) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    const customerName = appointment.customerId?.name || appointment.customerName || 'غير محدد';
    const customerPhone = appointment.customerId?.phone || appointment.customerPhone || 'غير محدد';
    const customerEmail = appointment.customerId?.email || 'غير متوفر';
    const serviceName = appointment.serviceId?.name || appointment.service || 'غير محدد';
    const servicePrice = appointment.serviceId?.price || 0;
    const serviceDuration = appointment.serviceId?.duration || 'غير محدد';
    const employeeName = appointment.employee?.name || appointment.employeeName || 'غير محدد';
    const date = appointment.date ? new Date(appointment.date).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' }) : 'غير محدد';
    const time = appointment.time || 'غير محدد';
    const notes = appointment.notes || 'لا توجد ملاحظات';
    const createdAt = appointment.createdAt ? new Date(appointment.createdAt).toLocaleString('ar-DZ') : 'غير محدد';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>📋 تفاصيل الموعد</h2>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body" style="padding: 20px;">
                <div style="display: grid; gap: 20px;">
                    <div class="detail-section">
                        <h3 style="color: var(--primary); margin-bottom: 10px; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                            👤 معلومات العميل
                        </h3>
                        <div style="background: var(--light); padding: 15px; border-radius: 8px; display: grid; gap: 10px;">
                            <div><strong>الاسم:</strong> ${customerName}</div>
                            <div><strong>رقم الجوال:</strong> <a href="tel:${customerPhone}" style="color: var(--primary);">${customerPhone}</a></div>
                            <div><strong>البريد الإلكتروني:</strong> ${customerEmail}</div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3 style="color: var(--primary); margin-bottom: 10px; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                            🗓️ تفاصيل الحجز
                        </h3>
                        <div style="background: var(--light); padding: 15px; border-radius: 8px; display: grid; gap: 10px;">
                            <div><strong>التاريخ:</strong> ${date}</div>
                            <div><strong>الوقت:</strong> ${time}</div>
                            <div><strong>الخدمة:</strong> ${serviceName}</div>
                            <div><strong>السعر:</strong> ${servicePrice} دج</div>
                            <div><strong>المدة:</strong> ${serviceDuration} دقيقة</div>
                            <div><strong>الموظف:</strong> ${employeeName}</div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3 style="color: var(--primary); margin-bottom: 10px; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                            📝 معلومات إضافية
                        </h3>
                        <div style="background: var(--light); padding: 15px; border-radius: 8px; display: grid; gap: 10px;">
                            <div><strong>الحالة:</strong> <span class="badge badge-${getStatusColor(appointment.status)}">${getStatusText(appointment.status)}</span></div>
                            <div><strong>الملاحظات:</strong> ${notes}</div>
                            <div><strong>تاريخ الحجز:</strong> ${createdAt}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">إغلاق</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function openAddAppointmentModal() {
    // TODO: Implement add appointment modal
    showToast('جاري العمل على هذه الميزة', 'info');
}

// ==================== Employees ====================
async function loadEmployees() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/employees?business=${NASSIM_BUSINESS_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        const employees = Array.isArray(result) ? result : (result.data || []);
        displayEmployees(employees);

    } catch (error) {
        console.error('Error loading employees:', error);
        showToast('حدث خطأ في تحميل الموظفين', 'error');
    }
}

function displayEmployees(employees) {
    const container = document.getElementById('employeesList');
    
    if (employees.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">👤</div><div class="empty-title">لا يوجد موظفين</div><button class="btn-primary" onclick="openAddEmployeeModal()">إضافة موظف</button></div>';
        return;
    }

    const html = employees.map(employee => `
        <div class="employee-card">
            <div class="employee-header">
                <img src="${employee.avatar || employee.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(employee.name) + '&background=FDB714&color=2C3E50&size=64'}" alt="${employee.name}" class="employee-avatar">
                <div class="employee-info">
                    <h3>${employee.name}</h3>
                    <div class="employee-role">${employee.role || 'حلاق'}</div>
                    <span class="employee-status ${employee.isAvailable ? 'available' : 'busy'}">
                        ${employee.isAvailable ? '✓ متاح' : '✗ مشغول'}
                    </span>
                </div>
            </div>
            
            ${employee.services && employee.services.length > 0 ? `
                <div class="employee-services">
                    <h4>الخدمات:</h4>
                    <div class="service-tags">
                        ${employee.services.map(service => `<span class="service-tag">${service.name}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="employee-actions">
                <button class="btn-icon" onclick="editEmployee('${employee._id}')" title="تعديل">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                </button>
                <button class="btn-icon" onclick="toggleEmployeeAvailability('${employee._id}', ${!employee.isAvailable})" title="${employee.isAvailable ? 'تعيين كمشغول' : 'تعيين كمتاح'}">
                    ${employee.isAvailable ? '⏸️' : '▶️'}
                </button>
                <button class="btn-icon" onclick="deleteEmployee('${employee._id}')" title="حذف" style="color: var(--danger);">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

async function toggleEmployeeAvailability(employeeId, isAvailable) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/employees/${employeeId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isAvailable })
        });

        if (!response.ok) throw new Error('Failed to update');

        showToast('تم تحديث حالة الموظف', 'success');
        loadEmployees();

    } catch (error) {
        console.error('Error updating employee:', error);
        showToast('حدث خطأ في التحديث', 'error');
    }
}

function openAddEmployeeModal() {
    const modal = createModal('إضافة موظف جديد', `
        <form id="addEmployeeForm">
            <div class="form-group">
                <label class="form-label">اسم الموظف *</label>
                <input type="text" class="form-input" name="name" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">رقم الهاتف</label>
                <input type="tel" class="form-input" name="phone">
            </div>
            
            <div class="form-group">
                <label class="form-label">البريد الإلكتروني</label>
                <input type="email" class="form-input" name="email">
            </div>

            <div class="form-group">
                <label class="form-label">كلمة المرور</label>
                <input type="password" class="form-input" name="password" placeholder="اتركها فارغة إذا لم ترد تعيين كلمة مرور">
            </div>
            
            <div class="form-group">
                <label class="form-label">صورة الموظف</label>
                <div class="image-upload-container">
                    <input type="file" id="employeeImageFile" class="file-input" accept="image/*" onchange="previewEmployeeImage(event)">
                    <label for="employeeImageFile" class="file-upload-btn">
                        📷 اختر صورة من الجهاز
                    </label>
                    <div id="employeeImagePreview" class="image-preview" style="display: none;">
                        <img id="employeePreviewImg" src="" alt="Preview">
                        <button type="button" class="remove-image-btn" onclick="removeEmployeeImage()">✕</button>
                    </div>
                    <small style="color: #666; display: block; margin-top: 8px;">أو أدخل رابط صورة:</small>
                    <input type="url" class="form-input" name="photoUrl" placeholder="https://..." style="margin-top: 8px;">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <input type="checkbox" name="isAvailable" checked>
                    <span>متاح للحجز</span>
                </label>
            </div>
        </form>
    `, [
        { text: 'إلغاء', class: 'btn-secondary', onclick: 'closeModal()' },
        { text: 'إضافة', class: 'btn-primary', onclick: 'submitAddEmployee()' }
    ]);
    
    showModal(modal);
}

async function submitAddEmployee() {
    const form = document.getElementById('addEmployeeForm');
    const formData = new FormData(form);
    
    try {
        // Upload image if selected
        let photoUrl = formData.get('photoUrl');
        if (selectedEmployeeImage) {
            showToast('جاري رفع الصورة...', 'info');
            photoUrl = await uploadImage(selectedEmployeeImage);
        }
        
        const employeeData = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            password: formData.get('password'),
            avatar: photoUrl || null,
            isAvailable: formData.get('isAvailable') === 'on',
            business: NASSIM_BUSINESS_ID
        };

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/employees`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(employeeData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to add employee');
        }

        showToast('تمت إضافة الموظف بنجاح', 'success');
        closeModal();
        loadEmployees();

    } catch (error) {
        console.error('Error adding employee:', error);
        showToast(error.message || 'حدث خطأ في إضافة الموظف', 'error');
    }
}

async function editEmployee(employeeId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/employees/${employeeId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        const employee = result.data || result;
        
        if (!employee) {
            showToast('الموظف غير موجود', 'error');
            return;
        }
        
        // Get all services for selection
        const servicesResponse = await fetch(`${API_URL}/services?business=${NASSIM_BUSINESS_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const servicesData = await servicesResponse.json();
        const services = Array.isArray(servicesData) ? servicesData : (servicesData.data || []);
        
        const servicesCheckboxes = services.map(service => `
            <label style="display: block; margin-bottom: 8px;">
                <input type="checkbox" name="services" value="${service._id}" 
                    ${employee.services && employee.services.some(s => (s._id || s) === service._id) ? 'checked' : ''}>
                <span>${service.name} (${service.price} دج)</span>
            </label>
        `).join('');
        
        const modal = createModal('تعديل الموظف', `
            <form id="editEmployeeForm">
                <input type="hidden" name="employeeId" value="${employee._id}">
                
                <div class="form-group">
                    <label class="form-label">اسم الموظف *</label>
                    <input type="text" class="form-input" name="name" required value="${employee.name}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">رقم الهاتف</label>
                    <input type="tel" class="form-input" name="phone" value="${employee.phone || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">البريد الإلكتروني</label>
                    <input type="email" class="form-input" name="email" value="${employee.email || ''}">
                </div>

                <div class="form-group">
                    <label class="form-label">كلمة المرور الجديدة</label>
                    <input type="password" class="form-input" name="password" placeholder="اتركها فارغة للاحتفاظ بكلمة المرور الحالية">
                </div>
                
                <div class="form-group">
                    <label class="form-label">الصورة (URL)</label>
                    <input type="url" class="form-input" name="photo" value="${employee.avatar || employee.photo || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">الخدمات التي يقدمها</label>
                    <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--gray-300); padding: 12px; border-radius: 8px;">
                        ${servicesCheckboxes}
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" name="isAvailable" ${employee.isAvailable !== false ? 'checked' : ''}>
                        <span>متاح للحجز</span>
                    </label>
                </div>
            </form>
        `, [
            { text: 'إلغاء', class: 'btn-secondary', onclick: 'closeModal()' },
            { text: 'حفظ', class: 'btn-primary', onclick: 'submitEditEmployee()' }
        ]);
        
        showModal(modal);
        
    } catch (error) {
        console.error('Error loading employee:', error);
        showToast('حدث خطأ في تحميل الموظف', 'error');
    }
}

async function submitEditEmployee() {
    const form = document.getElementById('editEmployeeForm');
    const formData = new FormData(form);
    const employeeId = formData.get('employeeId');
    
    // Get selected services
    const selectedServices = [];
    form.querySelectorAll('input[name="services"]:checked').forEach(checkbox => {
        selectedServices.push(checkbox.value);
    });
    
    const employeeData = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        avatar: formData.get('photo'),
        services: selectedServices,
        isAvailable: formData.get('isAvailable') === 'on'
    };

    const password = formData.get('password');
    if (password) {
        employeeData.password = password;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/employees/${employeeId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(employeeData)
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Failed to update employee');

        showToast('تم تحديث الموظف بنجاح', 'success');
        closeModal();
        loadEmployees();

    } catch (error) {
        console.error('Error updating employee:', error);
        showToast(error.message || 'حدث خطأ في تحديث الموظف', 'error');
    }
}

async function deleteEmployee(employeeId) {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/employees/${employeeId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message || 'فشل حذف الموظف', 'error');
            return;
        }

        showToast('تم حذف الموظف بنجاح', 'success');
        loadEmployees();

    } catch (error) {
        console.error('Error deleting employee:', error);
        showToast('حدث خطأ في حذف الموظف', 'error');
    }
}

// ==================== Services ====================
async function loadServices() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/services?business=${NASSIM_BUSINESS_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        const services = Array.isArray(result) ? result : (result.data || []);
        displayServices(services);

    } catch (error) {
        console.error('Error loading services:', error);
        showToast('حدث خطأ في تحميل الخدمات', 'error');
    }
}

function displayServices(services) {
    const container = document.getElementById('servicesList');
    
    if (services.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">✂️</div><div class="empty-title">لا توجد خدمات</div><button class="btn-primary" onclick="openAddServiceModal()">إضافة خدمة</button></div>';
        return;
    }

    const html = services.map(service => `
        <div class="service-card">
            <img src="${service.image || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300&h=180&fit=crop'}" 
                 alt="${service.name}" 
                 class="service-image" 
                 onerror="console.error('Failed to load image:', this.src); this.src='https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300&h=180&fit=crop';">
            <div class="service-content">
                <h3 class="service-title">
                    ${service.isPackage ? '📦 ' : ''}${service.name}
                    ${service.isPackage ? '<span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-right: 8px;">باقة</span>' : ''}
                </h3>
                <p class="service-description">${service.description || 'لا يوجد وصف'}</p>
                
                <div class="service-meta">
                    <span class="service-price">${service.priceMin && service.priceMax ? `من ${service.priceMin} إلى ${service.priceMax} دج` : `${service.price} دج`}</span>
                    <span class="service-duration">⏱️ ${service.duration || 30} دقيقة</span>
                </div>
                
                <div class="employee-actions" style="margin-top: 16px;">
                    <button class="btn-icon" onclick="editService('${service._id}')" title="تعديل">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="deleteService('${service._id}')" title="حذف" style="color: var(--danger);">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// Variants Management
let variantCounter = 0;

function toggleVariantsSection() {
    const checkbox = document.getElementById('hasVariantsCheckbox');
    const section = document.getElementById('variantsSection');
    
    if (checkbox.checked) {
        section.style.display = 'block';
        if (document.getElementById('variantsContainer').children.length === 0) {
            addVariantRow(); // Add first variant automatically
        }
    } else {
        section.style.display = 'none';
    }
}

function addVariantRow() {
    variantCounter++;
    const container = document.getElementById('variantsContainer');
    const row = document.createElement('div');
    row.className = 'variant-row';
    row.id = `variant-${variantCounter}`;
    row.style.cssText = 'background: #1A1A1A; padding: 15px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #2A2A2A;';
    
    row.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h5 style="color: #E9E9E9; margin: 0;">نوع ${variantCounter}</h5>
            <button type="button" onclick="removeVariantRow('variant-${variantCounter}')" style="background: transparent; border: none; color: #D9534F; cursor: pointer; font-size: 20px;">✕</button>
        </div>
        
        <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-size: 13px;">اسم النوع *</label>
            <input type="text" class="form-input variant-name" required placeholder="مثال: صبغة كاملة" style="background: #121212;">
        </div>
        
        <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-size: 13px;">وصف النوع</label>
            <input type="text" class="form-input variant-description" placeholder="وصف اختياري" style="background: #121212;">
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
                <label class="form-label" style="font-size: 13px;">السعر (دج) *</label>
                <input type="number" class="form-input variant-price" required min="0" placeholder="1000" style="background: #121212;">
            </div>
            <div class="form-group">
                <label class="form-label" style="font-size: 13px;">المدة (دقيقة) *</label>
                <input type="number" class="form-input variant-duration" required min="5" step="5" value="30" placeholder="30" style="background: #121212;">
            </div>
        </div>
    `;
    
    container.appendChild(row);
}

function removeVariantRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
    }
}

function getVariantsData() {
    const variants = [];
    const variantRows = document.querySelectorAll('.variant-row');
    
    variantRows.forEach(row => {
        const name = row.querySelector('.variant-name').value;
        const description = row.querySelector('.variant-description').value;
        const price = parseFloat(row.querySelector('.variant-price').value);
        const duration = parseInt(row.querySelector('.variant-duration').value);
        
        if (name && price && duration) {
            variants.push({
                name: name.trim(),
                description: description.trim(),
                price: price,
                duration: duration
            });
        }
    });
    
    return variants;
}

function openAddServiceModal() {
    const modal = createModal('إضافة خدمة جديدة', `
        <form id="addServiceForm">
            <div class="form-group">
                <label class="form-label">اسم الخدمة *</label>
                <input type="text" class="form-input" name="name" required placeholder="مثال: قص شعر عادي">
            </div>
            
            <div class="form-group">
                <label class="form-label">الوصف</label>
                <textarea class="form-input" name="description" rows="3" placeholder="وصف الخدمة (اختياري)"></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">السعر (دج) <span id="priceRequiredLabel">*</span></label>
                <input type="number" class="form-input" id="priceInput" name="price" min="0" placeholder="500">
                <small style="color: #666; font-size: 11px;">للسعر الثابت. أو استخدم نطاق السعر بالأسفل</small>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">السعر الأدنى (دج) - اختياري</label>
                    <input type="number" class="form-input" id="priceMinInput" name="priceMin" min="0" placeholder="400" onchange="togglePriceRequired()">
                    <small style="color: #999; font-size: 11px;">للخدمات ذات النطاق السعري المتغير</small>
                </div>
                <div class="form-group">
                    <label class="form-label">السعر الأعلى (دج) - اختياري</label>
                    <input type="number" class="form-input" id="priceMaxInput" name="priceMax" min="0" placeholder="700" onchange="togglePriceRequired()">
                    <small style="color: #999; font-size: 11px;">سيظهر "من X إلى Y دج" للزبائن</small>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">المدة (دقيقة) *</label>
                <input type="number" class="form-input" name="duration" required min="5" step="5" value="30" placeholder="30">
            </div>
            
            <div class="form-group">
                <label class="form-label">الفئة</label>
                <select class="form-input" name="category">
                    <option value="haircut">قص شعر</option>
                    <option value="beard">حلاقة لحية</option>
                    <option value="styling">تصفيف</option>
                    <option value="coloring">صبغة</option>
                    <option value="spa">عناية</option>
                    <option value="other">أخرى</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">صورة الخدمة</label>
                <div class="image-upload-container">
                    <input type="file" id="serviceImageFile" class="file-input" accept="image/*" onchange="previewServiceImage(event)">
                    <label for="serviceImageFile" class="file-upload-btn">
                        📷 اختر صورة من الجهاز
                    </label>
                    <div id="serviceImagePreview" class="image-preview" style="display: none;">
                        <img id="servicePreviewImg" src="" alt="Preview">
                        <button type="button" class="remove-image-btn" onclick="removeServiceImage()">✕</button>
                    </div>
                    <small style="color: #666; display: block; margin-top: 8px;">أو أدخل رابط صورة:</small>
                    <input type="url" class="form-input" name="imageUrl" placeholder="https://..." style="margin-top: 8px;">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <input type="checkbox" name="available" checked>
                    <span>متاحة للحجز</span>
                </label>
            </div>
            
            <div class="form-group" style="border-top: 2px solid #2A2A2A; padding-top: 20px; margin-top: 20px;">
                <label class="form-label">
                    <input type="checkbox" id="hasVariantsCheckbox" onchange="toggleVariantsSection()">
                    <span>هذه الخدمة لها أنواع فرعية متعددة (مثل: صبغة كاملة، صبغة جزئية...)</span>
                </label>
                <small style="color: #999; display: block; margin-top: 8px;">عند التفعيل، يمكن للزبون اختيار الخدمة العامة أو اختيار نوع محدد</small>
            </div>
            
            <div id="variantsSection" style="display: none; background: rgba(42, 42, 42, 0.5); padding: 20px; border-radius: 12px; margin-top: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="color: #CBA35C; margin: 0;">الأنواع الفرعية</h4>
                    <button type="button" class="btn-sm" onclick="addVariantRow()" style="background: #CBA35C; color: #121212; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        ➕ إضافة نوع
                    </button>
                </div>
                <div id="variantsContainer"></div>
            </div>
        </form>
    `, [
        { text: 'إلغاء', class: 'btn-secondary', onclick: 'closeModal()' },
        { text: 'إضافة', class: 'btn-primary', onclick: 'submitAddService()' }
    ]);
    
    showModal(modal);
}

async function submitAddService() {
    const form = document.getElementById('addServiceForm');
    const formData = new FormData(form);
    
    try {
        // Upload image if selected
        let imageUrl = formData.get('imageUrl');
        if (selectedServiceImage) {
            showToast('جاري رفع الصورة...', 'info');
            imageUrl = await uploadImage(selectedServiceImage);
            console.log('✅ Image uploaded successfully:', imageUrl);
        }
        
        const priceMin = formData.get('priceMin') ? parseFloat(formData.get('priceMin')) : null;
        const priceMax = formData.get('priceMax') ? parseFloat(formData.get('priceMax')) : null;
        const basePrice = formData.get('price') ? parseFloat(formData.get('price')) : null;
        
        // Validate: either price or price range must be provided
        if (!basePrice && (!priceMin || !priceMax)) {
            showToast('يجب إدخال السعر أو نطاق السعر (الأدنى والأعلى)', 'error');
            return;
        }
        
        const serviceData = {
            name: formData.get('name'),
            description: formData.get('description'),
            price: basePrice || (priceMin && priceMax ? Math.round((priceMin + priceMax) / 2) : 0),
            duration: parseInt(formData.get('duration')),
            category: formData.get('category'),
            image: imageUrl || null,
            available: formData.get('available') === 'on',
            business: NASSIM_BUSINESS_ID
        };
        
        // Add price range if both values are provided
        if (priceMin && priceMax) {
            serviceData.priceMin = priceMin;
            serviceData.priceMax = priceMax;
        }
        
        // Add variants if checkbox is checked
        const hasVariants = document.getElementById('hasVariantsCheckbox').checked;
        if (hasVariants) {
            const variants = getVariantsData();
            if (variants.length === 0) {
                showToast('يجب إضافة نوع فرعي واحد على الأقل', 'error');
                return;
            }
            serviceData.hasVariants = true;
            serviceData.variants = variants;
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/services`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(serviceData)
        });

        if (!response.ok) throw new Error('Failed to add service');

        showToast('تمت إضافة الخدمة بنجاح', 'success');
        closeModal();
        loadServices();

    } catch (error) {
        console.error('Error adding service:', error);
        showToast('حدث خطأ في إضافة الخدمة', 'error');
    }
}

async function editService(serviceId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/services/${serviceId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        const service = result.data || result;
        
        if (!service) {
            showToast('الخدمة غير موجودة', 'error');
            return;
        }
        
        const modal = createModal('تعديل الخدمة', `
            <form id="editServiceForm">
                <input type="hidden" name="serviceId" value="${service._id}">
                
                <div class="form-group">
                    <label class="form-label">اسم الخدمة *</label>
                    <input type="text" class="form-input" name="name" required value="${service.name}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">الوصف</label>
                    <textarea class="form-input" name="description" rows="3">${service.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">السعر (دج) <span id="editPriceRequiredLabel">*</span></label>
                    <input type="number" class="form-input" id="editPriceInput" name="price" min="0" value="${service.price || ''}">
                    <small style="color: #666; font-size: 11px;">للسعر الثابت. أو استخدم نطاق السعر بالأسفل</small>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">السعر الأدنى (دج) - اختياري</label>
                        <input type="number" class="form-input" id="editPriceMinInput" name="priceMin" min="0" value="${service.priceMin || ''}" placeholder="400" onchange="toggleEditPriceRequired()">
                        <small style="color: #999; font-size: 11px;">للخدمات ذات النطاق السعري المتغير</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">السعر الأعلى (دج) - اختياري</label>
                        <input type="number" class="form-input" id="editPriceMaxInput" name="priceMax" min="0" value="${service.priceMax || ''}" placeholder="700" onchange="toggleEditPriceRequired()">
                        <small style="color: #999; font-size: 11px;">سيظهر "من X إلى Y دج" للزبائن</small>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">المدة (دقيقة) *</label>
                    <input type="number" class="form-input" name="duration" required min="5" step="5" value="${service.duration || 30}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">الفئة</label>
                    <select class="form-input" name="category">
                        <option value="haircut" ${service.category === 'haircut' ? 'selected' : ''}>قص شعر</option>
                        <option value="beard" ${service.category === 'beard' ? 'selected' : ''}>حلاقة لحية</option>
                        <option value="styling" ${service.category === 'styling' ? 'selected' : ''}>تصفيف</option>
                        <option value="coloring" ${service.category === 'coloring' ? 'selected' : ''}>صبغة</option>
                        <option value="spa" ${service.category === 'spa' ? 'selected' : ''}>عناية</option>
                        <option value="other" ${service.category === 'other' ? 'selected' : ''}>أخرى</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">صورة الخدمة (URL)</label>
                    <input type="url" class="form-input" name="image" value="${service.image || ''}" placeholder="https://...">
                </div>
                
                <div class="form-group">
                    <label class="form-label">صورة الخدمة (URL)</label>
                    <input type="url" class="form-input" name="image" value="${service.image || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" name="available" ${service.available !== false ? 'checked' : ''}>
                        <span>متاحة للحجز</span>
                    </label>
                </div>
            </form>
        `, [
            { text: 'إلغاء', class: 'btn-secondary', onclick: 'closeModal()' },
            { text: 'حفظ', class: 'btn-primary', onclick: 'submitEditService()' }
        ]);
        
        showModal(modal);
        
    } catch (error) {
        console.error('Error loading service:', error);
        showToast('حدث خطأ في تحميل الخدمة', 'error');
    }
}

async function submitEditService() {
    const form = document.getElementById('editServiceForm');
    const formData = new FormData(form);
    const serviceId = formData.get('serviceId');
    
    const priceMinValue = formData.get('priceMin');
    const priceMaxValue = formData.get('priceMax');
    const basePrice = formData.get('price') ? parseFloat(formData.get('price')) : null;
    
    const priceMin = priceMinValue && priceMinValue.trim() !== '' ? parseFloat(priceMinValue) : 0;
    const priceMax = priceMaxValue && priceMaxValue.trim() !== '' ? parseFloat(priceMaxValue) : 0;
    
    // Validate: either price or price range must be provided
    if (!basePrice && (!priceMin || !priceMax)) {
        showToast('يجب إدخال السعر أو نطاق السعر (الأدنى والأعلى)', 'error');
        return;
    }
    
    const serviceData = {
        name: formData.get('name'),
        description: formData.get('description'),
        price: basePrice || (priceMin && priceMax ? Math.round((priceMin + priceMax) / 2) : 0),
        duration: parseInt(formData.get('duration')),
        category: formData.get('category'),
        image: formData.get('image'),
        available: formData.get('available') === 'on',
        priceMin: priceMin,
        priceMax: priceMax
    };

    try {
        console.log('Service data to update:', serviceData);
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/services/${serviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(serviceData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error response:', errorData);
            throw new Error(errorData.message || 'Failed to update service');
        }

        showToast('تم تحديث الخدمة بنجاح', 'success');
        closeModal();
        loadServices();

    } catch (error) {
        console.error('Error updating service:', error);
        showToast(error.message || 'حدث خطأ في تحديث الخدمة', 'error');
    }
}

// Open Add Package Modal
async function openAddPackageModal() {
    try {
        // Load all services first
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/services/public/by-business/${NASSIM_BUSINESS_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load services');
        }
        
        const result = await response.json();
        const allServices = result.data || result;
        
        if (!Array.isArray(allServices)) {
            throw new Error('Invalid services data');
        }
        
        // Filter out packages, only show individual services
        const individualServices = allServices.filter(s => !s.isPackage && s.available);
        
        const modal = createModal('إنشاء باقة خدمات 📦', `
            <form id="addPackageForm">
                <div class="form-group">
                    <label class="form-label">اسم الباقة *</label>
                    <input type="text" class="form-input" name="name" required placeholder="مثال: باقة الع روس الكاملة">
                </div>
                
                <div class="form-group">
                    <label class="form-label">الوصف</label>
                    <textarea class="form-input" name="description" rows="2" placeholder="وصف الباقة (اختياري)"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">الخدمات المضمنة في الباقة *</label>
                    <div style="max-height: 200px; overflow-y: auto; border: 2px solid var(--gray-300); border-radius: 8px; padding: 12px;">
                        ${individualServices.map(service => `
                            <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 4px;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background=''">
                                <input type="checkbox" name="packageServices" value="${service._id}" onchange="calculatePackageTotal()" style="margin-left: 8px;">
                                <span style="flex: 1;">${service.name}</span>
                                <span style="color: var(--primary); font-weight: 600;">${service.price} دج</span>
                            </label>
                        `).join('')}
                    </div>
                    <small style="color: #666; margin-top: 8px; display: block;">اختر الخدمات التي تريد تضمينها في الباقة</small>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">السعر الإجمالي للخدمات</label>
                        <input type="text" class="form-input" id="packageOriginalTotal" readonly style="background: #f5f5f5; font-weight: 600; color: var(--primary);" value="0 دج">
                    </div>
                    <div class="form-group">
                        <label class="form-label">سعر الباقة (بعد الخصم) *</label>
                        <input type="number" class="form-input" name="price" required min="0" placeholder="800">
                        <small style="color: #666; font-size: 11px;">السعر الخاص للباقة</small>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">المدة الإجمالية (دقيقة) *</label>
                    <input type="number" class="form-input" id="packageTotalDuration" name="duration" required min="5" step="5" value="0" readonly style="background: #f5f5f5;">
                    <small style="color: #666; font-size: 11px;">سيتم حسابها تلقائياً من الخدمات المختارة</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" name="available" checked>
                        <span>متاحة للحجز</span>
                    </label>
                </div>
                
                <input type="hidden" name="isPackage" value="true">
            </form>
        `, [
            { text: 'إلغاء', class: 'btn-secondary', onclick: 'closeModal()' },
            { text: 'إنشاء الباقة', class: 'btn-primary', onclick: 'submitAddPackage()' }
        ]);
        
        showModal(modal);
        
    } catch (error) {
        console.error('Error loading services:', error);
        showToast('حدث خطأ في تحميل الخدمات', 'error');
    }
}

// Calculate package total
window.calculatePackageTotal = async function() {
    const checkboxes = document.querySelectorAll('input[name="packageServices"]:checked');
    const serviceIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (serviceIds.length === 0) {
        document.getElementById('packageOriginalTotal').value = '0 دج';
        document.getElementById('packageTotalDuration').value = 0;
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/services/public/by-business/${NASSIM_BUSINESS_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load services');
        }
        
        const result = await response.json();
        const allServices = result.data || result;
        
        if (!Array.isArray(allServices)) {
            console.error('Invalid services data:', allServices);
            return;
        }
        
        let totalPrice = 0;
        let totalDuration = 0;
        
        serviceIds.forEach(id => {
            const service = allServices.find(s => s._id === id);
            if (service) {
                totalPrice += service.price || 0;
                totalDuration += service.duration || 0;
            }
        });
        
        document.getElementById('packageOriginalTotal').value = `${totalPrice} دج`;
        document.getElementById('packageTotalDuration').value = totalDuration;
        
    } catch (error) {
        console.error('Error calculating total:', error);
    }
};

// Submit Add Package
async function submitAddPackage() {
    const form = document.getElementById('addPackageForm');
    const formData = new FormData(form);
    
    const selectedServices = Array.from(document.querySelectorAll('input[name="packageServices"]:checked')).map(cb => cb.value);
    
    if (selectedServices.length < 2) {
        showToast('يجب اختيار خدمتين على الأقل لإنشاء باقة', 'error');
        return;
    }
    
    const packageData = {
        name: formData.get('name'),
        description: formData.get('description') || `باقة تشمل ${selectedServices.length} خدمات`,
        price: parseFloat(formData.get('price')),
        duration: parseInt(formData.get('duration')),
        category: 'other',
        available: formData.get('available') === 'on',
        business: NASSIM_BUSINESS_ID,
        isPackage: true,
        packageServices: selectedServices,
        showIndividualPrices: false
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/services`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(packageData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to add package');
        }

        showToast('تمت إضافة الباقة بنجاح ✨', 'success');
        closeModal();
        loadServices();

    } catch (error) {
        console.error('Error adding package:', error);
        showToast(error.message || 'حدث خطأ في إضافة الباقة', 'error');
    }
}

async function deleteService(serviceId) {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/services/${serviceId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to delete');

        showToast('تم حذف الخدمة بنجاح', 'success');
        loadServices();

    } catch (error) {
        console.error('Error deleting service:', error);
        showToast('حدث خطأ في حذف الخدمة', 'error');
    }
}

// ==================== Posts ====================
async function loadPosts() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/posts?business=${NASSIM_BUSINESS_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        const posts = Array.isArray(result) ? result : (result.data || []);
        displayPosts(posts);

    } catch (error) {
        console.error('Error loading posts:', error);
        showToast('حدث خطأ في تحميل المنشورات', 'error');
    }
}

function displayPosts(posts) {
    const container = document.getElementById('postsList');
    
    if (posts.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📢</div><div class="empty-title">لا توجد منشورات</div><button class="btn-primary" onclick="openAddPostModal()">إضافة منشور</button></div>';
        return;
    }

    const html = posts.map(post => `
        <div class="post-card">
            <div class="post-header">
                <div>
                    <span class="post-type ${post.type}">${getPostTypeText(post.type)}</span>
                    <h3 class="post-title">${post.title}</h3>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-icon" onclick="editPost('${post._id}')" title="تعديل">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="deletePost('${post._id}')" title="حذف" style="color: var(--danger);">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <p class="post-content">${post.content}</p>
            
            <div class="post-footer">
                <span class="post-date">${formatDate(post.createdAt)}</span>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <span>❤️ ${post.likes?.length || 0}</span>
                    <span>💬 ${post.comments?.length || 0}</span>
                    ${post.expiresAt ? `<span style="color: var(--warning);">⏰ ينتهي ${formatDate(post.expiresAt)}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

function openAddPostModal() {
    const modal = createModal('منشور جديد', `
        <form id="addPostForm">
            <div class="form-group">
                <label class="form-label">نوع المنشور *</label>
                <select class="form-input" name="type" required>
                    <option value="announcement">إعلان</option>
                    <option value="offer">عرض خاص</option>
                    <option value="update">تحديث</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">العنوان *</label>
                <input type="text" class="form-input" name="title" required placeholder="عنوان المنشور">
            </div>
            
            <div class="form-group">
                <label class="form-label">المحتوى *</label>
                <textarea class="form-input" name="content" rows="5" required placeholder="اكتب محتوى المنشور هنا..."></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">صورة المنشور (اختياري)</label>
                <div class="image-upload-container">
                    <input type="file" id="postImageFile" class="file-input" accept="image/*" onchange="previewPostImage(event)">
                    <label for="postImageFile" class="file-upload-btn">
                        📷 اختر صورة من الجهاز
                    </label>
                    <div id="postImagePreview" class="image-preview" style="display: none;">
                        <img id="postPreviewImg" src="" alt="Preview">
                        <button type="button" class="remove-image-btn" onclick="removePostImage()">✕</button>
                    </div>
                    <small style="color: #666; display: block; margin-top: 8px;">أو أدخل رابط صورة:</small>
                    <input type="url" class="form-input" name="imageUrl" placeholder="https://..." style="margin-top: 8px;">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">تاريخ انتهاء الصلاحية (اختياري)</label>
                <input type="datetime-local" class="form-input" name="expiresAt">
                <small class="form-hint">اترك فارغاً إذا لم يكن هناك تاريخ انتهاء</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <input type="checkbox" name="isActive" checked>
                    <span>نشر المنشور مباشرة</span>
                </label>
            </div>
        </form>
    `, [
        { text: 'إلغاء', class: 'btn-secondary', onclick: 'closeModal()' },
        { text: 'نشر', class: 'btn-primary', onclick: 'submitAddPost()' }
    ]);
    
    showModal(modal);
}

async function submitAddPost() {
    const form = document.getElementById('addPostForm');
    const formData = new FormData(form);
    
    try {
        // Upload image if selected
        let imageUrl = formData.get('imageUrl');
        if (selectedPostImage) {
            showToast('جاري رفع الصورة...', 'info');
            imageUrl = await uploadImage(selectedPostImage);
        }
        
        const postData = {
            type: formData.get('type'),
            title: formData.get('title'),
            content: formData.get('content'),
            image: imageUrl || null,
            expiresAt: formData.get('expiresAt') || null,
            isActive: formData.get('isActive') === 'on',
            business: NASSIM_BUSINESS_ID
        };

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) throw new Error('Failed to add post');

        showToast('تمت إضافة المنشور بنجاح', 'success');
        closeModal();
        loadPosts();

    } catch (error) {
        console.error('Error adding post:', error);
        showToast('حدث خطأ في إضافة المنشور', 'error');
    }
}

async function editPost(postId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        const post = result.data || result;
        
        if (!post) {
            showToast('المنشور غير موجود', 'error');
            return;
        }
        
        const expiresAtValue = post.expiresAt ? new Date(post.expiresAt).toISOString().slice(0, 16) : '';
        
        const modal = createModal('تعديل المنشور', `
            <form id="editPostForm">
                <input type="hidden" name="postId" value="${post._id}">
                
                <div class="form-group">
                    <label class="form-label">نوع المنشور *</label>
                    <select class="form-input" name="type" required>
                        <option value="announcement" ${post.type === 'announcement' ? 'selected' : ''}>إعلان</option>
                        <option value="offer" ${post.type === 'offer' ? 'selected' : ''}>عرض خاص</option>
                        <option value="update" ${post.type === 'update' ? 'selected' : ''}>تحديث</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">العنوان *</label>
                    <input type="text" class="form-input" name="title" required value="${post.title}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">المحتوى *</label>
                    <textarea class="form-input" name="content" rows="5" required>${post.content}</textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">صورة المنشور (URL - اختياري)</label>
                    <input type="url" class="form-input" name="image" value="${post.image || ''}" placeholder="https://...">
                    <small class="form-hint">أضف رابط صورة لعرضها مع المنشور</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">تاريخ انتهاء الصلاحية (اختياري)</label>
                    <input type="datetime-local" class="form-input" name="expiresAt" value="${expiresAtValue}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" name="isActive" ${post.isActive !== false ? 'checked' : ''}>
                        <span>المنشور نشط</span>
                    </label>
                </div>
            </form>
        `, [
            { text: 'إلغاء', class: 'btn-secondary', onclick: 'closeModal()' },
            { text: 'حفظ', class: 'btn-primary', onclick: 'submitEditPost()' }
        ]);
        
        showModal(modal);
        
    } catch (error) {
        console.error('Error loading post:', error);
        showToast('حدث خطأ في تحميل المنشور', 'error');
    }
}

async function submitEditPost() {
    const form = document.getElementById('editPostForm');
    const formData = new FormData(form);
    const postId = formData.get('postId');
    
    const postData = {
        type: formData.get('type'),
        title: formData.get('title'),
        content: formData.get('content'),
        image: formData.get('image') || null,
        expiresAt: formData.get('expiresAt') || null,
        isActive: formData.get('isActive') === 'on'
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) throw new Error('Failed to update post');

        showToast('تم تحديث المنشور بنجاح', 'success');
        closeModal();
        loadPosts();

    } catch (error) {
        console.error('Error updating post:', error);
        showToast('حدث خطأ في تحديث المنشور', 'error');
    }
}

async function deletePost(postId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to delete');

        showToast('تم حذف المنشور بنجاح', 'success');
        loadPosts();

    } catch (error) {
        console.error('Error deleting post:', error);
        showToast('حدث خطأ في حذف المنشور', 'error');
    }
}

// ==================== Rewards ====================
async function loadRewards() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/rewards?business=${NASSIM_BUSINESS_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        const rewards = Array.isArray(result) ? result : (result.data || []);
        const rewardItems = rewards.filter(item => !isProductItem(item));
        displayRewards(rewardItems);

    } catch (error) {
        console.error('Error loading rewards:', error);
        showToast('حدث خطأ في تحميل المكافآت', 'error');
    }
}

function displayRewards(rewards) {
    const container = document.getElementById('rewardsList');
    
    if (rewards.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎁</div><div class="empty-title">لا توجد مكافآت</div><button class="btn-primary" onclick="openAddRewardModal()">إضافة مكافأة</button></div>';
        return;
    }

    const html = rewards.map(reward => `
        <div class="reward-card">
            <span class="reward-badge">${reward.pointsCost} نقطة</span>
            
            <div class="reward-icon">${reward.icon || '🎁'}</div>
            
            <h3 class="reward-title">${reward.name}</h3>
            <p class="reward-description">${reward.description}</p>
            
            ${reward.quantityLimit ? `<div style="text-align: center; color: var(--gray-600); font-size: 14px; margin-bottom: 12px;">المتاح: ${reward.quantityRemaining || 0} / ${reward.quantityLimit}</div>` : ''}
            
            <div style="display: flex; gap: 8px; justify-content: center;">
                <button class="btn-icon" onclick="editReward('${reward._id}')" title="تعديل">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                </button>
                <button class="btn-icon" onclick="toggleRewardStatus('${reward._id}', ${!reward.isActive})" title="${reward.isActive ? 'إيقاف' : 'تفعيل'}">
                    ${reward.isActive ? '⏸️' : '▶️'}
                </button>
                <button class="btn-icon" onclick="deleteReward('${reward._id}')" title="حذف" style="color: var(--danger);">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

function openAddRewardModal() {
    const modal = createModal('مكافأة جديدة', `
        <form id="addRewardForm">
            <div class="form-group">
                <label class="form-label">اسم المكافأة *</label>
                <input type="text" class="form-input" name="name" required placeholder="مثال: حلاقة مجانية">
            </div>
            
            <div class="form-group">
                <label class="form-label">الوصف *</label>
                <textarea class="form-input" name="description" rows="3" required placeholder="وصف المكافأة"></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">الأيقونة (emoji)</label>
                <input type="text" class="form-input" name="icon" placeholder="🎁" maxlength="2">
            </div>
            
            <div class="form-group">
                <label class="form-label">عدد النقاط المطلوبة *</label>
                <input type="number" class="form-input" name="pointsCost" required min="1" placeholder="100">
            </div>
            
            <div class="form-group">
                <label class="form-label">الكمية المتاحة (اختياري)</label>
                <input type="number" class="form-input" name="quantityLimit" min="0" placeholder="اترك فارغاً للكمية غير المحدودة">
            </div>
            
            <div class="form-group">
                <label class="form-label">صورة المكافأة (اختياري)</label>
                <div class="image-upload-container">
                    <input type="file" id="rewardImageFile" class="file-input" accept="image/*" onchange="previewRewardImage(event)">
                    <label for="rewardImageFile" class="file-upload-btn">
                        📷 اختر صورة من الجهاز
                    </label>
                    <div id="rewardImagePreview" class="image-preview" style="display: none;">
                        <img id="rewardPreviewImg" src="" alt="Preview">
                        <button type="button" class="remove-image-btn" onclick="removeRewardImage()">✕</button>
                    </div>
                    <small style="color: #666; display: block; margin-top: 8px;">أو أدخل رابط صورة:</small>
                    <input type="url" class="form-input" name="imageUrl" placeholder="https://..." style="margin-top: 8px;">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <input type="checkbox" name="isActive" checked>
                    <span>مكافأة نشطة</span>
                </label>
            </div>
        </form>
    `, [
        { text: 'إلغاء', class: 'btn-secondary', onclick: 'closeModal()' },
        { text: 'إضافة', class: 'btn-primary', onclick: 'submitAddReward()' }
    ]);
    
    showModal(modal);
}

async function submitAddReward() {
    const form = document.getElementById('addRewardForm');
    const formData = new FormData(form);
    
    try {
        // Upload image if selected
        let imageUrl = formData.get('imageUrl');
        if (selectedRewardImage) {
            showToast('جاري رفع الصورة...', 'info');
            imageUrl = await uploadImage(selectedRewardImage);
        }
        
        const rewardData = {
            name: formData.get('name'),
            description: formData.get('description'),
            icon: formData.get('icon') || '🎁',
            image: imageUrl || null,
            pointsCost: parseInt(formData.get('pointsCost')),
            quantityLimit: formData.get('quantityLimit') ? parseInt(formData.get('quantityLimit')) : null,
            isActive: formData.get('isActive') === 'on',
            business: NASSIM_BUSINESS_ID
        };

        if (rewardData.quantityLimit) {
            rewardData.quantityRemaining = rewardData.quantityLimit;
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/rewards`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rewardData)
        });

        if (!response.ok) throw new Error('Failed to add reward');

        showToast('تمت إضافة المكافأة بنجاح', 'success');
        closeModal();
        loadRewards();

    } catch (error) {
        console.error('Error adding reward:', error);
        showToast('حدث خطأ في إضافة المكافأة', 'error');
    }
}

async function toggleRewardStatus(rewardId, isActive) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/rewards/${rewardId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isActive })
        });

        if (!response.ok) throw new Error('Failed to update');

        showToast('تم تحديث حالة المكافأة', 'success');
        loadRewards();

    } catch (error) {
        console.error('Error updating reward:', error);
        showToast('حدث خطأ في التحديث', 'error');
    }
}

async function editReward(rewardId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/rewards/${rewardId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        const reward = result.data || result;
        
        if (!reward) {
            showToast('المكافأة غير موجودة', 'error');
            return;
        }
        
        const modal = createModal('تعديل المكافأة', `
            <form id="editRewardForm">
                <input type="hidden" name="rewardId" value="${reward._id}">
                
                <div class="form-group">
                    <label class="form-label">اسم المكافأة *</label>
                    <input type="text" class="form-input" name="name" required value="${reward.name}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">الوصف *</label>
                    <textarea class="form-input" name="description" rows="3" required>${reward.description}</textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">الأيقونة (emoji)</label>
                    <input type="text" class="form-input" name="icon" maxlength="2" value="${reward.icon || '🎁'}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">عدد النقاط المطلوبة *</label>
                    <input type="number" class="form-input" name="pointsCost" required min="1" value="${reward.pointsCost}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">الكمية المتاحة (اختياري)</label>
                    <input type="number" class="form-input" name="quantityLimit" min="0" value="${reward.quantityLimit || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">صورة المكافأة (URL - اختياري)</label>
                    <input type="url" class="form-input" name="image" value="${reward.image || ''}" placeholder="https://...">
                    <small class="form-hint">أضف رابط صورة لعرضها مع المكافأة</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" name="isActive" ${reward.isActive !== false ? 'checked' : ''}>
                        <span>مكافأة نشطة</span>
                    </label>
                </div>
            </form>
        `, [
            { text: 'إلغاء', class: 'btn-secondary', onclick: 'closeModal()' },
            { text: 'حفظ', class: 'btn-primary', onclick: 'submitEditReward()' }
        ]);
        
        showModal(modal);
        
    } catch (error) {
        console.error('Error loading reward:', error);
        showToast('حدث خطأ في تحميل المكافأة', 'error');
    }
}

async function submitEditReward() {
    const form = document.getElementById('editRewardForm');
    const formData = new FormData(form);
    const rewardId = formData.get('rewardId');
    
    const rewardData = {
        name: formData.get('name'),
        description: formData.get('description'),
        icon: formData.get('icon') || '🎁',
        image: formData.get('image') || null,
        pointsCost: parseInt(formData.get('pointsCost')),
        quantityLimit: formData.get('quantityLimit') ? parseInt(formData.get('quantityLimit')) : null,
        isActive: formData.get('isActive') === 'on'
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/rewards/${rewardId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rewardData)
        });

        if (!response.ok) throw new Error('Failed to update reward');

        showToast('تم تحديث المكافأة بنجاح', 'success');
        closeModal();
        loadRewards();

    } catch (error) {
        console.error('Error updating reward:', error);
        showToast('حدث خطأ في تحديث المكافأة', 'error');
    }
}

async function deleteReward(rewardId) {
    if (!confirm('هل أنت متأكد من حذف هذه المكافأة؟')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/rewards/${rewardId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to delete');

        showToast('تم حذف المكافأة بنجاح', 'success');
        loadRewards();

    } catch (error) {
        console.error('Error deleting reward:', error);
        showToast('حدث خطأ في حذف المكافأة', 'error');
    }
}

// ==================== Products ====================
// Note: Using rewards API with type='product' until products endpoint is available
async function loadProducts() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/rewards?business=${NASSIM_BUSINESS_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        const rewards = Array.isArray(result) ? result : (result.data || []);
        const products = rewards.filter(item => isProductItem(item));
        displayProducts(products);

    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('productsList').innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">فشل تحميل المنتجات</div></div>';
    }
}

function displayProducts(products) {
    const container = document.getElementById('productsList');

    if (!products || products.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">لا توجد منتجات</div><button class="btn-primary" onclick="openAddProductModal()">إضافة منتج</button></div>';
        return;
    }

    container.innerHTML = products.map(product => {
        const price = product.pointsCost || 0;
        const quantity = product.metadata?.stock;
        const categorySlug = product.metadata?.category;
        const category = formatProductCategory(categorySlug);

        return `
        <div class="reward-card">
            ${product.image ? `<img src="${product.image}" alt="${product.name}" class="reward-image">` : '<div class="reward-image-placeholder">📦</div>'}
            <div class="reward-content">
                <h3 class="reward-title">${product.name}</h3>
                <p class="reward-description">${product.description || ''}</p>
                <div class="reward-price">${price} دج</div>
                ${quantity !== undefined && quantity !== null ? `<div class="product-stock">المخزون المتوفر: ${quantity}</div>` : ''}
                ${category ? `<div class="product-stock">الفئة: ${category}</div>` : ''}
            </div>
            <div class="reward-actions">
                <button class="btn-icon" onclick="openEditProductModal('${product._id}')" title="تعديل">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                </button>
                <button class="btn-icon btn-danger" onclick="deleteProduct('${product._id}')" title="حذف">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>
        `;
    }).join('');
}

function openAddProductModal() {
    const modal = createModal('إضافة منتج جديد', `
        <form id="addProductForm">
            <div class="form-group">
                <label class="form-label">اسم المنتج *</label>
                <input type="text" class="form-input" name="name" required placeholder="مثال: شامبو للشعر">
            </div>
            
            <div class="form-group">
                <label class="form-label">الوصف</label>
                <textarea class="form-input" name="description" rows="3" placeholder="وصف المنتج"></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">السعر (دج) *</label>
                <input type="number" class="form-input" name="price" required min="0" placeholder="1000">
            </div>
            
            <div class="form-group">
                <label class="form-label">المخزون</label>
                <input type="number" class="form-input" name="stock" min="0" value="0" placeholder="10">
            </div>
            
            <div class="form-group">
                <label class="form-label">الفئة</label>
                <select class="form-input" name="category">
                    <option value="hair-care">عناية بالشعر</option>
                    <option value="beard-care">عناية باللحية</option>
                    <option value="styling">تصفيف</option>
                    <option value="tools">أدوات</option>
                    <option value="other">أخرى</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">صورة المنتج</label>
                <div class="image-upload-container">
                    <input type="file" id="productImageFile" class="file-input" accept="image/*" onchange="previewProductImage(event)">
                    <label for="productImageFile" class="file-upload-btn">
                        📷 اختر صورة من الجهاز
                    </label>
                    <div id="productImagePreview" class="image-preview" style="display: none;">
                        <img id="productPreviewImg" src="" alt="Preview">
                        <button type="button" class="remove-image-btn" onclick="removeProductImage()">✕</button>
                    </div>
                    <small style="color: #666; display: block; margin-top: 8px;">أو أدخل رابط صورة:</small>
                    <input type="url" class="form-input" name="image" placeholder="https://..." style="margin-top: 8px;">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <input type="checkbox" name="isAvailable" checked>
                    <span>متاح للبيع</span>
                </label>
            </div>
        </form>
    `, [
        { text: 'إلغاء', class: 'btn-secondary', onclick: 'closeModal()' },
        { text: 'إضافة', class: 'btn-primary', onclick: 'submitAddProduct()' }
    ]);

    showModal(modal);
}

async function submitAddProduct() {
    const form = document.getElementById('addProductForm');
    const formData = new FormData(form);

    try {
        // Upload image if selected
        let image = formData.get('image');
        if (selectedProductImage) {
            showToast('جاري رفع الصورة...', 'info');
            image = await uploadImage(selectedProductImage);
        }

        const priceValue = parseInt(formData.get('price'), 10) || 0;
        const stockValue = formData.get('stock') ? parseInt(formData.get('stock'), 10) : null;
        const categoryValue = formData.get('category');
        const baseDescription = formData.get('description') || 'منتج';

        // Using rewards API - store product as 'gift' type with metadata
        const productData = {
            business: NASSIM_BUSINESS_ID,
            name: formData.get('name'),
            description: baseDescription,
            icon: '🛍️',
            image: image || null,
            pointsCost: priceValue,
            type: 'gift',
            value: priceValue,
            isActive: formData.get('isAvailable') === 'on',
            metadata: {
                isProduct: true,
                category: categoryValue,
                stock: stockValue
            }
        };

        if (!categoryValue) {
            delete productData.metadata.category;
        }
        if (stockValue === null || stockValue === undefined) {
            delete productData.metadata.stock;
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/rewards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) throw new Error('Failed to add product');

        showToast('تم إضافة المنتج بنجاح', 'success');
        selectedProductImage = null;
        closeModal();
        loadProducts();

    } catch (error) {
        console.error('Error adding product:', error);
        showToast('حدث خطأ في إضافة المنتج', 'error');
    }
}

async function openEditProductModal(productId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/rewards/${productId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        const product = result.data || result;
        const priceValue = product.pointsCost || 0;
        const stockValue = product.metadata?.stock ?? '';
        const categoryValue = product.metadata?.category || '';

        const modal = createModal('تعديل المنتج', `
            <form id="editProductForm">
                <input type="hidden" name="productId" value="${product._id}">
                
                <div class="form-group">
                    <label class="form-label">اسم المنتج *</label>
                    <input type="text" class="form-input" name="name" value="${product.name}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">الوصف</label>
                    <textarea class="form-input" name="description" rows="3">${product.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">السعر (دج) *</label>
                    <input type="number" class="form-input" name="price" value="${priceValue}" required min="0">
                </div>
                
                <div class="form-group">
                    <label class="form-label">المخزون</label>
                    <input type="number" class="form-input" name="stock" value="${stockValue}" min="0">
                </div>
                
                <div class="form-group">
                    <label class="form-label">الفئة</label>
                    <select class="form-input" name="category">
                        <option value="hair-care" ${categoryValue === 'hair-care' ? 'selected' : ''}>عناية بالشعر</option>
                        <option value="beard-care" ${categoryValue === 'beard-care' ? 'selected' : ''}>عناية باللحية</option>
                        <option value="styling" ${categoryValue === 'styling' ? 'selected' : ''}>تصفيف</option>
                        <option value="tools" ${categoryValue === 'tools' ? 'selected' : ''}>أدوات</option>
                        <option value="other" ${categoryValue === 'other' ? 'selected' : ''}>أخرى</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">صورة المنتج</label>
                    <div class="image-upload-container">
                        ${product.image ? `<div class="current-image"><img src="${product.image}" alt="Current" style="max-width: 200px; border-radius: 8px;"></div>` : ''}
                        <input type="file" id="editProductImageFile" class="file-input" accept="image/*" onchange="previewProductImage(event)">
                        <label for="editProductImageFile" class="file-upload-btn">
                            📷 ${product.image ? 'تغيير الصورة' : 'اختر صورة'}
                        </label>
                        <div id="productImagePreview" class="image-preview" style="display: none;">
                            <img id="productPreviewImg" src="" alt="Preview">
                            <button type="button" class="remove-image-btn" onclick="removeProductImage()">✕</button>
                        </div>
                        <small style="color: #666; display: block; margin-top: 8px;">أو أدخل رابط صورة:</small>
                        <input type="url" class="form-input" name="image" value="${product.image || ''}" placeholder="https://..." style="margin-top: 8px;">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" name="isAvailable" ${product.isActive !== false ? 'checked' : ''}>
                        <span>متاح للبيع</span>
                    </label>
                </div>
            </form>
        `, [
            { text: 'إلغاء', class: 'btn-secondary', onclick: 'closeModal()' },
            { text: 'حفظ التغييرات', class: 'btn-primary', onclick: 'submitEditProduct()' }
        ]);

        showModal(modal);

    } catch (error) {
        console.error('Error loading product:', error);
        showToast('حدث خطأ في تحميل بيانات المنتج', 'error');
    }
}

async function submitEditProduct() {
    const form = document.getElementById('editProductForm');
    const formData = new FormData(form);
    const productId = formData.get('productId');

    try {
        // Upload image if selected
        let image = formData.get('image');
        if (selectedProductImage) {
            showToast('جاري رفع الصورة...', 'info');
            image = await uploadImage(selectedProductImage);
        }

        const priceValue = parseInt(formData.get('price'), 10) || 0;
        const stockValue = formData.get('stock') ? parseInt(formData.get('stock'), 10) : null;
        const categoryValue = formData.get('category');
        const baseDescription = formData.get('description') || 'منتج';

        // Using rewards API - store product as 'gift' type with metadata
        const productData = {
            name: formData.get('name'),
            description: baseDescription,
            icon: '🛍️',
            image: image || null,
            pointsCost: priceValue,
            type: 'gift',
            value: priceValue,
            isActive: formData.get('isAvailable') === 'on',
            metadata: {
                isProduct: true,
                category: categoryValue,
                stock: stockValue
            }
        };

        if (!categoryValue) {
            delete productData.metadata.category;
        }
        if (stockValue === null || stockValue === undefined) {
            delete productData.metadata.stock;
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/rewards/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) throw new Error('Failed to update product');

        showToast('تم تحديث المنتج بنجاح', 'success');
        selectedProductImage = null;
        closeModal();
        loadProducts();

    } catch (error) {
        console.error('Error updating product:', error);
        showToast('حدث خطأ في تحديث المنتج', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/rewards/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to delete');

        showToast('تم حذف المنتج بنجاح', 'success');
        loadProducts();

    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('حدث خطأ في حذف المنتج', 'error');
    }
}

// ==================== Customers ====================
async function loadCustomers() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/customers/business/${NASSIM_BUSINESS_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        const customers = Array.isArray(result) ? result : (result.data || []);
        displayCustomers(customers);

    } catch (error) {
        console.error('Error loading customers:', error);
        showToast('حدث خطأ في تحميل العملاء', 'error');
    }
}

function displayCustomers(customers) {
    const container = document.getElementById('customersList');
    
    if (customers.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">لا يوجد عملاء</div></div>';
        return;
    }

    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>الاسم</th>
                    <th>البريد الإلكتروني</th>
                    <th>رقم الهاتف</th>
                    <th>نقاط الولاء</th>
                    <th>المواعيد</th>
                    <th>تاريخ التسجيل</th>
                </tr>
            </thead>
            <tbody>
                ${customers.map(customer => `
                    <tr>
                        <td>${customer.name}</td>
                        <td>${customer.email || '-'}</td>
                        <td>${customer.phone || '-'}</td>
                        <td><span class="badge badge-warning">${customer.loyaltyPoints || 0} نقطة</span></td>
                        <td>${customer.appointmentsCount || 0}</td>
                        <td>${formatDate(customer.createdAt)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// ==================== Reminders Settings ====================
async function loadReminderSettings() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/settings/reminders/${NASSIM_BUSINESS_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const settings = await response.json();
            
            // Fill form with settings
            document.getElementById('enableReminders').checked = settings.enabled !== false;
            document.getElementById('reminderInterval').value = settings.intervalDays || 14;
            document.getElementById('reminderTime').value = settings.sendTime || '10:00';
            document.getElementById('reminderMessage').value = settings.message || 'مرحباً {name}، حان وقت حلاقتك التالية! احجز موعدك الآن في Nassim Barber ✂️';
        }

    } catch (error) {
        console.error('Error loading reminder settings:', error);
    }
}

async function saveReminderSettings() {
    const settings = {
        enabled: document.getElementById('enableReminders').checked,
        intervalDays: parseInt(document.getElementById('reminderInterval').value),
        sendTime: document.getElementById('reminderTime').value,
        message: document.getElementById('reminderMessage').value,
        business: NASSIM_BUSINESS_ID
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/settings/reminders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) throw new Error('Failed to save settings');

        showToast('تم حفظ إعدادات التنبيهات بنجاح', 'success');

    } catch (error) {
        console.error('Error saving reminder settings:', error);
        showToast('حدث خطأ في حفظ الإعدادات', 'error');
    }
}

async function loadRecentReminders() {
    // TODO: Load recently sent reminders
    const container = document.getElementById('recentRemindersList');
    container.innerHTML = '<div class="empty-state"><div class="empty-text">لا توجد تنبيهات مرسلة مؤخراً</div></div>';
}

// ==================== Utilities ====================
function formatDateForInput(date) {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
}

function formatDateTime(dateString, timeString) {
    if (timeString) {
        // Separate date and time fields
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('ar-DZ', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        return `${formattedDate} - ${timeString}`;
    }
    // Single dateTime field
    const date = new Date(dateString);
    return date.toLocaleString('ar-DZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-DZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-DZ', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function cleanObject(obj) {
    if (Array.isArray(obj)) {
        return obj
            .map(item => (typeof item === 'string' ? item.trim() : item))
            .filter(item => item !== undefined && item !== null && !(typeof item === 'string' && item === ''));
    }

    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    const cleaned = {};
    Object.keys(obj).forEach(key => {
        const value = obj[key];

        if (value === undefined || value === null) {
            return;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed !== '') {
                cleaned[key] = trimmed;
            }
            return;
        }

        if (Array.isArray(value)) {
            const arrayValue = cleanObject(value);
            if (arrayValue.length > 0) {
                cleaned[key] = arrayValue;
            }
            return;
        }

        if (typeof value === 'object') {
            const nested = cleanObject(value);
            if (nested && Object.keys(nested).length > 0) {
                cleaned[key] = nested;
            }
            return;
        }

        cleaned[key] = value;
    });

    return cleaned;
}

function getStatusColor(status) {
    const colors = {
        pending: 'warning',
        confirmed: 'info',
        completed: 'success',
        cancelled: 'danger'
    };
    return colors[status] || 'info';
}

function getStatusText(status) {
    const texts = {
        pending: 'قيد الانتظار',
        confirmed: 'مؤكد',
        completed: 'مكتمل',
        cancelled: 'ملغي'
    };
    return texts[status] || status;
}

function getPostTypeText(type) {
    const texts = {
        announcement: '📢 إعلان',
        offer: '🎉 عرض خاص',
        update: '📝 تحديث'
    };
    return texts[type] || type;
}

// ==================== Modal System ====================
function createModal(title, body, buttons) {
    return `
        <div class="modal-overlay" onclick="event.target === this && closeModal()">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    ${body}
                </div>
                <div class="modal-footer">
                    ${buttons.map(btn => `<button class="${btn.class}" onclick="${btn.onclick}">${btn.text}</button>`).join('')}
                </div>
            </div>
        </div>
    `;
}

function showModal(modalHTML) {
    const container = document.getElementById('modalContainer');
    container.innerHTML = modalHTML;
}

function closeModal() {
    const container = document.getElementById('modalContainer');
    container.innerHTML = '';
}

// ==================== Image Upload Functions ====================
let selectedServiceImage = null;
let selectedPostImage = null;
let selectedRewardImage = null;
let selectedEmployeeImage = null;
let selectedProductImage = null;
let selectedCompletionImage = null;

function previewServiceImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('الرجاء اختيار صورة فقط', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error');
        return;
    }
    
    selectedServiceImage = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('servicePreviewImg').src = e.target.result;
        document.getElementById('serviceImagePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removeServiceImage() {
    selectedServiceImage = null;
    document.getElementById('serviceImageFile').value = '';
    document.getElementById('serviceImagePreview').style.display = 'none';
}

function previewPostImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('الرجاء اختيار صورة فقط', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error');
        return;
    }
    
    selectedPostImage = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('postPreviewImg').src = e.target.result;
        document.getElementById('postImagePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removePostImage() {
    selectedPostImage = null;
    document.getElementById('postImageFile').value = '';
    document.getElementById('postImagePreview').style.display = 'none';
}

function previewRewardImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('الرجاء اختيار صورة فقط', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error');
        return;
    }
    
    selectedRewardImage = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('rewardPreviewImg').src = e.target.result;
        document.getElementById('rewardImagePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removeRewardImage() {
    selectedRewardImage = null;
    document.getElementById('rewardImageFile').value = '';
    document.getElementById('rewardImagePreview').style.display = 'none';
}

function previewEmployeeImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('الرجاء اختيار صورة فقط', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error');
        return;
    }
    
    selectedEmployeeImage = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('employeePreviewImg').src = e.target.result;
        document.getElementById('employeeImagePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removeEmployeeImage() {
    selectedEmployeeImage = null;
    document.getElementById('employeeImageFile').value = '';
    document.getElementById('employeeImagePreview').style.display = 'none';
}

function previewProductImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('الرجاء اختيار صورة فقط', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error');
        return;
    }
    
    selectedProductImage = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('productPreviewImg').src = e.target.result;
        document.getElementById('productImagePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removeProductImage() {
    selectedProductImage = null;
    const fileInput = document.getElementById('productImageFile') || document.getElementById('editProductImageFile');
    if (fileInput) fileInput.value = '';
    document.getElementById('productImagePreview').style.display = 'none';
}

function previewCompletionImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('الرجاء اختيار صورة فقط', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error');
        return;
    }

    selectedCompletionImage = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewImg = document.getElementById('completionPreviewImg');
        const previewContainer = document.getElementById('completionImagePreview');
        if (previewImg && previewContainer) {
            previewImg.src = e.target.result;
            previewContainer.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
}

function removeCompletionImage() {
    selectedCompletionImage = null;
    const fileInput = document.getElementById('completionImageFile');
    if (fileInput) {
        fileInput.value = '';
    }
    const previewContainer = document.getElementById('completionImagePreview');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}

// Upload image to server
async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/upload/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('📤 Upload response:', data);
            // Convert relative URL to absolute URL
            const imageUrl = data.imageUrl || data.url;
            if (imageUrl && imageUrl.startsWith('/uploads/')) {
                // Always use Render URL for images since that's where they're stored
                const fullUrl = 'https://nassim-coiffeur.onrender.com' + imageUrl;
                console.log('🔗 Full image URL:', fullUrl);
                return fullUrl;
            }
            console.log('🔗 Image URL:', imageUrl);
            return imageUrl;
        } else {
            throw new Error('فشل رفع الصورة');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

// ==================== Toast Notifications ====================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showNotifications() {
    // TODO: Implement notifications panel
    showToast('جاري العمل على نظام الإشعارات', 'info');
}

// ==================== Cleanup ====================
async function cleanupOldImages() {
    if (!confirm('هل تريد حذف جميع روابط الصور القديمة من قاعدة البيانات؟\n\nملاحظة: سيتم حذف الروابط فقط، يمكنك إعادة رفع الصور لاحقاً.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/cleanup/old-images`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
            showToast(`✅ ${data.message}`, 'success');
            // Reload current page data
            if (currentPage === 'services') loadServices();
            if (currentPage === 'products') loadProducts();
            if (currentPage === 'employees') loadEmployees();
            if (currentPage === 'rewards') loadRewards();
        } else {
            showToast(data.message || 'فشل التنظيف', 'error');
        }
    } catch (error) {
        console.error('Cleanup error:', error);
        showToast('حدث خطأ في التنظيف', 'error');
    }
}

// ==================== Timeline View ====================
function normalizeTimeValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
        return `${value.toString().padStart(2, '0')}:00`;
    }
    const parts = value.toString().split(':');
    const hours = (parts[0] || '0').padStart(2, '0');
    const minutes = (parts[1] || '0').padStart(2, '0');
    return `${hours}:${minutes}`;
}

function generateTimelineSlots(selectedDate, startHour = 9, endHour = 21, stepMinutes = 30) {
    const baseDate = new Date(selectedDate || new Date());
    baseDate.setSeconds(0, 0);
    const slots = [];

    for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += stepMinutes) {
            if (hour === endHour && minute > 0) {
                break;
            }
            const slotDate = new Date(baseDate);
            slotDate.setHours(hour, minute, 0, 0);
            const label = slotDate.toLocaleTimeString('ar-DZ', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const value = normalizeTimeValue(`${hour}:${minute}`);
            slots.push({ value, label, date: slotDate });
        }
    }

    return slots;
}

function getAppointmentDateTime(appointment) {
    if (!appointment) return null;

    if (appointment.dateTime) {
        const explicitDate = new Date(appointment.dateTime);
        if (!Number.isNaN(explicitDate.getTime())) {
            return explicitDate;
        }
    }

    const base = appointment.date ? new Date(appointment.date) : new Date();
    if (Number.isNaN(base.getTime())) {
        return null;
    }

    const timeValue = normalizeTimeValue(appointment.time);
    if (timeValue) {
        const [hours, minutes] = timeValue.split(':').map(num => parseInt(num, 10));
        base.setHours(hours, minutes, 0, 0);
    }

    return base;
}

function isSameDayDate(dateA, dateB) {
    if (!dateA || !dateB) return false;
    return dateA.getFullYear() === dateB.getFullYear() &&
        dateA.getMonth() === dateB.getMonth() &&
        dateA.getDate() === dateB.getDate();
}

function formatTimeDisplay(dateObj) {
    if (!dateObj) return '';
    return dateObj.toLocaleTimeString('ar-DZ', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function renderTimelineAppointmentCard(appointment) {
    const dateTime = getAppointmentDateTime(appointment);
    const customerName = appointment.customerId?.name || appointment.customerName || 'عميل';
    const serviceName = appointment.serviceId?.name || appointment.service || 'خدمة';
    const employeeName = appointment.employee?.name || appointment.employeeName || appointment.barber || 'غير محدد';
    const phone = appointment.customerId?.phone || appointment.customerPhone || '';
    const status = appointment.status || 'pending';
    const statusText = getStatusText(status);

    return `
        <div class="timeline-appointment">
            <div class="appointment-header">
                <span class="appointment-service">${serviceName}</span>
                <span class="timeline-status ${status}">${statusText}</span>
            </div>
            <div class="appointment-meta">
                <span>👤 ${customerName}</span>
                ${phone ? `<span>📞 ${phone}</span>` : ''}
                <span>✂️ ${employeeName}</span>
                ${dateTime ? `<span>🕒 ${formatTimeDisplay(dateTime)}</span>` : ''}
            </div>
        </div>
    `;
}

function renderTimelineSlots(appointments, selectedDate) {
    const grid = document.getElementById('timelineGrid');
    if (!grid) return;

    const slots = generateTimelineSlots(selectedDate);
    const slotMap = new Map();
    slots.forEach(slot => slotMap.set(slot.value, []));
    const overflow = [];

    appointments.forEach(appointment => {
        const key = normalizeTimeValue(appointment.time);
        if (slotMap.has(key)) {
            slotMap.get(key).push(appointment);
        } else {
            overflow.push(appointment);
        }
    });

    const slotHtml = slots.map(slot => {
        const slotAppointments = slotMap.get(slot.value) || [];
        let slotClass = 'available';

        if (slotAppointments.length > 0) {
            if (slotAppointments.some(apt => apt.status === 'completed')) {
                slotClass = 'completed';
            } else if (slotAppointments.some(apt => apt.status === 'pending')) {
                slotClass = 'pending';
            } else if (slotAppointments.some(apt => apt.status === 'cancelled')) {
                slotClass = 'cancelled';
            } else {
                slotClass = 'booked';
            }
        }

        const details = slotAppointments.length > 0
            ? slotAppointments.map(renderTimelineAppointmentCard).join('')
            : '<div class="timeline-empty">الوقت متاح للحجز</div>';

        return `
            <div class="timeline-slot ${slotClass}">
                <div class="timeline-time">${slot.label}</div>
                <div class="timeline-details">${details}</div>
            </div>
        `;
    }).join('');

    let overflowHtml = '';
    if (overflow.length > 0) {
        overflowHtml = `
            <div class="timeline-slot booked">
                <div class="timeline-time">أخرى</div>
                <div class="timeline-details">
                    ${overflow.map(renderTimelineAppointmentCard).join('')}
                </div>
            </div>
        `;
    }

    grid.innerHTML = slotHtml + overflowHtml;
}

function renderTimelineSummary(appointments, selectedDate) {
    const container = document.getElementById('timelineSummary');
    if (!container) return;

    const slots = generateTimelineSlots(selectedDate);
    const uniqueSlots = new Set();
    let pendingCount = 0;
    let completedCount = 0;

    appointments.forEach(appointment => {
        const normalizedTime = normalizeTimeValue(appointment.time);
        if (normalizedTime) {
            uniqueSlots.add(normalizedTime);
        }
        if (appointment.status === 'pending') {
            pendingCount += 1;
        }
        if (appointment.status === 'completed') {
            completedCount += 1;
        }
    });

    const bookedCount = uniqueSlots.size;
    const totalSlots = slots.length;
    const availableSlots = Math.max(totalSlots - bookedCount, 0);

    const upcoming = appointments
        .map(apt => ({ data: apt, date: getAppointmentDateTime(apt) }))
        .filter(item => item.date && item.date >= new Date())
        .sort((a, b) => a.date - b.date)[0];

    const nextText = upcoming
        ? `${upcoming.data.customerName || upcoming.data.customerId?.name || 'عميل'} - ${formatTimeDisplay(upcoming.date)}`
        : 'لا يوجد';

    container.innerHTML = `
        <div class="summary-item">
            <span>إجمالي المواعيد اليوم</span>
            <strong>${appointments.length}</strong>
        </div>
        <div class="summary-item">
            <span>أوقات متاحة</span>
            <strong>${availableSlots}</strong>
        </div>
        <div class="summary-item">
            <span>بانتظار التأكيد</span>
            <strong>${pendingCount}</strong>
        </div>
        <div class="summary-item">
            <span>الحلاقات المنجزة</span>
            <strong>${completedCount}</strong>
        </div>
        <div class="summary-item">
            <span>أقرب موعد</span>
            <strong>${nextText}</strong>
        </div>
    `;
}

async function loadTimelineView(targetDate = timelineSelectedDate, options = {}) {
    const { force = false } = options;
    const date = targetDate ? new Date(targetDate) : new Date();

    if (Number.isNaN(date.getTime())) {
        return;
    }

    timelineSelectedDate = date;

    const dateInput = document.getElementById('timelineDate');
    if (dateInput) {
        const formatted = formatDateForInput(date);
        if (formatted && dateInput.value !== formatted) {
            dateInput.value = formatted;
        }
    }

    try {
        const appointments = await fetchBusinessAppointments({ useCache: !force });
        const dayAppointments = appointments.filter(appointment => {
            const appointmentDate = getAppointmentDateTime(appointment);
            return appointmentDate ? isSameDayDate(appointmentDate, date) : false;
        });

        renderTimelineSummary(dayAppointments, date);
        renderTimelineSlots(dayAppointments, date);
        updateQuickBookingMeta(dayAppointments, date);
        renderQuickBookingHints(dayAppointments, date);
    } catch (error) {
        console.error('Timeline load error:', error);
        showToast('تعذر تحميل الجدول الزمني', 'error');
    }
}

function refreshTimeline() {
    invalidateAppointmentsCache();
    loadTimelineView(timelineSelectedDate, { force: true });
}

// ==================== Quick Booking ====================
function populateTimeSelect(selectElement, selectedValue, date = timelineSelectedDate) {
    if (!selectElement) return;
    const slots = generateTimelineSlots(date);
    const currentValue = selectedValue || selectElement.value;
    const options = ['<option value="">اختر الوقت</option>'];

    slots.forEach(slot => {
        const isSelected = slot.value === currentValue;
        options.push(`<option value="${slot.value}"${isSelected ? ' selected' : ''}>${slot.label}</option>`);
    });

    selectElement.innerHTML = options.join('');
}

async function prepareQuickBookingForm() {
    const serviceSelect = document.getElementById('quickBookingService');
    const employeeSelect = document.getElementById('quickBookingEmployee');
    const dateInput = document.getElementById('quickBookingDate');
    const timeSelect = document.getElementById('quickBookingTime');

    try {
        const [services, employees, appointments] = await Promise.all([
            fetchServicesData(),
            fetchEmployeesData(),
            fetchBusinessAppointments()
        ]);

        if (serviceSelect) {
            serviceSelect.innerHTML = '<option value="">اختر خدمة</option>' + services.map(service => `
                <option value="${service._id || ''}" data-name="${service.name || ''}" data-price="${service.price || ''}">
                    ${service.name || 'خدمة'}${service.price ? ` - ${service.price} دج` : ''}
                </option>
            `).join('');
        }

        if (employeeSelect) {
            employeeSelect.innerHTML = '<option value="">بدون تحديد</option>' + employees.map(employee => `
                <option value="${employee._id || ''}" data-name="${employee.name || ''}">
                    ${employee.name || 'موظف'}${employee.isAvailable === false ? ' (مشغول)' : ''}
                </option>
            `).join('');
        }

        let selectedDate = new Date();
        if (dateInput) {
            if (!dateInput.value) {
                dateInput.value = formatDateForInput(selectedDate);
            } else {
                selectedDate = new Date(dateInput.value);
            }
        }

        if (timeSelect) {
            populateTimeSelect(timeSelect, timeSelect.value || null, selectedDate);
        }

        const dayAppointments = appointments.filter(appointment => {
            const appointmentDate = getAppointmentDateTime(appointment);
            return appointmentDate ? isSameDayDate(appointmentDate, selectedDate) : false;
        });

        updateQuickBookingMeta(dayAppointments, selectedDate);
        renderQuickBookingHints(dayAppointments, selectedDate);
    } catch (error) {
        console.error('Quick booking preparation error:', error);
    }
}

function updateQuickBookingMeta(appointments, selectedDate) {
    const metaElement = document.getElementById('quickBookingMeta');
    if (!metaElement) return;

    const dateLabel = selectedDate.toLocaleDateString('ar-DZ', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    const confirmedStatuses = ['confirmed', 'appointment_confirmed', 'employee_confirmed', 'fully_confirmed', 'completed'];
    const confirmed = appointments.filter(apt => confirmedStatuses.includes(apt.status)).length;
    const pending = appointments.filter(apt => apt.status === 'pending').length;

    metaElement.innerHTML = `
        <span>📅 ${dateLabel}</span>
        <span>✅ مؤكد: ${confirmed}</span>
        <span>⏳ قيد التأكيد: ${pending}</span>
        <span>💈 إجمالي: ${appointments.length}</span>
    `;
}

function renderQuickBookingHints(appointments, selectedDate) {
    const container = document.getElementById('quickBookingHints');
    if (!container) return;

    const slots = generateTimelineSlots(selectedDate);
    const slotMap = new Map();
    slots.forEach(slot => slotMap.set(slot.value, []));

    appointments.forEach(appointment => {
        const key = normalizeTimeValue(appointment.time);
        if (slotMap.has(key)) {
            slotMap.get(key).push(appointment);
        }
    });

    const now = new Date();
    const nextAvailable = slots.find(slot => {
        const slotAppointments = slotMap.get(slot.value) || [];
        if (slotAppointments.length > 0) {
            return false;
        }
        return slot.date > now;
    });

    const serviceCounts = {};
    const employeeCounts = {};
    appointments.forEach(appointment => {
        const serviceName = appointment.serviceId?.name || appointment.service || 'خدمة';
        serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;

        const employeeName = appointment.employee?.name || appointment.employeeName || appointment.barber || 'غير محدد';
        employeeCounts[employeeName] = (employeeCounts[employeeName] || 0) + 1;
    });

    const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];
    const topEmployee = Object.entries(employeeCounts).sort((a, b) => b[1] - a[1])[0];

    const hints = [];

    if (nextAvailable) {
        hints.push({
            icon: '🕒',
            title: 'أقرب وقت متاح',
            description: `الساعة ${nextAvailable.label} متاحة للحجز.`
        });
    }

    if (topService) {
        hints.push({
            icon: '⭐',
            title: 'الخدمة الأكثر طلباً',
            description: `${topService[0]} (عدد ${topService[1]} حجوزات).`
        });
    }

    if (topEmployee && topEmployee[0] !== 'غير محدد') {
        hints.push({
            icon: '💈',
            title: 'أكثر حلاق نشاطاً',
            description: `${topEmployee[0]} مع ${topEmployee[1]} حجز/حجوزات.`
        });
    }

    if (hints.length === 0) {
        hints.push({
            icon: '✨',
            title: 'لا توجد حجوزات بعد',
            description: 'ابدأ بحجز جديد لتخطيط يومك.'
        });
    }

    container.innerHTML = hints.map(hint => `
        <div class="hint-card">
            <strong>${hint.icon} ${hint.title}</strong>
            <span>${hint.description}</span>
        </div>
    `).join('');
}

async function handleQuickBookingSubmit(event) {
    event.preventDefault();
    const form = event.target;
    if (!form) return;

    const serviceSelect = document.getElementById('quickBookingService');
    const employeeSelect = document.getElementById('quickBookingEmployee');
    const dateInput = document.getElementById('quickBookingDate');
    const timeSelect = document.getElementById('quickBookingTime');

    const formData = new FormData(form);
    const customerName = (formData.get('customerName') || '').trim();
    const customerPhone = (formData.get('customerPhone') || '').trim();
    const dateValue = formData.get('date');
    const timeValue = formData.get('time');
    const notes = (formData.get('notes') || '').trim();

    const serviceOption = serviceSelect?.selectedOptions?.[0];
    const serviceId = serviceOption?.value || formData.get('service');
    const serviceName = serviceOption?.dataset?.name || serviceOption?.textContent?.trim() || '';

    if (!customerName || !customerPhone || !dateValue || !timeValue || !serviceName) {
        showToast('يرجى تعبئة جميع الحقول الإجبارية', 'error');
        return;
    }

    const employeeOption = employeeSelect?.selectedOptions?.[0];
    const employeeId = employeeOption?.value || '';
    const employeeName = employeeOption?.dataset?.name || employeeOption?.textContent?.trim() || '';

    const payload = cleanObject({
        customerName,
        customerPhone,
        service: serviceName,
        serviceId,
        serviceName,
        date: dateValue,
        time: timeValue,
        barber: employeeName || undefined,
        employeeId: employeeId || undefined,
        employeeName: employeeName || undefined,
        notes: notes || undefined
    });

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || result.success === false) {
            throw new Error(result.message || 'فشل إنشاء الموعد');
        }

        showToast('تم إنشاء الموعد بنجاح', 'success');
        form.reset();

        if (dateInput) {
            dateInput.value = formatDateForInput(timelineSelectedDate);
        }

        if (timeSelect) {
            populateTimeSelect(timeSelect, null, timelineSelectedDate);
        }

        invalidateAppointmentsCache();
        await Promise.all([
            loadTimelineView(timelineSelectedDate, { force: true }),
            loadAppointments(window.currentAppointmentFilter || 'all')
        ]);

        prepareQuickBookingForm();
    } catch (error) {
        console.error('Quick booking error:', error);
        showToast(error.message || 'حدث خطأ أثناء إنشاء الموعد', 'error');
    }
}

// ==================== Service Completion ====================
async function prepareCompletionForm() {
    const appointmentSelect = document.getElementById('completionAppointmentSelect');
    const employeeSelect = document.getElementById('completionEmployeeSelect');

    if (!appointmentSelect && !employeeSelect) {
        return;
    }

    try {
        const [appointments, employees] = await Promise.all([
            fetchBusinessAppointments(),
            fetchEmployeesData()
        ]);

        if (employeeSelect) {
            employeeSelect.innerHTML = '<option value="">اختر الموظف</option>' + employees.map(employee => `
                <option value="${employee._id || ''}" data-name="${employee.name || ''}">
                    ${employee.name || 'موظف'}${employee.isAvailable === false ? ' (مشغول)' : ''}
                </option>
            `).join('');
        }

        if (appointmentSelect) {
            const upcoming = appointments.filter(appointment => {
                if (appointment.status === 'cancelled' || appointment.status === 'completed') {
                    return false;
                }
                const appointmentDate = getAppointmentDateTime(appointment);
                if (!appointmentDate) return false;
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                return appointmentDate >= startOfDay;
            }).sort((a, b) => {
                const aDate = getAppointmentDateTime(a) || 0;
                const bDate = getAppointmentDateTime(b) || 0;
                return aDate - bDate;
            });

            appointmentSelect.innerHTML = '<option value="">اختر موعداً</option>' + upcoming.map(appointment => {
                const appointmentDate = getAppointmentDateTime(appointment);
                const label = appointmentDate
                    ? `${appointment.customerName || appointment.customerId?.name || 'عميل'} - ${appointmentDate.toLocaleDateString('ar-DZ', { month: 'long', day: 'numeric' })} ${formatTimeDisplay(appointmentDate)}`
                    : `${appointment.customerName || appointment.customerId?.name || 'عميل'}`;
                const employeeId = appointment.employee?._id || appointment.employee || '';
                const employeeName = appointment.employee?.name || appointment.employeeName || appointment.barber || '';
                return `<option value="${appointment._id}" data-employee-id="${employeeId}" data-employee-name="${employeeName}">${label}</option>`;
            }).join('');
        }

        renderCompletionHistory(appointments);
        updateCompletionMetaView(null);
    } catch (error) {
        console.error('Completion form preparation error:', error);
    }
}

function updateCompletionMetaView(appointment) {
    const metaElement = document.getElementById('completionMeta');
    if (!metaElement) return;

    if (!appointment) {
        metaElement.innerHTML = '<span>اختر موعداً لعرض تفاصيله.</span>';
        return;
    }

    const appointmentDate = getAppointmentDateTime(appointment);
    metaElement.innerHTML = `
        <span>👤 ${appointment.customerName || appointment.customerId?.name || 'عميل'}</span>
        <span>✂️ ${appointment.employee?.name || appointment.employeeName || appointment.barber || 'غير محدد'}</span>
        <span>🕒 ${appointmentDate ? formatTimeDisplay(appointmentDate) : '-'}</span>
        <span>💈 الخدمة: ${appointment.serviceId?.name || appointment.service || '-'}</span>
    `;
}

function handleCompletionAppointmentChange(event) {
    const select = event.target;
    const selectedOption = select?.selectedOptions?.[0];
    const employeeSelect = document.getElementById('completionEmployeeSelect');

    if (selectedOption && employeeSelect) {
        const employeeId = selectedOption.dataset.employeeId;
        if (employeeId) {
            const match = Array.from(employeeSelect.options).find(option => option.value === employeeId);
            if (match) {
                employeeSelect.value = employeeId;
            }
        }
    }

    const appointment = appointmentsCache?.find?.(apt => apt._id === selectedOption?.value) || null;
    updateCompletionMetaView(appointment);
}

function splitCommaValues(value) {
    if (!value) return [];
    return value
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
}

async function handleCompletionSubmit(event) {
    event.preventDefault();
    const form = event.target;
    if (!form) return;

    const formData = new FormData(form);
    const appointmentId = formData.get('appointmentId');
    if (!appointmentId) {
        showToast('يرجى اختيار الموعد', 'error');
        return;
    }

    const appointment = appointmentsCache?.find?.(apt => apt._id === appointmentId) || null;
    if (!appointment) {
        showToast('الموعد غير موجود في السجل الحالي', 'error');
        return;
    }

    if (appointment.status === 'cancelled') {
        showToast('لا يمكن إنهاء موعد ملغي', 'error');
        return;
    }

    const ratingValue = formData.get('rating');
    const rating = ratingValue ? parseInt(ratingValue, 10) : null;

    const warnings = Array.from(form.querySelectorAll('input[name="warnings"]:checked')).map(input => input.value);
    const customWarning = document.getElementById('completionCustomWarning')?.value.trim();
    if (customWarning) {
        warnings.push(customWarning);
    }

    const productsUsed = splitCommaValues(formData.get('products'));
    const employeeSelect = document.getElementById('completionEmployeeSelect');
    const employeeOption = employeeSelect?.selectedOptions?.[0];

    let photoUrl;
    if (selectedCompletionImage) {
        showToast('جاري رفع صورة الحلاقة...', 'info');
        try {
            photoUrl = await uploadImage(selectedCompletionImage);
        } catch (error) {
            console.error('Completion photo upload error:', error);
            showToast('تعذر رفع الصورة', 'error');
            return;
        }
    }

    const payload = cleanObject({
        status: 'completed',
        completion: {
            performedBy: employeeOption?.value || undefined,
            performedByName: employeeOption?.dataset?.name || employeeOption?.textContent?.trim() || undefined,
            finishedAt: new Date().toISOString(),
            notes: formData.get('notes')?.trim() || undefined,
            rating: rating || undefined,
            warnings: warnings.length ? warnings : undefined,
            productsUsed: productsUsed.length ? productsUsed : undefined,
            aftercareAdvice: formData.get('aftercare')?.trim() || undefined,
            photo: photoUrl || undefined
        }
    });

    try {
        if (appointment.status !== 'completed') {
            payload.status = 'completed';
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || result.success === false) {
            throw new Error(result.message || 'فشل حفظ التقرير');
        }

        showToast('تم حفظ تقرير الحلاقة بنجاح', 'success');
        form.reset();
        removeCompletionImage();
        const customWarningInput = document.getElementById('completionCustomWarning');
        if (customWarningInput) {
            customWarningInput.value = '';
        }

        invalidateAppointmentsCache();
        await Promise.all([
            loadTimelineView(timelineSelectedDate, { force: true }),
            loadAppointments(window.currentAppointmentFilter || 'all')
        ]);

        prepareCompletionForm();
        prepareCustomerFeedbackForm();
    } catch (error) {
        console.error('Completion submit error:', error);
        showToast(error.message || 'حدث خطأ أثناء حفظ التقرير', 'error');
    }
}

function renderCompletionHistory(appointments) {
    const container = document.getElementById('completionHistory');
    if (!container) return;

    const completed = appointments
        .filter(appointment => appointment.status === 'completed' && appointment.completion?.finishedAt)
        .sort((a, b) => new Date(b.completion.finishedAt) - new Date(a.completion.finishedAt))
        .slice(0, 5);

    if (completed.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = completed.map(appointment => {
        const finishedAt = appointment.completion.finishedAt
            ? new Date(appointment.completion.finishedAt).toLocaleString('ar-DZ')
            : '-';
        const rating = appointment.completion.rating
            ? '⭐'.repeat(appointment.completion.rating)
            : 'بدون تقييم';
        const warnings = appointment.completion.warnings?.length
            ? appointment.completion.warnings.join('، ')
            : 'لا توجد';

        return `
            <div class="history-card">
                <div class="feedback-header">
                    <strong>${appointment.customerName || appointment.customerId?.name || 'عميل'}</strong>
                    <span>${finishedAt}</span>
                </div>
                <span>التقييم الداخلي: ${rating}</span>
                <span>الموظف: ${appointment.completion.performedByName || appointment.employee?.name || appointment.employeeName || '-'}</span>
                <span>ملاحظات: ${appointment.completion.notes || 'لا يوجد'}</span>
                <span>تحذيرات: ${warnings}</span>
            </div>
        `;
    }).join('');
}

// ==================== Customer Feedback ====================
async function prepareCustomerFeedbackForm() {
    const selectElement = document.getElementById('feedbackAppointmentSelect');

    try {
        const appointments = await fetchBusinessAppointments();
        const completed = appointments.filter(appointment => appointment.status === 'completed');

        if (selectElement) {
            selectElement.innerHTML = '<option value="">اختر الموعد</option>' + completed.map(appointment => {
                const appointmentDate = getAppointmentDateTime(appointment);
                const label = appointmentDate
                    ? `${appointment.customerName || appointment.customerId?.name || 'عميل'} - ${appointmentDate.toLocaleDateString('ar-DZ', { month: 'long', day: 'numeric' })} ${formatTimeDisplay(appointmentDate)}`
                    : `${appointment.customerName || appointment.customerId?.name || 'عميل'}`;
                return `<option value="${appointment._id}">${label}</option>`;
            }).join('');
        }

        renderCustomerFeedbackList(completed);
    } catch (error) {
        console.error('Feedback form preparation error:', error);
    }
}

async function handleCustomerFeedbackSubmit(event) {
    event.preventDefault();
    const form = event.target;
    if (!form) return;

    const formData = new FormData(form);
    const appointmentId = formData.get('appointmentId');
    if (!appointmentId) {
        showToast('يرجى اختيار الموعد', 'error');
        return;
    }

    const rating = parseInt(formData.get('rating'), 10) || 0;
    const comment = formData.get('comment')?.trim();
    const punctuality = formData.get('punctuality') === 'on';
    const photoConsent = formData.get('photoConsent') === 'on';
    const behaviourNotes = formData.get('behaviourNotes')?.trim();

    const payload = cleanObject({
        customerFeedback: {
            rating,
            comment,
            punctuality,
            photoConsent,
            behaviourNotes,
            submittedAt: new Date().toISOString()
        }
    });

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || result.success === false) {
            throw new Error(result.message || 'فشل حفظ التقييم');
        }

        showToast('تم حفظ تقييم العميل', 'success');
        form.reset();
        const punctualityCheckbox = document.getElementById('feedbackPunctuality');
        if (punctualityCheckbox) {
            punctualityCheckbox.checked = true;
        }

        invalidateAppointmentsCache();
        await loadTimelineView(timelineSelectedDate, { force: true });
        prepareCustomerFeedbackForm();
    } catch (error) {
        console.error('Feedback submit error:', error);
        showToast(error.message || 'حدث خطأ أثناء حفظ التقييم', 'error');
    }
}

function renderCustomerFeedbackList(appointments) {
    const container = document.getElementById('customerFeedbackList');
    if (!container) return;

    const withFeedback = appointments
        .filter(appointment => appointment.customerFeedback && appointment.customerFeedback.rating)
        .sort((a, b) => {
            const aDate = a.customerFeedback.submittedAt ? new Date(a.customerFeedback.submittedAt) : 0;
            const bDate = b.customerFeedback.submittedAt ? new Date(b.customerFeedback.submittedAt) : 0;
            return bDate - aDate;
        })
        .slice(0, 5);

    if (withFeedback.length === 0) {
        container.innerHTML = '<div class="hint-card">لم يتم تسجيل تقييمات بعد.</div>';
        return;
    }

    container.innerHTML = withFeedback.map(appointment => {
        const feedback = appointment.customerFeedback;
        const feedbackDate = feedback.submittedAt ? new Date(feedback.submittedAt).toLocaleString('ar-DZ') : '-';
        const ratingStars = feedback.rating ? '⭐'.repeat(feedback.rating) : 'بدون تقييم';
        const punctualityText = feedback.punctuality ? 'حضر في الوقت' : 'تأخر عن الموعد';

        return `
            <div class="feedback-card">
                <div class="feedback-header">
                    <strong>${appointment.customerName || appointment.customerId?.name || 'عميل'}</strong>
                    <span>${feedbackDate}</span>
                </div>
                <span class="rating-stars">${ratingStars}</span>
                <span>${feedback.comment || 'لا توجد ملاحظات'}</span>
                <span>الالتزام بالوقت: ${punctualityText}</span>
                ${feedback.behaviourNotes ? `<span>ملاحظات إضافية: ${feedback.behaviourNotes}</span>` : ''}
            </div>
        `;
    }).join('');
}

// Toggle price field required status based on price range
function togglePriceRequired() {
    const priceInput = document.getElementById('priceInput');
    const priceMinInput = document.getElementById('priceMinInput');
    const priceMaxInput = document.getElementById('priceMaxInput');
    const requiredLabel = document.getElementById('priceRequiredLabel');
    
    if (!priceInput || !priceMinInput || !priceMaxInput || !requiredLabel) return;
    
    const hasRange = priceMinInput.value && priceMaxInput.value;
    
    if (hasRange) {
        priceInput.removeAttribute('required');
        requiredLabel.textContent = '';
        priceInput.style.borderColor = '';
    } else {
        priceInput.setAttribute('required', 'required');
        requiredLabel.textContent = '*';
    }
}

function toggleEditPriceRequired() {
    const priceInput = document.getElementById('editPriceInput');
    const priceMinInput = document.getElementById('editPriceMinInput');
    const priceMaxInput = document.getElementById('editPriceMaxInput');
    const requiredLabel = document.getElementById('editPriceRequiredLabel');
    
    if (!priceInput || !priceMinInput || !priceMaxInput || !requiredLabel) return;
    
    const hasRange = priceMinInput.value && priceMaxInput.value;
    
    if (hasRange) {
        priceInput.removeAttribute('required');
        requiredLabel.textContent = '';
        priceInput.style.borderColor = '';
    } else {
        priceInput.setAttribute('required', 'required');
        requiredLabel.textContent = '*';
    }
}
