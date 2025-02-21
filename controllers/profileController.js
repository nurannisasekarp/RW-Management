const jwt = require('jsonwebtoken');
const db = require('../config/database');
const bcrypt = require('bcrypt');

// Fungsi untuk mengambil profil pengguna
exports.getProfile = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [user] = await db.query('SELECT username, name, email, role FROM users WHERE id = ?', [decoded.id]);
    if (!user.length) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    res.json({
      username: user[0].username,
      name: user[0].name,
      email: user[0].email,
      role: user[0].role
    });

  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' });
  }
};

// Fungsi untuk edit profil berdasarkan ID user
exports.editProfile = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('User ID dari URL:', id);

    const [rows] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (!rows.length) {
      console.log(`User dengan ID ${id} tidak ditemukan`);
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    const { username, name, email } = req.body;
    if (!username && !name && !email) {
      return res.status(400).json({ error: 'Tidak ada data yang diperbarui' });
    }

    const updateFields = [];
    const updateValues = [];
    if (username) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }
    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    updateValues.push(id);
    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.query(updateQuery, updateValues);

    res.json({ message: 'Profil berhasil diperbarui' });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// Fungsi untuk memperbarui password
exports.updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Semua kolom password harus diisi' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Konfirmasi password tidak sesuai dengan password baru' });
    }

    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Password lama salah' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);

    res.json({ message: 'Password berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};
