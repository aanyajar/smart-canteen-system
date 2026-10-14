require('dotenv').config(); 
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));

// --- Database Connection ---
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '', 
    database: process.env.DB_NAME || 'smart_canteen'
});

db.connect(err => {
    if (err) console.log('❌ DB Connection Error. Check your .env file or XAMPP.');
    else console.log('✅ MySQL Connected Securely');
    });

// --- Nodemailer Configuration ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

let tempAdminOTP = null;

// ==========================================
// 📥 🔥 ORDERS ENGINE ENDPOINTS
// ==========================================

// 1. Save new order into MySQL database
app.post('/api/orders', (req, res) => {
    const { id, user_name, totalAmount, paymentMode, transactionId, items } = req.body;
    const stringifiedItems = typeof items === 'string' ? items : JSON.stringify(items);
    
    let verifiedStatus = "Pending";
    if (paymentMode && paymentMode !== "COD") {
        verifiedStatus = "Preparing"; // Online (Razorpay/UPI) automatically accepted
    }
    const sql = `INSERT INTO orders 
    (id, user_name, total_amount, payment_mode, transaction_id, status, items, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;


    db.query(sql, [id, user_name, totalAmount, paymentMode, transactionId, verifiedStatus, stringifiedItems], (err, result) => {
        if (err) {
            console.error("❌ SQL Insertion Crash:", err);
            return res.status(500).json({ success: false, error: "Database failed to save order logs" });
        }
        res.status(201).json({ success: true, message: "Order records saved successfully!", status: verifiedStatus });
    });
});

// 2. Fetch ALL orders (Used by Student Side: MyOrders.jsx)
app.get('/api/orders', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const sql = "SELECT * FROM orders ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 3. Fetch ONLY Active Orders (Used by Admin Side: Orders.jsx)
app.get('/api/orders/active', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const sql = "SELECT * FROM orders WHERE status != 'Completed' ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 4. Update Order Status (Used by Kitchen Action Buttons)
app.put('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.query("UPDATE orders SET status = ? WHERE id = ?", [status, id], (err, result) => {
        if (err) return res.status(500).json({ error: "Failed to update state context matrix" });
        res.json({ success: true, message: "Order status modified inside database" });
    });
});

// --- 🔐 AUTHENTICATION ROUTES ---

app.post('/api/admin/send-otp', async (req, res) => {
    const { email } = req.body;
    if (email !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ 
            message: "Access Denied: Unauthorized Email Address" 
        });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    tempAdminOTP = otp; 
    console.log("🔑 Admin OTP Generated:", otp);
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Smart Canteen Admin Login OTP',
        text: `Your OTP for Admin Access is: ${otp}.`
    };
    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        console.error("OTP Email Error:", error.message);
        res.json({
            success: true,
            message: "Email failed, but OTP was generated. Check the backend terminal."
        });
    }
});

app.post('/api/admin/verify-login', (req, res) => {
    const { email, otp } = req.body;
    if (email === process.env.ADMIN_EMAIL && otp === tempAdminOTP) {
        tempAdminOTP = null; 
        res.json({ 
            success: true, 
            user: { role: 'admin', email: email, name: 'Admin' } 
        });
    } else {
        res.status(401).json({ message: "Invalid OTP or Email" });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM users WHERE email = ? AND password = ? AND role = 'student'", [email, password], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (results.length > 0) {
            res.json({ success: true, user: results[0] });
        } else {
            res.status(401).json({ success: false, message: "Invalid email or password!" });
        }
    });
});

app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    const sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'student')";
    db.query(sql, [name, email, password], (err, result) => {
        if (err) {
            console.error("Register Error:", err);
            return res.status(500).json({ success: false, message: "Email already exists or Database error." });
        }
        res.json({ success: true, message: "Student Registered Successfully! Please Login." });
    });
});

// --- 🍱 MENU & INVENTORY ROUTES ---

app.get('/api/menu/next-id', (req, res) => {
    db.query("SELECT MAX(id) as lastId FROM menu", (err, result) => {
        if (err) return res.status(500).json(err);
        const nextId = (result[0].lastId || 0) + 1;
        const formattedId = `PRD-${String(nextId).padStart(3, '0')}`;
        res.json({ nextId: formattedId });
    });
});

app.get('/api/menu', (req, res) => {
    db.query("SELECT * FROM menu WHERE is_active = 1", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/menu', (req, res) => {
    const { name, price, category, image, description, stock_quantity, product_id } = req.body;
    const sql = "INSERT INTO menu (name, price, category, image, description, stock_quantity, product_id, is_active, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)";
    db.query(sql, [name, price, category, image, description, stock_quantity, product_id], (err) => {
        if (err) {
            console.error("Insert Error:", err);
            return res.status(500).json({ error: "Duplicate Product ID or DB Error." });
        }
        res.json({ success: true, message: "Product Registered Successfully" });
    });
});

app.delete('/api/menu/:id', (req, res) => {
    const { id } = req.params;
    const sql = "UPDATE menu SET is_active = 0 WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true, message: "Item removed successfully" });
    });
});

app.put('/api/menu/stock/:id', (req, res) => {
    const { id } = req.params;
    const { stock } = req.body;
    const sql = "UPDATE menu SET stock_quantity = ? WHERE id = ?";
    db.query(sql, [stock, id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true, message: "Stock levels updated successfully" });
    });
});

// --- 📈 BUSINESS ANALYTICS ROUTES ---

app.get('/api/analysis/stats', (req, res) => {
    const salesSql = "SELECT SUM(total_amount) as totalRevenue, COUNT(id) as totalOrders FROM orders";
    const stockSql = "SELECT name, stock_quantity FROM menu WHERE is_active = 1";
    const itemStatsSql = "SELECT items, total_amount FROM orders";

    db.query(salesSql, (err, salesRes) => {
        if (err) return res.status(500).json(err);
        db.query(stockSql, (err, stockRes) => {
            if (err) return res.status(500).json(err);
            db.query(itemStatsSql, (err, itemStatsRes) => {
                if (err) return res.status(500).json(err);
                
                const parsedPerformance = {};
                itemStatsRes.forEach(row => {
                    try {
                        const productArray = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
                        if (Array.isArray(productArray)) {
                            productArray.forEach(item => {
                                if (!parsedPerformance[item.name]) {
                                    parsedPerformance[item.name] = { item_name: item.name, orderCount: 0, itemRevenue: 0 };
                                }
                                parsedPerformance[item.name].orderCount += Number(item.quantity || 1);
                                parsedPerformance[item.name].itemRevenue += Number((item.price || 0) * (item.quantity || 1));
                            });
                        }
                    } catch (e) { /* skip unparsed items safely */ }
                });

                const itemPerformanceArray = Object.values(parsedPerformance).sort((a, b) => b.itemRevenue - a.itemRevenue);

                res.json({
                    revenue: salesRes[0].totalRevenue || 0,
                    orders: salesRes[0].totalOrders || 0,
                    stockData: stockRes || [],
                    itemPerformance: itemPerformanceArray
                });
            });
        });
    });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));