// Configuration
const BUSINESS_ID = '69259331651b1babc1eb83dc'; // nassim business ID
const API_URL = '/api';

// Debug
console.log('🔍 Booking Page Initialized');
console.log('📋 Business ID:', BUSINESS_ID);
console.log('🌐 API URL:', API_URL);

// Booking data
let selectedService = null;
let selectedBarber = null;
let selectedDate = null;
let selectedTime = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadBarbers();
    setupDatePicker();
    setupForm();
});

// Load Services
async function loadServices() {
    const container = document.getElementById('servicesList');
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #FDB714; padding: 40px;">⏳ جاري تحميل الخدمات...</div>';
    
    try {
        const response = await fetch(`${API_URL}/services/public/by-business/${BUSINESS_ID}`);
        const data = await response.json();
        
        console.log('Services API response:', data);
        
        if (data.success && data.data && data.data.length > 0) {
            displayServices(data.data);
        } else {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #FF3B30; padding: 40px;">❌ لا توجد خدمات متاحة حالياً</div>';
        }
    } catch (error) {
        console.error('Error loading services:', error);
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #FF3B30; padding: 40px;">❌ خطأ في تحميل الخدمات</div>';
    }
}

function displayServices(services) {
    const container = document.getElementById('servicesList');
    if (!services || services.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #B0B0B0; padding: 40px;">لا توجد خدمات متاحة</div>';
        return;
    }
    
    container.innerHTML = services.map(service => `
        <div class="service-card" onclick="selectService('${service._id}', '${service.name}', ${service.duration}, ${service.price})">
            <h4>${service.name}</h4>
            <div class="price">${service.price} ر.س</div>
            <div class="duration">⏱ ${service.duration} دقيقة</div>
        </div>
    `).join('');
    
    console.log(`Loaded ${services.length} services`);
}

function selectService(id, name, duration, price) {
    selectedService = { id, name, duration, price };
    
    // Update UI
    document.querySelectorAll('.service-card').forEach(card => card.classList.remove('selected'));
    event.target.closest('.service-card').classList.add('selected');
    
    // Update summary
    document.getElementById('summaryService').textContent = `${name} (${duration} دقيقة - ${price} ر.س)`;
}

// Load Barbers
async function loadBarbers() {
    const container = document.getElementById('barbersList');
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #FDB714; padding: 40px;">⏳ جاري تحميل الموظفين...</div>';
    
    try {
        const response = await fetch(`${API_URL}/employees/available/${BUSINESS_ID}`);
        const data = await response.json();
        
        console.log('Barbers API response:', data);
        
        if (data.success && data.data) {
            displayBarbers(data.data);
        } else {
            // Show default option even if no barbers
            displayBarbers([]);
        }
    } catch (error) {
        console.error('Error loading barbers:', error);
        displayBarbers([]);
    }
}

function displayBarbers(barbers) {
    const container = document.getElementById('barbersList');
    container.innerHTML = `
        <div class="barber-card" onclick="selectBarber(null, 'أي حلاق متاح')">
            <div class="avatar">👤</div>
            <h4>أي حلاق متاح</h4>
            <div class="rating">⭐ أفضل خيار</div>
        </div>
    ` + barbers.map(barber => `
        <div class="barber-card" onclick="selectBarber('${barber._id}', '${barber.name}')">
            <div class="avatar">${getFirstLetter(barber.name)}</div>
            <h4>${barber.name}</h4>
            ${barber.stats?.rating ? `<div class="rating">⭐ ${barber.stats.rating.toFixed(1)}</div>` : '<div class="rating">⭐ 4.9</div>'}
        </div>
    `).join('');
}

function getFirstLetter(name) {
    return name.charAt(0);
}

function selectBarber(id, name) {
    selectedBarber = id ? { id, name } : null;
    
    // Update UI
    document.querySelectorAll('.barber-card').forEach(card => card.classList.remove('selected'));
    event.target.closest('.barber-card').classList.add('selected');
    
    // Update summary
    document.getElementById('summaryBarber').textContent = name;
}

