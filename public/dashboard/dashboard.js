// Configuration
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://nassim-coiffeur.onrender.com/api';
let currentUser = null;
let token = localStorage.getItem('token');
let services = [];
let employees = [];
let customers = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard initializing...');
    console.log('Token exists:', !!token);
    console.log('Token value:', token ? token.substring(0, 20) + '...' : 'null');
    
    if (!token) {
        console.log('No token found, redirecting to login');
        // Redirect to login page with return URL
        window.location.href = '/login?redirect=dashboard';
        return;
    }
    
    console.log('Loading user data...');
    loadUserData();
    loadDashboardData();
});

// Helper: API Call with Auth
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        
        // Check if response is ok before parsing JSON
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Token expired or invalid
                console.error(`Auth error (${response.status}) on ${endpoint}`);
                showNotification('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى', 'error');
                setTimeout(() => {
                    logout();
                }, 2000);
                return null;
            }
            
            // Try to parse error message
            try {
                const errorData = await response.json();
                console.error(`API error on ${endpoint}:`, errorData);
                throw new Error(errorData.message || `خطأ ${response.status}`);
            } catch (parseError) {
                console.error(`Failed to parse error response on ${endpoint}:`, parseError);
                throw new Error(`خطأ ${response.status}`);
            }
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`API call failed for ${endpoint}:`, error);
        // Only show notification for non-auth errors
        if (!error.message.includes('صلاحية الجلسة')) {
            showNotification(error.message || 'حدث خطأ في الاتصال', 'error');
        }
        return null;
    }
}

