// Configuration
const API_BASE = '/api';

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeTimeline();
    
    // Auto-refresh every 5 minutes
    setInterval(() => {
        refreshTimeline();
    }, 5 * 60 * 1000);
});

// Initialize timeline with today's date
function initializeTimeline() {
    const dateInput = document.getElementById('timelineDate');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.max = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // +60 days
    loadTimeline(today);
}

// Refresh timeline (called by button)
function refreshTimeline() {
    const dateInput = document.getElementById('timelineDate');
    const selectedDate = dateInput.value;
    if (selectedDate) {
        loadTimeline(selectedDate);
    }
}

// Load timeline for specific date
async function loadTimeline(date) {
    try {
        showToast('جاري تحميل البيانات...', 'info');
        
        // Use public endpoint
        const response = await fetch(`${API_BASE}/appointments/public?date=${date}`);
        if (!response.ok) throw new Error('فشل تحميل البيانات');
        
        const result = await response.json();
        const appointments = result.data || [];
        
        renderTimeline(date, appointments);
        renderSummary(appointments);
        
    } catch (error) {
        console.error('Error loading timeline:', error);
        showToast('حدث خطأ أثناء تحميل البيانات', 'error');
    }
}

// Render timeline grid
function renderTimeline(date, appointments) {
    const grid = document.getElementById('timelineGrid');
    grid.innerHTML = '';
    
    // Define working hours (9 AM to 9 PM)
    const startHour = 9;
    const endHour = 21;
    const slotDuration = 30; // minutes
    
    // Generate time slots
    const slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            slots.push({ time, appointments: [] });
        }
    }
    
    // Map appointments to slots
    appointments.forEach(apt => {
        const aptTime = new Date(apt.appointmentDate).toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const slot = slots.find(s => s.time === aptTime);
        if (slot) {
            slot.appointments.push(apt);
        }
    });
    
    // Render slots
    slots.forEach(slot => {
        const slotEl = document.createElement('div');
        
        let statusClass = 'available';
        let statusText = 'متاح للحجز';
        let details = '';
        
        if (slot.appointments.length > 0) {
            const bookedCount = slot.appointments.length;
            const confirmedCount = slot.appointments.filter(a => a.status === 'confirmed').length;
            
            if (confirmedCount >= 3) {
                statusClass = 'booked';
                statusText = 'محجوز بالكامل';
                details = `${bookedCount} موعد`;
            } else if (bookedCount > 0) {
                statusClass = 'partially';
                statusText = 'متاح جزئياً';
                details = `${bookedCount} موعد، ${3 - confirmedCount} متاح`;
            }
        }
        
        slotEl.className = `timeline-slot ${statusClass}`;
        slotEl.innerHTML = `
            <div class="slot-time">${slot.time}</div>
            <div class="slot-status">${statusText}</div>
            ${details ? `<div class="slot-details">${details}</div>` : ''}
        `;
        
        // Add click handler for available/partially slots
        if (statusClass !== 'booked') {
            slotEl.addEventListener('click', () => {
                window.location.href = `/book-now?date=${date}&time=${slot.time}`;
            });
        }
        
        grid.appendChild(slotEl);
    });
}

// Render summary cards
function renderSummary(appointments) {
    const summaryEl = document.getElementById('timelineSummary');
    
    const total = appointments.length;
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const pending = appointments.filter(a => a.status === 'pending').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const available = (12 * 2) - confirmed; // 12 hours * 2 slots per hour - confirmed appointments
    
    summaryEl.innerHTML = `
        <div class="summary-item">
            <div class="summary-value" style="color: var(--primary-color);">${total}</div>
            <div class="summary-label">إجمالي المواعيد</div>
        </div>
        <div class="summary-item">
            <div class="summary-value" style="color: var(--success-color);">${confirmed}</div>
            <div class="summary-label">محجوز</div>
        </div>
        <div class="summary-item">
            <div class="summary-value" style="color: var(--warning-color);">${pending}</div>
            <div class="summary-label">قيد الانتظار</div>
        </div>
        <div class="summary-item">
            <div class="summary-value" style="color: var(--secondary-color);">${completed}</div>
            <div class="summary-label">مكتمل</div>
        </div>
        <div class="summary-item">
            <div class="summary-value" style="color: var(--success-color);">${Math.max(0, available)}</div>
            <div class="summary-label">أوقات متاحة</div>
        </div>
    `;
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
