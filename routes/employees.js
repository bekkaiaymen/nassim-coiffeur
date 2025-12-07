const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Appointment = require('../models/Appointment');
const { protect, ensureTenant } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// @desc    Employee Login
// @route   POST /api/employees/login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور'
            });
        }

        // Check for employee
        const employee = await Employee.findOne({ email }).select('+password');

        if (!employee) {
            return res.status(401).json({
                success: false,
                message: 'بيانات الدخول غير صحيحة'
            });
        }

        // Check password
        const isMatch = await employee.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'بيانات الدخول غير صحيحة'
            });
        }

        // Create token
        const token = jwt.sign(
            { id: employee._id, role: 'employee' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            employee: {
                _id: employee._id,
                id: employee._id,
                name: employee.name,
                email: employee.email,
                avatar: employee.avatar,
                role: 'employee'
            }
        });
    } catch (error) {
        console.error('Employee login error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تسجيل الدخول'
        });
    }
});

// @desc    Get current employee profile
// @route   GET /api/employees/me
// @access  Private (Employee)
router.get('/me', protect, async (req, res) => {
    try {
        const employee = await Employee.findById(req.user.id);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود'
            });
        }
        res.json({
            success: true,
            data: employee
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب الملف الشخصي'
        });
    }
});

// @desc    Update Employee Schedule
// @route   PUT /api/employees/schedule
// @access  Private (Employee)
router.put('/schedule', protect, async (req, res) => {
    try {
        const { workingHours } = req.body;
        const employeeId = req.user.id;

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود'
            });
        }

        // Validate workingHours structure if needed
        if (workingHours) {
            employee.workingHours = workingHours;
            await employee.save();
        }

        res.json({
            success: true,
            message: 'تم تحديث جدول العمل بنجاح',
            data: employee.workingHours
        });
    } catch (error) {
        console.error('Update schedule error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تحديث الجدول'
        });
    }
});

// @desc    Check-in Employee (Set attendance)
// @route   POST /api/employees/check-in
// @access  Private (Employee)
router.post('/check-in', protect, async (req, res) => {
    try {
        const { checkInTime, checkOutTime } = req.body;
        const employeeId = req.user.id;
        
        const today = new Date().toISOString().split('T')[0];
        
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود'
            });
        }
        
        // Update attendance
        employee.todayAttendance = {
            isPresent: true,
            checkInTime: checkInTime || '09:00',
            checkOutTime: checkOutTime || '21:00',
            date: today
        };
        
        await employee.save();
        
        res.json({
            success: true,
            message: 'تم تسجيل الحضور بنجاح',
            data: employee.todayAttendance
        });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تسجيل الحضور'
        });
    }
});

// @desc    Check-out Employee
// @route   POST /api/employees/check-out
// @access  Private (Employee)
router.post('/check-out', protect, async (req, res) => {
    try {
        const employeeId = req.user.id;
        
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود'
            });
        }
        
        // Clear attendance
        employee.todayAttendance = {
            isPresent: false,
            checkInTime: null,
            checkOutTime: null,
            date: null
        };
        
        await employee.save();
        
        res.json({
            success: true,
            message: 'تم تسجيل الانصراف بنجاح',
            data: employee.todayAttendance
        });
    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تسجيل الانصراف'
        });
    }
});

// @desc    Get Available Employees (for customer booking)
// @route   GET /api/employees/available
// @access  Public
router.get('/available', async (req, res) => {
    try {
        // Return all active employees (Attendance check removed)
        const employees = await Employee.find({
            status: 'active'
        })
        .select('name avatar stats workingHours')
        .sort({ order: 1 });

        res.json({
            success: true,
            count: employees.length,
            data: employees
        });
    } catch (error) {
        console.error('Get available employees error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب الموظفين المتاحين'
        });
    }
});