// Load User Data
async function loadUserData() {
    const data = await apiCall('/users/me');
    if (data && data.success) {
        currentUser = data.data;
        document.getElementById('user-name').textContent = currentUser.name;
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    await Promise.all([
        loadStats(),
        loadUpcomingAppointments(),
        loadServices(),
        loadEmployees(),
        loadCustomers()
    ]);
}

// Load Stats
async function loadStats() {
    const data = await apiCall('/stats/dashboard');
    if (data && data.success) {
        const stats = data.data;
        document.getElementById('stat-today-appointments').textContent = stats.todayAppointments || 0;
        document.getElementById('stat-total-customers').textContent = stats.totalCustomers || 0;
        document.getElementById('stat-today-revenue').textContent = `${stats.todayRevenue || 0} ريال`;
        const rating = parseFloat(stats.avgRating) || 0;
        document.getElementById('stat-rating').textContent = rating.toFixed(1);
    }
}

// Load Upcoming Appointments
async function loadUpcomingAppointments() {
    const data = await apiCall('/appointments?status=confirmed&limit=5');
    if (data && data.success) {
        const container = document.getElementById('upcoming-appointments');
        if (data.data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6B7280; padding: 20px;">لا توجد مواعيد قادمة</p>';
            return;
        }
        
        container.innerHTML = data.data.map(apt => `
            <div class="appointment-item">
                <div class="appointment-header">
                    <span class="appointment-customer">${apt.customerName}</span>
                    <span class="appointment-time">${formatDate(apt.date)} - ${apt.time}</span>
                </div>
                <div class="appointment-details">
                    ${apt.service} - ${apt.barber}
                </div>
            </div>
        `).join('');
    }
}

// Navigation
function showSection(sectionName) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    
    // Show section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    // Update page title
    const titles = {
        dashboard: 'الرئيسية',
        appointments: 'المواعيد',
        customers: 'العملاء',
        services: 'الخدمات',
        employees: 'الموظفين',
        invoices: 'الفواتير',
        subscription: 'الاشتراك',
        settings: 'الإعدادات'
    };
    document.getElementById('page-title').textContent = titles[sectionName] || sectionName;
    
    // Load section data
    switch(sectionName) {
        case 'appointments':
            loadAppointments();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'services':
            loadServices();
            break;
        case 'employees':
            loadEmployees();
            break;
        case 'invoices':
            loadInvoices();
            break;
        case 'subscription':
            loadSubscription();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Appointments
async function loadAppointments() {
    const statusFilter = document.getElementById('appointment-status-filter').value;
    const dateFilter = document.getElementById('appointment-date-filter').value;
    
    let url = '/appointments?';
    if (statusFilter) url += `status=${statusFilter}&`;
    if (dateFilter) url += `date=${dateFilter}&`;
    
    const data = await apiCall(url);
    if (data && data.success) {
        const tbody = document.getElementById('appointments-table-body');
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #6B7280; padding: 30px;">لا توجد مواعيد</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.data.map(apt => `
            <tr>
                <td>${formatDate(apt.date)}</td>
                <td>${apt.time}</td>
                <td>${apt.customerName}</td>
                <td>${apt.service}</td>
                <td>${apt.barber}</td>
                <td><span class="status-badge ${apt.status}">${getStatusText(apt.status)}</span></td>
                <td>
                    ${apt.status === 'pending' ? `
                        <button class="btn btn-success btn-sm" onclick="updateAppointmentStatus('${apt._id}', 'confirmed')">
                            تأكيد
                        </button>
                    ` : ''}
                    ${apt.status === 'confirmed' ? `
                        <button class="btn btn-success btn-sm" onclick="updateAppointmentStatus('${apt._id}', 'completed')">
                            اكتمل
                        </button>
                    ` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteAppointment('${apt._id}')">
                        حذف
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

async function updateAppointmentStatus(id, status) {
    const data = await apiCall(`/appointments/${id}`, 'PUT', { status });
    if (data && data.success) {
        showNotification('تم تحديث حالة الموعد', 'success');
        loadAppointments();
        loadStats();
    }
}

async function deleteAppointment(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الموعد؟')) return;
    
    const data = await apiCall(`/appointments/${id}`, 'DELETE');
    if (data && data.success) {
        showNotification('تم حذف الموعد', 'success');
        loadAppointments();
        loadStats();
    }
}

function filterAppointments() {
    loadAppointments();
}

function showAddAppointmentModal() {
    // Load services and employees for the form
    loadServicesForForm();
    loadEmployeesForForm();
    
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointment-date').setAttribute('min', today);
    document.getElementById('appointment-date').value = today;
    
    openModal('add-appointment-modal');
}

async function loadServicesForForm() {
    if (services.length === 0) {
        const data = await apiCall('/services');
        if (data && data.success) {
            services = data.data;
        }
    }
    
    const select = document.getElementById('appointment-service');
    select.innerHTML = '<option value="">اختر الخدمة</option>' + 
        services.map(s => `<option value="${s._id}">${s.name} - ${s.price} ريال</option>`).join('');
}

async function loadEmployeesForForm() {
    if (employees.length === 0) {
        const data = await apiCall('/users?role=employee');
        if (data && data.success) {
            employees = data.data;
        }
    }
    
    const select = document.getElementById('appointment-employee');
    select.innerHTML = '<option value="">اختر الموظف</option>' + 
        employees.map(e => `<option value="${e._id}">${e.name}</option>`).join('');
}

async function addAppointment(event) {
    event.preventDefault();
    
    const phone = document.getElementById('appointment-customer-phone').value;
    const name = document.getElementById('appointment-customer-name').value;
    const serviceId = document.getElementById('appointment-service').value;
    const barberId = document.getElementById('appointment-employee').value;
    const date = document.getElementById('appointment-date').value;
    const time = document.getElementById('appointment-time').value;
    
    const service = services.find(s => s._id === serviceId);
    const barber = employees.find(e => e._id === barberId);
    
    const data = await apiCall('/appointments', 'POST', {
        customerPhone: phone,
        customerName: name,
        service: service.name,
        serviceId: service._id,
        barber: barber.name,
        barberId: barber._id,
        date,
        time
    });
    
    if (data && data.success) {
        showNotification('تم إضافة الموعد بنجاح', 'success');
        closeModal('add-appointment-modal');
        loadAppointments();
        loadStats();
        event.target.reset();
    }
}

// Customers
async function loadCustomers() {
    const data = await apiCall('/customers');
    if (data && data.success) {
        customers = data.data;
        const tbody = document.getElementById('customers-table-body');
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #6B7280; padding: 30px;">لا يوجد عملاء</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.data.map(customer => `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.phone}</td>
                <td>${customer.loyaltyPoints || 0}</td>
                <td>${customer.totalVisits || 0}</td>
                <td>${customer.totalSpent || 0} ريال</td>
                <td>
                    ${customer.rating ? '⭐'.repeat(customer.rating) : 'لا يوجد'}
                </td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="viewCustomer('${customer._id}')">
                        عرض
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${customer._id}')">
                        حذف
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

function searchCustomers() {
    const searchTerm = document.getElementById('customer-search').value.toLowerCase();
    const tbody = document.getElementById('customers-table-body');
    
    const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm) || 
        c.phone.includes(searchTerm)
    );
    
    tbody.innerHTML = filtered.map(customer => `
        <tr>
            <td>${customer.name}</td>
            <td>${customer.phone}</td>
            <td>${customer.loyaltyPoints || 0}</td>
            <td>${customer.totalVisits || 0}</td>
            <td>${customer.totalSpent || 0} ريال</td>
            <td>
                ${customer.rating ? '⭐'.repeat(customer.rating) : 'لا يوجد'}
            </td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="viewCustomer('${customer._id}')">
                    عرض
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${customer._id}')">
                    حذف
                </button>
            </td>
        </tr>
    `).join('');
}

async function deleteCustomer(id) {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    
    const data = await apiCall(`/customers/${id}`, 'DELETE');
    if (data && data.success) {
        showNotification('تم حذف العميل', 'success');
        loadCustomers();
    }
}

function showAddCustomerModal() {
    // Will implement later
    showNotification('سيتم إضافة هذه الميزة قريباً', 'info');
}

function viewCustomer(id) {
    // Will implement later
    showNotification('سيتم إضافة هذه الميزة قريباً', 'info');
}

// Services
async function loadServices() {
    const data = await apiCall('/services');
    if (data && data.success) {
        services = data.data;
        const grid = document.getElementById('services-grid');
        if (data.data.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: #6B7280; padding: 40px;">لا توجد خدمات</p>';
            return;
        }
        
        const categoryNames = {
            'haircut': 'قص شعر',
            'beard': 'حلاقة',
            'styling': 'تصفيف',
            'coloring': 'صبغة',
            'spa': 'عناية',
            'other': 'أخرى'
        };
        
        grid.innerHTML = data.data.map(service => `
            <div class="service-card">
                <h4>${service.name}</h4>
                ${service.category ? `<span class="badge badge-primary">${categoryNames[service.category] || service.category}</span>` : ''}
                <p>${service.description || 'لا يوجد وصف'}</p>
                <div class="service-price">${service.price} ريال</div>
                <div class="service-duration">
                    <i class="fas fa-clock"></i> ${service.duration} دقيقة
                </div>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="btn btn-primary btn-sm" onclick="editService('${service._id}')">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteService('${service._id}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `).join('');
    }
}

async function deleteService(id) {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    
    const data = await apiCall(`/services/${id}`, 'DELETE');
    if (data && data.success) {
        showNotification('تم حذف الخدمة', 'success');
        loadServices();
    }
}

function showAddServiceModal() {
    document.getElementById('add-service-form').reset();
    document.getElementById('service-active').checked = true;
    openModal('add-service-modal');
}

async function addService(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('service-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الحفظ...';
    
    try {
        const categoryValue = document.getElementById('service-category').value;
        
        // Map Arabic category to English enum
        const categoryMap = {
            'قص شعر': 'haircut',
            'حلاقة': 'beard',
            'تصفيف': 'styling',
            'صبغة': 'coloring',
            'عناية': 'spa',
            'تجميل': 'spa',
            'مساج': 'spa',
            'أخرى': 'other'
        };
        
        const serviceData = {
            name: document.getElementById('service-name').value,
            description: document.getElementById('service-description').value,
            price: parseFloat(document.getElementById('service-price').value),
            duration: parseInt(document.getElementById('service-duration').value),
            category: categoryMap[categoryValue] || 'other',
            available: document.getElementById('service-active').checked
        };
        
        const data = await apiCall('/services', 'POST', serviceData);
        
        if (data && data.success) {
            showNotification('✓ تم إضافة الخدمة بنجاح', 'success');
            closeModal('add-service-modal');
            loadServices();
        } else {
            showNotification(data?.message || 'فشل في إضافة الخدمة', 'error');
        }
    } catch (error) {
        console.error('Error adding service:', error);
        showNotification('حدث خطأ أثناء إضافة الخدمة', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function editService(id) {
    const service = services.find(s => s._id === id);
    if (!service) {
        showNotification('الخدمة غير موجودة', 'error');
        return;
    }
    
    // Map English category back to Arabic
    const categoryMapReverse = {
        'haircut': 'قص شعر',
        'beard': 'حلاقة',
        'styling': 'تصفيف',
        'coloring': 'صبغة',
        'spa': 'عناية',
        'other': 'أخرى'
    };
    
    // Fill form with service data
    document.getElementById('edit-service-id').value = service._id;
    document.getElementById('edit-service-name').value = service.name;
    document.getElementById('edit-service-description').value = service.description || '';
    document.getElementById('edit-service-price').value = service.price;
    document.getElementById('edit-service-duration').value = service.duration;
    document.getElementById('edit-service-category').value = categoryMapReverse[service.category] || '';
    document.getElementById('edit-service-active').checked = service.available !== false;
    
    openModal('edit-service-modal');
}

async function updateService(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('edit-service-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الحفظ...';
    
    try {
        const serviceId = document.getElementById('edit-service-id').value;
        const categoryValue = document.getElementById('edit-service-category').value;
        
        // Map Arabic category to English enum
        const categoryMap = {
            'قص شعر': 'haircut',
            'حلاقة': 'beard',
            'تصفيف': 'styling',
            'صبغة': 'coloring',
            'عناية': 'spa',
            'تجميل': 'spa',
            'مساج': 'spa',
            'أخرى': 'other'
        };
        
        const serviceData = {
            name: document.getElementById('edit-service-name').value,
            description: document.getElementById('edit-service-description').value,
            price: parseFloat(document.getElementById('edit-service-price').value),
            duration: parseInt(document.getElementById('edit-service-duration').value),
            category: categoryMap[categoryValue] || 'other',
            available: document.getElementById('edit-service-active').checked
        };
        
        const data = await apiCall(`/services/${serviceId}`, 'PUT', serviceData);
        
        if (data && data.success) {
            showNotification('✓ تم تحديث الخدمة بنجاح', 'success');
            closeModal('edit-service-modal');
            loadServices();
        } else {
            showNotification(data?.message || 'فشل في تحديث الخدمة', 'error');
        }
    } catch (error) {
        console.error('Error updating service:', error);
        showNotification('حدث خطأ أثناء تحديث الخدمة', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Employees
async function loadEmployees() {
    const data = await apiCall('/users?role=employee');
    if (data && data.success) {
        employees = data.data;
        const grid = document.getElementById('employees-grid');
        if (data.data.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: #6B7280; padding: 40px;">لا يوجد موظفين</p>';
            return;
        }
        
        grid.innerHTML = data.data.map(employee => `
            <div class="employee-card">
                <div class="employee-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <h4>${employee.name}</h4>
                <div class="employee-role">${getRoleText(employee.role)}</div>
                <div class="employee-rating">
                    ${employee.rating ? '⭐'.repeat(Math.round(employee.rating)) + ` (${employee.rating.toFixed(1)})` : 'لا يوجد تقييم'}
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-primary btn-sm" onclick="editEmployee('${employee._id}')">
                        تعديل
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteEmployee('${employee._id}')">
                        حذف
                    </button>
                </div>
            </div>
        `).join('');
    }
}

async function deleteEmployee(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    
    const data = await apiCall(`/users/${id}`, 'DELETE');
    if (data && data.success) {
        showNotification('تم حذف الموظف', 'success');
        loadEmployees();
    }
}

function showAddEmployeeModal() {
    showNotification('سيتم إضافة هذه الميزة قريباً', 'info');
}

function editEmployee(id) {
    showNotification('سيتم إضافة هذه الميزة قريباً', 'info');
}

// Invoices
async function loadInvoices() {
    const statusFilter = document.getElementById('invoice-status-filter').value;
    let url = '/invoices?';
    if (statusFilter) url += `paymentStatus=${statusFilter}`;
    
    const data = await apiCall(url);
    if (data && data.success) {
        const tbody = document.getElementById('invoices-table-body');
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6B7280; padding: 30px;">لا توجد فواتير</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.data.map(invoice => `
            <tr>
                <td>#${invoice.invoiceNumber || invoice._id.slice(-6)}</td>
                <td>${formatDate(invoice.createdAt)}</td>
                <td>${invoice.customerName}</td>
                <td>${invoice.total} ريال</td>
                <td><span class="status-badge ${invoice.paymentStatus}">${getPaymentStatusText(invoice.paymentStatus)}</span></td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="viewInvoice('${invoice._id}')">
                        عرض
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteInvoice('${invoice._id}')">
                        حذف
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

function filterInvoices() {
    loadInvoices();
}

async function deleteInvoice(id) {
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;
    
    const data = await apiCall(`/invoices/${id}`, 'DELETE');
    if (data && data.success) {
        showNotification('تم حذف الفاتورة', 'success');
        loadInvoices();
    }
}

function showCreateInvoiceModal() {
    showNotification('سيتم إضافة هذه الميزة قريباً', 'info');
}

function viewInvoice(id) {
    showNotification('سيتم إضافة هذه الميزة قريباً', 'info');
}

// Subscription
async function loadSubscription() {
    const data = await apiCall('/payments/subscription');
    if (data && data.success && data.data) {
        const sub = data.data;
        const container = document.getElementById('subscription-info');
        container.innerHTML = `
            <div class="subscription-info">
                <h4>${sub.plan.nameAr}</h4>
                <p><strong>الحالة:</strong> <span class="status-badge ${sub.status}">${getSubscriptionStatusText(sub.status)}</span></p>
                <p><strong>السعر:</strong> ${sub.plan.pricing.monthly} ${sub.plan.pricing.currency}/شهر</p>
                <p><strong>تاريخ البداية:</strong> ${formatDate(sub.startedAt)}</p>
                <p><strong>تاريخ التجديد:</strong> ${formatDate(sub.currentPeriodEnd)}</p>
                ${sub.autoRenew ? '<p style="color: #10B981;">✓ التجديد التلقائي مفعّل</p>' : '<p style="color: #EF4444;">✗ التجديد التلقائي معطل</p>'}
            </div>
            
            <div style="margin-top: 20px;">
                <button class="btn btn-primary" onclick="manageBilling()">
                    <i class="fas fa-credit-card"></i> إدارة الاشتراك
                </button>
                ${sub.autoRenew ? `
                    <button class="btn btn-danger" onclick="cancelSubscription()">
                        <i class="fas fa-times"></i> إلغاء الاشتراك
                    </button>
                ` : `
                    <button class="btn btn-success" onclick="reactivateSubscription()">
                        <i class="fas fa-check"></i> إعادة تفعيل الاشتراك
                    </button>
                `}
            </div>
        `;
    } else {
        document.getElementById('subscription-info').innerHTML = `
            <p style="text-align: center; color: #6B7280; padding: 40px;">لا يوجد اشتراك نشط</p>
            <div style="text-align: center;">
                <button class="btn btn-primary" onclick="window.location.href='/pricing.html'">
                    <i class="fas fa-crown"></i> اشترك الآن
                </button>
            </div>
        `;
    }
    
    // Load payment history
    loadPaymentHistory();
}

async function loadPaymentHistory() {
    const data = await apiCall('/payments/history');
    if (data && data.success && data.data.length > 0) {
        const container = document.getElementById('payment-history');
        container.innerHTML = data.data.map(payment => `
            <div class="payment-item">
                <div>
                    <strong>${formatDate(payment.date)}</strong>
                    <br>
                    <span style="color: #6B7280;">${payment.amount} ${payment.currency}</span>
                </div>
                <div>
                    <span class="status-badge ${payment.status}">${getPaymentStatusText(payment.status)}</span>
                    ${payment.pdfUrl ? `<a href="${payment.pdfUrl}" target="_blank" class="btn btn-sm btn-primary" style="margin-right: 10px;">PDF</a>` : ''}
                </div>
            </div>
        `).join('');
    } else {
        document.getElementById('payment-history').innerHTML = '<p style="text-align: center; color: #6B7280; padding: 20px;">لا يوجد سجل دفعات</p>';
    }
}

async function manageBilling() {
    const data = await apiCall('/payments/create-billing-portal', 'POST');
    if (data && data.success && data.url) {
        window.open(data.url, '_blank');
    }
}

async function cancelSubscription() {
    if (!confirm('هل أنت متأكد من إلغاء اشتراكك؟ سيستمر حتى نهاية الفترة الحالية.')) return;
    
    const data = await apiCall('/payments/cancel-subscription', 'POST');
    if (data && data.success) {
        showNotification('تم إلغاء الاشتراك', 'success');
        loadSubscription();
    }
}

async function reactivateSubscription() {
    const data = await apiCall('/payments/reactivate-subscription', 'POST');
    if (data && data.success) {
        showNotification('تم إعادة تفعيل الاشتراك', 'success');
        loadSubscription();
    }
}

// Settings
async function loadSettings() {
    const data = await apiCall('/businesses/current/info');
    if (data && data.success) {
        const business = data.data;
        document.getElementById('tenant-name').value = business.businessName || '';
        document.getElementById('tenant-email').value = business.email || '';
        // Set default values if settings don't exist
        document.getElementById('rewards-enabled').checked = business.settings?.rewardsEnabled || false;
        document.getElementById('points-per-riyal').value = business.settings?.rewardsConfig?.pointsPerRiyal || 1;
        document.getElementById('riyal-per-point').value = business.settings?.rewardsConfig?.riyalPerPoint || 0.1;
    }
}

async function saveSettings(event) {
    event.preventDefault();
    
    const data = await apiCall('/businesses/current/info', 'PUT', {
        businessName: document.getElementById('tenant-name').value,
        email: document.getElementById('tenant-email').value,
        settings: {
            rewardsEnabled: document.getElementById('rewards-enabled').checked,
            rewardsConfig: {
                pointsPerRiyal: parseFloat(document.getElementById('points-per-riyal').value),
                riyalPerPoint: parseFloat(document.getElementById('riyal-per-point').value)
            }
        }
    });
    
    if (data && data.success) {
        showNotification('تم حفظ الإعدادات بنجاح', 'success');
    }
}

// Utilities
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getStatusText(status) {
    const statuses = {
        pending: 'معلق',
        confirmed: 'مؤكد',
        completed: 'مكتمل',
        cancelled: 'ملغي',
        'no-show': 'لم يحضر'
    };
    return statuses[status] || status;
}

function getPaymentStatusText(status) {
    const statuses = {
        paid: 'مدفوعة',
        pending: 'معلقة',
        cancelled: 'ملغاة',
        succeeded: 'نجحت',
        failed: 'فشلت'
    };
    return statuses[status] || status;
}

function getSubscriptionStatusText(status) {
    const statuses = {
        active: 'نشط',
        trialing: 'تجريبي',
        past_due: 'متأخر',
        cancelled: 'ملغي',
        expired: 'منتهي'
    };
    return statuses[status] || status;
}

function getRoleText(role) {
    const roles = {
        business_owner: 'مالك',
        manager: 'مدير',
        employee: 'موظف',
        customer: 'عميل'
    };
    return roles[role] || role;
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Modal Functions
function openModal(modalId) {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById('modal-overlay').classList.remove('active');
    document.getElementById(modalId).classList.remove('active');
}

function closeAllModals() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Sidebar Toggle
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Logout
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
}
