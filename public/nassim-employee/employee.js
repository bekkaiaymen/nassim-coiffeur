// Configuration
const API_BASE = '/api';

// State
let selectedAppointment = null;
let selectedRating = 0;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeEmployeeInterface();
});

// Initialize employee interface
function initializeEmployeeInterface() {
    // Quick add form
    const quickAddForm = document.getElementById('quickAddForm');
    quickAddForm.addEventListener('submit', handleQuickAdd);
    
    // Initialize date and time inputs
    initializeDateTimeInputs();
    
    // Star rating
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', handleStarClick);
        star.addEventListener('mouseenter', handleStarHover);
    });
    
    const starsContainer = document.getElementById('starsContainer');
    starsContainer.addEventListener('mouseleave', resetStarHover);
    
    // Rating form submission
    const ratingForm = document.getElementById('employeeRatingForm');
    ratingForm.addEventListener('submit', handleRatingSubmit);
}

// Initialize date and time inputs
function initializeDateTimeInputs() {
    const dateInput = document.getElementById('appointmentDate');
    const timeSelect = document.getElementById('appointmentTime');
    
    // Set today as default date
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.min = today;
    
    // Generate time slots (9 AM to 9 PM, every 30 minutes)
    const times = [];
    for (let hour = 9; hour < 21; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            times.push(time);
        }
    }
    
    times.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        timeSelect.appendChild(option);
    });
}

