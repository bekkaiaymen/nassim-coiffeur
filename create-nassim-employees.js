const mongoose = require('mongoose');
require('dotenv').config();

const Business = require('./models/Business');
const Employee = require('./models/Employee');

async function createNassimEmployees() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ متصل بقاعدة البيانات\n');

        const business = await Business.findOne({ businessName: /nassim/i });
        
        if (!business) {
            console.log('❌ لم يتم العثور على محل nassim');
            process.exit(1);
        }

        console.log(`🏪 محل: ${business.businessName} (${business._id})\n`);

        const employees = [
            {
                name: 'محمد أحمد',
                phone: '0501234567',
                email: 'mohamed@nassim.com',
                tenant: business._id,
                business: business._id,
                role: 'barber',
                specialties: ['قص الشعر', 'تشذيب اللحية'],
                workSchedule: {
                    saturday: { isWorkingDay: true, startTime: '09:00', endTime: '21:00' },
                    sunday: { isWorkingDay: true, startTime: '09:00', endTime: '21:00' },
                    monday: { isWorkingDay: true, startTime: '09:00', endTime: '21:00' },
                    tuesday: { isWorkingDay: true, startTime: '09:00', endTime: '21:00' },
                    wednesday: { isWorkingDay: true, startTime: '09:00', endTime: '21:00' },
                    thursday: { isWorkingDay: true, startTime: '09:00', endTime: '21:00' },
                    friday: { isWorkingDay: false }
                },
                stats: { rating: 4.8, totalAppointments: 120 }
            },
            {
                name: 'عبدالله ناصر',
                phone: '0507654321',
                email: 'abdullah@nassim.com',
                tenant: business._id,
                business: business._id,
                role: 'barber',
                specialties: ['قص الشعر', 'حلاقة تقليدية'],
                workSchedule: {
                    saturday: { isWorkingDay: true, startTime: '09:00', endTime: '21:00' },
                    sunday: { isWorkingDay: true, startTime: '09:00', endTime: '21:00' },
                    monday: { isWorkingDay: true, startTime: '09:00', endTime: '21:00' },
                    tuesday: { isWorkingDay: true, startTime: '09:00', endTime: '21:00' },
                    wednesday: { isWorkingDay: true, startTime: '09:00', endTime: '21:00' },
                    thursday: { isWorkingDay: true, startTime: '09:00', endTime: '21:00' },
                    friday: { isWorkingDay: false }
                },
                stats: { rating: 4.9, totalAppointments: 95 }
            },
            {
                name: 'خالد سعيد',
                phone: '0509876543',
                email: 'khaled@nassim.com',
                tenant: business._id,
                business: business._id,
                role: 'barber',
                specialties: ['قص الشعر الحديث', 'تشكيل اللحية'],
                workSchedule: {
                    saturday: { isWorkingDay: true, startTime: '14:00', endTime: '22:00' },
                    sunday: { isWorkingDay: true, startTime: '14:00', endTime: '22:00' },
                    monday: { isWorkingDay: true, startTime: '14:00', endTime: '22:00' },
                    tuesday: { isWorkingDay: true, startTime: '14:00', endTime: '22:00' },
                    wednesday: { isWorkingDay: true, startTime: '14:00', endTime: '22:00' },
                    thursday: { isWorkingDay: true, startTime: '14:00', endTime: '22:00' },
                    friday: { isWorkingDay: false }
                },
                stats: { rating: 4.7, totalAppointments: 78 }
            }
        ];

        for (const empData of employees) {
            const existing = await Employee.findOne({ phone: empData.phone });
            if (existing) {
                console.log(`⏭️  ${empData.name} موجود بالفعل`);
            } else {
                const emp = await Employee.create(empData);
                console.log(`✅ تم إضافة: ${emp.name}`);
            }
        }

        console.log('\n✨ تم بنجاح!');
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

createNassimEmployees();
