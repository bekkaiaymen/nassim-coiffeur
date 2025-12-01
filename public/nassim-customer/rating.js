// Configuration
const API_BASE = '/api';

// State
let currentAppointments = [];
let selectedAppointment = null;
let selectedRating = 0;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeRatingForm();
});

// Initialize rating form
function initializeRatingForm() {
    // Phone lookup form
    const lookupForm = document.getElementById('lookupForm');
    lookupForm.addEventListener('submit', handlePhoneLookup);
    
    // Star rating
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', handleStarClick);
        star.addEventListener('mouseenter', handleStarHover);
    });
    
    const starsContainer = document.getElementById('starsContainer');
    starsContainer.addEventListener('mouseleave', resetStarHover);
    
    // Rating form submission
    const ratingForm = document.getElementById('ratingForm');
    ratingForm.addEventListener('submit', handleRatingSubmit);
}

// Handle phone lookup
async function handlePhoneLookup(e) {
    e.preventDefault();
    
    const phoneInput = document.getElementById('phoneNumber');
    const phone = phoneInput.value.trim();
    
    if (!phone || phone.length !== 10) {
        showToast('الرجاء إدخال رقم هاتف صحيح (10 أرقام)', 'error');
        return;
    }
    
    try {
        showToast('جاري البحث عن المواعيد...', 'info');
        
        const response = await fetch(`${API_BASE}/appointments?phone=${phone}&status=completed`);
        if (!response.ok) throw new Error('فشل البحث عن المواعيد');
        
        const appointments = await response.json();
        
        if (appointments.length === 0) {
            showToast('لا توجد مواعيد مكتملة لهذا الرقم', 'error');
            return;
        }
        
        currentAppointments = appointments;
        showAppointmentsList();
        
    } catch (error) {
        console.error('Error looking up appointments:', error);
        showToast('حدث خطأ أثناء البحث عن المواعيد', 'error');
    }
}

// Show appointments list
function showAppointmentsList() {
    const lookupSection = document.getElementById('lookupSection');
    const appointmentsSection = document.getElementById('appointmentsSection');
    const appointmentsList = document.getElementById('appointmentsList');
    
    lookupSection.style.display = 'none';
    appointmentsSection.style.display = 'block';
    
    appointmentsList.innerHTML = '';
    
    currentAppointments.forEach(apt => {
        const aptEl = document.createElement('div');
        aptEl.className = 'appointment-item';
        
        const date = new Date(apt.appointmentDate);
        const dateStr = date.toLocaleDateString('ar-SA', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const timeStr = date.toLocaleTimeString('ar-SA', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const hasRating = apt.customerRating && apt.customerRating.rating;
        
        aptEl.innerHTML = `
            <div class="appointment-info">
                <div class="info-item">
                    <span class="info-label">التاريخ</span>
                    <span class="info-value">${dateStr}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">الوقت</span>
                    <span class="info-value">${timeStr}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">اسم العميل</span>
                    <span class="info-value">${apt.customerName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">الحالة</span>
                    <span class="info-value" style="color: ${hasRating ? 'var(--success-color)' : 'var(--warning-color)'}">
                        ${hasRating ? '✓ تم التقييم' : 'لم يتم التقييم'}
                    </span>
                </div>
            </div>
        `;
        
        if (!hasRating) {
            aptEl.addEventListener('click', () => selectAppointment(apt));
        } else {
            aptEl.style.opacity = '0.6';
            aptEl.style.cursor = 'not-allowed';
        }
        
        appointmentsList.appendChild(aptEl);
    });
}

// Select appointment for rating
function selectAppointment(appointment) {
    selectedAppointment = appointment;
    showRatingForm();
}

// Show rating form
function showRatingForm() {
    const appointmentsSection = document.getElementById('appointmentsSection');
    const ratingSection = document.getElementById('ratingSection');
    const detailsEl = document.getElementById('selectedAppointmentDetails');
    
    appointmentsSection.style.display = 'none';
    ratingSection.style.display = 'block';
    
    const date = new Date(selectedAppointment.appointmentDate);
    const dateStr = date.toLocaleDateString('ar-SA', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const timeStr = date.toLocaleTimeString('ar-SA', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    detailsEl.innerHTML = `
        <h3 class="section-title" style="margin-bottom: 1rem;">تفاصيل الموعد</h3>
        <div class="detail-row">
            <span class="detail-label">التاريخ</span>
            <span class="detail-value">${dateStr}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">الوقت</span>
            <span class="detail-value">${timeStr}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">اسم العميل</span>
            <span class="detail-value">${selectedAppointment.customerName}</span>
        </div>
        ${selectedAppointment.completion && selectedAppointment.completion.services ? `
        <div class="detail-row">
            <span class="detail-label">الخدمات</span>
            <span class="detail-value">${selectedAppointment.completion.services.join(', ')}</span>
        </div>
        ` : ''}
    `;
    
    // Reset form
    selectedRating = 0;
    document.getElementById('ratingValue').value = '';
    document.getElementById('comment').value = '';
    document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
    document.getElementById('ratingText').textContent = 'اختر التقييم';
}

// Back to appointments list
function backToAppointments() {
    const appointmentsSection = document.getElementById('appointmentsSection');
    const ratingSection = document.getElementById('ratingSection');
    
    ratingSection.style.display = 'none';
    appointmentsSection.style.display = 'block';
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
        1: 'سيء جداً 😞',
        2: 'سيء 😕',
        3: 'متوسط 😐',
        4: 'جيد 😊',
        5: 'ممتاز 😍'
    };
    ratingText.textContent = texts[rating] || 'اختر التقييم';
}

// Handle rating form submission
async function handleRatingSubmit(e) {
    e.preventDefault();
    
    if (selectedRating === 0) {
        showToast('الرجاء اختيار التقييم', 'error');
        return;
    }
    
    const comment = document.getElementById('comment').value.trim();
    
    const ratingData = {
        rating: selectedRating,
        comment: comment || ''
    };
    
    try {
        showToast('جاري إرسال التقييم...', 'info');
        
        const response = await fetch(`${API_BASE}/appointments/${selectedAppointment._id}/customer-rating`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ratingData)
        });
        
        if (!response.ok) throw new Error('فشل إرسال التقييم');
        
        showSuccessMessage();
        
    } catch (error) {
        console.error('Error submitting rating:', error);
        showToast('حدث خطأ أثناء إرسال التقييم', 'error');
    }
}

// Show success message
function showSuccessMessage() {
    const ratingSection = document.getElementById('ratingSection');
    const successSection = document.getElementById('successSection');
    
    ratingSection.style.display = 'none';
    successSection.style.display = 'block';
}

// Reset rating flow
function resetRating() {
    const successSection = document.getElementById('successSection');
    const lookupSection = document.getElementById('lookupSection');
    
    successSection.style.display = 'none';
    lookupSection.style.display = 'block';
    
    // Reset form
    document.getElementById('phoneNumber').value = '';
    currentAppointments = [];
    selectedAppointment = null;
    selectedRating = 0;
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