// Date Picker
function setupDatePicker() {
    const dateInput = document.getElementById('bookingDate');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    
    dateInput.addEventListener('change', (e) => {
        selectedDate = e.target.value;
        loadTimeSlots();
        document.getElementById('summaryDate').textContent = new Date(selectedDate).toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    });
}

// Load Time Slots
async function loadTimeSlots() {
    if (!selectedDate) return;
    
    const container = document.getElementById('timeSlots');
    container.innerHTML = '<p style="text-align:center;color:#64748b;">جاري تحميل الأوقات المتاحة...</p>';
    
    try {
        const response = await fetch(`${API_URL}/appointments/available-slots?business=${BUSINESS_ID}&date=${selectedDate}${selectedBarber ? `&barber=${selectedBarber.id}` : ''}`);
        const data = await response.json();
        
        if (data.success && data.data) {
            displayTimeSlots(data.data);
        }
    } catch (error) {
        console.error('Error loading time slots:', error);
        container.innerHTML = '<p style="text-align:center;color:#ef4444;">خطأ في تحميل الأوقات</p>';
    }
}

function displayTimeSlots(slots) {
    const container = document.getElementById('timeSlots');
    container.innerHTML = slots.map(slot => `
        <div class="time-slot ${slot.available ? '' : 'disabled'}" 
             onclick="${slot.available ? `selectTime('${slot.time}')` : ''}"
             ${!slot.available ? 'disabled' : ''}>
            ${slot.time}
        </div>
    `).join('');
}

function selectTime(time) {
    selectedTime = time;
    
    // Update UI
    document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));
    event.target.classList.add('selected');
    
    // Update summary
    document.getElementById('summaryTime').textContent = time;
}

// Navigation
function nextStep(step) {
    // Validation
    if (step === 2 && !selectedService) {
        alert('الرجاء اختيار خدمة');
        return;
    }
    if (step === 3 && !selectedBarber && !document.querySelector('.barber-card.selected')) {
        // Auto-select "any barber"
        selectBarber(null, 'أي حلاق متاح');
    }
    if (step === 4 && (!selectedDate || !selectedTime)) {
        alert('الرجاء اختيار التاريخ والوقت');
        return;
    }
    
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep(step) {
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Form Submission
function setupForm() {
    document.getElementById('bookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const customerName = document.getElementById('customerName').value;
        const customerPhone = document.getElementById('customerPhone').value;
        const notes = document.getElementById('bookingNotes').value;
        
        const bookingData = {
            business: BUSINESS_ID,
            service: selectedService.id,
            barber: selectedBarber?.id,
            customerName,
            customerPhone,
            date: selectedDate,
            time: selectedTime,
            notes
        };
        
        try {
            const response = await fetch(`${API_URL}/appointments/public/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showSuccess(data.data);
            } else {
                alert(data.message || 'حدث خطأ في الحجز');
            }
        } catch (error) {
            console.error('Booking error:', error);
            alert('حدث خطأ في الحجز، يرجى المحاولة مرة أخرى');
        }
    });
}

function showSuccess(appointment) {
    const details = `
        <div style="text-align: right;">
            <p><strong>الخدمة:</strong> ${selectedService.name}</p>
            <p><strong>التاريخ:</strong> ${new Date(selectedDate).toLocaleDateString('ar-SA')}</p>
            <p><strong>الوقت:</strong> ${selectedTime}</p>
            <p><strong>رقم الحجز:</strong> ${appointment._id.slice(-6).toUpperCase()}</p>
        </div>
    `;
    
    document.getElementById('bookingDetails').innerHTML = details;
    document.getElementById('loyaltyMessage').innerHTML = '🎁 تم إضافة 10 نقاط ولاء لحسابك!';
    const modal = document.getElementById('successModal');
    modal.style.display = 'flex';
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'none';
    modal.classList.remove('active');
    // Reset form
    location.reload();
}

function closeModal() {
    document.getElementById('successModal').classList.remove('show');
    window.location.reload();
}
