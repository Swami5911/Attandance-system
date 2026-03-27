const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files (index.html, style.css, script.js)

// Helper to read DB
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        // If file doesn't exist or is empty, return default structure
        return { students: {}, attendance: {} };
    }
};

// Helper to write DB
const writeDB = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// GET students for a specific year
app.get('/api/students/:year', (req, res) => {
    const db = readDB();
    const students = db.students[req.params.year] || [];
    res.json(students);
});

// GET attendance history for a specific year and date
app.get('/api/attendance/:year/:date', (req, res) => {
    const db = readDB();
    const key = `attendance_${req.params.year}_${req.params.date}`;
    const record = db.attendance[key] || null;
    res.json(record);
});

// POST to save attendance
app.post('/api/attendance', (req, res) => {
    const { year, date, records } = req.body;
    
    if (!year || !date || !records) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const db = readDB();
    const key = `attendance_${year}_${date}`;
    db.attendance[key] = records;
    
    writeDB(db);
    res.json({ success: true, message: 'Attendance saved successfully' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`SKD University Attendance Server running on http://localhost:${PORT}`);
});
