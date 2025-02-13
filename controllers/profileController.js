const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Fungsi untuk mengambil profil pengguna
exports.getProfile = async (req, res) => {
  try {
    // Mendapatkan token dari header Authorization
    const token = req.headers.authorization.split(' ')[1];
    
    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ambil data pengguna berdasarkan id yang terverifikasi dari token
    const [user] = await db.query('SELECT id, username, name, email, role FROM users WHERE id = ?', [decoded.id]);
    
    if (!user.length) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    
    res.json({
      id: user[0].id,
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

// Fungsi untuk mengupdate profil pengguna
exports.editProfile = async (req, res) => {
  try {
    const { username, name, email, role } = req.body;
    const token = req.headers.authorization.split(' ')[1];

    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Cek apakah ada data baru yang ingin diubah
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
    if (role) {
      updateFields.push('role = ?');
      updateValues.push(role);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data yang perlu diperbarui' });
    }

    updateValues.push(decoded.id);

    // Menjalankan query untuk memperbarui profil
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.query(query, updateValues);

    // Mengambil data pengguna yang telah diperbarui
    const [updatedUser] = await db.query('SELECT id, username, name, email, role FROM users WHERE id = ?', [decoded.id]);

    res.json({
      message: 'Profil berhasil diperbarui',
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat memperbarui profil' });
  }
};
