# 🍔 Smart Canteen Management System

Full-stack web application designed to automate college canteen order processing, live status tracking, and kitchen operations.

---

## 🌟 Key Features

- **🎓 Student Portal:** Interactive Menu, Cart & Checkout, Online/COD Payment, Dynamic Order QR Code Token, and Live Order Tracking.
- **👨‍🍳 Admin & Kitchen Display:** Live Kitchen Board with active order updates, Auto-Verification for online payments, Order Lifecycle Management (`Pending` ➔ `Preparing` ➔ `Ready` ➔ `Completed`), and Active Memory Auto-Cleanup.
- **📊 Business Analytics:** Real-time revenue insights, order counts, and top-selling food performance.
- **🔐 Secure Auth:** Email OTP verification powered by Nodemailer.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, Vite, React Router, Lucide Icons, Axios, React QR Code, CSS3
- **Backend:** Node.js, Express.js, MySQL (`mysql2`), CORS, Body-Parser, Nodemailer
- **Database:** MySQL (Relational Schema with `LONGTEXT` support)

---

## 🛢️ Database Setup

Run the following SQL commands in MySQL CLI / phpMyAdmin:

```sql
CREATE DATABASE IF NOT EXISTS smart_canteen;
USE smart_canteen;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu Table
CREATE TABLE IF NOT EXISTS menu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image LONGTEXT,
    description TEXT,
    stock_quantity INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    is_available TINYINT(1) DEFAULT 1
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    items LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