// Handle quick add form submission
async function handleQuickAdd(e) {
    e.preventDefault();
    
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const date = document.getElementById('appointmentDate').value;
    const time = document.getElementById('appointmentTime').value;
    const service = document.getElementById('serviceType').value;
    const notes = document.getElementById('notes').value.trim();
    
    if (!name || !phone || !date || !time || !service) {
        showToast('الرجاء ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    // Combine date and time
    const appointmentDate = new Date(`${date}T${time}`);
    
    const appointmentData = {
        customerName: name,
        customerPhone: phone,
        appointmentDate: appointmentDate.toISOString(),
        serviceType: service,
        notes: notes || '',
        status: 'confirmed'
    };
    
    try {
        showToast('جاري إضافة الموعد...', 'info');
        
        const response = await fetch(`${API_BASE}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });
        
        if (!response.ok) throw new Error('فشل إضافة الموعد');
        
        const result = await response.json();
        showToast('تم إضافة الموعد بنجاح ✓', 'success');
        
        // Reset form
        e.target.reset();
        initializeDateTimeInputs();
        
    } catch (error) {
        console.error('Error adding appointment:', error);
        showToast('حدث خطأ أثناء إضافة الموعد', 'error');
    }
}

// Search customer appointments
async function searchCustomer() {
    const phoneInput = document.getElementById('searchPhone');
    const phone = phoneInput.value.trim();
    
    if (!phone || phone.length !== 10) {
        showToast('الرجاء إدخال رقم هاتف صحيح (10 أرقام)', 'error');
        return;
    }
    
    try {
        showToast('جاري البحث...', 'info');
        
        const response = await fetch(`${API_BASE}/appointments?phone=${phone}&status=completed`);
        if (!response.ok) throw new Error('فشل البحث');
        
        const appointments = await response.json();
        
        if (appointments.length === 0) {
            showToast('لا توجد مواعيد مكتملة لهذا الرقم', 'error');
            hideAppointmentsList();
            return;
        }
        
        displayAppointments(appointments);
        
    } catch (error) {
        console.error('Error searching:', error);
        showToast('حدث خطأ أثناء البحث', 'error');
    }
}

// Display appointments list
function displayAppointments(appointments) {
    const appointmentsSection = document.getElementById('customerAppointments');
    const appointmentsList = document.getElementById('appointmentsList');
    
    appointmentsSection.style.display = 'block';
    appointmentsList.innerHTML = '';
    
    appointments.forEach(apt => {
        const aptEl = document.createElement('div');
        aptEl.className = 'appointment-item';
        
        const date = new Date(apt.appointmentDate);
        const dateStr = date.toLocaleDateString('ar-SA');
        const timeStr = date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        
        const hasRating = apt.employeeRating && apt.employeeRating.rating;
        
        aptEl.innerHTML = `
            <div class="appointment-info">
                <div>
                    <div class="info-label">التاريخ</div>
                    <div class="info-value">${dateStr}</div>
                </div>
                <div>
                    <div class="info-label">الوقت</div>
                    <div class="info-value">${timeStr}</div>
                </div>
                <div>
                    <div class="info-label">الخدمة</div>
                    <div class="info-value">${apt.serviceType || '-'}</div>
                </div>
                <div>
                    <div class="info-label">الحالة</div>
                    <div class="info-value" style="color: ${hasRating ? 'var(--success-color)' : 'var(--warning-color)'}">
                        ${hasRating ? '✓ تم التقييم' : 'لم يتم التقييم'}
                    </div>
                </div>
            </div>
        `;
        
        if (!hasRating) {
            aptEl.addEventListener('click', () => selectAppointmentForRating(apt));
        } else {
            aptEl.style.opacity = '0.6';
            aptEl.style.cursor = 'not-allowed';
        }
        
        appointmentsList.appendChild(aptEl);
    });
}

// Hide appointments list
function hideAppointmentsList() {
    document.getElementById('customerAppointments').style.display = 'none';
    document.getElementById('ratingFormSection').style.display = 'none';
}

// Select appointment for rating
function selectAppointmentForRating(appointment) {
    selectedAppointment = appointment;
    showRatingForm();
}

// Show rating form
function showRatingForm() {
    const ratingSection = document.getElementById('ratingFormSection');
    const infoEl = document.getElementById('selectedAppointmentInfo');
    
    ratingSection.style.display = 'block';
    
    const date = new Date(selectedAppointment.appointmentDate);
    const dateStr = date.toLocaleDateString('ar-SA');
    const timeStr = date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    
    infoEl.innerHTML = `
        <h4 class="subsection-title" style="margin-bottom: 0.75rem;">تفاصيل الموعد المحدد</h4>
        <div class="info-row">
            <span class="info-label">الاسم:</span>
            <span class="info-value">${selectedAppointment.customerName}</span>
        </div>
        <div class="info-row">
            <span class="info-label">التاريخ:</span>
            <span class="info-value">${dateStr}</span>
        </div>
        <div class="info-row">
            <span class="info-label">الوقت:</span>
            <span class="info-value">${timeStr}</span>
        </div>
        <div class="info-row">
            <span class="info-label">الخدمة:</span>
            <span class="info-value">${selectedAppointment.serviceType || '-'}</span>
        </div>
    `;
    
    // Reset rating form
    selectedRating = 0;
    document.getElementById('ratingValue').value = '';
    document.getElementById('ratingComment').value = '';
    document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
    document.getElementById('ratingText').textContent = 'اختر التقييم';
    
    // Scroll to rating form
    ratingSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Cancel rating
function cancelRating() {
    document.getElementById('ratingFormSection').style.display = 'none';
    selectedAppointment = null;
    selectedRating = 0;
}

// Handle star click
function handleStarClick(e) {
    const rating = parseInt(e.target.dataset.rating);
    selectedRating = rating;
    document.getElementById('ratingValue').value = rating;
    
    updateStars(rating);
    updateRatingText(rating);
}

// Handle star hover
function handleStarHover(e) {
    const rating = parseInt(e.target.dataset.rating);
    updateStars(rating, true);
}

// Reset star hover
function resetStarHover() {
    updateStars(selectedRating);
}

// Update stars display
function updateStars(rating, isHover = false) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Update rating text
function updateRatingText(rating) {
    const ratingText = document.getElementById('ratingText');
    const texts = {
        1: 'سيء جداً - عميل صعب 😞',
        2: 'سيء - عميل غير متعاون 😕',
        3: 'متوسط - عادي 😐',
        4: 'جيد - عميل لطيف 😊',
        5: 'ممتاز - عميل رائع 😍'
    };
    ratingText.textContent = texts[rating] || 'اختر التقييم';
}

// Handle rating form submission
async function handleRatingSubmit(e) {
    e.preventDefault();
    
    if (!selectedAppointment) {
        showToast('لم يتم اختيار موعد', 'error');
        return;
    }
    
    if (selectedRating === 0) {
        showToast('الرجاء اختيار التقييم', 'error');
        return;
    }
    
    const comment = document.getElementById('ratingComment').value.trim();
    
    const ratingData = {
        rating: selectedRating,
        comment: comment || ''
    };
    
    try {
        showToast('جاري إرسال التقييم...', 'info');
        
        const response = await fetch(`${API_BASE}/appointments/${selectedAppointment._id}/employee-rating`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ratingData)
        });
        
        if (!response.ok) throw new Error('فشل إرسال التقييم');
        
        showToast('تم إرسال التقييم بنجاح ✓', 'success');
        
        // Reset and hide rating form
        cancelRating();
        
        // Re-search to update list
        searchCustomer();
        
    } catch (error) {
        console.error('Error submitting rating:', error);
        showToast('حدث خطأ أثناء إرسال التقييم', 'error');
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'error' ? 'var(--danger-color)' : 
                            type === 'info' ? 'var(--secondary-color)' : 
                            'var(--success-color)';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
