const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

console.log('Users routes loaded');

// Route untuk export users ke Excel
router.get('/export-users', userController.exportUsers);

// Route untuk import users dari Excel
router.post('/import-users', userController.uploadMiddleware, userController.importUsers);

// Route untuk create user baru
router.post('/', userController.createUsers);

// Route untuk edit user berdasarkan ID
router.put('/:id', userController.editUser);

// Route untuk delete user berdasarkan ID
router.delete('/:id', userController.deleteUser);

// Route untuk get all users
router.get('/', userController.getAllUsers);

module.exports = router;
