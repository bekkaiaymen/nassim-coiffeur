const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('./models/Employee');
const Appointment = require('./models/Appointment');

async function deleteMohamed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ متصل بقاعدة البيانات\n');

        // Find all employees named Mohamed or محمد
        const mohamedEmployees = await Employee.find({
            $or: [
                { name: /mohamed/i },
                { name: /محمد/i }
            ]
        });

        if (mohamedEmployees.length === 0) {
            console.log('ℹ️  لا يوجد موظف باسم Mohamed أو محمد');
            
            // Check all employees
            const allEmployees = await Employee.find({});
            console.log('\n📋 جميع الموظفين في قاعدة البيانات:');
            allEmployees.forEach(emp => {
                console.log(`   👤 ${emp.name} - ${emp.phone || emp.email} (Business: ${emp.business})`);
            });
            
            process.exit(0);
        }

        console.log(`🔍 تم العثور على ${mohamedEmployees.length} موظف:\n`);
        mohamedEmployees.forEach(emp => {
            console.log(`   👤 ${emp.name}`);
            console.log(`      📧 ${emp.email || 'لا يوجد بريد'}`);
            console.log(`      📱 ${emp.phone || 'لا يوجد رقم'}`);
            console.log(`      🏪 Business ID: ${emp.business}`);
            console.log(`      🆔 Employee ID: ${emp._id}\n`);
        });

        // Delete appointments for these employees
        const employeeIds = mohamedEmployees.map(e => e._id);
        const appointmentsDeleted = await Appointment.deleteMany({
            employee: { $in: employeeIds }
        });
        console.log(`🗑️  تم حذف ${appointmentsDeleted.deletedCount} موعد مرتبط بهذا الموظف\n`);

        // Delete the employees
        const result = await Employee.deleteMany({
            _id: { $in: employeeIds }
        });
        
        console.log(`✅ تم حذف ${result.deletedCount} موظف بنجاح!\n`);

        // Show remaining employees
        const remainingEmployees = await Employee.find({}).select('name phone email business');
        console.log('✅ الموظفين المتبقين:');
        if (remainingEmployees.length === 0) {
            console.log('   ⚠️  لا يوجد موظفين');
        } else {
            remainingEmployees.forEach(emp => {
                console.log(`   👤 ${emp.name} - ${emp.phone || emp.email}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

deleteMohamed();
