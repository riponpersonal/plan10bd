'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboardOverview() {
  const [apps, setApps] = useState([]);
  const [buyerApps, setBuyerApps] = useState([]);
  const [members, setMembers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function fetchData() {
      try {
        const [resApps, resMembers, resOrders] = await Promise.all([
          fetch('/api/applications'),
          fetch('/api/members'),
          fetch('/api/orders')
        ]);
        const dataApps = await resApps.json();
        const dataMembers = await resMembers.json();
        const dataOrders = await resOrders.json();

        if (dataApps.success) {
          const splApps = dataApps.applications.filter(a => a.purpose !== 'Buy Product');
          setApps(splApps);
          const bApps = dataApps.applications.filter(a => a.purpose === 'Buy Product');
          setBuyerApps(bApps);
        }
        if (dataMembers.success) setMembers(dataMembers.members);
        if (dataOrders.success) setOrders(dataOrders.orders || []);
      } catch (e) {
        console.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    window.addEventListener('applications-updated', fetchData);
    return () => {
      window.removeEventListener('applications-updated', fetchData);
    };
  }, []);

  const totalCapital = members.reduce((acc, m) => acc + (m.capitalInvested || 0), 0);
  const totalMonthlyObligation = members.reduce((acc, m) => acc + (m.monthlyTotalPayout || 0), 0);
  const pendingApps = apps.filter((a) => a.status === 'PENDING').length;
  const totalReferralCommissions = members
    .filter(m => m.referredBy && members.some(parent => parent.memberId === m.referredBy))
    .reduce((acc, m) => acc + (m.capitalInvested * 0.06), 0);

  // Product Buyer Metrics calculations
  const totalProductRevenue = orders.filter(o => o.status === 'DELIVERED').reduce((acc, o) => acc + (o.price || 0), 0);
  const totalSalesOrders = orders.filter(o => o.status === 'DELIVERED').length;
  const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
  const processingOrders = orders.filter(o => o.status === 'PROCESSING').length;
  const pendingBuyerApps = buyerApps.filter(a => a.status === 'PENDING').length;
  const activeBuyers = buyerApps.filter(a => a.status === 'APPROVED').length;
  const buyerReferralsPayout = buyerApps.filter(a => a.status === 'APPROVED' && a.referredBy).length * 500;
  const deliveredUnits = orders.filter(o => o.status === 'DELIVERED').length;
  const rejectedOrders = orders.filter(o => o.status === 'REJECTED').length;

  const referralEvents = members
    .filter(m => m.referredBy && members.some(parent => parent.memberId === m.referredBy))
    .map(m => {
      const sponsor = members.find(parent => parent.memberId === m.referredBy);
      return {
        sponsorName: sponsor ? sponsor.name : m.referredBy,
        sponsorId: m.referredBy,
        referredName: m.name,
        referredId: m.memberId,
        capital: m.capitalInvested,
        commissionAmount: m.capitalInvested * 0.06,
        date: m.joinDate
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  return (
    <div>
      {/* Product Buyer & Sales Overview */}
      <h3 style={{ marginBottom: '16px', color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <i className="fa-solid fa-cart-shopping" style={{ color: '#3b82f6' }}></i>
        Product Buyer & Sales Overview
      </h3>
      <div className="metrics-grid" style={{ marginBottom: '32px' }}>
        <Link href="/admin/orders?status=DELIVERED" className="metric-card interactive">
          <div className="metric-info">
            <h4>Total Product Revenue</h4>
            <h3 className="metric-number">{formatBDT(totalProductRevenue)}</h3>
          </div>
          <div className="metric-icon icon-green">
            <i className="fa-solid fa-hand-holding-dollar"></i>
          </div>
        </Link>

        <Link href="/admin/orders?status=DELIVERED" className="metric-card interactive">
          <div className="metric-info">
            <h4>Total Sales Orders</h4>
            <h3 className="metric-number">{totalSalesOrders}</h3>
          </div>
          <div className="metric-icon icon-blue">
            <i className="fa-solid fa-boxes-packing"></i>
          </div>
        </Link>

        <Link href="/admin/orders?status=PENDING" className="metric-card interactive">
          <div className="metric-info">
            <h4>Pending Product Orders</h4>
            <h3 className="metric-number">{pendingOrders}</h3>
          </div>
          <div className="metric-icon icon-amber">
            <i className="fa-solid fa-clock"></i>
          </div>
        </Link>

        <Link href="/admin/orders?status=PROCESSING" className="metric-card interactive">
          <div className="metric-info">
            <h4>Processing Product Orders</h4>
            <h3 className="metric-number">{processingOrders}</h3>
          </div>
          <div className="metric-icon icon-blue" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <i className="fa-solid fa-arrows-rotate fa-spin"></i>
          </div>
        </Link>

        <Link href="/admin/orders?status=DELIVERED" className="metric-card interactive">
          <div className="metric-info">
            <h4>Total complete delivery</h4>
            <h3 className="metric-number">{deliveredUnits}</h3>
          </div>
          <div className="metric-icon icon-green" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <i className="fa-solid fa-truck"></i>
          </div>
        </Link>

        <Link href="/admin/buyer-applications?status=PENDING" className="metric-card interactive">
          <div className="metric-info">
            <h4>Pending Buyer Apps</h4>
            <h3 className="metric-number">{pendingBuyerApps}</h3>
          </div>
          <div className="metric-icon icon-amber" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <i className="fa-solid fa-file-signature"></i>
          </div>
        </Link>

        <Link href="/admin/buyer-applications?status=APPROVED" className="metric-card interactive">
          <div className="metric-info">
            <h4>Active Product Buyers</h4>
            <h3 className="metric-number">{activeBuyers}</h3>
          </div>
          <div className="metric-icon icon-purple">
            <i className="fa-solid fa-users"></i>
          </div>
        </Link>

        <Link href="/admin/buyer-applications?status=APPROVED" className="metric-card interactive">
          <div className="metric-info">
            <h4>Buyer Referral Distribute</h4>
            <h3 className="metric-number">{formatBDT(buyerReferralsPayout)}</h3>
          </div>
          <div className="metric-icon icon-blue" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <i className="fa-solid fa-gift"></i>
          </div>
        </Link>

        <Link href="/admin/orders?status=REJECTED" className="metric-card interactive">
          <div className="metric-info">
            <h4>Rejected Orders</h4>
            <h3 className="metric-number">{rejectedOrders}</h3>
          </div>
          <div className="metric-icon icon-amber" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <i className="fa-solid fa-ban"></i>
          </div>
        </Link>
      </div>

      {/* SPL Investment Overview */}
      <h3 style={{ marginBottom: '16px', color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <i className="fa-solid fa-sack-dollar" style={{ color: '#10b981' }}></i>
        SPL Investment Overview
      </h3>
      <div className="metrics-grid" style={{ marginBottom: '32px' }}>
        <Link href="/admin/members" className="metric-card interactive">
          <div className="metric-info">
            <h4>Total Managed Capital</h4>
            <h3 className="metric-number">{formatBDT(totalCapital)}</h3>
          </div>
          <div className="metric-icon icon-blue">
            <i className="fa-solid fa-vault"></i>
          </div>
        </Link>

        <Link href="/admin/payouts" className="metric-card interactive">
          <div className="metric-info">
            <h4>Monthly Disbursal Obligation</h4>
            <h3 className="metric-number">{formatBDT(totalMonthlyObligation)}</h3>
          </div>
          <div className="metric-icon icon-green">
            <i className="fa-solid fa-hand-holding-dollar"></i>
          </div>
        </Link>

        <Link href="/admin/applications?status=PENDING" className="metric-card interactive">
          <div className="metric-info">
            <h4>Pending SPL Applications</h4>
            <h3 className="metric-number">{pendingApps}</h3>
          </div>
          <div className="metric-icon icon-amber">
            <i className="fa-solid fa-clock"></i>
          </div>
        </Link>

        <Link href="/admin/members" className="metric-card interactive">
          <div className="metric-info">
            <h4>Active Investors / Members</h4>
            <h3 className="metric-number">{members.length}</h3>
          </div>
          <div className="metric-icon icon-purple">
            <i className="fa-solid fa-users"></i>
          </div>
        </Link>

        <Link href="/admin/referrals/commissions" className="metric-card interactive">
          <div className="metric-info">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Total Referral Distribute
            </h4>
            <h3 className="metric-number">{formatBDT(totalReferralCommissions)}</h3>
          </div>
          <div className="metric-icon icon-blue" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <i className="fa-solid fa-gift"></i>
          </div>
        </Link>
      </div>

      {/* Product Buyer Applications Section */}
      <div className="card-table-container">
        <div className="table-header-row">
          <h3>Recent Product Buyer Submissions</h3>
          <Link href="/admin/buyer-applications" className="btn-action btn-view">
            View All Applications ({buyerApps.length})
          </Link>
        </div>

        {loading ? (
          <p style={{ padding: '24px' }}>Loading real-time data...</p>
        ) : buyerApps.length === 0 ? (
          <p style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No buyer applications found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Buyer Name & NID</th>
                <th>Contact Phone</th>
                <th>Product / Sector</th>
                <th>Sponsor ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {buyerApps.slice(0, 5).map((app) => (
                <tr key={app.id}>
                  <td><strong>{app.id}</strong></td>
                  <td>
                    <div><strong>{app.applicantName}</strong></div>
                    <small style={{ color: '#94a3b8' }}>NID: {app.nid || 'N/A'}</small>
                  </td>
                  <td>{app.phone}</td>
                  <td>
                    <div>
                      <span style={{ background: '#334155', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>
                        {app.productName || 'Direct Buyer Registration'}
                      </span>
                    </div>
                  </td>
                  <td>
                    {app.referredBy ? (
                      <span style={{ color: '#38bdf8', fontWeight: 600, fontFamily: 'monospace' }}>{app.referredBy}</span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge-status badge-${app.status.toLowerCase()}`}>
                      {app.status}
                    </span>
                  </td>
                  <td>
                    <Link href="/admin/buyer-applications" className="btn-action btn-view">
                      Process
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Table Container */}
      <div className="card-table-container">
        <div className="table-header-row">
          <h3>Recent SPL Investment Submissions</h3>
          <Link href="/admin/applications" className="btn-action btn-view">
            View All Applications ({apps.length})
          </Link>
        </div>

        {loading ? (
          <p style={{ padding: '24px' }}>Loading real-time data...</p>
        ) : apps.length === 0 ? (
          <p style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No investment applications found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>App ID</th>
                <th>Applicant Name</th>
                <th>Mobile Contact</th>
                <th>Capital Amount</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.slice(0, 5).map((app) => (
                <tr key={app.id}>
                  <td><strong>{app.id}</strong></td>
                  <td>{app.applicantName}</td>
                  <td>{app.phone}</td>
                  <td><strong>{formatBDT(app.capitalAmount)}</strong></td>
                  <td>{app.durationMonths} Mos</td>
                  <td>
                    <span className={`badge-status badge-${app.status.toLowerCase()}`}>
                      {app.status}
                    </span>
                  </td>
                  <td>
                    <Link href="/admin/applications" className="btn-action btn-view">
                      Process
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
