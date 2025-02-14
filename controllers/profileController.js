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
    const { id } = req.params; // Ambil ID dari URL
    console.log('User ID dari URL:', id);

    // Periksa apakah ID ada di database
    const [rows] = await db.query('SELECT id FROM users WHERE id = ?', [id]);

    if (!rows.length) {
      console.log(`User dengan ID ${id} tidak ditemukan`);
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    // Ambil data dari body request
    const { username, name, email } = req.body;

    if (!username && !name && !email) {
      return res.status(400).json({ error: 'Tidak ada data yang diperbarui' });
    }

    // Bangun query update dinamis
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

    // Eksekusi query
    await db.query(updateQuery, updateValues);

    res.json({ message: 'Profil berhasil diperbarui' });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};
