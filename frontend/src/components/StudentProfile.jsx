import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, ShoppingBag } from 'lucide-react';
import './StudentProfile.css';

function StudentProfile() {
    const navigate = useNavigate();
    
    // LocalStorage se logged-in user nikaalo
    const user = JSON.parse(localStorage.getItem('user')) || {
        name: "Aditya Raj",
        email: "aditya@college.edu",
        rollNo: "CS-2026-05"
    };

    const handleLogout = () => {
        localStorage.removeItem('user'); // Session clear karo
        alert("Logged out successfully!");
        navigate('/login'); // Redirect to login
    };

    return (
        <div className="profile-header-widget">
            <div className="user-badge" onClick={() => {
                const box = document.getElementById('profile-dropdown');
                box.classList.toggle('show');
            }}>
                <div className="avatar">
                    <User size={18} color="#2d3436" />
                </div>
                <span className="user-name-text">{user.name}</span>
            </div>

            {/* Dropdown Card */}
            <div id="profile-dropdown" className="profile-card-dropdown">
                <h3 className="profile-title">Student Profile</h3>
                <div className="profile-info-row">
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>ID/Roll No:</strong> {user.rollNo || "N/A"}</p>
                </div>
                <hr className="divider" />
                <div className="dropdown-actions">
                    <button onClick={() => {
                        // Close dropdown and navigate to real order tracking
                        document.getElementById('profile-dropdown').classList.remove('show');
                        navigate('/my-orders');
                    }} className="btn-action">
                        <ShoppingBag size={16} /> Track My Orders (QR)
                    </button>
                    <button onClick={handleLogout} className="btn-logout">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </div>
        </div>
    );
}

export default StudentProfile;