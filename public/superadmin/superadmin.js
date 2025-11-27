// Configuration
const API_URL = '/api';
let token = localStorage.getItem('token');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    // Check if user is super admin
    checkSuperAdmin();
    
    // Load initial data
    loadOverviewData();
});

// Check Super Admin
async function checkSuperAdmin() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok || data.data.role !== 'super_admin') {
            alert('غير مصرح لك بالدخول لهذه الصفحة');
            window.location.href = '/dashboard';
            return;
        }
    } catch (error) {
        console.error('Error checking admin:', error);
        window.location.href = '/login';
    }
}

// Tab Navigation
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all menu items
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Add active to clicked menu item
    event.target.closest('li').classList.add('active');
    
    // Load tab data
    switch(tabName) {
        case 'overview':
            loadOverviewData();
            break;
        case 'tenants':
            loadTenants();
            break;
        case 'subscriptions':
            loadSubscriptions();
            break;
        case 'revenue':
            loadRevenue();
            break;
        case 'plans':
            loadPlans();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

// Load Overview Data
async function loadOverviewData() {
    try {
        // Load tenants count
        const tenantsResponse = await fetch(`${API_URL}/superadmin/tenants`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const tenantsData = await tenantsResponse.json();
        
        if (tenantsData.success) {
            document.getElementById('total-tenants').textContent = tenantsData.count || 0;
            
            // Count by plan
            const basicCount = tenantsData.data.filter(t => t.subscription?.plan?.name === 'Basic').length;
            const proCount = tenantsData.data.filter(t => t.subscription?.plan?.name === 'Pro').length;
            const enterpriseCount = tenantsData.data.filter(t => t.subscription?.plan?.name === 'Enterprise').length;
            
            document.getElementById('basic-count').textContent = basicCount;
            document.getElementById('pro-count').textContent = proCount;
            document.getElementById('enterprise-count').textContent = enterpriseCount;
            
            // Calculate active subscriptions
            const activeSubscriptions = tenantsData.data.filter(t => 
                t.subscription?.status === 'active'
            ).length;
            document.getElementById('active-subscriptions').textContent = activeSubscriptions;
            
            // Calculate monthly revenue
            let totalRevenue = 0;
            tenantsData.data.forEach(tenant => {
                if (tenant.subscription?.status === 'active') {
                    totalRevenue += tenant.subscription.plan?.price || 0;
                }
            });
            document.getElementById('monthly-revenue').textContent = totalRevenue.toLocaleString() + ' ر.س';
        }
        
        // Load users count
        const usersResponse = await fetch(`${API_URL}/superadmin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const usersData = await usersResponse.json();
        
        if (usersData.success) {
            document.getElementById('total-users').textContent = usersData.count || 0;
        }
        
    } catch (error) {
        console.error('Error loading overview:', error);
    }
}

// Load Tenants
async function loadTenants() {
    try {
        const response = await fetch(`${API_URL}/superadmin/tenants`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('tenants-table-body');
            tbody.innerHTML = '';
            
            // حساب الإحصائيات الإجمالية
            let totalMonthlyRevenue = 0;
            let totalAppointments = 0;
            let overLimitCount = 0;
            
            data.data.forEach(tenant => {
                const usage = tenant.usage || {};
                const limits = tenant.limits || {};
                const appointments = usage.appointmentsThisMonth || 0;
                const maxAppointments = limits.maxAppointmentsPerMonth || 50;
                
                totalAppointments += appointments;
                
                if (maxAppointments !== -1 && appointments > maxAppointments) {
                    overLimitCount++;
                }
                
                // حساب الإيراد من هذا المحل
                const subscriptionPlan = tenant.subscription?.plan || 'free';
                const planPrices = { 'free': 0, 'basic': 99, 'pro': 199, 'enterprise': 399 };
                const monthlyPrice = planPrices[subscriptionPlan.toLowerCase()] || 0;
                const platformPercentage = tenant.platformFees?.percentage || 5;
                const businessRevenue = tenant.stats?.totalRevenue || 0;
                const platformFee = Math.round(businessRevenue * (platformPercentage / 100));
                
                totalMonthlyRevenue += (monthlyPrice + platformFee);
            });
            
            // تحديث الإحصائيات
            const avgRevenuePerBusiness = data.data.length > 0 ? Math.round(totalMonthlyRevenue / data.data.length) : 0;
            
            document.getElementById('total-appointments-month').textContent = totalAppointments;
            document.getElementById('businesses-over-limit').textContent = overLimitCount;
            document.getElementById('total-monthly-revenue').textContent = totalMonthlyRevenue + ' ر.س';
            document.getElementById('avg-revenue-per-business').textContent = avgRevenuePerBusiness + ' ر.س';
            
            // تحديث Overview أيضاً
            if (document.getElementById('monthly-revenue')) {
                document.getElementById('monthly-revenue').textContent = totalMonthlyRevenue + ' ر.س';
            }
            
            data.data.forEach(tenant => {
                const usage = tenant.usage || {};
                const limits = tenant.limits || {};
                const appointments = usage.appointmentsThisMonth || 0;
                const maxAppointments = limits.maxAppointmentsPerMonth || 50;
                const usagePercent = maxAppointments === -1 ? 0 : Math.round((appointments / maxAppointments) * 100);
                const overLimit = maxAppointments !== -1 && appointments > maxAppointments;
                
                // حساب الاشتراك والاقتطاع
                const subscriptionPlan = tenant.subscription?.plan || 'free';
                let monthlyPrice = 0;
                let platformFee = 0;
                let platformPercentage = tenant.platformFees?.percentage || 5; // 5% عمولة المنصة
                
                // أسعار الخطط
                const planPrices = {
                    'free': 0,
                    'basic': 99,
                    'pro': 199,
                    'enterprise': 399
                };
                
                monthlyPrice = planPrices[subscriptionPlan.toLowerCase()] || 0;
                
                // حساب العمولة من إيرادات المحل
                const businessRevenue = tenant.stats?.totalRevenue || 0;
                platformFee = Math.round(businessRevenue * (platformPercentage / 100));
                
                const totalCollection = monthlyPrice + platformFee;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div class="tenant-info">
                            <div class="tenant-logo">${tenant.businessName?.charAt(0) || tenant.name?.charAt(0)}</div>
                            <div>
                                <div class="tenant-name">${tenant.businessName || tenant.name}</div>
                                <div style="font-size: 12px; color: #64748b;">${tenant.subdomain}.smartbiz.com</div>
                            </div>
                        </div>
                    </td>
                    <td>${tenant.owner?.name || '-'}</td>
                    <td><span class="plan-badge ${subscriptionPlan}">${subscriptionPlan}</span></td>
                    <td>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="display: flex; justify-content: space-between; font-size: 12px;">
                                <span ${overLimit ? 'style="color: #ef4444; font-weight: 600;"' : ''}>${appointments} / ${maxAppointments === -1 ? '∞' : maxAppointments}</span>
                                ${overLimit ? '<span style="color: #ef4444;">⚠️</span>' : ''}
                            </div>
                            ${maxAppointments !== -1 ? `
                                <div style="height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
                                    <div style="height: 100%; background: ${overLimit ? '#ef4444' : '#6366f1'}; width: ${Math.min(usagePercent, 100)}%;"></div>
                                </div>
                            ` : ''}
                        </div>
                    </td>
                    <td>
                        <div style="font-size: 12px;">
                            <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">
                                💰 ${totalCollection} ر.س/شهر
                            </div>
                            <div style="color: #64748b;">
                                📋 اشتراك: ${monthlyPrice} ر.س
                            </div>
                            <div style="color: #64748b;">
                                📊 عمولة: ${platformFee} ر.س (${platformPercentage}%)
                            </div>
                            <div style="color: #10b981; font-size: 11px; margin-top: 2px;">
                                إيرادات المحل: ${businessRevenue} ر.س
                            </div>
                        </div>
                    </td>
                    <td><span class="status-badge ${tenant.status || 'active'}">${getStatusText(tenant.status || 'active')}</span></td>
                    <td>${formatDate(tenant.createdAt)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon" onclick="viewTenantDetails('${tenant._id}')" title="عرض">👁️</button>
                            <button class="btn-icon" onclick="editTenant('${tenant._id}')" title="تعديل">✏️</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading tenants:', error);
    }
}

// Load Plans
async function loadPlans() {
    try {
        const response = await fetch(`${API_URL}/superadmin/plans`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('plans-list');
            container.innerHTML = '';
            
            data.data.forEach(plan => {
                const div = document.createElement('div');
                div.className = 'plan-card';
                if (plan.name === 'Pro') div.classList.add('featured');
                
                div.innerHTML = `
                    <h3>${plan.name}</h3>
                    <div class="plan-price">${plan.price} ر.س<span style="font-size: 16px; color: #64748b;">/شهر</span></div>
                    <ul class="plan-features">
                        <li>✅ ${plan.features?.maxUsers || 'غير محدود'} مستخدمين</li>
                        <li>✅ ${plan.features?.maxAppointments || 'غير محدود'} موعد شهرياً</li>
                        <li>✅ ${plan.features?.storage || 'غير محدود'} مساحة تخزين</li>
                        <li>${plan.features?.aiAssistant ? '✅' : '❌'} مساعد AI</li>
                        <li>${plan.features?.analytics ? '✅' : '❌'} تحليلات متقدمة</li>
                    </ul>
                    <button class="btn-primary" onclick="editPlan('${plan._id}')">تعديل الخطة</button>
                `;
                
                container.appendChild(div);
            });
        }
    } catch (error) {
        console.error('Error loading plans:', error);
    }
}

// Load Users
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/superadmin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('users-table-body');
            tbody.innerHTML = '';
            
            data.data.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div class="tenant-info">
                            <div class="tenant-logo">${user.name.charAt(0)}</div>
                            <div class="tenant-name">${user.name}</div>
                        </div>
                    </td>
                    <td>${user.email}</td>
                    <td><span class="plan-badge basic">${getRoleText(user.role)}</span></td>
                    <td>${user.tenant?.name || 'المنصة'}</td>
                    <td>${formatDate(user.createdAt)}</td>
                    <td><span class="status-badge active">نشط</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load Subscriptions
async function loadSubscriptions() {
    try {
        const response = await fetch(`${API_URL}/superadmin/tenants`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('subscriptions-list');
            container.innerHTML = '';
            
            data.data.forEach(tenant => {
                if (!tenant.subscription) return;
                
                const div = document.createElement('div');
                div.className = 'subscription-card';
                div.style.cssText = 'background: white; border-radius: 15px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 15px;';
                
                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h3 style="color: #1e293b; margin-bottom: 5px;">${tenant.name}</h3>
                            <p style="color: #64748b; font-size: 14px;">خطة ${tenant.subscription.plan?.name}</p>
                        </div>
                        <div style="text-align: left;">
                            <div style="font-size: 24px; font-weight: 700; color: #6366f1;">${tenant.subscription.plan?.price} ر.س</div>
                            <span class="status-badge ${tenant.subscription.status}">${getStatusText(tenant.subscription.status)}</span>
                        </div>
                    </div>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; font-size: 14px; color: #64748b;">
                        <span>تاريخ البداية: ${formatDate(tenant.subscription.startDate)}</span>
                        <span>تاريخ الانتهاء: ${formatDate(tenant.subscription.endDate)}</span>
                    </div>
                `;
                
                container.appendChild(div);
            });
        }
    } catch (error) {
        console.error('Error loading subscriptions:', error);
    }
}

