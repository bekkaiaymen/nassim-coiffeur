// Global State
let selectedAppointmentId = null;
let haircutRatingValue = 0;
let barberRatingValue = 0;

// API Base URL
const API_BASE = '/api';

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initCustomerApp();
});

// Initialize App
function initCustomerApp() {
    setupNavigation();
    setupTimeline();
    setupRatingForm();
    
    // Set default date to today
    const dateInput = document.getElementById('timelineDate');
    if (dateInput) {
        dateInput.value = formatDateForInput(new Date());
        loadTimelineSlots(new Date());
    }
}

// Navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetPage = this.dataset.page;
            
            // Special handling for refer friend button
            if (this.id === 'referFriendBtn') {
                handleReferFriend();
                return;
            }
            
            // Update nav active state
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Show target page
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(targetPage + 'Page').classList.add('active');
        });
    });
}

// Handle Refer Friend
function handleReferFriend() {
    // Get customer name from localStorage if available
    const customerData = JSON.parse(localStorage.getItem('customerData') || '{}');
    const referrerName = customerData.name || 'صديقك';
    
    const quickBookUrl = `${window.location.origin}/quick-book.html?ref=${encodeURIComponent(referrerName)}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(quickBookUrl).then(() => {
        showToast('✅ تم نسخ رابط الحجز السريع!', 'success');
        
        // Show share options if available
        if (navigator.share) {
            navigator.share({
                title: 'نسيم كوافير - حجز سريع',
                text: `${referrerName} يدعوك لحجز موعد في نسيم كوافير!`,
                url: quickBookUrl
            }).catch(err => console.log('Share cancelled'));
        }
    }).catch(err => {
        showToast('فشل في النسخ. الرابط: ' + quickBookUrl, 'error');
    });
}

// Timeline Setup
function setupTimeline() {
    const dateInput = document.getElementById('timelineDate');
    const refreshBtn = document.getElementById('refreshTimeline');
    
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            const selectedDate = new Date(this.value + 'T00:00:00');
            loadTimelineSlots(selectedDate);
        });
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const dateValue = dateInput.value;
            const selectedDate = dateValue ? new Date(dateValue + 'T00:00:00') : new Date();
            loadTimelineSlots(selectedDate);
        });
    }
}

// Load Timeline Slots
async function loadTimelineSlots(date) {
    try {
        const formattedDate = formatDateForAPI(date);
        
        // Fetch appointments for the selected date
        const response = await fetch(`${API_BASE}/appointments?date=${formattedDate}`);
        
        if (!response.ok) {
            throw new Error('فشل في تحميل المواعيد');
        }
        
        const appointments = await response.json();
        
        // Generate time slots
        const slots = generateTimeSlots(date, appointments);
        
        // Render timeline
        renderTimelineSlots(slots);
        
        // Update summary
        updateTimelineSummary(slots);
        
    } catch (error) {
        console.error('Timeline error:', error);
        showToast('حدث خطأ أثناء تحميل الجدول الزمني', 'error');
    }
}

// Generate Time Slots (9 AM to 9 PM, 30-minute intervals)
function generateTimeSlots(date, appointments) {
    const slots = [];
    const startHour = 9;
    const endHour = 21;
    const intervalMinutes = 30;
    
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += intervalMinutes) {
            const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            
            // Check if this slot has an appointment
            const appointment = appointments.find(apt => 
                apt.time === timeString && apt.status !== 'cancelled'
            );
            
            const slot = {
                time: timeString,
                status: appointment ? appointment.status : 'available',
                appointment: appointment || null
            };
            
            slots.push(slot);
        }
    }
    
    return slots;
}

// Render Timeline Slots
function renderTimelineSlots(slots) {
    const grid = document.getElementById('timelineGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    slots.forEach(slot => {
        const slotDiv = document.createElement('div');
        slotDiv.className = `timeline-slot ${slot.status}`;
        
        let statusText = 'متاح';
        if (slot.status === 'confirmed' || slot.status === 'pending') {
            statusText = 'محجوز';
        } else if (slot.status === 'completed') {
            statusText = 'مكتمل';
        }
        
        slotDiv.innerHTML = `
            <span class="slot-time">${slot.time}</span>
            <span class="slot-status ${slot.status === 'available' ? 'available' : slot.status === 'completed' ? 'completed' : 'booked'}">
                ${statusText}
            </span>
            ${slot.appointment ? `
                <div class="slot-details">
                    <div class="slot-detail-row">
                        <span class="slot-detail-label">الخدمة:</span>
                        <span class="slot-detail-value">${slot.appointment.serviceName || '-'}</span>
                    </div>
                    <div class="slot-detail-row">
                        <span class="slot-detail-label">الحلاق:</span>
                        <span class="slot-detail-value">${slot.appointment.employeeName || '-'}</span>
                    </div>
                </div>
            ` : ''}
        `;
        
        // Click handler for available slots
        if (slot.status === 'available') {
            slotDiv.addEventListener('click', () => {
                showToast('يمكنك الحجز عن طريق الاتصال بالمحل', 'info');
            });
        }
        
        grid.appendChild(slotDiv);
    });
}

// Update Timeline Summary
function updateTimelineSummary(slots) {
    const available = slots.filter(s => s.status === 'available').length;
    const booked = slots.filter(s => s.status === 'confirmed' || s.status === 'pending').length;
    const total = slots.length;
    
    document.getElementById('availableSlots').textContent = available;
    document.getElementById('bookedSlots').textContent = booked;
    document.getElementById('totalSlots').textContent = total;
}

// Rating Form Setup
function setupRatingForm() {
    const findBtn = document.getElementById('findAppointment');
    const form = document.getElementById('haircutRatingForm');
    
    if (findBtn) {
        findBtn.addEventListener('click', findCustomerAppointment);
    }
    
    if (form) {
        form.addEventListener('submit', submitHaircutRating);
    }
    
    // Setup star ratings
    setupStarRating('haircutStars', 'haircutRating', (value) => {
        haircutRatingValue = value;
    });
    
    setupStarRating('barberStars', 'barberRating', (value) => {
        barberRatingValue = value;
    });
}

// Find Customer Appointment
async function findCustomerAppointment() {
    const phone = document.getElementById('customerPhone').value.trim();
    
    if (!phone) {
        showToast('الرجاء إدخال رقم الهاتف', 'error');
        return;
    }
    
    try {
        // Search for completed appointments by phone
        const response = await fetch(`${API_BASE}/appointments?phone=${encodeURIComponent(phone)}&status=completed`);
        
        if (!response.ok) {
            throw new Error('فشل في البحث عن المواعيد');
        }
        
        const appointments = await response.json();
        
        if (!appointments || appointments.length === 0) {
            showToast('لم يتم العثور على مواعيد مكتملة', 'error');
            return;
        }
        
        // Get the most recent completed appointment
        const latestAppointment = appointments.sort((a, b) => {
            const dateA = new Date(a.date + 'T' + a.time);
            const dateB = new Date(b.date + 'T' + b.time);
            return dateB - dateA;
        })[0];
        
        // Check if already rated
        if (latestAppointment.haircutRating || latestAppointment.barberRating) {
            showToast('تم تقييم هذا الموعد مسبقاً', 'error');
            return;
        }
        
        // Display appointment info
        selectedAppointmentId = latestAppointment._id;
        document.getElementById('appointmentDate').textContent = formatDateArabic(latestAppointment.date);
        document.getElementById('appointmentTime').textContent = latestAppointment.time;
        document.getElementById('appointmentBarber').textContent = latestAppointment.employeeName || '-';
        document.getElementById('appointmentService').textContent = latestAppointment.serviceName || '-';
        
        document.getElementById('appointmentInfo').style.display = 'block';
        document.getElementById('ratingSection').style.display = 'block';
        
        showToast('تم العثور على الموعد!', 'success');
        
    } catch (error) {
        console.error('Find appointment error:', error);
        showToast('حدث خطأ أثناء البحث', 'error');
    }
}

// Submit Haircut Rating
async function submitHaircutRating(event) {
    event.preventDefault();
    
    if (!selectedAppointmentId) {
        showToast('الرجاء البحث عن موعدك أولاً', 'error');
        return;
    }
    
    if (haircutRatingValue === 0 || barberRatingValue === 0) {
        showToast('الرجاء تقييم الحلاقة والحلاق', 'error');
        return;
    }
    
    const comment = document.getElementById('ratingComment').value.trim();
    const recommend = document.querySelector('input[name="recommend"]:checked')?.value;
    
    if (!recommend) {
        showToast('الرجاء اختيار إذا كنت توصي بالمحل أم لا', 'error');
        return;
    }
    
    try {
        const payload = {
            haircutRating: haircutRatingValue,
            barberRating: barberRatingValue,
            ratingComment: comment,
            recommendShop: recommend === 'yes',
            ratedAt: new Date().toISOString()
        };
        
        const response = await fetch(`${API_BASE}/appointments/${selectedAppointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error('فشل في حفظ التقييم');
        }
        
        showToast('شكراً لك! تم إرسال تقييمك بنجاح', 'success');
        
        // Reset form
        document.getElementById('haircutRatingForm').reset();
        document.getElementById('appointmentInfo').style.display = 'none';
        document.getElementById('ratingSection').style.display = 'none';
        resetStars('haircutStars');
        resetStars('barberStars');
        haircutRatingValue = 0;
        barberRatingValue = 0;
        selectedAppointmentId = null;
        
    } catch (error) {
        console.error('Submit rating error:', error);
        showToast('حدث خطأ أثناء إرسال التقييم', 'error');
    }
}

