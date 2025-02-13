const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../config/database');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const googleEmail = profile.emails[0].value;

      const [existingUsers] = await db.query(
        'SELECT * FROM users WHERE email = ?', 
        [googleEmail]
      );

      if (existingUsers.length === 0) {
        return done(null, false, { message: 'Email tidak terdaftar' });
      }

      return done(null, existingUsers[0]);
    } catch (error) {
      return done(error, null);
    }
  }
));

exports.register = async (req, res) => {
    try {
        const { username, password, name, role, rt_number, email } = req.body;

        // Validasi input
        if (!username || !password || !name ) {
            return res.status(400).json({ error: 'Semua field harus diisi' });
        }

        // Cek username sudah dipakai atau belum
        const [existingUser] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Username sudah dipakai' });
        }

        // Cek email sudah dipakai atau belum
        const [existingEmail] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingEmail.length > 0) {
            return res.status(400).json({ error: 'Email sudah dipakai' });
        }

        // Validasi khusus untuk RT
        if (role === 'rt') {
            if (!rt_number) {
                return res.status(400).json({ error: 'Nomor RT harus diisi' });
            }

            const [existingRT] = await db.query('SELECT * FROM users WHERE role = "rt" AND rt_number = ?', [rt_number]);
            if (existingRT.length > 0) {
                return res.status(400).json({ error: 'Nomor RT sudah terdaftar' });
            }
        }

        // Validasi khusus untuk RW
        if (role === 'rw') {
            const [existingRW] = await db.query('SELECT * FROM users WHERE role = "rw"');
            if (existingRW.length > 0) {
                return res.status(400).json({ error: 'Admin RW sudah terdaftar' });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user baru
        const [result] = await db.query(
            `INSERT INTO users (username, password, name, role, rt_number, email) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [username, hashedPassword, name, role, rt_number || null, email]
        );

        // Ambil data user yang baru dibuat (tanpa password)
        const [newUser] = await db.query(
            'SELECT id, username, name, role, rt_number, email FROM users WHERE id = ?',
            [result.insertId]
        );

        const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET);

        res.status(201).json({
            message: 'Registrasi berhasil',
            user: newUser[0],
            token
        });

    } catch (error) {
        // console.error('Register error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat registrasi' });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        const user = users[0];
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Username atau password salah' });
        }
        
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        delete user.password;
        res.json({ 
            message: 'Login berhasil',
            user, 
            token 
        });
    } catch (error) {
        res.status(500).json({ error: 'Terjadi kesalahan saat login' });
    }
};

exports.googleLogin = passport.authenticate('google', { 
  scope: ['profile', 'email'] 
});

exports.googleCallback = (req, res) => {
  passport.authenticate('google', async (err, user, info) => {
    if (err) {
      return res.redirect('http://localhost:5173/login?error=authentication_failed');
    }

    if (!user) {
      return res.redirect('http://localhost:5173/login?error=unauthorized');
    }

    try {
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
      
      // Kirim token via URL parameter
      res.redirect(`http://localhost:5173/login?token=${token}`);
    } catch (error) {
      res.redirect('http://localhost:5173/login?error=token_generation_failed');
    }
  })(req, res);
};

// New method to verify Google login token
exports.verifyGoogleToken = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await db.query('SELECT id, username, name, email, role FROM users WHERE id = ?', [decoded.id]);
    
    if (!users.length) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json(users[0]);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};