const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const { saveTermSettings, getTermSettings } = require('../controllers/termSettingsController');

router.post('/',  auth.protect, saveTermSettings);
router.get('/',   auth.protect, getTermSettings);

module.exports = router;