// Load Revenue
async function loadRevenue() {
    try {
        const response = await fetch(`${API_URL}/superadmin/tenants`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            let monthlyRevenue = 0;
            let totalTenants = data.data.length;
            
            data.data.forEach(tenant => {
                if (tenant.subscription?.status === 'active') {
                    monthlyRevenue += tenant.subscription.plan?.price || 0;
                }
            });
            
            const yearlyRevenue = monthlyRevenue * 12;
            const avgSubscription = totalTenants > 0 ? (monthlyRevenue / totalTenants) : 0;
            
            document.getElementById('today-revenue').textContent = (monthlyRevenue / 30).toFixed(2) + ' ر.س';
            document.getElementById('month-revenue').textContent = monthlyRevenue.toLocaleString() + ' ر.س';
            document.getElementById('year-revenue').textContent = yearlyRevenue.toLocaleString() + ' ر.س';
            document.getElementById('avg-subscription').textContent = avgSubscription.toFixed(2) + ' ر.س';
        }
    } catch (error) {
        console.error('Error loading revenue:', error);
    }
}

// Helper Functions
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStatusText(status) {
    const statusMap = {
        'active': 'نشط',
        'inactive': 'غير نشط',
        'trial': 'تجريبي',
        'cancelled': 'ملغي',
        'expired': 'منتهي'
    };
    return statusMap[status] || status;
}

