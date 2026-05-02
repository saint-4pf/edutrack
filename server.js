// server.js — EduTrack v1.0
const express   = require('express');
const cors      = require('cors');
const dotenv    = require('dotenv');
const path      = require('path');
const connectDB = require('./config/db');

dotenv.config();
// ── LICENSE CHECK ──────────────────────────
if (!process.env.LICENSE_KEY) {
  console.error('❌ No license key found. App cannot start.');
  process.exit(1);
}
console.log(`✅ License verified for: ${process.env.SCHOOL_NAME}`);
connectDB();

const app = express();

// ── MIDDLEWARE ────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' })); // increased for base64 logo in PDF requests
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// ── API ROUTES ────────────────────────────────
app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/scores',   require('./routes/scoreRoutes'));
app.use('/api/pdf',      require('./routes/pdfRoutes'));
app.use('/api/import',   require('./routes/importRoutes'));
app.use('/api/term-settings', require('./routes/termSettingsRoutes'));

app.use(express.static(path.join(__dirname, 'frontend')));
// ── HEALTH CHECK ──────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: '✅ EduTrack server running', version: '1.0.0' });
});
// — SCHOOL INFO (locked from .env)
app.get('/api/school-info', (req, res) => {
  res.json({
    schoolName: process.env.SCHOOL_NAME || '',
    address:    process.env.SCHOOL_ADDRESS || '',
    pobox:      process.env.SCHOOL_POBOX || '',
    phones:     process.env.SCHOOL_PHONES || ''
  });
});

// — CATCH-ALL
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});
// ── CATCH-ALL: serve frontend ──────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 EduTrack server running on http://localhost:${PORT}`);
});