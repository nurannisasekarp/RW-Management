const jwt = require('jsonwebtoken');
const db = require('../config/database');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
        const user = users[0];
        
        if (!user) {
            throw new Error();
        }
        
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

module.exports = auth;