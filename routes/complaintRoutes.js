const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const auth = require('../middleware/auth');

// Routes membutuhkan authentication
router.use(auth);

// Create new complaint
router.post('/', complaintController.createComplaint);

// Get all complaints
router.get('/', complaintController.getComplaints);

// Update complaint status (untuk admin/RT)
router.patch('/:id/status', complaintController.updateComplaintStatus);

module.exports = router;