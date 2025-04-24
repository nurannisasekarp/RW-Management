
const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Create new complaint
router.post('/', complaintController.createComplaint);

// Get all complaints
router.get('/', complaintController.getComplaints);

// Get specific complaint with details
router.get('/:id', complaintController.getComplaintDetail);

// Update complaint status (for admin/RT)
router.patch('/:id/status', complaintController.updateComplaintStatus);

// Voting system
router.post('/:id/vote', complaintController.voteComplaint);

// Comment system
router.post('/:id/comments', complaintController.addComment);
router.get('/:id/comments', complaintController.getCommentsByComplaint);
router.delete('/comments/:commentId', complaintController.deleteComment);

module.exports = router;