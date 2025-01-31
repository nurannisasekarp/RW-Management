const db = require('../config/database');
const multer = require('multer');
const path = require('path');

// Konfigurasi multer untuk upload file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/complaints/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'complaint-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'));
        }
    }
});

exports.createComplaint = async (req, res) => {
    try {
        upload.single('photo')(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            const { title, description, location, rt_number } = req.body;
            const photoUrl = req.file ? `/uploads/complaints/${req.file.filename}` : null;

            const [result] = await db.query(
                `INSERT INTO complaints (title, description, location, rt_number, photo_url, created_by) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [title, description, location, rt_number, photoUrl, req.user.id]
            );

            const [complaint] = await db.query(
                'SELECT * FROM complaints WHERE id = ?',
                [result.insertId]
            );

            res.status(201).json(complaint[0]);
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getComplaints = async (req, res) => {
    try {
        const [complaints] = await db.query(`
            SELECT 
                c.*,
                u.name as reporter_name,
                DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') as formatted_date
            FROM complaints c
            LEFT JOIN users u ON c.created_by = u.id
            ORDER BY c.created_at DESC
        `);

        res.json(complaints);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await db.query(
            'UPDATE complaints SET status = ? WHERE id = ?',
            [status, id]
        );

        const [complaint] = await db.query(
            'SELECT * FROM complaints WHERE id = ?',
            [id]
        );

        res.json(complaint[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};