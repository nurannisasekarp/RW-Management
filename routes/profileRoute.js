const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

console.log('Profile routes loaded');

// Rute untuk mendapatkan profil pengguna
router.get('/getProfile', profileController.getProfile);

// Rute untuk memperbarui profil pengguna
router.patch('/editProfile/:id', profileController.editProfile);

// Rute untuk memperbarui password
router.patch('/updatePassword/:id', profileController.updatePassword);

module.exports = router;
