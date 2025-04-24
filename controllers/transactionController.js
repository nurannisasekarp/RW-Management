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
        // Get year and search query from query parameters
        const year = req.query.year || new Date().getFullYear();
        const searchQuery = req.query.search || '';
        
        let query = `
            SELECT 
                t.*,
                DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as formatted_date 
            FROM transactions t 
            WHERE YEAR(t.transaction_date) = ?
        `;
        
        const queryParams = [year];
        
        // Add search filter if search query exists
        if (searchQuery) {
            query += ` AND t.description LIKE ?`;
            queryParams.push(`%${searchQuery}%`);
        }
        
        query += `
            ORDER BY 
                t.transaction_date DESC,
                t.created_at DESC
        `;
        
        const [transactions] = await db.query(query, queryParams);
        
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getTransactionSummary = async (req, res) => {
    try {
        // Get year and month from query parameters, default to current year/month
        const year = req.query.year || new Date().getFullYear();
        const month = req.query.month || new Date().getMonth() + 1;
        
        const [summary] = await db.query(`
            SELECT 
                type,
                SUM(amount) as total
            FROM transactions 
            WHERE MONTH(transaction_date) = ?
            AND YEAR(transaction_date) = ?
            GROUP BY type
        `, [month, year]);
        
        // Handle empty results better
        if (!summary || summary.length === 0) {
            return res.json([
                { type: 'income', total: 0 },
                { type: 'expense', total: 0 }
            ]);
        }
        
        const result = [];
        const incomeEntry = summary.find(item => item.type === 'income');
        const expenseEntry = summary.find(item => item.type === 'expense');
        
        result.push(incomeEntry || { type: 'income', total: 0 });
        result.push(expenseEntry || { type: 'expense', total: 0 });
        
        res.json(result);
    } catch (error) {
        console.error('Error in getTransactionSummary:', error);
        res.status(500).json({ error: error.message });
    }
};