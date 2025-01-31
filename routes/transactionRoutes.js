const express = require('express');
const router = express.Router();
const { createTransaction, getTransactions, getTransactionSummary } = require('../controllers/transactionController');
const auth = require('../middleware/auth');


// Gunakan auth sebagai middleware dan controller function sebagai handler
router.post('/', auth, createTransaction);
router.get('/', auth, getTransactions);
router.get('/summary', auth, getTransactionSummary);

module.exports = router;