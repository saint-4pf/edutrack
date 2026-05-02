// routes/importRoutes.js
const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { importStudentsCSV } = require('../controllers/importController');

router.post('/students', authMiddleware.protect, importStudentsCSV);

module.exports = router;