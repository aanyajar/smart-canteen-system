import React, { useState, useEffect } from "react";
import axios from "axios";
import { Clock, CheckCircle, Flame, Truck } from 'lucide-react';
import "../Styles/Order.css";

function Orders() {
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    try {
      // 📡 Target the strict runtime active context array endpoint
      const res = await axios.get("http://localhost:5000/api/orders/active", {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.data && Array.isArray(res.data)) {
        setOrders(res.data);
      }
    } catch (err) { 
      console.log("Database connection error, checking local fallback.");
      const local = JSON.parse(localStorage.getItem('orders')) || [];
      // Synchronous active filtering for the offline cache backup structure
      setOrders(local.filter(o => o.status !== "Completed"));
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000); // Poll every 3 seconds for snap feedback
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`http://localhost:5001/api/orders/${id}/status`, { status });
      
      // 🧼 CLEAN WIPE MEMORY STRATEGY
      if (status === "Completed") {
        // Drop the targeted card array item completely from active state engine arrays
        setOrders(prev => prev.filter(order => order.id !== id));
      }
      
      // Keep local sync up-to-date
      const local = JSON.parse(localStorage.getItem('orders')) || [];
      const updatedLocal = local.map(o => (o.id === id || o.id == id) ? { ...o, status } : o);
      localStorage.setItem('orders', JSON.stringify(updatedLocal));
      
      fetchOrders();
    } catch (err) {
      console.log("Failed to update status on server database.");
    }
  };

  const renderItems = (itemsData) => {
    if (!itemsData) return "No items";
    if (Array.isArray(itemsData)) return itemsData.map(item => `${item.name} (${item.quantity})`).join(', ');
    try {
      const parsed = JSON.parse(itemsData);
      if (Array.isArray(parsed)) return parsed.map(item => `${item.name} (${item.quantity})`).join(', ');
    } catch (e) { return itemsData; }
    return String(itemsData);
  };

  return (
    <div className="kitchen-wrapper">
      <div className="kitchen-header">
        <h1>👨‍🍳 Live Kitchen Display</h1>
        <div className="stats-bar"><span>Active Tickets: {orders.length}</span></div>
      </div>
      <div className="kitchen-grid">
        {orders.map(order => (
          <div key={order.id} className={`order-ticket ${order.status}`}>
            <div className="ticket-header">
              <span className="order-no">#{order.id}</span>
              <span className="order-time">
                <Clock size={14}/> {order.created_at || order.createdAt ? new Date(order.created_at || order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Just Now"}
              </span>
            </div>
            <div className="customer-name">{order.user_name || "Student"}</div>
            <div className="order-items-list"><p className="item-text">{renderItems(order.items)}</p></div>
            <div className="ticket-footer">
               <div className="status-label">Status: <b>{order.status}</b></div>
               <div className="action-buttons">
                  {order.status === "Pending" && <button className="btn-prep" onClick={() => updateStatus(order.id, "Preparing")}><Flame size={16}/> Accept & Cook</button>}
                  {order.status === "Preparing" && <button className="btn-ready" onClick={() => updateStatus(order.id, "Ready")}><CheckCircle size={16}/> Food Ready</button>}
                  {order.status === "Ready" && <button className="btn-done" onClick={() => updateStatus(order.id, "Completed")}><Truck size={16}/> Deliver (Clear Memory)</button>}
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Orders;