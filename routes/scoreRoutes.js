// routes/scoreRoutes.js
const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const controller     = require('../controllers/scoreController');

const protect   = authMiddleware.protect;
const adminOnly = authMiddleware.adminOnly;

router.delete('/all', protect, adminOnly, controller.deleteAllScores);
router.post('/',      protect, controller.createScore);
router.get('/',       protect, controller.getScores);
router.get('/:id',    protect, controller.getScoreById);
router.put('/:id',    protect, controller.updateScore);
router.delete('/:id', protect, controller.deleteScore);

module.exports = router;