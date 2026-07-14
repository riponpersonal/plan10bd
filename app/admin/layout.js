'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import './admin.css';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingBadge, setPendingBadge] = useState(0);
  const [pendingBuyerBadge, setPendingBuyerBadge] = useState(0);
  const [pendingOrdersBadge, setPendingOrdersBadge] = useState(0);
  const [pendingWithdrawalsBadge, setPendingWithdrawalsBadge] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const userMenuRef = useRef(null);

  async function fetchPendingCount() {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success && data.applications) {
        const pending = data.applications.filter((a) => a.status === 'PENDING' && a.purpose !== 'Buy Product').length;
        setPendingBadge(pending);
        
        const pendingBuyer = data.applications.filter((a) => a.status === 'PENDING' && a.purpose === 'Buy Product').length;
        setPendingBuyerBadge(pendingBuyer);
      }

      const ordersRes = await fetch('/api/orders');
      const ordersData = await ordersRes.json();
      if (ordersData.success && ordersData.orders) {
        const pendingOrders = ordersData.orders.filter((o) => o.status === 'PENDING').length;
        setPendingOrdersBadge(pendingOrders);
      }

      const withdrawalsRes = await fetch('/api/admin/withdrawals');
      const withdrawalsData = await withdrawalsRes.json();
      if (withdrawalsData.success && withdrawalsData.withdrawals) {
        const pendingW = withdrawalsData.withdrawals.filter((w) => w.status === 'PENDING').length;
        setPendingWithdrawalsBadge(pendingW);
      }
    } catch (e) {
      console.error('Failed to fetch counts', e);
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
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Verify admin session via httpOnly cookie
    async function verifySession() {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (!data.success || data.user?.role !== 'ADMIN') {
          // Not authenticated — redirect to home
          router.replace('/');
          return;
        }
        // Persist to localStorage for UI display
        localStorage.setItem('plan10_user', JSON.stringify({
          name: data.user.name,
          username: data.user.username,
          role: data.user.role
        }));
      } catch (e) {
        // If session check fails, fall back to localStorage (dev/offline scenario)
        const saved = localStorage.getItem('plan10_user');
        if (!saved) {
          router.replace('/');
          return;
        }
      } finally {
        setSessionChecked(true);
      }
    }
    verifySession();
  }, []);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { label: 'Dashboard Overview', href: '/admin', icon: 'fa-chart-line' },
    { label: 'Investor Applications', href: '/admin/applications', icon: 'fa-file-contract', badge: pendingBadge },
    { label: 'Buyer Applications', href: '/admin/buyer-applications', icon: 'fa-file-signature', badge: pendingBuyerBadge },
    { label: 'Active Members', href: '/admin/members', icon: 'fa-users' },
    { label: 'Investor Referral Tree', href: '/admin/referrals', icon: 'fa-sitemap' },
    { label: 'Referral Commissions', href: '/admin/referrals/commissions', icon: 'fa-gift' },
    { label: 'Products Selling Tree', href: '/admin/products-tree', icon: 'fa-diagram-project' },
    { label: 'Monthly Payouts', href: '/admin/payouts', icon: 'fa-hand-holding-dollar' },
    { label: 'Withdrawals', href: '/admin/withdrawals', icon: 'fa-money-bill-transfer', badge: pendingWithdrawalsBadge },
    { label: 'Products & Sectors', href: '/admin/products', icon: 'fa-boxes-packing' },
    { label: 'Product Orders', href: '/admin/orders', icon: 'fa-cart-flatbed', badge: pendingOrdersBadge },
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
          <div className="sidebar-logo">
            <img src="/assets/plan10logo.jpeg" alt="P10" className="logo-img" />
          </div>
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
              <Link href="/admin" className="header-title-link">
                <h1>PLAN-10 Control Center</h1>
              </Link>
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
                  onClick={async () => {
                    // Clear httpOnly cookie via server
                    try {
                      await fetch('/api/auth/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'logout' })
                      });
                    } catch (e) {}
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

        <div className="admin-content">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
