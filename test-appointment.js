const mongoose = require('mongoose');
require('dotenv').config();

const Appointment = require('./models/Appointment');
const Customer = require('./models/Customer');

async function createTestAppointment() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const BUSINESS_ID = '69259331651b1babc1eb83dc';
        
        // Get a random employee
        const Employee = require('./models/Employee');
        const employees = await Employee.find({ business: BUSINESS_ID });
        
        if (employees.length === 0) {
            console.log('❌ No employees found');
            process.exit(1);
        }

        // Get a random service
        const Service = require('./models/Service');
        const services = await Service.find({ business: BUSINESS_ID });
        
        if (services.length === 0) {
            console.log('❌ No services found');
            process.exit(1);
        }

        const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
        const randomService = services[Math.floor(Math.random() * services.length)];

        // Create or get customer
        let customer = await Customer.findOne({ phone: '0501234567' });
        
        if (!customer) {
            customer = await Customer.create({
                name: 'عميل تجريبي',
                phone: '0501234567',
                email: 'test@customer.com',
                business: BUSINESS_ID,
                tenant: BUSINESS_ID
            });
            console.log('✅ Created test customer');
        }

        // Simulate public booking (like /book-now page)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Use the same logic as public/book API
        const appointment = await Appointment.create({
            tenant: BUSINESS_ID,
            business: BUSINESS_ID,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerId: customer._id,
            service: randomService._id,
            barber: randomEmployee._id,
            date: tomorrow,
            time: '14:00',
            notes: 'موعد تجريبي للاختبار',
            status: 'pending'
        });

        // Update customer stats (like the API does)
        customer.totalVisits += 1;
        customer.lastVisit = new Date();
        customer.loyaltyPoints += 10;
        customer.pointsHistory.push({
            points: 10,
            type: 'earned',
            description: 'حجز موعد تجريبي',
            date: new Date()
        });
        await customer.save();

        // Update business stats (THIS IS THE KEY PART)
        const Business = require('./models/Business');
        const businessDoc = await Business.findById(BUSINESS_ID);
        
        if (businessDoc) {
            if (!businessDoc.stats) businessDoc.stats = {};
            if (!businessDoc.usage) businessDoc.usage = {};
            
            businessDoc.stats.totalAppointments = (businessDoc.stats.totalAppointments || 0) + 1;
            
            const now = new Date();
            const lastReset = new Date(businessDoc.usage.lastResetDate || 0);
            
            if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
                businessDoc.usage.appointmentsThisMonth = 1;
                businessDoc.usage.lastResetDate = now;
            } else {
                businessDoc.usage.appointmentsThisMonth = (businessDoc.usage.appointmentsThisMonth || 0) + 1;
            }
            
            await businessDoc.save();
            console.log('✅ Business stats updated!');
        }

        console.log('✅ Test appointment created:');
        console.log(`   Customer: ${appointment.customerName}`);
        console.log(`   Service: ${randomService.name}`);
        console.log(`   Barber: ${randomEmployee.name}`);
        console.log(`   Date: ${appointment.date.toLocaleDateString('ar-SA')}`);
        console.log(`   Time: ${appointment.time}`);
        console.log(`   ID: ${appointment._id}`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createTestAppointment();
