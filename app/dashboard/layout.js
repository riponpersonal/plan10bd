'use client';

import React, { useState, useEffect, useRef, createContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './dashboard.css';

export const DashboardTabContext = createContext();

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'payouts', 'referral', 'account'
  const [showNavDropdown, setShowNavDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const navDropdownRef = useRef(null);
  const profileModalRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('plan10_user');
      if (saved) {
        setUser(JSON.parse(saved));
      } else {
        const demoUser = { name: 'Rahim Uddin', username: 'Plan10-101', role: 'USER' };
        localStorage.setItem('plan10_user', JSON.stringify(demoUser));
        setUser(demoUser);
      }
    } catch (e) {
      console.error('Failed to parse user session');
    }
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (navDropdownRef.current && !navDropdownRef.current.contains(event.target)) {
        setShowNavDropdown(false);
      }
      if (profileModalRef.current && !profileModalRef.current.contains(event.target)) {
        setShowProfileModal(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('plan10_user');
    window.location.href = '/';
  };

  return (
    <DashboardTabContext.Provider value={{ activeTab, setActiveTab, user, setUser }}>
      <div className="user-dash-wrapper">
        {/* Main Content Area with Full Width Top-Navigation Dropdown */}
        <main className="user-main-content full-width">
          <header className="user-dash-header">
            <div className="header-left-group">
              {/* Always Visible 3-Dash Menu Button that opens Navigation Dropdown downside */}
              <div className="nav-dropdown-wrapper" ref={navDropdownRef}>
                <button 
                  className="sidebar-toggle-btn always-show" 
                  onClick={() => setShowNavDropdown(!showNavDropdown)}
                  aria-label="Toggle Navigation Menu"
                  title="Click to open Navigation Menu"
                >
                  <i className="fa-solid fa-bars"></i>
                </button>

                {/* Navigation Dropdown directly downside the 3-Dash Menu */}
                {showNavDropdown && (
                  <div className="nav-popover-menu">
                    <div className="nav-popover-header">
                      <div className="user-logo-icon small">P10</div>
                      <span>PLAN-10 Portal</span>
                    </div>

                    <button 
                      className={`nav-popover-item ${activeTab === 'overview' ? 'active' : ''}`} 
                      onClick={() => { setActiveTab('overview'); setShowNavDropdown(false); }}
                    >
                      <i className="fa-solid fa-gauge-high"></i>
                      <span>Overview & Summary</span>
                    </button>

                    <button 
                      className={`nav-popover-item ${activeTab === 'payouts' ? 'active' : ''}`} 
                      onClick={() => { setActiveTab('payouts'); setShowNavDropdown(false); }}
                    >
                      <i className="fa-solid fa-file-invoice-dollar"></i>
                      <span>33-Month Payout Schedule</span>
                    </button>

                    <button 
                      className={`nav-popover-item ${activeTab === 'referral' ? 'active' : ''}`} 
                      onClick={() => { setActiveTab('referral'); setShowNavDropdown(false); }}
                    >
                      <i className="fa-solid fa-sitemap"></i>
                      <span>Referral Tree & Earnings</span>
                    </button>

                    <button 
                      className={`nav-popover-item ${activeTab === 'orders' ? 'active' : ''}`} 
                      onClick={() => { setActiveTab('orders'); setShowNavDropdown(false); }}
                    >
                      <i className="fa-solid fa-cart-shopping"></i>
                      <span>My Orders & Alerts</span>
                    </button>

                    <button 
                      className={`nav-popover-item ${activeTab === 'account' ? 'active' : ''}`} 
                      onClick={() => { setActiveTab('account'); setShowNavDropdown(false); }}
                    >
                      <i className="fa-solid fa-user-gear"></i>
                      <span>My Profile & Nominee</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="header-title-box">
                <h1>{user?.name || 'Investor Member'}</h1>
              </div>
            </div>

            {/* Right Side Header User Avatar trigger */}
            <div className="header-user-profile" ref={profileModalRef}>
              <button 
                className="header-avatar-btn" 
                onClick={() => setShowProfileModal(!showProfileModal)}
                title="Click to open Profile options menu"
              >
                <div className="user-avatar-circle">
                  {user ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              </button>

              {/* Right Side Popup Menu featuring Profile, Corporate Site, and Sign Out */}
              {showProfileModal && (
                <div className="profile-popover-card">
                  <div className="popover-user-header">
                    <div className="user-avatar-circle large">
                      {user ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="popover-user-info">
                      <h4>{user?.name || 'Investor Member'}</h4>
                      <span className="popover-account-id">Account ID: {user?.username || 'Plan10-101'}</span>
                      <span className="popover-verified-badge">
                        <i className="fa-solid fa-shield-check"></i> Verified Investor
                      </span>
                    </div>
                  </div>

                  <div className="popover-actions-body">
                    <button 
                      className="popover-action-item"
                      onClick={() => {
                        setActiveTab('orders');
                        setShowProfileModal(false);
                      }}
                    >
                      <i className="fa-solid fa-cart-shopping" style={{ color: '#10b981' }}></i> My Orders & Alerts
                    </button>

                    <button 
                      className="popover-action-item"
                      onClick={() => {
                        setActiveTab('account');
                        setShowProfileModal(false);
                      }}
                    >
                      <i className="fa-solid fa-user-gear" style={{ color: '#2563eb' }}></i> My Profile Details
                    </button>

                    <Link 
                      href="/" 
                      className="popover-action-item" 
                      onClick={() => {
                        setShowProfileModal(false);
                      }}
                    >
                      <i className="fa-solid fa-globe" style={{ color: '#059669' }}></i> View Corporate Site
                    </Link>

                    <button className="popover-action-item danger" onClick={handleSignOut}>
                      <i className="fa-solid fa-right-from-bracket"></i> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          <div className="dash-container">
            {children}
          </div>
        </main>
      </div>
    </DashboardTabContext.Provider>
  );
}
