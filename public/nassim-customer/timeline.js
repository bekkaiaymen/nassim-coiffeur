// Configuration
const API_BASE = '/api';

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeTimeline();
    startClock();
    
    // Auto-refresh every 5 minutes
    setInterval(() => {
        refreshTimeline();
    }, 5 * 60 * 1000);
});

function startClock() {
    const clockEl = document.getElementById('clockDisplay');
    if (!clockEl) return;
    
    setInterval(() => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }, 1000);
}

// Initialize timeline with today's date
function initializeTimeline() {
    const dateInput = document.getElementById('timelineDate');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.max = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // +60 days
    
    // Add change listener
    dateInput.addEventListener('change', () => refreshTimeline());
    
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
        // showToast('جاري تحميل البيانات...', 'info'); // Removed toast for cleaner display
        
        // Use public endpoint
        const response = await fetch(`${API_BASE}/appointments/public?date=${date}`);
        if (!response.ok) throw new Error('فشل تحميل البيانات');
        
        const result = await response.json();
        const appointments = result.data || [];
        
        renderTimeline(date, appointments);
        // renderSummary(appointments); // Removed summary for cleaner display
        
    } catch (error) {
        console.error('Error loading timeline:', error);
        showToast('حدث خطأ أثناء تحميل البيانات', 'error');
    }
}

// Render timeline grid
function renderTimeline(date, appointments) {
    const strip = document.getElementById('timelineStrip');
    strip.innerHTML = '';
    
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
        const aptTime = new Date(apt.date).toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Also check string time if date object time is 00:00 (legacy data)
        const timeToCheck = (aptTime === '00:00' && apt.time) ? apt.time : aptTime;
        
        const slot = slots.find(s => s.time === timeToCheck);
        if (slot) {
            slot.appointments.push(apt);
        }
    });
    
    // Render slots
    slots.forEach(slot => {
        const slotEl = document.createElement('div');
        
        let statusClass = 'available';
        let statusText = 'متاح';
        let details = '';
        
        if (slot.appointments.length > 0) {
            const bookedCount = slot.appointments.length;
            const confirmedCount = slot.appointments.filter(a => a.status === 'confirmed').length;
            
            // Assuming 3 chairs/barbers
            const maxCapacity = 3;
            
            if (confirmedCount >= maxCapacity) {
                statusClass = 'booked';
                statusText = 'محجوز';
                details = 'جميع الكراسي مشغولة';
            } else if (bookedCount > 0) {
                statusClass = 'partially';
                statusText = 'متاح جزئياً';
                const availableChairs = maxCapacity - confirmedCount;
                details = `${availableChairs} كرسي متاح`;
            }
            
            // If we have employee names, show them
            const employees = slot.appointments
                .map(a => a.employee ? a.employee.name : null)
                .filter(Boolean);
                
            if (employees.length > 0) {
                // details += `<br><small>${employees.join(', ')}</small>`;
            }
        }
        
        slotEl.className = `timeline-slot ${statusClass}`;
        slotEl.innerHTML = `
            <div class="slot-time">${slot.time}</div>
            <div class="slot-status">${statusText}</div>
            <div class="slot-details">${details}</div>
        `;
        
        strip.appendChild(slotEl);
    });
    
    // Auto-scroll to current time
    scrollToCurrentTime(slots);
}

function scrollToCurrentTime(slots) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Find closest slot
    const currentTimeVal = currentHour * 60 + currentMinute;
    
    let closestSlotIndex = -1;
    let minDiff = Infinity;
    
    slots.forEach((slot, index) => {
        const [h, m] = slot.time.split(':').map(Number);
        const slotTimeVal = h * 60 + m;
        const diff = Math.abs(slotTimeVal - currentTimeVal);
        if (diff < minDiff) {
            minDiff = diff;
            closestSlotIndex = index;
        }
    });
    
    if (closestSlotIndex !== -1) {
        const strip = document.getElementById('timelineStrip');
        const slotWidth = 220 + 24; // Width + Gap
        const scrollPos = (closestSlotIndex * slotWidth) - (strip.clientWidth / 2) + (slotWidth / 2);
        
        strip.scrollTo({
            left: scrollPos,
            behavior: 'smooth'
        });
    }
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