// @desc    Get employees by business ID (Public)
// @route   GET /api/employees/public/by-business/:businessId
// @access  Public
router.get('/public/by-business/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        
        const employees = await Employee.find({
            business: businessId,
            status: 'active',
            isAvailable: true
        })
        .populate('services', 'name price duration')
        .sort({ order: 1, createdAt: -1 });

        res.json({
            success: true,
            count: employees.length,
            data: employees
        });
    } catch (error) {
        console.error('Get public employees error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب الموظفين'
        });
    }
});

// @desc    Get all employees for a business
// @route   GET /api/employees
// @access  Private
router.get('/', protect, ensureTenant, async (req, res) => {
    try {
        const { business } = req.query;
        const tenantId = business || req.tenantId || req.user.tenant || req.user.business;
        
        const employees = await Employee.find({
            $or: [
                { tenant: tenantId },
                { business: tenantId }
            ]
        })
        .populate('services', 'name price duration')
        .sort({ order: 1, createdAt: -1 });

        res.json(employees);
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب الموظفين'
        });
    }
});

// @desc    Get available employees for customer booking
// @route   GET /api/employees/available
// @access  Public
router.get('/available/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const { date, time, serviceId } = req.query;

        const query = {
            business: businessId,
            status: 'active',
            isAvailable: true
        };

        // إذا كانت هناك خدمة محددة، فقط الموظفين الذين يقدمونها
        if (serviceId) {
            query.services = serviceId;
        }

        const employees = await Employee.find(query)
            .select('name avatar jobTitle specialties stats experience')
            .sort({ order: 1, 'stats.rating': -1 });

        // إذا كان هناك تاريخ ووقت، فلتر حسب التوفر
        if (date && time) {
            const availableEmployees = [];
            for (const emp of employees) {
                const available = await emp.isAvailableAt(new Date(date), time);
                if (available) {
                    availableEmployees.push(emp);
                }
            }
            return res.json({
                success: true,
                count: availableEmployees.length,
                data: availableEmployees
            });
        }

        res.json({
            success: true,
            count: employees.length,
            data: employees
        });
    } catch (error) {
        console.error('Get available employees error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب الموظفين المتاحين'
        });
    }
});

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
router.get('/:id', protect, ensureTenant, async (req, res) => {
    try {
        const employee = await Employee.findOne({
            _id: req.params.id,
            $or: [
                { tenant: req.tenantId },
                { business: req.tenantId }
            ]
        }).populate('services', 'name price duration');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود'
            });
        }

        res.json({
            success: true,
            data: employee
        });
    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب بيانات الموظف'
        });
    }
});

// @desc    Create new employee
// @route   POST /api/employees
// @access  Private
router.post('/', protect, ensureTenant, async (req, res) => {
    try {
        // استخدام tenantId من middleware
        const tenantId = req.tenantId || req.user.tenant || req.user.business;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'المستخدم غير مرتبط بمتجر'
            });
        }
        
        const employeeData = {
            ...req.body,
            tenant: tenantId,
            business: tenantId
        };

        const employee = await Employee.create(employeeData);

        res.status(201).json({
            success: true,
            message: 'تم إضافة الموظف بنجاح',
            data: employee
        });
    } catch (error) {
        console.error('Create employee error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'حدث خطأ في إضافة الموظف'
        });
    }
});

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private
router.put('/:id', protect, ensureTenant, async (req, res) => {
    try {
        const employee = await Employee.findOne({
            _id: req.params.id,
            $or: [
                { tenant: req.tenantId },
                { business: req.tenantId }
            ]
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود'
            });
        }

        // Update fields
        Object.keys(req.body).forEach(key => {
            if (key !== 'tenant' && key !== 'business') {
                employee[key] = req.body[key];
            }
        });

        await employee.save();

        res.json({
            success: true,
            message: 'تم تحديث بيانات الموظف بنجاح',
            data: employee
        });
    } catch (error) {
        console.error('Update employee error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'حدث خطأ في تحديث الموظف'
        });
    }
});

