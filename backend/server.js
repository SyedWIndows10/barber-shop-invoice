const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Get all invoices
app.get('/api/invoices', (req, res) => {
    const { startDate, endDate } = req.query;
    console.log('Query Params:', req.query);
    let sql = 'SELECT * FROM invoices';
    const params = [];

    if (startDate && endDate) {
        sql += ' WHERE date BETWEEN ? AND ?';
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

// Create a new invoice
app.post('/api/invoices', (req, res) => {
    const { customerName, date, totalAmount, items } = req.body;
    const sql = 'INSERT INTO invoices (customerName, date, totalAmount, items) VALUES (?,?,?,?)';
    const params = [customerName, date, totalAmount, JSON.stringify(items)];

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

// Get predefined services
app.get('/api/services', (req, res) => {
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
