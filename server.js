const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const profileRoute = require('./routes/profileRoute');
const userRoute = require('./routes/userRoute');

const app = express();

console.log('Server starting...');

// Configure CORS first, before other middlewares
app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/profile', profileRoute);
app.use('/api/user', userRoute);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));  

// Debugging: Print all registered routes
console.log('Registered routes:');
app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
        console.log(r.route.path, Object.keys(r.route.methods));
    }
});
// Rute untuk update password
app.use('/api/profile/updatePassword', profileRoute);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
