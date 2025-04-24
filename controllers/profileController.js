const jwt = require('jsonwebtoken');
const db = require('../config/database');
const bcrypt = require('bcrypt');

// GET: Ambil profil user berdasarkan token
exports.getProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token tidak disertakan' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [user] = await db.query('SELECT username, name, email, role FROM users WHERE id = ?', [decoded.id]);

    if (!user.length) return res.status(404).json({ error: 'User tidak ditemukan' });

    res.json(user[0]);
  } catch (error) {
    console.error('Error getProfile:', error);
    res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' });
  }
};

// PATCH: Edit profil user
exports.editProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, name, email } = req.body;

    const [rows] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'User tidak ditemukan' });

    const updates = [];
    const values = [];

    if (username) { updates.push('username = ?'); values.push(username); }
    if (name)     { updates.push('name = ?');     values.push(name); }
    if (email)    { updates.push('email = ?');    values.push(email); }

    if (!updates.length) return res.status(400).json({ error: 'Tidak ada data untuk diperbarui' });

    values.push(id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Profil berhasil diperbarui' });
  } catch (error) {
    console.error('Error editProfile:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
};

// PATCH: Update password
exports.updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Semua kolom harus diisi' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Konfirmasi tidak sesuai' });
    }

    const [users] = await db.query('SELECT password FROM users WHERE id = ?', [id]);
    if (!users.length) return res.status(404).json({ error: 'User tidak ditemukan' });

    const valid = await bcrypt.compare(oldPassword, users[0].password);
    if (!valid) return res.status(401).json({ error: 'Password lama salah' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, id]);

    res.json({ message: 'Password berhasil diperbarui' });
  } catch (error) {
    console.error('Error updatePassword:', error);
    res.status(500).json({ error: 'Kesalahan server saat update password' });
  }
};
