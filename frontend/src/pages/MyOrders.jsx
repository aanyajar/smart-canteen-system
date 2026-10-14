import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code'; 
import { CheckCircle, ArrowLeft, Loader2, Utensils, ShoppingBag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import "../Styles/MyOrders.css";

function MyOrders() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Logged in student name
    const currentUser = JSON.parse(localStorage.getItem('user')) || { name: 'alex' };
    const targetOrderId = location.state?.orderId || localStorage.getItem('last_ordered_id');
    
    const [ordersList, setOrdersList] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchStudentOrders = async () => {
        try {
            // Fetch all orders from Database
            const res = await axios.get("http://localhost:5000/api/orders", {
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (res.data && Array.isArray(res.data)) {
                // Filter orders belonging to this user or match target order id
                const myOrders = res.data.filter(o => 
                    String(o.user_name).toLowerCase() === String(currentUser.name).toLowerCase() ||
                    String(o.id) === String(targetOrderId)
                );
                
                console.log("📊 Student Matched Orders:", myOrders);
                
                if (myOrders.length > 0) {
                    setOrdersList(myOrders);
                } else {
                    // Fallback to all database orders if user name filter mismatch
                    setOrdersList(res.data);
                }
            }
        } catch (err) {
            console.log("⚠️ Database fetch error, checking local storage fallback...");
            const local = JSON.parse(localStorage.getItem('orders')) || [];
            setOrdersList(local);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudentOrders();
        // Dynamic Live Polling for Student Panel updates (Every 3 seconds)
        const trackerInterval = setInterval(fetchStudentOrders, 3000);
        return () => clearInterval(trackerInterval);
    }, [targetOrderId]);

    // Safe Items Parser & Renderer
    const renderItemsList = (itemsData) => {
        if (!itemsData) return <li>No items found</li>;
        let parsedArray = [];
        
        if (Array.isArray(itemsData)) {
            parsedArray = itemsData;
        } else if (typeof itemsData === 'string') {
            try {
                parsedArray = JSON.parse(itemsData);
            } catch (e) {
                return <li>{itemsData}</li>;
            }
        }

        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
            return parsedArray.map((item, idx) => (
                <li key={idx} style={{ padding: '3px 0' }}>
                    <strong>{item.name || "Item"}</strong> x {item.quantity || 1} 
                    {item.price ? ` - ₹${item.price * (item.quantity || 1)}` : ''}
                </li>
            ));
        }

        return <li>{String(itemsData)}</li>;
    };

    if (loading) {
        return (
            <div className="orders-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Loader2 className="animate-spin" size={40} color="#ee5253" />
            </div>
        );
    }

    if (!ordersList || ordersList.length === 0) {
        return (
            <div className="orders-container" style={{ textAlign: 'center', padding: '50px' }}>
                <ShoppingBag size={50} color="#ccc" style={{ marginBottom: '15px' }} />
                <h2>No Active Orders Tracked</h2>
                <p style={{ color: '#666' }}>You haven't placed any order yet or database is reset.</p>
                <button onClick={() => navigate('/menu')} className="back-to-menu" style={{ marginTop: '20px' }}>
                    <ArrowLeft size={18} /> Back to Menu
                </button>
            </div>
        );
    }

    return (
        <div className="orders-container">
            <button onClick={() => navigate('/menu')} className="back-to-menu">
                <ArrowLeft size={18} /> Back to Menu
            </button>

            <h1 style={{ textAlign: 'center', margin: '20px 0', color: '#2d3436' }}>📦 My Canteen Tokens & Orders</h1>

            <div className="orders-list-grid" style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '600px', margin: '0 auto' }}>
                {ordersList.map((order) => {
                    const isTarget = String(order.id) === String(targetOrderId);
                    return (
                        <div 
                            key={order.id} 
                            className="order-card"
                            style={{
                                border: isTarget ? '2px solid #ee5253' : '1px solid #e0e0e0',
                                boxShadow: isTarget ? '0 4px 15px rgba(238, 82, 83, 0.15)' : '0 2px 8px rgba(0,0,0,0.05)',
                                borderRadius: '12px',
                                background: '#fff',
                                padding: '20px',
                                textAlign: 'center'
                            }}
                        >
                            <div className="success-icon">
                                <CheckCircle size={50} color="#4bb543" />
                            </div>
                            <h3>Order Token: <strong style={{ color: '#2d3436' }}>{order.id}</strong></h3>
                            <p style={{ fontSize: '0.85rem', color: '#888', margin: '5px 0 15px 0' }}>
                                Placed on: {order.created_at ? new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just Now'}
                            </p>

                            {/* 📋 Dynamic Food Summary Box */}
                            <div className="order-summary-box" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', margin: '15px 0', textAlign: 'left', border: '1px solid #eee' }}>
                                <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px', color: '#2d3436' }}>
                                    <Utensils size={16}/> Items Ordered:
                                </h4>
                                <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.9rem', color: '#636e72' }}>
                                    {renderItemsList(order.items)}
                                </ul>
                                <hr style={{ border: '0', borderTop: '1px dashed #ccc', margin: '10px 0' }} />
                                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem', color: '#2d3436' }}>
                                    Total Amount: ₹{order.total_amount || order.totalAmount || 0} ({order.payment_mode || 'Paid'})
                                </p>
                            </div>

                            {/* 📱 QR Code Section */}
                            <div className="qr-section" style={{ margin: '15px 0' }}>
                                <p style={{ fontSize: '0.85rem', color: '#636e72', marginBottom: '8px' }}>Scan at counter for instant verification:</p>
                                <div className="qr-wrapper" style={{ background: 'white', padding: '10px', display: 'inline-block', borderRadius: '10px', border: '1px solid #ddd' }}>
                                    <QRCode value={String(order.id)} size={150} />
                                </div>
                            </div>

                            {/* 🔔 Live Dynamic Status Tracking Badge */}
                            <div className="status-badge" style={{ marginTop: '15px', padding: '10px 20px', borderRadius: '50px', background: '#f1f2f6', display: 'inline-block', fontWeight: 'bold' }}>
                                <span className={`status-text ${order.status ? order.status.toLowerCase() : 'pending'}`}>
                                    {order.status === "Pending" && "⌛ Waiting for Kitchen Acceptance..."}
                                    {order.status === "Preparing" && "👨‍🍳 Kitchen has Started Cooking..."}
                                    {order.status === "Ready" && "🔔 Food is Ready! Please collect from counter!"}
                                    {order.status === "Completed" && "✅ Order Served & Completed!"}
                                </span>
                            </div>

                            <button className="download-receipt" onClick={() => window.print()} style={{ marginTop: '15px', display: 'block', width: '100%', padding: '10px', background: '#2d3436', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                Print Token Receipt
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default MyOrders;