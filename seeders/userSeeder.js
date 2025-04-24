// seeders/userSeeder.js
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

// Buat koneksi ke database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',  // Ganti kalau ada password
  database: 'rw_management'
});

connection.connect(async (err) => {
  if (err) {
    console.error('Koneksi gagal:', err);
    return;
  }
  console.log('Terhubung ke MySQL!');

  // Hash password '12345678'
  const hashedPassword = await bcrypt.hash('12345678', 10);

  // Data seeder
  const users = [
    ["buah", hashedPassword, "Buah", "admin", null, "2025-03-06 09:30:00", "2025-03-06 09:30:00", "buah@example.com"],
    ["farhan", hashedPassword, "MMM", "rt", null, "2025-03-06 09:30:00", "2025-03-06 09:30:00", "farhan@example.com"],
    ["mmm", hashedPassword, "MMM", "warga", null, "2025-03-06 09:30:00", "2025-03-06 09:30:00", "mmm@example.com"]
  ];

  const query = `INSERT INTO users (username, password, name, role, rt_number, created_at, updated_at, email) VALUES ?`;
  connection.query(query, [users], (err, results) => {
    if (err) {
      console.error('Gagal memasukkan data:', err);
    } else {
      console.log(`Berhasil menambahkan ${results.affectedRows} user!`);
    }
    connection.end();
  });
});
