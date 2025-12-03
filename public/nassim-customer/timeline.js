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
    
    // Auto-refresh every 10 seconds
    setInterval(() => {
        refreshTimeline();
    }, 10 * 1000);
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
    
    // Check if within working hours
    if (currentHour < START_HOUR || currentHour >= END_HOUR) {
        const line = document.getElementById('currentTimeLine');
        if (line) line.style.display = 'none';
        return;
    }
    
    const minutesSinceStart = (currentHour - START_HOUR) * 60 + currentMinute;
    const position = 180 + (minutesSinceStart * PIXELS_PER_MINUTE);
    
    const line = document.getElementById('currentTimeLine');
    if (line) {
        line.style.display = 'block';
        line.style.left = `${position}px`;
        
        // Scroll to center the line
        line.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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
        // Get appointments
        const apptResponse = await fetch(`${API_BASE}/appointments/public?date=${date}`);
        if (!apptResponse.ok) throw new Error('فشل تحميل البيانات');
        
        const apptResult = await apptResponse.json();
        const appointments = apptResult.data || [];
        
        // Get available employees for this date
        const empResponse = await fetch(`${API_BASE}/employees/available`);
        let availableEmployees = [];
        if (empResponse.ok) {
            const empResult = await empResponse.json();
            availableEmployees = empResult.data || [];
        }
        
        renderTimeline(date, appointments, availableEmployees);
        
    } catch (error) {
        console.error('Error loading timeline:', error);
        showToast('حدث خطأ أثناء تحميل البيانات', 'error');
    }
}

