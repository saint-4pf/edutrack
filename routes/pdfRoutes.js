// routes/pdfRoutes.js
const express    = require('express');
const router     = express.Router();
const authMiddleware  = require('../middleware/authMiddleware');
const { generateReportPDF } = require('../controllers/pdfController');

router.post('/report', authMiddleware.protect, generateReportPDF);

module.exports = router;