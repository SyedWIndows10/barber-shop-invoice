const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const { authenticateToken, SECRET_KEY } = require('./auth-middleware');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Authentication Routes

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username }
        });
    });
});

// Register
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run('INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: 'Registration successful',
                user: { id: this.lastID, username }
            });
        }
    );
});

// Verify token
app.post('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        message: 'Token is valid',
        user: req.user
    });
});

// Protected Routes

// Get all invoices (protected)
app.get('/api/invoices', authenticateToken, (req, res) => {
    const { startDate, endDate } = req.query;
    console.log('Query Params:', req.query);
    let sql = 'SELECT * FROM invoices WHERE userId = ?';
    const params = [req.user.id];

    if (startDate && endDate) {
        sql += ' AND date BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    sql += ' ORDER BY date DESC';

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        // Parse items JSON string back to object
        const invoices = rows.map(row => ({
            ...row,
            items: JSON.parse(row.items)
        }));
        res.json({
            message: 'success',
            data: invoices
        });
    });
});

// Create a new invoice (protected)
app.post('/api/invoices', authenticateToken, (req, res) => {
    const { customerName, date, totalAmount, items } = req.body;
    const sql = 'INSERT INTO invoices (customerName, date, totalAmount, items, userId) VALUES (?,?,?,?,?)';
    const params = [customerName, date, totalAmount, JSON.stringify(items), req.user.id];

    db.run(sql, params, function (err, result) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: {
                id: this.lastID,
                customerName,
                date,
                totalAmount,
                items
            }
        });
    });
});

// Public Routes (No Authentication Required)

// Get available services for public
app.get('/api/public/services', (req, res) => {
    const services = [
        { id: 1, name: 'Haircut', price: 20, duration: 30 },
        { id: 2, name: 'Shave', price: 15, duration: 20 },
        { id: 3, name: 'Beard Trim', price: 10, duration: 15 },
        { id: 4, name: 'Hair Wash', price: 5, duration: 10 },
        { id: 5, name: 'Full Service', price: 40, duration: 60 }
    ];
    res.json({
        message: 'success',
        data: services
    });
});

// Get list of barbers
app.get('/api/public/barbers', (req, res) => {
    db.all('SELECT id, username FROM users', [], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: rows
        });
    });
});

// Get available time slots for a specific date and barber
app.get('/api/public/available-slots', (req, res) => {
    const { date, barberId } = req.query;

    if (!date || !barberId) {
        return res.status(400).json({ error: 'Date and barberId are required' });
    }

    // Define working hours (9 AM to 6 PM)
    const workingHours = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];

    // Get all confirmed appointments for the date and barber
    db.all(
        'SELECT appointmentTime FROM appointments WHERE appointmentDate = ? AND barberId = ? AND status = ?',
        [date, barberId, 'confirmed'],
        (err, bookedSlots) => {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }

            // Filter out booked slots
            const bookedTimes = bookedSlots.map(slot => slot.appointmentTime);
            const availableSlots = workingHours.filter(time => !bookedTimes.includes(time));

            res.json({
                message: 'success',
                data: availableSlots
            });
        }
    );
});

// Create appointment request (public - no auth required)
app.post('/api/public/appointments', (req, res) => {
    const { customerName, customerPhone, appointmentDate, appointmentTime, services, totalAmount, barberId } = req.body;

    if (!customerName || !customerPhone || !appointmentDate || !appointmentTime || !services || !totalAmount || !barberId) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if the time slot is already taken
    db.get(
        'SELECT id FROM appointments WHERE appointmentDate = ? AND appointmentTime = ? AND barberId = ? AND status = ?',
        [appointmentDate, appointmentTime, barberId, 'confirmed'],
        (err, existingAppointment) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            if (existingAppointment) {
                return res.status(400).json({ error: 'This time slot is already booked' });
            }

            // Create the appointment request
            const sql = 'INSERT INTO appointments (customerName, customerPhone, appointmentDate, appointmentTime, services, totalAmount, barberId, status) VALUES (?,?,?,?,?,?,?,?)';
            const params = [customerName, customerPhone, appointmentDate, appointmentTime, JSON.stringify(services), totalAmount, barberId, 'pending'];

            db.run(sql, params, function (err) {
                if (err) {
                    res.status(400).json({ error: err.message });
                    return;
                }
                res.json({
                    message: 'Appointment request submitted successfully',
                    data: {
                        id: this.lastID,
                        customerName,
                        customerPhone,
                        appointmentDate,
                        appointmentTime,
                        services,
                        totalAmount,
                        barberId,
                        status: 'pending'
                    }
                });
            });
        }
    );
});

// Appointment Routes

// Create a new appointment (protected - for barbers creating appointments on behalf of customers)
app.post('/api/appointments', authenticateToken, (req, res) => {
    const { customerName, customerPhone, appointmentDate, appointmentTime, services, totalAmount, barberId } = req.body;

    if (!customerName || !customerPhone || !appointmentDate || !appointmentTime || !services || !totalAmount) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const sql = 'INSERT INTO appointments (userId, customerName, customerPhone, appointmentDate, appointmentTime, services, totalAmount, barberId, status) VALUES (?,?,?,?,?,?,?,?,?)';
    const params = [req.user.id, customerName, customerPhone, appointmentDate, appointmentTime, JSON.stringify(services), totalAmount, barberId || req.user.id, 'confirmed'];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'Appointment created successfully',
            data: {
                id: this.lastID,
                userId: req.user.id,
                customerName,
                customerPhone,
                appointmentDate,
                appointmentTime,
                services,
                totalAmount,
                barberId: barberId || req.user.id,
                status: 'confirmed',
                invoiceId: null
            }
        });
    });
});