// Render timeline strip
function renderTimeline(date, appointments, availableEmployees = []) {
    const strip = document.getElementById('timelineStrip');
    strip.innerHTML = '';
    
    // Calculate total width
    const totalMinutes = (END_HOUR - START_HOUR) * 60;
    const totalWidth = totalMinutes * PIXELS_PER_MINUTE;
    strip.style.width = `${totalWidth + 180}px`; // Add space for barber names
    
    // Header Row (Time Markers)
    const headerRow = document.createElement('div');
    headerRow.className = 'timeline-header-row';
    headerRow.style.width = `${totalWidth + 180}px`;
    
    // Empty corner
    const corner = document.createElement('div');
    corner.className = 'timeline-corner';
    corner.style.width = '180px';
    headerRow.appendChild(corner);

    // Render Time Markers (every 30 mins)
    for (let i = 0; i <= totalMinutes; i += 30) {
        const marker = document.createElement('div');
        const isHour = i % 60 === 0;
        marker.className = `time-marker ${isHour ? 'hour' : ''}`;
        marker.style.left = `${180 + (i * PIXELS_PER_MINUTE)}px`; // Offset by 180px
        
        // Calculate time label
        const totalMin = (START_HOUR * 60) + i;
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        const timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        
        marker.textContent = timeLabel;
        headerRow.appendChild(marker);
    }
    strip.appendChild(headerRow);

    // Map available employees by name
    const availableMap = {};
    availableEmployees.forEach(emp => {
        availableMap[emp.name] = {
            id: emp._id,
            checkInTime: emp.todayAttendance?.checkInTime || '09:00',
            checkOutTime: emp.todayAttendance?.checkOutTime || '21:00'
        };
    });

    // Filter employees to show only those who are present
    const today = new Date().toISOString().split('T')[0];
    const selectedDate = document.getElementById('timelineDate').value;
    
    let employees = [];
    
    // Only show available employees for today
    if (selectedDate === today && availableEmployees.length > 0) {
        employees = availableEmployees.map(emp => ({
            name: emp.name,
            id: emp._id,
            avatar: emp.avatar || '/images/default-avatar.png',
            checkInTime: emp.todayAttendance?.checkInTime || '09:00',
            checkOutTime: emp.todayAttendance?.checkOutTime || '21:00',
            isAvailable: true
        }));
    }
    
    // Show message if no employees available
    if (employees.length === 0) {
        strip.innerHTML = '<div style="text-align: center; padding: 60px; color: #888; font-size: 18px;">لا يوجد حلاقين متاحين في هذا التاريخ 😔</div>';
        return;
    }

    // Render Rows
    employees.forEach(emp => {
        const row = document.createElement('div');
        row.className = 'timeline-row';
        row.style.width = `${totalWidth + 180}px`;

        // Barber Name Column with Avatar
        const nameCol = document.createElement('div');
        nameCol.className = 'barber-name-col';
        
        // Avatar
        const avatar = document.createElement('img');
        avatar.src = emp.avatar || '/images/default-avatar.png';
        avatar.alt = emp.name;
        avatar.className = 'barber-avatar';
        avatar.onerror = function() {
            this.src = '/images/default-avatar.png';
        };
        
        // Name
        const nameText = document.createElement('div');
        nameText.className = 'barber-name-text';
        nameText.textContent = emp.name;
        
        nameCol.appendChild(avatar);
        nameCol.appendChild(nameText);
        row.appendChild(nameCol);

        // Track
        const track = document.createElement('div');
        track.className = 'timeline-track';
        track.style.width = `${totalWidth}px`;

        // Filter appointments for this barber (by ID and name)
        const empAppts = appointments.filter(a => {
            // Check by employee ID (most reliable)
            if (a.employee && typeof a.employee === 'object' && a.employee._id === emp.id) return true;
            if (a.employee && typeof a.employee === 'string' && a.employee === emp.id) return true;
            // Fallback to name matching
            if (a.barber === emp.name) return true;
            if (a.employee && a.employee.name === emp.name) return true;
            return false;
        });

        empAppts.forEach(apt => {
            let h, m;
            if (apt.time && typeof apt.time === 'string' && apt.time.includes(':')) {
                [h, m] = apt.time.split(':').map(Number);
            } else {
                const aptDate = new Date(apt.date);
                h = aptDate.getHours();
                m = aptDate.getMinutes();
            }
            
            if (h < START_HOUR || h >= END_HOUR) return;
            
            const minutesFromStart = (h - START_HOUR) * 60 + m;
            const leftPos = minutesFromStart * PIXELS_PER_MINUTE;
            const duration = apt.serviceId?.duration || apt.duration || 30;
            const width = duration * PIXELS_PER_MINUTE;
            
            const totalStartMinutes = h * 60 + m;
            const totalEndMinutes = totalStartMinutes + duration;
            const endH = Math.floor(totalEndMinutes / 60);
            const endM = totalEndMinutes % 60;
            
            const startTimeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
            
            const el = document.createElement('div');
            el.className = 'timeline-appointment booked';
            if (apt.price >= 100) el.classList.add('critical'); // Surge pricing style

            el.style.left = `${leftPos}px`;
            el.style.width = `${width}px`;
            
            el.innerHTML = `
                <div class="apt-time">${startTimeStr} - ${endTimeStr}</div>
                <div class="apt-name">${apt.customerName || 'محجوز'}</div>
            `;
            
            track.appendChild(el);
        });

        row.appendChild(track);
        strip.appendChild(row);
    });
    
    // Render "Now" Line
    const nowLine = document.createElement('div');
    nowLine.id = 'currentTimeLine';
    nowLine.className = 'current-time-line';
    strip.appendChild(nowLine);
    
    // Initial positioning
    updateCurrentTimeLine();
}

function updateCurrentTimeLine() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check if within working hours
    if (currentHour < START_HOUR || currentHour >= END_HOUR) {
        const line = document.getElementById('currentTimeLine');
        if (line) line.style.display = 'none';
        return;
    }
    
    const minutesSinceStart = (currentHour - START_HOUR) * 60 + currentMinute;
    const position = 180 + (minutesSinceStart * PIXELS_PER_MINUTE); // Offset by 180px to match barber names column
    
    const line = document.getElementById('currentTimeLine');
    if (line) {
        line.style.display = 'block';
        line.style.left = `${position}px`;
        
        // Scroll to center the line
        line.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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
