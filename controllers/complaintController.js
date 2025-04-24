
const db = require('../config/database');
const multer = require('multer');
const path = require('path');

// Multer configuration for file uploads
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
        const { filter } = req.query; // Get filter parameter from query
        let query = `
            SELECT 
                c.*,
                u.name as reporter_name,
                DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') as formatted_date,
                (SELECT COUNT(*) FROM complaint_votes WHERE complaint_id = c.id AND vote_type = 'upvote') as upvotes,
                (SELECT COUNT(*) FROM complaint_votes WHERE complaint_id = c.id AND vote_type = 'downvote') as downvotes,
                (SELECT COUNT(*) FROM complaint_comments WHERE complaint_id = c.id) as comment_count
            FROM complaints c
            LEFT JOIN users u ON c.created_by = u.id
        `;
        
        // Add WHERE clause if filtering for current user's complaints
        if (filter === 'me') {
            // Make sure user is logged in and req.user exists
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: 'Authentication required to filter by user' });
            }
            query += ` WHERE c.created_by = ?`;
            const [complaints] = await db.query(query, [req.user.id]);
            return res.json(complaints);
        }
        
        // If no filter, get all data
        query += ` ORDER BY c.created_at DESC`;
        const [complaints] = await db.query(query);
        
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getComplaintDetail = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get the complaint details with votes count
        const [complaints] = await db.query(
            `SELECT 
                c.*,
                u.name as reporter_name,
                DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') as formatted_date,
                (SELECT COUNT(*) FROM complaint_votes WHERE complaint_id = c.id AND vote_type = 'upvote') as upvotes,
                (SELECT COUNT(*) FROM complaint_votes WHERE complaint_id = c.id AND vote_type = 'downvote') as downvotes
            FROM complaints c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.id = ?`,
            [id]
        );
        
        if (complaints.length === 0) {
            return res.status(404).json({ error: 'Complaint not found' });
        }
        
        const complaint = complaints[0];
        
        // Get all comments for this complaint
        const [comments] = await db.query(
            `SELECT 
                cc.*,
                u.name as commenter_name,
                DATE_FORMAT(cc.created_at, '%Y-%m-%d %H:%i') as formatted_date
            FROM complaint_comments cc
            LEFT JOIN users u ON cc.user_id = u.id
            WHERE cc.complaint_id = ?
            ORDER BY cc.created_at ASC`,
            [id]
        );
        
        // Check if user has voted on this complaint
        let userVote = null;
        if (req.user && req.user.id) {
            const [votes] = await db.query(
                'SELECT vote_type FROM complaint_votes WHERE complaint_id = ? AND user_id = ?',
                [id, req.user.id]
            );
            if (votes.length > 0) {
                userVote = votes[0].vote_type;
            }
        }
        
        res.json({
            ...complaint,
            comments,
            userVote
        });
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

// VOTING SYSTEM
exports.voteComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const { voteType } = req.body;
        
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Authentication required to vote' });
        }
        
        if (!['upvote', 'downvote'].includes(voteType)) {
            return res.status(400).json({ error: 'Invalid vote type. Must be "upvote" or "downvote"' });
        }
        
        // Check if complaint exists
        const [complaints] = await db.query('SELECT * FROM complaints WHERE id = ?', [id]);
        if (complaints.length === 0) {
            return res.status(404).json({ error: 'Complaint not found' });
        }
        
        // Check if user has already voted on this complaint
        const [existingVotes] = await db.query(
            'SELECT id, vote_type FROM complaint_votes WHERE complaint_id = ? AND user_id = ?',
            [id, req.user.id]
        );
        
        if (existingVotes.length > 0) {
            // User already voted, update their vote
            if (existingVotes[0].vote_type === voteType) {
                // Remove vote if clicking the same button again (toggle behavior)
                await db.query('DELETE FROM complaint_votes WHERE id = ?', [existingVotes[0].id]);
                
                // Return updated vote counts
                const [voteCounts] = await db.query(
                    `SELECT 
                        (SELECT COUNT(*) FROM complaint_votes WHERE complaint_id = ? AND vote_type = 'upvote') as upvotes,
                        (SELECT COUNT(*) FROM complaint_votes WHERE complaint_id = ? AND vote_type = 'downvote') as downvotes`,
                    [id, id]
                );
                
                return res.json({ 
                    message: 'Vote removed',
                    userVote: null,
                    upvotes: voteCounts[0].upvotes,
                    downvotes: voteCounts[0].downvotes
                });
            } else {
                // Change vote from upvote to downvote or vice versa
                await db.query(
                    'UPDATE complaint_votes SET vote_type = ? WHERE id = ?',
                    [voteType, existingVotes[0].id]
                );
            }
        } else {
            // New vote
            await db.query(
                'INSERT INTO complaint_votes (complaint_id, user_id, vote_type) VALUES (?, ?, ?)',
                [id, req.user.id, voteType]
            );
        }
        
        // Return updated vote counts
        const [voteCounts] = await db.query(
            `SELECT 
                (SELECT COUNT(*) FROM complaint_votes WHERE complaint_id = ? AND vote_type = 'upvote') as upvotes,
                (SELECT COUNT(*) FROM complaint_votes WHERE complaint_id = ? AND vote_type = 'downvote') as downvotes`,
            [id, id]
        );
        
        res.json({ 
            message: 'Vote recorded successfully',
            userVote: voteType,
            upvotes: voteCounts[0].upvotes,
            downvotes: voteCounts[0].downvotes
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// COMMENT SYSTEM
exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Authentication required to comment' });
        }
        
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Comment content cannot be empty' });
        }
        
        // Check if complaint exists
        const [complaints] = await db.query('SELECT * FROM complaints WHERE id = ?', [id]);
        if (complaints.length === 0) {
            return res.status(404).json({ error: 'Complaint not found' });
        }
        
        // Add the comment
        const [result] = await db.query(
            'INSERT INTO complaint_comments (complaint_id, user_id, content) VALUES (?, ?, ?)',
            [id, req.user.id, content]
        );
        
        // Get the newly created comment with user information
        const [comments] = await db.query(
            `SELECT 
                cc.*,
                u.name as commenter_name,
                DATE_FORMAT(cc.created_at, '%Y-%m-%d %H:%i') as formatted_date
            FROM complaint_comments cc
            LEFT JOIN users u ON cc.user_id = u.id
            WHERE cc.id = ?`,
            [result.insertId]
        );
        
        res.status(201).json(comments[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCommentsByComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if complaint exists
        const [complaints] = await db.query('SELECT * FROM complaints WHERE id = ?', [id]);
        if (complaints.length === 0) {
            return res.status(404).json({ error: 'Complaint not found' });
        }
        
        // Get all comments for this complaint
        const [comments] = await db.query(
            `SELECT 
                cc.*,
                u.name as commenter_name,
                DATE_FORMAT(cc.created_at, '%Y-%m-%d %H:%i') as formatted_date
            FROM complaint_comments cc
            LEFT JOIN users u ON cc.user_id = u.id
            WHERE cc.complaint_id = ?
            ORDER BY cc.created_at ASC`,
            [id]
        );
        
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Get the comment
        const [comments] = await db.query('SELECT * FROM complaint_comments WHERE id = ?', [commentId]);
        
        if (comments.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        const comment = comments[0];
        
        // Check if user is the comment owner or has admin rights
        if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You do not have permission to delete this comment' });
        }
        
        // Delete the comment
        await db.query('DELETE FROM complaint_comments WHERE id = ?', [commentId]);
        
        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};