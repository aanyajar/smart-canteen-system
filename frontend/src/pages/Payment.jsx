import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Smartphone, CreditCard, Banknote, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import '../Styles/Payment.css';

function Payment() {
    const navigate = useNavigate();
    const { cart, clearCart } = useCart();
    const [selectedMode, setSelectedMode] = useState('');

    const safeCart = cart || [];
    const total = safeCart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    useEffect(() => {
        if (!window.Razorpay) {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    const processOrder = async (paymentMethod, transactionId = "COD-TXN") => {
        const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
        const studentUser = JSON.parse(localStorage.getItem('user')) || { name: "Student" };
        
        const newOrder = {
            id: orderId,
            items: safeCart,
            totalAmount: total,
            paymentMode: paymentMethod,
            transactionId: transactionId,
            status: "Pending",
            user_name: studentUser.name
        };

        // Local Storage state cache refresh block (Triggers storage sync events)
        const currentLocalOrders = localStorage.getItem('orders');
        let existingOrders = [];
        try {
            if (currentLocalOrders) {
                existingOrders = JSON.parse(currentLocalOrders);
                if (!Array.isArray(existingOrders)) existingOrders = [];
            }
        } catch (e) {
            existingOrders = [];
        }
        existingOrders.unshift(newOrder);
        localStorage.setItem('orders', JSON.stringify(existingOrders));

        // 🚀 Target backend server endpoint directly to persist logs inside database table permanent layout
        try {
            await axios.post("http://localhost:5000/api/orders", newOrder);
            console.log("✅ Order securely pushed into backend database pipeline!");
        } catch (err) {
            console.error("❌ Failed to contact backend database:", err);
        }

        clearCart();
        navigate('/my-orders', { state: { orderId: orderId } }); 
    };

    const handleRazorpayPayment = (methodType) => {
        if (!window.Razorpay) return alert("Razorpay SDK loading...");
        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY;
        if (!razorpayKey) return alert("VITE_RAZORPAY_KEY missing in .env!");

        try {
            const options = {
                key: razorpayKey, 
                amount: total * 100, 
                currency: "INR",
                name: "Smart Canteen",
                description: `Food Order via ${methodType}`,
                handler: function (response) {
                    processOrder(`Online (${methodType})`, response.razorpay_payment_id);
                },
                prefill: {
                    name: JSON.parse(localStorage.getItem('user'))?.name || "Student User",
                    email: "student@canteen.com",
                    contact: "9999999999"
                },
                theme: { color: "#ee5253" }
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) {
            alert("Error initializing payment.");
        }
    };

    const handlePay = () => {
        if (!selectedMode) return alert("Please select a payment option!");
        if (selectedMode === 'UPI') handleRazorpayPayment('UPI');
        else if (selectedMode === 'CARD') handleRazorpayPayment('Card');
        else if (selectedMode === 'COD') {
            alert("Order Confirmed via Cash on Delivery!");
            processOrder("COD");
        }
    };

    return (
        <div className="payment-container">
            <button onClick={() => navigate('/cart')} className="back-btn"><ArrowLeft size={18}/> Back to Cart</button>
            <div className="payment-card">
                <h1 className="premium-text">Select Payment Mode</h1>
                <p className="payment-amount">Amount to Pay: <strong>₹{total}</strong></p>
                <div className="modes-list">
                    <div className={`mode-item ${selectedMode === 'UPI' ? 'active' : ''}`} onClick={() => setSelectedMode('UPI')}><Smartphone color="#6c5ce7"/><span>BHIM UPI</span></div>
                    <div className={`mode-item ${selectedMode === 'CARD' ? 'active' : ''}`} onClick={() => setSelectedMode('CARD')}><CreditCard color="#0984e3"/><span>Credit / Debit Card</span></div>
                    <div className={`mode-item ${selectedMode === 'COD' ? 'active' : ''}`} onClick={() => setSelectedMode('COD')}><Banknote color="#00b894"/><span>Cash On Delivery (COD)</span></div>
                </div>
                <button className="confirm-pay-btn" onClick={handlePay}>{selectedMode === 'COD' ? 'Place Order (COD)' : 'Proceed to Pay'}</button>
            </div>
        </div>
    );
}

export default Payment;