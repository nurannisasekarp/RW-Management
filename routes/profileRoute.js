const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// Rute untuk mendapatkan profil pengguna
router.get('/getProfile', profileController.getProfile);

// Rute untuk memperbarui profil pengguna
router.patch('/updateProfile', profileController.updateProfile);

module.exports = router;
