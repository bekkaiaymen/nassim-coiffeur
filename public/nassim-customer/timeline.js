// Configuration
const API_BASE = '/api';
const START_HOUR = 9;
const END_HOUR = 22; // Extended to 10 PM
const PIXELS_PER_MINUTE = 6; // Width of 1 minute in pixels

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeTimeline();
    startClock();
    startAutoScroll();
    
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

function startAutoScroll() {
    // Update position every 10 seconds
    setInterval(() => {
        updateCurrentTimeLine();
    }, 10000);
    
    // Initial update
    setTimeout(updateCurrentTimeLine, 500);
}

function updateCurrentTimeLine() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Only scroll if within working hours
    if (currentHour < START_HOUR || currentHour >= END_HOUR) return;
    
    const minutesSinceStart = (currentHour - START_HOUR) * 60 + currentMinute;
    const position = minutesSinceStart * PIXELS_PER_MINUTE;
    
    const line = document.getElementById('currentTimeLine');
    if (line) {
        line.style.left = `${position}px`;
    }
    
    // Scroll container to center the line
    const container = document.querySelector('.timeline-strip-container');
    if (container) {
        const centerOffset = container.clientWidth / 2;
        container.scrollTo({
            left: position - centerOffset,
            behavior: 'smooth'
        });
    }
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
        // Use public endpoint
        const response = await fetch(`${API_BASE}/appointments/public?date=${date}`);
        if (!response.ok) throw new Error('فشل تحميل البيانات');
        
        const result = await response.json();
        const appointments = result.data || [];
        
        renderTimeline(date, appointments);
        
    } catch (error) {
        console.error('Error loading timeline:', error);
        showToast('حدث خطأ أثناء تحميل البيانات', 'error');
    }
}

// Render timeline strip
function renderTimeline(date, appointments) {
    const strip = document.getElementById('timelineStrip');
    strip.innerHTML = '';
    
    // Calculate total width
    const totalMinutes = (END_HOUR - START_HOUR) * 60;
    const totalWidth = totalMinutes * PIXELS_PER_MINUTE;
    strip.style.width = `${totalWidth}px`;
    
    // Render Time Markers (every 30 mins)
    for (let i = 0; i <= totalMinutes; i += 30) {
        const marker = document.createElement('div');
        const isHour = i % 60 === 0;
        marker.className = `time-marker ${isHour ? 'hour' : ''}`;
        marker.style.left = `${i * PIXELS_PER_MINUTE}px`;
        
        // Calculate time label
        const totalMin = (START_HOUR * 60) + i;
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        const timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        
        marker.textContent = timeLabel;
        strip.appendChild(marker);
    }
    
    // Render "Now" Line
    const nowLine = document.createElement('div');
    nowLine.id = 'currentTimeLine';
    nowLine.className = 'current-time-line';
    strip.appendChild(nowLine);
    
    // Render Appointments
    appointments.forEach(apt => {
        let h, m;
        
        // Try to parse time from 'time' string field first (format "HH:MM")
        if (apt.time && typeof apt.time === 'string' && apt.time.includes(':')) {
            [h, m] = apt.time.split(':').map(Number);
        } else {
            // Fallback to date object
            const aptDate = new Date(apt.date);
            h = aptDate.getHours();
            m = aptDate.getMinutes();
        }
        
        // Skip if out of range
        if (h < START_HOUR || h >= END_HOUR) return;
        
        const minutesFromStart = (h - START_HOUR) * 60 + m;
        const leftPos = minutesFromStart * PIXELS_PER_MINUTE;
        
        // Duration (default 30 mins if not set)
        const duration = apt.serviceId?.duration || 30;
        const width = duration * PIXELS_PER_MINUTE;
        
        const el = document.createElement('div');
        el.className = 'timeline-appointment booked';
        el.style.left = `${leftPos}px`;
        el.style.width = `${width}px`;
        
        el.innerHTML = `
            <div class="apt-time">${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}</div>
            <div class="apt-name">${apt.customerName || 'محجوز'}</div>
            <div class="apt-service">${apt.serviceId?.name || 'خدمة'}</div>
        `;
        
        strip.appendChild(el);
    });
    
    // Initial positioning
    updateCurrentTimeLine();
}

// Removed old renderTimeline and scrollToCurrentTime functions


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
