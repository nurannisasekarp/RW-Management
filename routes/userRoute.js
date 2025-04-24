const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

console.log('Users routes loaded');

router.get('/export-users', userController.exportUsers);
router.post('/import-users', userController.uploadMiddleware, userController.importUsers);

module.exports = router;
