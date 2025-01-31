const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/google', authController.googleLogin);
router.get('/google/callback', authController.googleCallback);
router.get('/verify', authController.verifyGoogleToken);


module.exports = router;