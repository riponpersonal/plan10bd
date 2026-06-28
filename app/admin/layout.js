'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './admin.css';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [pendingBadge, setPendingBadge] = useState(2);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  }, [pathname]);

  const navItems = [
    { label: 'Dashboard Overview', href: '/admin', icon: 'fa-chart-line' },
    { label: 'SPL Applications', href: '/admin/applications', icon: 'fa-file-contract', badge: pendingBadge },
    { label: 'Active Members', href: '/admin/members', icon: 'fa-users' },
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
          <div className="header-user" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="user-info">
              <span>System Administrator</span>
              <small>Role: Corporate Admin</small>
            </div>
            <div className="avatar">A</div>
            <button
              onClick={() => {
                localStorage.removeItem('plan10_user');
                window.location.href = '/';
              }}
              style={{ background: 'none', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', color: '#ef4444', fontWeight: 600, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Sign Out of Corporate Admin"
            >
              <i className="fa-solid fa-right-from-bracket"></i> Sign Out
            </button>
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
