const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'barbershop.db');
const backupPath = path.resolve(__dirname, 'barbershop_backup.db');

console.log('Starting database migration...');

// Backup existing database
if (fs.existsSync(dbPath)) {
    console.log('Backing up existing database...');
    fs.copyFileSync(dbPath, backupPath);
    console.log('Backup created at:', backupPath);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }

    console.log('Connected to database');

    // Check if appointments table exists and needs migration
    db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='appointments'", (err, row) => {
        if (err) {
            console.error('Error checking table:', err.message);
            db.close();
            process.exit(1);
        }

        if (row && row.sql.includes('userId INTEGER NOT NULL')) {
            console.log('Found old schema with NOT NULL constraint on userId');
            console.log('Migrating appointments table...');

            db.serialize(() => {
                // Create new table with correct schema
                db.run(`CREATE TABLE appointments_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER,
                    customerName TEXT NOT NULL,
                    customerPhone TEXT,
                    appointmentDate TEXT NOT NULL,
                    appointmentTime TEXT NOT NULL,
                    services TEXT NOT NULL,
                    totalAmount REAL NOT NULL,
                    status TEXT DEFAULT 'pending',
                    barberId INTEGER,
                    invoiceId INTEGER,
                    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (userId) REFERENCES users(id),
                    FOREIGN KEY (barberId) REFERENCES users(id),
                    FOREIGN KEY (invoiceId) REFERENCES invoices(id)
                )`, (err) => {
                    if (err) {
                        console.error('Error creating new table:', err.message);
                        db.close();
                        process.exit(1);
                    }
                    console.log('Created new appointments table');
                });

                // Copy data from old table
                db.run(`INSERT INTO appointments_new 
                    SELECT id, userId, customerName, 
                           COALESCE(customerPhone, '') as customerPhone,
                           appointmentDate, appointmentTime, services, totalAmount, 
                           status, 
                           COALESCE(barberId, userId) as barberId,
                           invoiceId, createdAt 
                    FROM appointments`, (err) => {
                    if (err) {
                        console.error('Error copying data:', err.message);
                        db.close();
                        process.exit(1);
                    }
                    console.log('Copied existing appointment data');
                });

                // Drop old table
                db.run('DROP TABLE appointments', (err) => {
                    if (err) {
                        console.error('Error dropping old table:', err.message);
                        db.close();
                        process.exit(1);
                    }
                    console.log('Dropped old appointments table');
                });

                // Rename new table
                db.run('ALTER TABLE appointments_new RENAME TO appointments', (err) => {
                    if (err) {
                        console.error('Error renaming table:', err.message);
                        db.close();
                        process.exit(1);
                    }
                    console.log('Renamed new table to appointments');
                    console.log('Migration completed successfully!');
                    console.log('You can now start the server with: node server.js');
                    db.close();
                });
            });
        } else if (row) {
            console.log('Appointments table already has correct schema');
            console.log('No migration needed');
            db.close();
        } else {
            console.log('Appointments table does not exist yet');
            console.log('It will be created with correct schema when server starts');
            db.close();
        }
    });
});