// Star Rating Setup
function setupStarRating(containerId, inputId, callback) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    
    if (!container || !input) return;
    
    const stars = container.querySelectorAll('.star');
    
    stars.forEach((star, index) => {
        star.addEventListener('click', function() {
            const value = parseInt(this.dataset.value);
            input.value = value;
            callback(value);
            
            // Update visual state
            stars.forEach((s, i) => {
                if (i < value) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
        
        star.addEventListener('mouseenter', function() {
            const value = parseInt(this.dataset.value);
            stars.forEach((s, i) => {
                if (i < value) {
                    s.style.color = '#f39c12';
                } else {
                    s.style.color = '#dfe6e9';
                }
            });
        });
    });
    
    container.addEventListener('mouseleave', function() {
        const currentValue = parseInt(input.value) || 0;
        stars.forEach((s, i) => {
            if (i < currentValue) {
                s.style.color = '#f39c12';
            } else {
                s.style.color = '#dfe6e9';
            }
        });
    });
}

// Reset Stars
function resetStars(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const stars = container.querySelectorAll('.star');
    stars.forEach(star => {
        star.classList.remove('active');
        star.style.color = '#dfe6e9';
    });
}

// Utility Functions
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateForAPI(date) {
    return formatDateForInput(date);
}

function formatDateArabic(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('ar-SA', options);
}

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
