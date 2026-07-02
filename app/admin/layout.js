'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './admin.css';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [pendingBadge, setPendingBadge] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  async function fetchPendingCount() {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success && data.applications) {
        const pending = data.applications.filter((a) => a.status === 'PENDING').length;
        setPendingBadge(pending);
      }
    } catch (e) {
      console.error('Failed to fetch pending applications count', e);
    }
  }

  useEffect(() => {
    fetchPendingCount();

    window.addEventListener('applications-updated', fetchPendingCount);
    return () => {
      window.removeEventListener('applications-updated', fetchPendingCount);
    };
  }, []);

  useEffect(() => {
    fetchPendingCount();
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Ensure admin session is persisted in localStorage when visiting admin pages
    try {
      const saved = localStorage.getItem('plan10_user');
      if (!saved) {
        localStorage.setItem('plan10_user', JSON.stringify({
          name: 'Corporate Executive Admin',
          username: 'admin',
          role: 'ADMIN'
        }));
      }
    } catch (e) {}
  }, []);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { label: 'Dashboard Overview', href: '/admin', icon: 'fa-chart-line' },
    { label: 'SPL Applications', href: '/admin/applications', icon: 'fa-file-contract', badge: pendingBadge },
    { label: 'Active Members', href: '/admin/members', icon: 'fa-users' },
    { label: 'Referral Tree', href: '/admin/referrals', icon: 'fa-sitemap' },
    { label: 'Monthly Payouts', href: '/admin/payouts', icon: 'fa-hand-holding-dollar' },
    { label: 'Products & Sectors', href: '/admin/products', icon: 'fa-boxes-packing' },
    { label: 'Inquiries & Leads', href: '/admin/inquiries', icon: 'fa-envelope-open-text' }
  ];

  return (
    <div className="admin-wrapper">
      {/* Backdrop Overlay for Mobile */}
      <div 
        className={`admin-overlay ${isSidebarOpen ? 'active' : ''}`} 
        onClick={() => setIsSidebarOpen(false)} 
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">P10</div>
          <div className="sidebar-brand">
            <h2>PLAN-10 BD</h2>
            <span>Corporate Admin Panel</span>
          </div>
          <button 
            className="mobile-close-btn" 
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close Sidebar"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                <i className={`fa-solid ${item.icon}`}></i>
                <span>{item.label}</span>
                {item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link href="/" className="public-site-btn">
            <i className="fa-solid fa-globe"></i> View Public Portal
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <button 
              className="mobile-menu-toggle" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle Menu"
            >
              <i className="fa-solid fa-bars"></i>
            </button>
            <div className="header-title">
              <h1>PLAN-10 Control Center</h1>
            </div>
          </div>
          <div className="header-user-wrapper" ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              className="user-admin-btn"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              aria-label="User Admin Menu"
              title="Admin Options"
            >
              <div className="user-admin-icon-box">
                <i className="fa-solid fa-user-gear"></i>
              </div>
              <i className={`fa-solid fa-chevron-down dropdown-arrow ${isUserMenuOpen ? 'open' : ''}`}></i>
            </button>

            {isUserMenuOpen && (
              <div className="admin-user-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-user-badge">
                    <i className="fa-solid fa-shield-halved"></i>
                  </div>
                  <div>
                    <div className="dropdown-title">System Administrator</div>
                    <div className="dropdown-subtitle">Corporate Admin</div>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <Link
                  href="/admin/info"
                  className="dropdown-item"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <i className="fa-solid fa-user-shield"></i>
                  <span>Admin Information</span>
                </Link>
                <button
                  className="dropdown-item logout-item"
                  onClick={() => {
                    localStorage.removeItem('plan10_user');
                    window.location.href = '/';
                  }}
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
