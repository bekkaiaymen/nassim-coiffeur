const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const User = require('../models/User');
const { protect, ensureTenant, addTenantFilter } = require('../middleware/auth');

// Apply middleware to all routes
router.use(protect);
router.use(ensureTenant);

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Today's appointments
        const todayAppointments = await Appointment.countDocuments(addTenantFilter(req, {
            date: { $gte: today, $lt: tomorrow },
            status: { $ne: 'cancelled' }
        }));

        // Today's revenue
        const todayInvoices = await Invoice.find(addTenantFilter(req, {
            createdAt: { $gte: today }
        }));
        const todayRevenue = todayInvoices.reduce((sum, inv) => sum + inv.total, 0);

        // This month customers
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthCustomers = await Customer.countDocuments(addTenantFilter(req, {
            createdAt: { $gte: firstDayOfMonth }
        }));

        // Average rating
        const customers = await Customer.find(addTenantFilter(req, { rating: { $exists: true, $ne: null } }));
        const avgRating = customers.length > 0
            ? customers.reduce((sum, c) => sum + c.rating, 0) / customers.length
            : 5;

        // Weekly revenue
        const weeklyRevenue = [];
        for (let i = 6; i >= 0; i--) {
            const day = new Date(today);
            day.setDate(day.getDate() - i);
            const nextDay = new Date(day);
            nextDay.setDate(nextDay.getDate() + 1);

            const dayInvoices = await Invoice.find(addTenantFilter(req, {
                createdAt: { $gte: day, $lt: nextDay }
            }));

            const dayRevenue = dayInvoices.reduce((sum, inv) => sum + inv.total, 0);
            weeklyRevenue.push({
                date: day.toISOString().split('T')[0],
                revenue: dayRevenue
            });
        }

        // Top services
        const invoices = await Invoice.find(addTenantFilter(req, {
            createdAt: { $gte: firstDayOfMonth }
        }));

        const serviceCount = {};
        invoices.forEach(invoice => {
            invoice.items.forEach(item => {
                serviceCount[item.service] = (serviceCount[item.service] || 0) + 1;
            });
        });

        const topServices = Object.entries(serviceCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([service, count]) => ({ service, count }));

        res.json({
            success: true,
            data: {
                todayAppointments,
                todayRevenue,
                monthCustomers,
                avgRating: avgRating.toFixed(1),
                weeklyRevenue,
                topServices
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get revenue statistics
router.get('/revenue', async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;

        let start = startDate ? new Date(startDate) : new Date();
        let end = endDate ? new Date(endDate) : new Date();

        if (!startDate && !endDate) {
            // Default to current month
            start = new Date(start.getFullYear(), start.getMonth(), 1);
            end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        }

        const invoices = await Invoice.find(addTenantFilter(req, {
            createdAt: { $gte: start, $lte: end }
        }));

        const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalInvoices = invoices.length;
        const avgInvoice = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

        // Revenue by payment method
        const paymentMethods = {};
        invoices.forEach(inv => {
            paymentMethods[inv.paymentMethod] = (paymentMethods[inv.paymentMethod] || 0) + inv.total;
        });

        res.json({
            success: true,
            data: {
                totalRevenue,
                totalInvoices,
                avgInvoice,
                paymentMethods,
                period: { start, end }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get appointments statistics
router.get('/appointments', async (req, res) => {
    try {
        const total = await Appointment.countDocuments(addTenantFilter(req, {}));
        const pending = await Appointment.countDocuments(addTenantFilter(req, { status: 'pending' }));
        const confirmed = await Appointment.countDocuments(addTenantFilter(req, { status: 'confirmed' }));
        const completed = await Appointment.countDocuments(addTenantFilter(req, { status: 'completed' }));
        const cancelled = await Appointment.countDocuments(addTenantFilter(req, { status: 'cancelled' }));

        // Completion rate
        const completionRate = total > 0 ? (completed / total * 100).toFixed(1) : 0;

        // Appointments by barber
        const appointments = await Appointment.find(addTenantFilter(req, { status: { $ne: 'cancelled' } }));
        const barberStats = {};
        appointments.forEach(apt => {
            barberStats[apt.barber] = (barberStats[apt.barber] || 0) + 1;
        });

        res.json({
            success: true,
            data: {
                total,
                pending,
                confirmed,
                completed,
                cancelled,
                completionRate,
                byBarber: barberStats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get customer statistics
router.get('/customers', async (req, res) => {
    try {
        const total = await Customer.countDocuments(addTenantFilter(req, {}));
        const active = await Customer.countDocuments(addTenantFilter(req, { status: 'active' }));
        const vip = await Customer.countDocuments(addTenantFilter(req, { status: 'vip' }));
        
        // Top customers by spending
        const topCustomers = await Customer.find(addTenantFilter(req, {}))
            .sort({ totalSpent: -1 })
            .limit(10)
            .select('name phone totalSpent totalVisits');

        // Customer growth (last 6 months)
        const monthlyGrowth = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const count = await Customer.countDocuments(addTenantFilter(req, {
                createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            }));

            monthlyGrowth.push({
                month: date.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' }),
                count
            });
        }

        res.json({
            success: true,
            data: {
                total,
                active,
                vip,
                topCustomers,
                monthlyGrowth
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get staff performance
router.get('/staff', async (req, res) => {
    try {
        const users = await User.find(addTenantFilter(req, { role: { $in: ['employee', 'manager'] } }))
            .select('name totalAppointments totalRevenue rating');

        // Get appointments for each staff
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const staffPerformance = await Promise.all(users.map(async (user) => {
            const monthAppointments = await Appointment.countDocuments(addTenantFilter(req, {
                barber: user.name,
                date: { $gte: firstDayOfMonth },
                status: 'completed'
            }));

            return {
                name: user.name,
                monthAppointments,
                totalAppointments: user.totalAppointments || 0,
                totalRevenue: user.totalRevenue || 0,
                rating: user.rating || 5
            };
        }));

        res.json({
            success: true,
            data: staffPerformance.sort((a, b) => b.monthAppointments - a.monthAppointments)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;