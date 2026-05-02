// routes/studentRoutes.js
const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const controller     = require('../controllers/studentController');

const protect   = authMiddleware.protect;
const adminOnly = authMiddleware.adminOnly;

router.delete('/all', protect, adminOnly, controller.deleteAllStudents);
router.post('/',      protect, controller.createStudent);
router.get('/',       protect, controller.getAllStudents);
router.get('/:id',    protect, controller.getStudentById);
router.put('/:id',    protect, controller.updateStudent);
router.delete('/:id', protect, controller.deleteStudent);

module.exports = router;