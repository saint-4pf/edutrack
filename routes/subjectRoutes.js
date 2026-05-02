// routes/subjectRoutes.js
const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const controller     = require('../controllers/subjectController');

const protect = authMiddleware.protect;

router.post('/',      protect, controller.createSubject);
router.get('/',       protect, controller.getSubjects);
router.put('/:id',    protect, controller.updateSubject);
router.delete('/:id', protect, controller.deleteSubject);

module.exports = router;