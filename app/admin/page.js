'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboardOverview() {
  const [apps, setApps] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReferralsModal, setShowReferralsModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [resApps, resMembers] = await Promise.all([
          fetch('/api/applications'),
          fetch('/api/members')
        ]);
        const dataApps = await resApps.json();
        const dataMembers = await resMembers.json();

        if (dataApps.success) setApps(dataApps.applications);
        if (dataMembers.success) setMembers(dataMembers.members);
      } catch (e) {
        console.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalCapital = members.reduce((acc, m) => acc + (m.capitalInvested || 0), 0);
  const totalMonthlyObligation = members.reduce((acc, m) => acc + (m.monthlyTotalPayout || 0), 0);
  const pendingApps = apps.filter((a) => a.status === 'PENDING').length;
  const totalReferralCommissions = members
    .filter(m => m.referredBy && members.some(parent => parent.memberId === m.referredBy))
    .reduce((acc, m) => acc + (m.capitalInvested * 0.06), 0);

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
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-info">
            <h4>Total Managed Capital</h4>
            <h3 className="metric-number">{formatBDT(totalCapital)}</h3>
          </div>
          <div className="metric-icon icon-blue">
            <i className="fa-solid fa-vault"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Monthly Disbursal Obligation</h4>
            <h3 className="metric-number">{formatBDT(totalMonthlyObligation)}</h3>
          </div>
          <div className="metric-icon icon-green">
            <i className="fa-solid fa-hand-holding-dollar"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Pending SPL Applications</h4>
            <h3 className="metric-number">{pendingApps}</h3>
          </div>
          <div className="metric-icon icon-amber">
            <i className="fa-solid fa-clock"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Active Investors / Members</h4>
            <h3 className="metric-number">{members.length}</h3>
          </div>
          <div className="metric-icon icon-purple">
            <i className="fa-solid fa-users"></i>
          </div>
        </div>

        <div 
          className="metric-card" 
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }} 
          onClick={() => setShowReferralsModal(true)}
          title="Click to view distributed referral list"
        >
          <div className="metric-info">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Total Referral Distribute
              <i className="fa-solid fa-circle-info" style={{ fontSize: '0.75rem', color: '#3b82f6' }}></i>
            </h4>
            <h3 className="metric-number">{formatBDT(totalReferralCommissions)}</h3>
          </div>
          <div className="metric-icon icon-blue" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <i className="fa-solid fa-gift"></i>
          </div>
        </div>
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

      {/* Referral Commission Distribute Audit Modal */}
      {showReferralsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem' }}>
                  <i className="fa-solid fa-gift" style={{ color: '#60a5fa', marginRight: '8px' }}></i>
                  Referral Commissions Distributed (Flat 6%)
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Complete audit log of 6% sponsor rewards distributed to members.
                </span>
              </div>
              <button 
                onClick={() => setShowReferralsModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '1.35rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              flexGrow: 1
            }}>
              {referralEvents.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                  No referral distributions found in the database.
                </p>
              ) : (
                <table className="admin-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Sponsor Name & ID</th>
                      <th>Referred Member</th>
                      <th>Capital Balance</th>
                      <th>Sponsor Bonus (6%)</th>
                      <th>Joining Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralEvents.map((evt, idx) => (
                      <tr key={idx}>
                        <td>
                          <div><strong>{evt.sponsorName}</strong></div>
                          <small style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{evt.sponsorId}</small>
                        </td>
                        <td>
                          <div><strong>{evt.referredName}</strong></div>
                          <small style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{evt.referredId}</small>
                        </td>
                        <td>
                          <strong>{formatBDT(evt.capital)}</strong>
                        </td>
                        <td style={{ color: '#10b981', fontWeight: 700 }}>
                          {formatBDT(evt.commissionAmount)}
                        </td>
                        <td>
                          {evt.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#0f172a',
              borderBottomLeftRadius: '16px',
              borderBottomRightRadius: '16px'
            }}>
              <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                Total Distributed Bonus: <strong style={{ color: '#10b981' }}>{formatBDT(totalReferralCommissions)}</strong>
              </span>
              <button 
                className="btn-action btn-view" 
                onClick={() => setShowReferralsModal(false)}
                style={{ margin: 0 }}
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
