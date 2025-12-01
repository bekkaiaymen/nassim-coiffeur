// ==================== Configuration ====================
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://nassim-coiffeur.onrender.com/api';
const NASSIM_BUSINESS_ID = '69259331651b1babc1eb83dc';
let currentUser = null;
let currentPage = 'dashboard';

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

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadDashboardData();
    setupEventListeners();
});

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
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/appointments/business/${NASSIM_BUSINESS_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        let appointments = result.data || result || [];

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
                <img src="${employee.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(employee.name) + '&background=FDB714&color=2C3E50&size=64'}" alt="${employee.name}" class="employee-avatar">
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
            photo: photoUrl || null,
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

        if (!response.ok) throw new Error('Failed to add employee');

        showToast('تمت إضافة الموظف بنجاح', 'success');
        closeModal();
        loadEmployees();

    } catch (error) {
        console.error('Error adding employee:', error);
        showToast('حدث خطأ في إضافة الموظف', 'error');
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
        const services = await servicesResponse.json();
        
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
                    <label class="form-label">الصورة (URL)</label>
                    <input type="url" class="form-input" name="photo" value="${employee.photo || ''}">
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
        photo: formData.get('photo'),
        services: selectedServices,
        isAvailable: formData.get('isAvailable') === 'on'
    };

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

        if (!response.ok) throw new Error('Failed to update employee');

        showToast('تم تحديث الموظف بنجاح', 'success');
        closeModal();
        loadEmployees();

    } catch (error) {
        console.error('Error updating employee:', error);
        showToast('حدث خطأ في تحديث الموظف', 'error');
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

        if (!response.ok) throw new Error('Failed to delete');

        showToast('تم حذف الموظف بنجاح', 'success');
        loadEmployees();

    } catch (error) {
        console.error('Error deleting employee:', error);
        showToast('حدث خطأ في حذف الموظف', 'error');
    }
}

// ==================== Products ====================
async function loadServices() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/services?business=${NASSIM_BUSINESS_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        const services = Array.isArray(result) ? result : (result.data || []);
        const products = rewards.filter(item => isProductItem(item));

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
                <h3 class="service-title">${service.name}</h3>
                <p class="service-description">${service.description || 'لا يوجد وصف'}</p>
                
                <div class="service-meta">
                    <span class="service-price">${service.price} دج</span>
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
                <label class="form-label">السعر (دج) *</label>
                <input type="number" class="form-input" name="price" required min="0" placeholder="500">
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
        
        const serviceData = {
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            duration: parseInt(formData.get('duration')),
            category: formData.get('category'),
            image: imageUrl || null,
            available: formData.get('available') === 'on',
            business: NASSIM_BUSINESS_ID
        };

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
                    <label class="form-label">السعر (دج) *</label>
                    <input type="number" class="form-input" name="price" required min="0" value="${service.price}">
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
    
    const serviceData = {
        name: formData.get('name'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        duration: parseInt(formData.get('duration')),
        category: formData.get('category'),
        image: formData.get('image'),
        available: formData.get('available') === 'on'
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/services/${serviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(serviceData)
        });

        if (!response.ok) throw new Error('Failed to update service');

        showToast('تم تحديث الخدمة بنجاح', 'success');
        closeModal();
        loadServices();

    } catch (error) {
        console.error('Error updating service:', error);
        showToast('حدث خطأ في تحديث الخدمة', 'error');
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
        const baseDescription = formData.get('description') || '';

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

        // Using rewards API - store product as 'gift' type with metadata
        const productData = {
            name: formData.get('name'),
            description: formData.get('description'),
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
