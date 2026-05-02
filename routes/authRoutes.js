// routes/authRoutes.js
const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const controller     = require('../controllers/authController');

const protect   = authMiddleware.protect;
const adminOnly = authMiddleware.adminOnly;

router.post('/register',    controller.register);
router.post('/login',       controller.login);
router.post('/admin-login', controller.adminLogin);
router.get('/teachers',     protect, adminOnly, controller.getTeachers);
router.delete('/users/:id', protect, adminOnly, controller.deleteUser);

module.exports = router;