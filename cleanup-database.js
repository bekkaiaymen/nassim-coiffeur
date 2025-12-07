const mongoose = require('mongoose');
require('dotenv').config();

const Appointment = require('./models/Appointment');
const Employee = require('./models/Employee');
const Customer = require('./models/Customer');
const Business = require('./models/Business');

async function cleanupDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ متصل بقاعدة البيانات\n');

        // Find Nassim business
        const business = await Business.findOne({ businessName: /nassim/i });
        
        if (!business) {
            console.log('❌ لم يتم العثور على محل nassim');
            process.exit(1);
        }

        console.log(`🏪 محل: ${business.businessName} (${business._id})\n`);

        // ==================================
        // 1. Delete ALL Appointments (Test Data)
        // ==================================
        console.log('🗑️  حذف جميع المواعيد التجريبية...');
        const appointmentsDeleted = await Appointment.deleteMany({
            business: business._id
        });
        console.log(`   ✅ تم حذف ${appointmentsDeleted.deletedCount} موعد\n`);

        // ==================================
        // 2. Delete Test Customers (Keep real ones)
        // ==================================
        console.log('🗑️  حذف العملاء التجريبيين...');
        const testCustomersDeleted = await Customer.deleteMany({
            business: business._id,
            $or: [
                { name: /test|تجربة|زبون سريع/i },
                { phone: /^0000/ },
                { email: /test|temp|dummy/i }
            ]
        });
        console.log(`   ✅ تم حذف ${testCustomersDeleted.deletedCount} عميل تجريبي\n`);

        // ==================================
        // 3. Keep Only Specific Employees (نسيم، رستم، زينو)
        // ==================================
        console.log('👥 تنظيف الموظفين...');
        
        const keepEmployees = ['نسيم', 'رستم', 'زينو', 'zinou', 'Nassim', 'Rastam', 'Zinou', 'Rastem'];
        
        // Find all employees
        const allEmployees = await Employee.find({ business: business._id });
        console.log(`   📋 إجمالي الموظفين: ${allEmployees.length}`);
        
        // Employees to delete (not in keep list)
        const employeesToDelete = allEmployees.filter(emp => 
            !keepEmployees.some(name => 
                emp.name.toLowerCase().includes(name.toLowerCase()) || 
                name.toLowerCase().includes(emp.name.toLowerCase())
            )
        );
        
        if (employeesToDelete.length > 0) {
            console.log(`   🔍 الموظفين المحذوفين:`);
            employeesToDelete.forEach(emp => {
                console.log(`      - ${emp.name} (${emp.email || emp.phone})`);
            });
            
            const employeeIds = employeesToDelete.map(e => e._id);
            await Employee.deleteMany({ _id: { $in: employeeIds } });
            console.log(`   ✅ تم حذف ${employeeIds.length} موظف\n`);
        } else {
            console.log(`   ℹ️  لا يوجد موظفين للحذف\n`);
        }

        // ==================================
        // 4. Reset Employee Stats
        // ==================================
        console.log('📊 إعادة تعيين إحصائيات الموظفين الباقين...');
        await Employee.updateMany(
            { business: business._id },
            {
                $set: {
                    'stats.totalAppointments': 0,
                    'stats.completedAppointments': 0,
                    'stats.cancelledAppointments': 0,
                    'stats.rating': 0,
                    'stats.totalRevenue': 0
                }
            }
        );
        console.log('   ✅ تم إعادة تعيين الإحصائيات\n');

        // ==================================
        // 5. Show Remaining Employees
        // ==================================
        const remainingEmployees = await Employee.find({ business: business._id }).select('name phone email');
        console.log('✅ الموظفين المتبقين:');
        remainingEmployees.forEach(emp => {
            console.log(`   👤 ${emp.name} - ${emp.phone || emp.email}`);
        });

        // ==================================
        // 6. Summary
        // ==================================
        console.log('\n📊 ملخص التنظيف:');
        console.log(`   🗑️  المواعيد المحذوفة: ${appointmentsDeleted.deletedCount}`);
        console.log(`   🗑️  العملاء التجريبيين: ${testCustomersDeleted.deletedCount}`);
        console.log(`   🗑️  الموظفين المحذوفين: ${employeesToDelete.length}`);
        console.log(`   ✅ الموظفين المتبقين: ${remainingEmployees.length}`);
        console.log(`   ✅ الخدمات: لم تُمس`);
        console.log(`   ✅ المنتجات: لم تُمس`);
        console.log(`   ✅ الأخبار: لم تُمس`);
        console.log(`   ✅ المكافآت: لم تُمس`);

        console.log('\n✅ تم تنظيف قاعدة البيانات بنجاح!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ:', error);
        process.exit(1);
    }
}

cleanupDatabase();
