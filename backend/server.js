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
