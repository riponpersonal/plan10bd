'use client';

import React, { useState, useEffect, useContext } from 'react';
import { DashboardTabContext } from './layout';

export default function UserDashboardPage() {
  const context = useContext(DashboardTabContext);
  const activeTab = context ? context.activeTab : 'overview';
  const setActiveTab = context ? context.setActiveTab : () => {};

  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        let username = 'Plan10-101';
        const saved = localStorage.getItem('plan10_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.username || parsed.phone) {
            username = parsed.username || parsed.phone;
          }
        }
        
        const res = await fetch(`/api/user/dashboard?username=${encodeURIComponent(username)}`);
        const result = await res.json();
        if (result.success) {
          setDashData(result.data);
        }
      } catch (e) {
        console.error('Error fetching user dashboard:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const handleCopyLink = () => {
    if (!dashData) return;
    const link = `${window.location.origin}/#apply?ref=${dashData.referrals.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#059669' }}></i>
        <p style={{ marginTop: '16px', color: '#64748b', fontWeight: 600 }}>Loading your secure investment dashboard...</p>
      </div>
    );
  }

  if (!dashData || !dashData.member) {
    return (
      <div className="welcome-hero-card">
        <span className="hero-tag">Account Notice</span>
        <h2>Welcome to PLAN-10 BD Member Portal</h2>
        <p>Your investment application is currently pending verification or undergoing registration setup by our desk.</p>
      </div>
    );
  }

  const { member, stats, schedule, referrals } = dashData;

  // Helper for rendering recursive Referral Tree Nodes
  const renderTreeNode = (node) => (
    <div key={node.memberId} className="tree-node-wrapper">
      <div className="tree-node-card">
        <div className="node-left">
          <div className={`node-level-tag l${node.level}`}>
            L{node.level}
          </div>
          <div className="node-info">
            <h4>{node.name} <small style={{ color: '#64748b', fontWeight: 500 }}>({node.memberId})</small></h4>
            <span>Joined: {node.joinDate} | Mobile: {node.phone}</span>
          </div>
        </div>
        <div className="node-right">
          <strong>৳ {node.capitalInvested.toLocaleString()} BDT</strong>
          <small>Bonus Generated: +৳ {node.bonusEarned.toLocaleString()}</small>
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <div className="tree-children-wrapper">
          {node.children.map(child => renderTreeNode(child))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          <div className="welcome-hero-card">
            <span className="hero-tag">Active SPL Investment Scheme</span>
            <h2>Welcome Back, {member.name}!</h2>
            <p>Your capital is actively deployed in PLAN-10 BD smart electronics distribution and high-yield consumer goods manufacturing in Gazipur, Bangladesh.</p>
            
            <div className="hero-quick-stats">
              <div className="quick-stat-box">
                <label>Member Account ID</label>
                <span>{member.memberId}</span>
              </div>
              <div className="quick-stat-box">
                <label>Contract Tenure</label>
                <span>{stats.termMonths} Months</span>
              </div>
              <div className="quick-stat-box">
                <label>Completed Payouts</label>
                <span>{stats.payoutsCompletedCount} / {stats.termMonths} Months</span>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon-box green">
                <i className="fa-solid fa-sack-dollar"></i>
              </div>
              <div className="metric-info">
                <label>Invested Capital</label>
                <h3>৳ {stats.capitalInvested.toLocaleString()}</h3>
                <small><i className="fa-solid fa-circle-check"></i> 100% Capital Guaranteed</small>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-box blue">
                <i className="fa-solid fa-hand-holding-dollar"></i>
              </div>
              <div className="metric-info">
                <label>Monthly Total Return</label>
                <h3>৳ {stats.monthlyTotalPayout.toLocaleString()}</h3>
                <small>Profit (৳{stats.monthlyProfit.toLocaleString()}) + Refund (৳{stats.monthlyCapitalRefund.toLocaleString()})</small>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-box purple">
                <i className="fa-solid fa-chart-line"></i>
              </div>
              <div className="metric-info">
                <label>Total Disbursed To Date</label>
                <h3>৳ {stats.totalPaidSoFar.toLocaleString()}</h3>
                <small>{stats.payoutsCompletedCount} successful monthly transfers</small>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-box amber">
                <i className="fa-solid fa-gift"></i>
              </div>
              <div className="metric-info">
                <label>Referral Earnings</label>
                <h3>৳ {referrals.totalEarnedBonus.toLocaleString()}</h3>
                <small>{referrals.totalTeam} Network Members</small>
              </div>
            </div>
          </div>

          {/* Recent Payout Summary & Quick Actions */}
          <div className="content-section-card">
            <div className="section-card-header">
              <h3><i className="fa-solid fa-clock-rotate-left"></i> Upcoming & Recent Monthly Payouts</h3>
              <button 
                onClick={() => setActiveTab('payouts')}
                style={{ background: 'none', border: 'none', color: '#059669', fontWeight: 700, cursor: 'pointer' }}
              >
                View Full 33-Month Schedule &rarr;
              </button>
            </div>
            
            <div className="table-responsive">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Month #</th>
                    <th>Due Date</th>
                    <th>Monthly Profit</th>
                    <th>Capital Refund</th>
                    <th>Total Payout</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.slice(0, 5).map((row) => (
                    <tr key={row.monthNumber}>
                      <td><strong>Month {row.monthNumber}</strong></td>
                      <td>{row.dueDate}</td>
                      <td>৳ {row.profitAmount.toLocaleString()} BDT</td>
                      <td>৳ {row.capitalRefund.toLocaleString()} BDT</td>
                      <td><strong style={{ color: '#047857' }}>৳ {row.totalPayout.toLocaleString()} BDT</strong></td>
                      <td>{row.method}</td>
                      <td>
                        <span className={`status-badge ${row.status.toLowerCase()}`}>
                          <i className={`fa-solid ${row.status === 'PAID' ? 'fa-check-circle' : 'fa-clock'}`}></i> {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: PAYOUTS */}
      {activeTab === 'payouts' && (
        <div className="content-section-card">
          <div className="section-card-header">
            <h3><i className="fa-solid fa-list-check"></i> Complete 33-Month Capital & Profit Schedule</h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              Fixed Monthly Disbursal: Profit + Capital Amortization
            </span>
          </div>

          <div className="table-responsive">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Payout ID</th>
                  <th>Scheduled Date</th>
                  <th>Monthly Profit (3% / mo)</th>
                  <th>Capital Refund</th>
                  <th>Net Monthly Payout</th>
                  <th>Disbursal Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.monthNumber}>
                    <td><strong>Month {row.monthNumber}</strong></td>
                    <td><small style={{ color: '#64748b', fontFamily: 'monospace' }}>{row.id}</small></td>
                    <td>{row.dueDate}</td>
                    <td>৳ {row.profitAmount.toLocaleString()} BDT</td>
                    <td>৳ {row.capitalRefund.toLocaleString()} BDT</td>
                    <td><strong style={{ color: '#047857', fontSize: '0.95rem' }}>৳ {row.totalPayout.toLocaleString()} BDT</strong></td>
                    <td>{row.method}</td>
                    <td>
                      <span className={`status-badge ${row.status.toLowerCase()}`}>
                        <i className={`fa-solid ${row.status === 'PAID' ? 'fa-circle-check' : 'fa-hourglass-half'}`}></i> {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REFERRAL TREE */}
      {activeTab === 'referral' && (
        <>
          <div className="referral-box-header">
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#065f46', fontSize: '1.2rem', fontWeight: 800 }}>
                <i className="fa-solid fa-share-nodes"></i> PLAN-10 Multilevel Referral Program
              </h3>
              <p style={{ margin: 0, color: '#047857', fontSize: '0.88rem' }}>
                Earn 5% on Direct Referrals (L1), 3% on Level 2, and 1% on Level 3 investor volume!
              </p>
            </div>

            <div className="referral-link-input-group">
              <i className="fa-solid fa-link" style={{ color: '#059669' }}></i>
              <input 
                type="text" 
                readOnly 
                value={`${typeof window !== 'undefined' ? window.location.origin : 'https://plan10bd.com'}/#apply?ref=${referrals.referralCode}`} 
              />
              <button className="btn-copy-link" onClick={handleCopyLink}>
                {copySuccess ? <><i className="fa-solid fa-check"></i> Copied!</> : <><i className="fa-solid fa-copy"></i> Copy Link</>}
              </button>
            </div>
          </div>

          <div className="metrics-grid" style={{ marginBottom: '28px' }}>
            <div className="metric-card">
              <div className="metric-icon-box green">
                <i className="fa-solid fa-users"></i>
              </div>
              <div className="metric-info">
                <label>Direct Referrals (Level 1)</label>
                <h3>{referrals.totalDirect} Members</h3>
                <small>5% Commission Rate</small>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-box blue">
                <i className="fa-solid fa-diagram-project"></i>
              </div>
              <div className="metric-info">
                <label>Total Network Size</label>
                <h3>{referrals.totalTeam} Members</h3>
                <small>Level 1, 2 & 3 Combined</small>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-box purple">
                <i className="fa-solid fa-coins"></i>
              </div>
              <div className="metric-info">
                <label>Total Referral Commissions</label>
                <h3>৳ {referrals.totalEarnedBonus.toLocaleString()} BDT</h3>
                <small>Disbursed directly to your wallet</small>
              </div>
            </div>
          </div>

          {/* Interactive Visual Referral Tree */}
          <div className="content-section-card">
            <div className="section-card-header">
              <h3><i className="fa-solid fa-network-wired"></i> Your Dynamic Referral Hierarchy Tree</h3>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                Level 1 (Green), Level 2 (Blue), Level 3 (Purple)
              </span>
            </div>

            <div className="tree-container">
              {referrals.tree && referrals.tree.length > 0 ? (
                referrals.tree.map(node => renderTreeNode(node))
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  <i className="fa-solid fa-user-plus" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '12px' }}></i>
                  <p style={{ margin: 0, fontWeight: 600 }}>You haven't referred any members yet.</p>
                  <small>Share your unique link above to start earning referral bonuses!</small>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* TAB 4: ACCOUNT DETAILS */}
      {activeTab === 'account' && (
        <div className="content-section-card">
          <div className="section-card-header">
            <h3><i className="fa-solid fa-id-card"></i> Investor & Nominee Profile Details</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <div style={{ background: '#0f172a', padding: '20px', borderRadius: '14px', border: '1px solid #334155', color: '#e2e8f0' }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-user"></i> Primary Investor Information
              </h4>
              <p style={{ margin: '8px 0' }}><strong style={{ color: '#ffffff' }}>Full Name:</strong> {member.name}</p>
              <p style={{ margin: '8px 0' }}><strong style={{ color: '#ffffff' }}>Member ID:</strong> {member.memberId}</p>
              <p style={{ margin: '8px 0' }}><strong style={{ color: '#ffffff' }}>Mobile Number:</strong> {member.phone}</p>
              <p style={{ margin: '8px 0' }}><strong style={{ color: '#ffffff' }}>National ID (NID):</strong> {member.nid}</p>
              <p style={{ margin: '8px 0' }}><strong style={{ color: '#ffffff' }}>Join Date:</strong> {member.joinDate}</p>
              <p style={{ margin: '8px 0' }}><strong style={{ color: '#ffffff' }}>Account Status:</strong> <span className="status-badge paid">{member.status}</span></p>
            </div>

            <div style={{ background: '#0f172a', padding: '20px', borderRadius: '14px', border: '1px solid #334155', color: '#e2e8f0' }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-user-shield"></i> Nominee Beneficiary Info
              </h4>
              <p style={{ margin: '8px 0' }}><strong style={{ color: '#ffffff' }}>Nominee Name:</strong> {member.nomineeName || 'N/A'}</p>
              <p style={{ margin: '8px 0' }}><strong style={{ color: '#ffffff' }}>Relationship:</strong> {member.relation || 'Legal Heir'}</p>
              <p style={{ margin: '8px 0' }}><strong style={{ color: '#ffffff' }}>Disbursal Method:</strong> Bank Wire / bKash Disbursal</p>
              <p style={{ margin: '8px 0' }}><strong style={{ color: '#ffffff' }}>Contract Protection:</strong> 100% Guaranteed Deed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