// @desc    Update employee status
// @route   PATCH /api/employees/:id/status
// @access  Private
router.patch('/:id/status', protect, ensureTenant, async (req, res) => {
    try {
        const { status, isAvailable } = req.body;

        const employee = await Employee.findOne({
            _id: req.params.id,
            tenant: req.tenantId
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود'
            });
        }

        if (status) employee.status = status;
        if (typeof isAvailable === 'boolean') employee.isAvailable = isAvailable;

        await employee.save();

        res.json({
            success: true,
            message: 'تم تحديث حالة الموظف بنجاح',
            data: employee
        });
    } catch (error) {
        console.error('Update employee status error:', error);
        res.status(400).json({
            success: false,
            message: 'حدث خطأ في تحديث حالة الموظف'
        });
    }
});

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private
router.delete('/:id', protect, ensureTenant, async (req, res) => {
    try {
        const employee = await Employee.findOne({
            _id: req.params.id,
            $or: [
                { tenant: req.tenantId },
                { business: req.tenantId }
            ]
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود'
            });
        }

        // التحقق من وجود حجوزات قادمة
        const upcomingAppointments = await Appointment.countDocuments({
            employee: employee._id,
            dateTime: { $gte: new Date() },
            status: { $in: ['pending', 'confirmed'] }
        });

        if (upcomingAppointments > 0) {
            console.log(`Cannot delete employee: ${upcomingAppointments} upcoming appointments found`);
            return res.status(400).json({
                success: false,
                message: `لا يمكن حذف الموظف لوجود ${upcomingAppointments} حجز قادم. يرجى إلغاء الحجوزات أولاً أو إخفاء الموظف`
            });
        }

        await employee.deleteOne();

        res.json({
            success: true,
            message: 'تم حذف الموظف بنجاح'
        });
    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في حذف الموظف'
        });
    }
});

// @desc    Get employee stats
// @route   GET /api/employees/:id/stats
// @access  Private
router.get('/:id/stats', protect, ensureTenant, async (req, res) => {
    try {
        const employee = await Employee.findOne({
            _id: req.params.id,
            tenant: req.tenantId
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود'
            });
        }

        // الحجوزات القادمة
        const upcomingAppointments = await Appointment.countDocuments({
            employee: employee._id,
            date: { $gte: new Date() },
            status: { $in: ['pending', 'confirmed'] }
        });

        // الحجوزات اليوم
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayAppointments = await Appointment.countDocuments({
            employee: employee._id,
            date: { $gte: today, $lt: tomorrow },
            status: { $in: ['pending', 'confirmed'] }
        });

        // الحجوزات هذا الشهر
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const monthlyStats = await Appointment.aggregate([
            {
                $match: {
                    employee: employee._id,
                    date: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                employee: {
                    name: employee.name,
                    avatar: employee.avatar,
                    jobTitle: employee.jobTitle,
                    stats: employee.stats
                },
                upcomingAppointments,
                todayAppointments,
                monthlyStats
            }
        });
    } catch (error) {
        console.error('Get employee stats error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب إحصائيات الموظف'
        });
    }
});

// @desc    Update employee order
// @route   PATCH /api/employees/reorder
// @access  Private
router.patch('/reorder', protect, ensureTenant, async (req, res) => {
    try {
        const { employeeIds } = req.body; // array of employee IDs in new order

        // Update order for each employee
        const updatePromises = employeeIds.map((id, index) =>
            Employee.findOneAndUpdate(
                { _id: id, tenant: req.tenantId },
                { order: index },
                { new: true }
            )
        );

        await Promise.all(updatePromises);

        res.json({
            success: true,
            message: 'تم تحديث ترتيب الموظفين بنجاح'
        });
    } catch (error) {
        console.error('Reorder employees error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تحديث الترتيب'
        });
    }
});

module.exports = router;
