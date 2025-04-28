const jwt = require('jsonwebtoken');
const db = require('../config/database');
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
const multer = require('multer');
const fs = require('fs');

// Setup multer
const upload = multer({ dest: 'uploads/' });
exports.uploadMiddleware = upload.single('file');

// GET: Export users ke Excel
exports.exportUsers = async (req, res) => {
  try {
    const [users] = await db.query('SELECT username, name, email, role FROM users');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Users');

    sheet.columns = [
      { header: 'Username', key: 'username' },
      { header: 'Name', key: 'name' },
      { header: 'Email', key: 'email' },
      { header: 'Role', key: 'role' }
    ];

    users.forEach(user => sheet.addRow(user));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exportUsers:', error);
    res.status(500).json({ error: 'Gagal mengekspor data' });
  }
};

// POST: Import users dari Excel
exports.importUsers = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const sheet = workbook.getWorksheet('Users');

    if (!sheet) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Sheet "Users" tidak ditemukan' });
    }

    const defaultPassword = await bcrypt.hash('12345678', 10);

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const [username, name, email, role] = [row.getCell(1).value, row.getCell(2).value, row.getCell(3).value, row.getCell(4).value];

      if (username && name && email && role) {
        const [exist] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (exist.length) continue;

        await db.query('INSERT INTO users (username, name, email, role, password) VALUES (?, ?, ?, ?, ?)', [username, name, email, role, defaultPassword]);
      }
    }

    fs.unlinkSync(req.file.path);
    res.json({ message: 'Import berhasil' });
  } catch (error) {
    console.error('Error importUsers:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat import' });
  }
};

// POST: Create User
exports.createUsers = async (req, res) => {
  try {
    const { username, password, name, role, rt_number, email } = req.body;

    if (!username || !password || !name || !role) {
      return res.status(400).json({ message: 'username, password, name, and role are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `INSERT INTO users (username, password, name, role, rt_number, email) VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [username, hashedPassword, name, role, rt_number || null, email || null];

    const [result] = await db.query(query, values);

    return res.status(201).json({ 
      message: 'User created successfully', 
      userId: result.insertId 
    });
  } catch (err) {
    console.error('Error creating user:', err);
    return res.status(500).json({ message: 'Error creating user', error: err.message });
  }
};

// PUT: Edit User
exports.editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, name, role, rt_number, email } = req.body;

    if (!username || !password || !name || !role) {
      return res.status(400).json({ message: 'username, password, name, and role are required' });
    }

    const [user] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `UPDATE users SET username = ?, password = ?, name = ?, role = ?, rt_number = ?, email = ? WHERE id = ?`;
    const values = [username, hashedPassword, name, role, rt_number || null, email || null, id];

    await db.query(query, values);

    return res.status(200).json({
      message: 'User updated successfully'
    });

  } catch (err) {
    console.error('Error editing user:', err);
    return res.status(500).json({ message: 'Error editing user', error: err.message });
  }
  
};
// DELETE: Hapus User
// DELETE: Hapus User
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah user dengan ID tersebut ada
    const [user] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hapus user dari database
    await db.query('DELETE FROM users WHERE id = ?', [id]);

    return res.status(200).json({
      message: 'User deleted successfully'
    });

  } catch (err) {
    console.error('Error deleting user:', err);
    return res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
};
// GET: Retrieve all users
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, username, name, email, role FROM users');
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }
    
    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error getting all users:', error);
    return res.status(500).json({ error: 'Failed to retrieve users' });
  }
};



