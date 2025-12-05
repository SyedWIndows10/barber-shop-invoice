const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'barbershop.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // Create invoices table
        db.run(`CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customerName TEXT,
            date TEXT,
            totalAmount REAL,
            items TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating invoices table: ' + err.message);
            } else {
                // Add userId column if it doesn't exist (migration)
                db.run(`ALTER TABLE invoices ADD COLUMN userId INTEGER REFERENCES users(id)`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('Error adding userId column: ' + err.message);
                    } else if (!err) {
                        console.log('Added userId column to invoices table');
                    }
                });
            }
        });

        // Create users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error creating users table: ' + err.message);
            } else {
                // Create default admin user if not exists
                db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
                    if (err) {
                        console.error('Error checking for admin user: ' + err.message);
                    } else if (!row) {
                        const hashedPassword = bcrypt.hashSync('admin123', 10);
                        db.run('INSERT INTO users (username, password) VALUES (?, ?)',
                            ['admin', hashedPassword],
                            (err) => {
                                if (err) {
                                    console.error('Error creating admin user: ' + err.message);
                                } else {
                                    console.log('Default admin user created (username: admin, password: admin123)');
                                }
                            }
                        );
                    }
                });
            }
        });
    }
});

module.exports = db;
