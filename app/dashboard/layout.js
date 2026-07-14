'use client';

import React, { useState, useEffect, useRef, createContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import './dashboard.css';

export const DashboardTabContext = createContext();

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'payouts', 'referral', 'account', 'wallet', 'notifications'
  const [roleProfile, setRoleProfile] = useState('INVESTOR');
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

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
    } catch (e) {}
    localStorage.removeItem('plan10_user');
    window.location.href = '/';
  };

  return (
    <DashboardTabContext.Provider value={{ activeTab, setActiveTab, user, setUser, roleProfile, setRoleProfile }}>
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
                      <div className="user-logo-icon small">
                        <img src="/assets/plan10logo.jpeg" alt="P10" className="logo-img" />
                      </div>
                      <span>My Profile</span>
                    </div>

                    <button 
                      className={`nav-popover-item ${activeTab === 'overview' ? 'active' : ''}`} 
                      onClick={() => { setActiveTab('overview'); setShowNavDropdown(false); }}
                    >
                      <i className="fa-solid fa-gauge-high"></i>
                      <span>Overview &amp; Summary</span>
                    </button>

                    {(roleProfile === 'INVESTOR' || roleProfile === 'DUAL') && (
                      <button 
                        className={`nav-popover-item ${activeTab === 'payouts' ? 'active' : ''}`} 
                        onClick={() => { setActiveTab('payouts'); setShowNavDropdown(false); }}
                      >
                        <i className="fa-solid fa-file-invoice-dollar"></i>
                        <span>Investment Payouts</span>
                      </button>
                    )}

                    {(roleProfile === 'INVESTOR' || roleProfile === 'DUAL') && (
                      <button 
                        className={`nav-popover-item ${activeTab === 'referral' ? 'active' : ''}`} 
                        onClick={() => { setActiveTab('referral'); setShowNavDropdown(false); }}
                      >
                        <i className="fa-solid fa-sitemap"></i>
                        <span>Investor Referral Tree</span>
                      </button>
                    )}

                    {(roleProfile === 'BUYER' || roleProfile === 'DUAL') && (
                      <button 
                        className={`nav-popover-item ${activeTab === 'orders' ? 'active' : ''}`} 
                        onClick={() => { setActiveTab('orders'); setShowNavDropdown(false); }}
                      >
                        <i className="fa-solid fa-cart-shopping"></i>
                        <span>My Orders &amp; Alerts</span>
                      </button>
                    )}

                    {(roleProfile === 'BUYER' || roleProfile === 'DUAL') && (
                      <button 
                        className={`nav-popover-item ${activeTab === 'buyerTree' ? 'active' : ''}`} 
                        onClick={() => { setActiveTab('buyerTree'); setShowNavDropdown(false); }}
                      >
                        <i className="fa-solid fa-sitemap"></i>
                        <span>Products Buyer Tree</span>
                      </button>
                    )}

                    <button 
                      className={`nav-popover-item ${activeTab === 'wallet' ? 'active' : ''}`} 
                      onClick={() => { setActiveTab('wallet'); setShowNavDropdown(false); }}
                    >
                      <i className="fa-solid fa-wallet"></i>
                      <span>My Wallet &amp; Payouts</span>
                    </button>

                    <button 
                      className={`nav-popover-item ${activeTab === 'notifications' ? 'active' : ''}`} 
                      onClick={() => { setActiveTab('notifications'); setShowNavDropdown(false); }}
                    >
                      <i className="fa-solid fa-bell"></i>
                      <span>Notifications &amp; Alerts</span>
                    </button>

                    <button 
                      className={`nav-popover-item ${activeTab === 'account' ? 'active' : ''}`} 
                      onClick={() => { setActiveTab('account'); setShowNavDropdown(false); }}
                    >
                      <i className="fa-solid fa-user-gear"></i>
                      <span>My Profile &amp; Nominee</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="header-title-box">
                <h1>{user?.name || (roleProfile === 'BUYER' ? 'Products Buyer' : (roleProfile === 'DUAL' ? 'Plan10 Partner' : 'Investor Member'))}</h1>
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
                      <h4>{user?.name || (roleProfile === 'BUYER' ? 'Products Buyer' : (roleProfile === 'DUAL' ? 'Plan10 Partner' : 'Investor Member'))}</h4>
                      <span className="popover-account-id">Account ID: {user?.username || 'Plan10-101'}</span>
                      <span className="popover-verified-badge" style={{ backgroundColor: roleProfile === 'BUYER' ? '#2563eb' : (roleProfile === 'DUAL' ? '#7c3aed' : '#059669') }}>
                        <i className={`fa-solid ${roleProfile === 'BUYER' ? 'fa-cart-shopping' : (roleProfile === 'DUAL' ? 'fa-handshake' : 'fa-shield-check')}`}></i> {roleProfile === 'BUYER' ? 'Verified Buyer' : (roleProfile === 'DUAL' ? 'Verified Partner' : 'Verified Investor')}
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
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </DashboardTabContext.Provider>
  );
}
