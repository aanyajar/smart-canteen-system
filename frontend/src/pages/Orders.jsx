
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Clock, CheckCircle, Flame, Truck } from "lucide-react";
import "../Styles/Order.css";

function timeAgo(timestamp, now) {
  if (!timestamp) return "Just Now";

  const time = new Date(timestamp).getTime();

  if (Number.isNaN(time)) return "Just Now";

  const minutes = Math.max(0, Math.floor((now - time) / 60000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const fetchOrders = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5001/api/orders/active"
      );

      if (Array.isArray(res.data) && res.data.length > 0) {
        setOrders(res.data);
      } else {
        const local = JSON.parse(
          localStorage.getItem("orders") || "[]"
        );
        setOrders(local.filter((o) => o.status !== "Completed"));
      }
    } catch (err) {
      console.log("Database connection error, checking local fallback.");

      const local = JSON.parse(
        localStorage.getItem("orders") || "[]"
      );
      setOrders(local.filter((o) => o.status !== "Completed"));
    }
  };

  useEffect(() => {
    fetchOrders();

    const fetchInterval = setInterval(fetchOrders, 3000);
    const timeInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);

    return () => {
      clearInterval(fetchInterval);
      clearInterval(timeInterval);
    };
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await axios.put(
        `http://localhost:5001/api/orders/${id}/status`,
        { status }
      );

      const local = JSON.parse(
        localStorage.getItem("orders") || "[]"
      );

      const updatedLocal = local.map((o) =>
        o.id === id ? { ...o, status } : o
      );

      localStorage.setItem("orders", JSON.stringify(updatedLocal));

      if (status === "Completed") {
        setOrders((prev) => prev.filter((order) => order.id !== id));
      } else {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === id ? { ...order, status } : order
          )
        );
      }

      fetchOrders();
    } catch (err) {
      console.error("Failed to update order status:", err);
    }
  };

  const renderItems = (itemsData) => {
    if (!itemsData) return "No items";

    if (Array.isArray(itemsData)) {
      return itemsData
        .map((item) => `${item.name} (${item.quantity})`)
        .join(", ");
    }

    try {
      const parsed = JSON.parse(itemsData);

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => `${item.name} (${item.quantity})`)
          .join(", ");
      }
    } catch (e) {
      return itemsData;
    }

    return String(itemsData);
  };

  return (
    <div className="kitchen-wrapper">
      <div className="kitchen-header">
        <h1>👨‍🍳 Live Kitchen Display</h1>
        <div className="stats-bar">
          <span>Active Tickets: {orders.length}</span>
        </div>
      </div>

      <div className="kitchen-grid">
        {orders.map((order) => (
          <div
            key={order.id}
            className={`order-ticket ${order.status}`}
          >
            <div className="ticket-header">
              <span className="order-no">#{order.id}</span>

              <span className="order-time">
                <Clock size={14} />{" "}
                {timeAgo(
                  order.created_at || order.createdAt,
                  currentTime
                )}
              </span>
            </div>

            <div className="customer-name">
              {order.user_name || "Student"}
            </div>

            <div className="order-items-list">
              <p className="item-text">{renderItems(order.items)}</p>
            </div>

            <div className="ticket-footer">
              <div className="status-label">
                Status: <b>{order.status}</b>
              </div>

              <div className="action-buttons">
                {order.status === "Pending" && (
                  <button
                    className="btn-prep"
                    onClick={() => updateStatus(order.id, "Preparing")}
                  >
                    <Flame size={16} /> Accept & Cook
                  </button>
                )}

                {order.status === "Preparing" && (
                  <button
                    className="btn-ready"
                    onClick={() => updateStatus(order.id, "Ready")}
                  >
                    <CheckCircle size={16} /> Food Ready
                  </button>
                )}

                {order.status === "Ready" && (
                  <button
                    className="btn-done"
                    onClick={() => updateStatus(order.id, "Completed")}
                  >
                    <Truck size={16} /> Deliver (Clear Memory)
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Orders;
