import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './navbar.css';
import { useAuth, TOKEN_KEY } from '../context/AuthContext';


export default function NavBar() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const role = user?.role?.toUpperCase();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [loading, user, navigate]);
  
  const tabs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'New Entry', to: '/new-entry' },
    { label: 'Fleet', to: '/fleet' },
  ];

  const handleLogout = async () => {
  try {
    await logout();
  } catch (err) {
    console.error('Logout request failed:', err);
  } finally {
    localStorage.removeItem(TOKEN_KEY);
    navigate('/login', { replace: true });
  }
};



  return (
    <div className="topbar">
      <div className="topbar__left">
        <div className="topbar__brand">
          <span className="topbar__dot" />
          <span className="topbar__title">WAYBILL</span>
        </div>

        <div className="topbar__tabs">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `topbar__tab ${isActive ? 'topbar__tab--active' : ''}`
              }
            >
              {tab.label.toUpperCase()}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="topbar__right">
        <span className="topbar__badge">{role}</span>
        <button className="topbar__logout" aria-label="Log out" onClick={handleLogout}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" x2="9" y1="12" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}