// Get all appointments for logged-in barber (protected)
app.get('/api/appointments', authenticateToken, (req, res) => {
    const { status, startDate, endDate } = req.query;
    let sql = 'SELECT * FROM appointments WHERE barberId = ?';
    const params = [req.user.id];

    if (status) {
        sql += ' AND status = ?';
        params.push(status);
    }

    if (startDate && endDate) {
        sql += ' AND appointmentDate BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    sql += ' ORDER BY appointmentDate ASC, appointmentTime ASC';

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        const appointments = rows.map(row => ({
            ...row,
            services: JSON.parse(row.services)
        }));
        res.json({
            message: 'success',
            data: appointments
        });
    });
});

// Get single appointment (protected)
app.get('/api/appointments/:id', authenticateToken, (req, res) => {
    const sql = 'SELECT * FROM appointments WHERE id = ? AND barberId = ?';

    db.get(sql, [req.params.id, req.user.id], (err, row) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Appointment not found' });
            return;
        }
        res.json({
            message: 'success',
            data: {
                ...row,
                services: JSON.parse(row.services)
            }
        });
    });
});

// Confirm appointment request (protected)
app.put('/api/appointments/:id/confirm', authenticateToken, (req, res) => {
    const appointmentId = req.params.id;

    // First, get the appointment to verify it belongs to this barber
    db.get('SELECT * FROM appointments WHERE id = ? AND barberId = ?', [appointmentId, req.user.id], (err, appointment) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        if (appointment.status !== 'pending') {
            return res.status(400).json({ error: 'Only pending appointments can be confirmed' });
        }

        // Check if the time slot is still available
        db.get(
            'SELECT id FROM appointments WHERE appointmentDate = ? AND appointmentTime = ? AND barberId = ? AND status = ? AND id != ?',
            [appointment.appointmentDate, appointment.appointmentTime, req.user.id, 'confirmed', appointmentId],
            (err, conflict) => {
                if (err) {
                    return res.status(400).json({ error: err.message });
                }
                if (conflict) {
                    return res.status(400).json({ error: 'This time slot has been booked by another appointment' });
                }

                // Confirm the appointment
                db.run('UPDATE appointments SET status = ? WHERE id = ?', ['confirmed', appointmentId], function (err) {
                    if (err) {
                        return res.status(400).json({ error: err.message });
                    }
                    res.json({
                        message: 'Appointment confirmed successfully',
                        data: {
                            appointmentId: appointmentId,
                            status: 'confirmed'
                        }
                    });
                });
            }
        );
    });
});

// Reject appointment request (protected)
app.put('/api/appointments/:id/reject', authenticateToken, (req, res) => {
    const appointmentId = req.params.id;

    db.get('SELECT * FROM appointments WHERE id = ? AND barberId = ?', [appointmentId, req.user.id], (err, appointment) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        db.run('UPDATE appointments SET status = ? WHERE id = ?', ['rejected', appointmentId], function (err) {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            res.json({
                message: 'Appointment rejected',
                data: {
                    appointmentId: appointmentId,
                    status: 'rejected'
                }
            });
        });
    });
});

// Complete appointment and create invoice (protected)
app.put('/api/appointments/:id/complete', authenticateToken, (req, res) => {
    const appointmentId = req.params.id;

    // First, get the appointment to verify ownership and get details
    db.get('SELECT * FROM appointments WHERE id = ? AND barberId = ?', [appointmentId, req.user.id], (err, appointment) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        if (appointment.status !== 'confirmed') {
            return res.status(400).json({ error: 'Only confirmed appointments can be completed' });
        }

        // Create an invoice for the completed appointment
        const invoiceSql = 'INSERT INTO invoices (customerName, date, totalAmount, items, userId) VALUES (?,?,?,?,?)';
        const invoiceParams = [
            appointment.customerName,
            appointment.appointmentDate,
            appointment.totalAmount,
            appointment.services,
            req.user.id
        ];

        db.run(invoiceSql, invoiceParams, function (invoiceErr) {
            if (invoiceErr) {
                return res.status(400).json({ error: 'Failed to create invoice: ' + invoiceErr.message });
            }

            const invoiceId = this.lastID;

            // Update appointment with completed status and invoiceId
            const updateSql = 'UPDATE appointments SET status = ?, invoiceId = ? WHERE id = ?';
            db.run(updateSql, ['completed', invoiceId, appointmentId], function (updateErr) {
                if (updateErr) {
                    return res.status(400).json({ error: updateErr.message });
                }

                res.json({
                    message: 'Appointment completed and invoice created',
                    data: {
                        appointmentId: appointmentId,
                        invoiceId: invoiceId,
                        status: 'completed'
                    }
                });
            });
        });
    });
});

// Delete/Cancel appointment (protected)
app.delete('/api/appointments/:id', authenticateToken, (req, res) => {
    const sql = 'UPDATE appointments SET status = ? WHERE id = ? AND barberId = ?';

    db.run(sql, ['cancelled', req.params.id, req.user.id], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Appointment not found' });
            return;
        }
        res.json({
            message: 'Appointment cancelled successfully'
        });
    });
});

// Get predefined services (protected)
app.get('/api/services', authenticateToken, (req, res) => {
    const services = [
        { id: 1, name: 'Haircut', price: 20 },
        { id: 2, name: 'Shave', price: 15 },
        { id: 3, name: 'Beard Trim', price: 10 },
        { id: 4, name: 'Hair Wash', price: 5 },
        { id: 5, name: 'Full Service', price: 40 }
    ];
    res.json({
        message: 'success',
        data: services
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
