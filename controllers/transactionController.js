const db = require('../config/database');

exports.createTransaction = async (req, res) => {
    try {
        const { type, amount, category, description, transaction_date, rt_number } = req.body;
        
        const [result] = await db.query(
            `INSERT INTO transactions (type, amount, category, description, 
                transaction_date, rt_number, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [type, amount, category, description, transaction_date, rt_number, req.user.id]
        );
        
        const [transaction] = await db.query(
            'SELECT * FROM transactions WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json(transaction[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getTransactions = async (req, res) => {
    try {
        // console.log('Auth header:', req.headers.authorization);
        // console.log('User data:', req.user);
        
        let query = `
            SELECT 
                t.*,
                DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as formatted_date 
            FROM transactions t 
            WHERE 1=1 
            ORDER BY 
                t.transaction_date DESC,
                t.created_at DESC
        `;
        
        const queryParams = [];
        
        // console.log('Final query:', query);
        // console.log('Query params:', queryParams);
        
        const [transactions] = await db.query(query, queryParams);
        // console.log('Query results:', transactions);
        
        res.json(transactions);
    } catch (error) {
        // console.error('Error in getTransactions:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getTransactionSummary = async (req, res) => {
    try {
        const [summary] = await db.query(`
            SELECT 
                type,
                SUM(amount) as total
            FROM transactions 
            WHERE MONTH(transaction_date) = MONTH(CURRENT_DATE())
            AND YEAR(transaction_date) = YEAR(CURRENT_DATE())
            GROUP BY type
        `);
        
        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};