function getRoleText(role) {
    const roleMap = {
        'superadmin': 'مالك المنصة',
        'admin': 'مدير',
        'owner': 'صاحب محل',
        'employee': 'موظف'
    };
    return roleMap[role] || role;
}

function viewTenant(id) {
    alert('عرض تفاصيل المتجر: ' + id);
}

async function viewTenantDetails(id) {
    try {
        const response = await fetch(`${API_URL}/superadmin/tenants/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const tenant = data.data;
            const usage = tenant.usage || {};
            const limits = tenant.limits || {};
            
            alert(`تفاصيل المحل: ${tenant.businessName || tenant.name}\n\n` +
                  `📧 البريد: ${tenant.email}\n` +
                  `📱 الجوال: ${tenant.phone}\n` +
                  `📍 المدينة: ${tenant.address?.city || '-'}\n\n` +
                  `📊 الاستخدام الشهري:\n` +
                  `المواعيد: ${usage.appointmentsThisMonth || 0} / ${limits.maxAppointmentsPerMonth === -1 ? '∞' : limits.maxAppointmentsPerMonth}\n` +
                  `الموظفين: ${usage.employees || 0} / ${limits.maxEmployees === -1 ? '∞' : limits.maxEmployees}\n` +
                  `العملاء: ${usage.customers || 0} / ${limits.maxCustomers === -1 ? '∞' : limits.maxCustomers}\n\n` +
                  `💰 الإحصائيات:\n` +
                  `الإيرادات: ${tenant.stats?.totalRevenue || 0} ر.س\n` +
                  `المواعيد الكلية: ${tenant.stats?.totalAppointments || 0}\n` +
                  `العملاء الكليين: ${tenant.stats?.totalCustomers || 0}`
            );
        }
    } catch (error) {
        console.error('Error loading tenant details:', error);
        alert('خطأ في تحميل التفاصيل');
    }
}

function editTenant(id) {
    alert('تعديل المتجر: ' + id);
}

function deleteTenant(id) {
    if (confirm('هل أنت متأكد من حذف هذا المتجر؟')) {
        alert('تم الحذف');
    }
}

function editPlan(id) {
    alert('تعديل الخطة: ' + id);
}

function showAddTenantModal() {
    alert('نافذة إضافة متجر جديد');
}

function showAddPlanModal() {
    alert('نافذة إضافة خطة جديدة');
}

function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
}
