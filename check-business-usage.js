const mongoose = require('mongoose');
require('dotenv').config();

const Business = require('./models/Business');

async function checkBusinessUsage() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const BUSINESS_ID = '69259331651b1babc1eb83dc';
        
        const business = await Business.findById(BUSINESS_ID);
        
        if (!business) {
            console.log('❌ Business not found!');
            process.exit(1);
        }

        console.log('📊 Business Usage Stats for:', business.businessName);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        console.log('\n📈 Overall Statistics:');
        console.log(`  Total Appointments: ${business.stats?.totalAppointments || 0}`);
        console.log(`  Total Customers: ${business.stats?.totalCustomers || 0}`);
        console.log(`  Total Revenue: ${business.stats?.totalRevenue || 0} SAR`);
        
        console.log('\n📅 Monthly Usage:');
        console.log(`  Appointments This Month: ${business.usage?.appointmentsThisMonth || 0}`);
        console.log(`  Employees: ${business.usage?.employees || 0}`);
        console.log(`  Customers: ${business.usage?.customers || 0}`);
        console.log(`  Last Reset Date: ${business.usage?.lastResetDate || 'Never'}`);
        
        console.log('\n🎯 Plan Limits:');
        const limits = business.limits || {};
        console.log(`  Max Appointments/Month: ${limits.maxAppointmentsPerMonth === -1 ? '∞ (Unlimited)' : limits.maxAppointmentsPerMonth || 'Not Set'}`);
        console.log(`  Max Employees: ${limits.maxEmployees === -1 ? '∞ (Unlimited)' : limits.maxEmployees || 'Not Set'}`);
        console.log(`  Max Customers: ${limits.maxCustomers === -1 ? '∞ (Unlimited)' : limits.maxCustomers || 'Not Set'}`);
        
        console.log('\n💼 Subscription:');
        console.log(`  Plan: ${business.subscription?.plan || 'free'}`);
        console.log(`  Status: ${business.subscription?.status || 'trial'}`);
        
        // Check if approaching limits
        console.log('\n⚠️  Usage Alerts:');
        const monthlyLimit = limits.maxAppointmentsPerMonth || -1;
        const currentUsage = business.usage?.appointmentsThisMonth || 0;
        
        if (monthlyLimit !== -1) {
            const percentage = (currentUsage / monthlyLimit) * 100;
            console.log(`  Using ${currentUsage}/${monthlyLimit} appointments (${percentage.toFixed(1)}%)`);
            
            if (percentage >= 100) {
                console.log('  ❌ LIMIT EXCEEDED!');
            } else if (percentage >= 80) {
                console.log('  ⚠️  WARNING: Approaching limit!');
            } else {
                console.log('  ✅ Within limits');
            }
        } else {
            console.log('  ✅ Unlimited plan - no restrictions');
        }

        await mongoose.disconnect();
        console.log('\n✅ Done!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkBusinessUsage();
