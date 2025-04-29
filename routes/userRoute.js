const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

console.log('Users routes loaded');

// Route untuk export users ke Excel
router.get('/export-users', userController.exportUsers);

// Route untuk import users dari Excel
router.post('/import-users', userController.uploadMiddleware, userController.importUsers);

router.post('/', userController.createUsers);

// Route untuk edit user berdasarkan ID
router.put('/:id', userController.editUser);


router.delete('/:id', userController.deleteUser);


router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);


module.exports = router;
