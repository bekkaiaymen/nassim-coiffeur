const mongoose = require('mongoose');
require('dotenv').config();

const Business = require('./models/Business');
const Employee = require('./models/Employee');

async function restoreRostom() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ متصل بقاعدة البيانات\n');

        const business = await Business.findOne({ businessName: /nassim/i });
        
        if (!business) {
            console.log('❌ لم يتم العثور على محل nassim');
            process.exit(1);
        }

        console.log(`🏪 محل: ${business.businessName} (${business._id})\n`);

        // Create Rostom employee
        const rostom = await Employee.create({
            name: 'Rostom',
            phone: '0770000000',
            email: 'rostombabaz@gmail.com',
            tenant: business._id,
            business: business._id,
            role: 'barber',
            status: 'active',
            jobTitle: 'حلاق محترف',
            specialties: ['قص الشعر', 'تشذيب اللحية', 'صبغة'],
            workingHours: {
                saturday: { enabled: true, start: '09:00', end: '21:00', shifts: [{ start: '09:00', end: '21:00' }] },
                sunday: { enabled: true, start: '09:00', end: '21:00', shifts: [{ start: '09:00', end: '21:00' }] },
                monday: { enabled: true, start: '09:00', end: '21:00', shifts: [{ start: '09:00', end: '21:00' }] },
                tuesday: { enabled: true, start: '09:00', end: '21:00', shifts: [{ start: '09:00', end: '21:00' }] },
                wednesday: { enabled: true, start: '09:00', end: '21:00', shifts: [{ start: '09:00', end: '21:00' }] },
                thursday: { enabled: true, start: '09:00', end: '21:00', shifts: [{ start: '09:00', end: '21:00' }] },
                friday: { enabled: false }
            },
            stats: {
                totalAppointments: 0,
                completedAppointments: 0,
                cancelledAppointments: 0,
                rating: 5.0,
                totalRevenue: 0
            }
        });

        console.log('✅ تم إنشاء الموظف بنجاح:');
        console.log(`   👤 الاسم: ${rostom.name}`);
        console.log(`   📧 البريد: ${rostom.email}`);
        console.log(`   📱 الهاتف: ${rostom.phone}`);
        console.log(`   🆔 ID: ${rostom._id}\n`);

        // Show all employees
        const allEmployees = await Employee.find({ business: business._id }).select('name phone email');
        console.log('✅ جميع الموظفين الآن:');
        allEmployees.forEach(emp => {
            console.log(`   👤 ${emp.name} - ${emp.phone || emp.email}`);
        });

        console.log('\n✅ تم استعادة الموظف بنجاح!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

restoreRostom();
