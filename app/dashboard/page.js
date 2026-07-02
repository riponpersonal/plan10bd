'use client';

import React, { useState, useEffect, useContext } from 'react';
import { DashboardTabContext } from './layout';

export default function UserDashboardPage() {
  const context = useContext(DashboardTabContext);
  const activeTab = context ? context.activeTab : 'overview';
  const setActiveTab = context ? context.setActiveTab : () => {};
  const setUser = context ? context.setUser : () => {};

  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    nid: '',
    fatherName: '',
    address: '',
    nomineeName: '',
    relation: ''
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  const [inputRefCode, setInputRefCode] = useState('');
  const [bindingRef, setBindingRef] = useState(false);
  const [refBindMsg, setRefBindMsg] = useState({ type: '', text: '' });

  const [zoomScale, setZoomScale] = useState(1.0);

  const handleZoomIn = () => setZoomScale(prev => Math.min(Number((prev + 0.15).toFixed(2)), 2.0));
  const handleZoomOut = () => setZoomScale(prev => Math.max(Number((prev - 0.15).toFixed(2)), 0.4));
  const handleResetZoom = () => setZoomScale(1.0);

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
          if (result.data && result.data.member) {
            if (result.data.member.name) {
              setUser(prev => ({ ...prev, name: result.data.member.name }));
            }
            setProfileForm({
              name: result.data.member.name || '',
              phone: result.data.member.phone || '',
              nid: result.data.member.nid || '',
              fatherName: result.data.member.fatherName || '',
              address: result.data.member.address || '',
              nomineeName: result.data.member.nomineeName || '',
              relation: result.data.member.relation || ''
            });
          }
        }
      } catch (e) {
        console.error('Error fetching user dashboard:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!dashData || !dashData.member) return;
    setUpdatingProfile(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: dashData.member.memberId || dashData.member.phone,
          ...profileForm
        })
      });
      const data = await res.json();
      if (data.success) {
        setProfileMsg({ type: 'success', text: 'Your profile information has been updated successfully!' });
        setDashData(prev => ({
          ...prev,
          member: {
            ...prev.member,
            ...profileForm
          }
        }));
        if (profileForm.name) {
          setUser(prev => ({ ...prev, name: profileForm.name }));
          try {
            const saved = localStorage.getItem('plan10_user');
            if (saved) {
              const parsed = JSON.parse(saved);
              parsed.name = profileForm.name;
              localStorage.setItem('plan10_user', JSON.stringify(parsed));
            }
          } catch (err) {}
        }
        setIsEditing(false);
      } else {
        setProfileMsg({ type: 'error', text: data.message || 'Failed to update profile details.' });
      }
    } catch (err) {
      console.error(err);
      setProfileMsg({ type: 'error', text: 'An unexpected error occurred while saving profile changes.' });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleBindReferralCode = async (e) => {
    e.preventDefault();
    if (!dashData || !dashData.member || !inputRefCode.trim()) return;
    setBindingRef(true);
    setRefBindMsg({ type: '', text: '' });
    try {
      const res = await fetch('/api/user/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: dashData.member.memberId || dashData.member.phone,
          referralCode: inputRefCode.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setRefBindMsg({ type: 'success', text: data.message });
        setInputRefCode('');
        let username = dashData.member.memberId || dashData.member.phone;
        const freshRes = await fetch(`/api/user/dashboard?username=${encodeURIComponent(username)}`);
        const freshData = await freshRes.json();
        if (freshData.success) {
          setDashData(freshData.data);
        }
      } else {
        setRefBindMsg({ type: 'error', text: data.message || 'Invalid referral code.' });
      }
    } catch (err) {
      console.error(err);
      setRefBindMsg({ type: 'error', text: 'Error processing referral code. Please try again.' });
    } finally {
      setBindingRef(false);
    }
  };

  const fallbackCopyText = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
  };

  const handleCopyLink = () => {
    if (!dashData) return;
    const link = `${window.location.origin}/#apply?ref=${dashData.referrals.referralCode}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
      }).catch((err) => {
        console.error('Clipboard API error:', err);
        fallbackCopyText(link);
      });
    } else {
      fallbackCopyText(link);
    }
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

  const renderUnlimitedMultilevelTree = () => {
    const rootNode = {
      memberId: member.memberId,
      name: member.name,
      children: referrals.tree || []
    };

    const renderTreeNodeHierarchy = (node, level) => {
      const hasChildren = node.children && node.children.length > 0;
      
      const theme = level === 0 
        ? { bg: 'linear-gradient(135deg, #0284c7 0%, #0f172a 100%)', border: '#38bdf8', iconColor: '#0284c7', text: '#ffffff', id: '#38bdf8', icon: 'fa-user-tie', badge: 'ROOT' }
        : level === 1 
        ? { bg: 'linear-gradient(135deg, #059669 0%, #0f172a 100%)', border: '#10b981', iconColor: '#34d399', text: '#ffffff', id: '#6ee7b7', icon: 'fa-circle-user', badge: 'L1 (6%)' }
        : level === 2 
        ? { bg: 'linear-gradient(135deg, #0284c7 0%, #0f172a 100%)', border: '#0284c7', iconColor: '#38bdf8', text: '#ffffff', id: '#7dd3fc', icon: 'fa-circle-user', badge: 'L2 (0%)' }
        : level === 3
        ? { bg: 'linear-gradient(135deg, #7c3aed 0%, #0f172a 100%)', border: '#7c3aed', iconColor: '#c084fc', text: '#ffffff', id: '#e9d5ff', icon: 'fa-circle-user', badge: 'L3 (0%)' }
        : { bg: 'linear-gradient(135deg, #4c1d95 0%, #090514 100%)', border: '#6d28d9', iconColor: '#a78bfa', text: '#cbd5e1', id: '#c084fc', icon: 'fa-users', badge: `L${level} (0%)` };

      return (
        <div key={node.memberId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 14px', position: 'relative' }}>
          <div style={{
            background: theme.bg,
            border: `2px solid ${theme.border}`,
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '130px',
            zIndex: 2,
            position: 'relative'
          }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
              <i className={`fa-solid ${theme.icon}`} style={{ color: theme.iconColor, fontSize: '1.1rem' }}></i>
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
              {node.name}
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: theme.id, fontFamily: 'monospace' }}>
              {node.memberId}
            </span>
            {level > 0 && (
              <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: '4px', marginTop: '4px', color: '#ffffff' }}>
                {theme.badge}
              </span>
            )}
          </div>

          {hasChildren && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '0px' }}>
              <div style={{ width: '2px', height: '18px', background: '#475569' }}></div>
              <div style={{ display: 'flex', position: 'relative', justifyContent: 'center' }}>
                {node.children.length > 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '0px',
                    left: '45px',
                    right: '45px',
                    height: '2px',
                    background: '#475569',
                    zIndex: 1
                  }}></div>
                )}
                {node.children.map(child => (
                  <div key={child.memberId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    <div style={{ width: '2px', height: '18px', background: '#475569' }}></div>
                    {renderTreeNodeHierarchy(child, level + 1)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div style={{ background: '#040711', borderRadius: '14px', border: '1px solid #1e293b', overflow: 'hidden', color: '#ffffff', fontFamily: 'sans-serif' }}>
        {/* Header Bar */}
        <div style={{ background: '#000000', padding: '12px 16px', fontWeight: 700, borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ flex: 1, minWidth: '180px', textAlign: 'left', fontSize: '1.15rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#ffffff' }}>
            <i className="fa-solid fa-sitemap" style={{ color: '#34d399', marginRight: '8px' }}></i> Your Referral Tree
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', padding: '4px 8px', borderRadius: '8px', border: '1px solid #334155' }}>
            <button 
              onClick={handleZoomOut} 
              title="Zoom Out (-)"
              style={{ background: '#1e293b', border: '1px solid #475569', color: '#ffffff', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}
            >
              -
            </button>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399', minWidth: '42px', textAlign: 'center' }}>
              {Math.round(zoomScale * 100)}%
            </span>
            <button 
              onClick={handleZoomIn} 
              title="Zoom In (+)"
              style={{ background: '#1e293b', border: '1px solid #475569', color: '#ffffff', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}
            >
              +
            </button>
            <button 
              onClick={handleResetZoom} 
              title="Reset Zoom (100%)"
              style={{ background: '#059669', border: 'none', color: '#ffffff', borderRadius: '6px', padding: '6px 10px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700, marginLeft: '2px' }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ background: '#090d16', padding: '8px 16px', display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', borderBottom: '1px solid #1e293b', fontSize: '0.78rem', fontWeight: 600 }}>
          <span style={{ color: '#38bdf8', whiteSpace: 'nowrap' }}><i className="fa-solid fa-square"></i> Root Member</span>
          <span style={{ color: '#34d399', whiteSpace: 'nowrap' }}><i className="fa-solid fa-square"></i> Level 1 (5%)</span>
          <span style={{ color: '#60a5fa', whiteSpace: 'nowrap' }}><i className="fa-solid fa-square"></i> Level 2 (3%)</span>
          <span style={{ color: '#c084fc', whiteSpace: 'nowrap' }}><i className="fa-solid fa-square"></i> Level 3 (1%)</span>
        </div>

        {/* Scrollable Mobile-Responsive Tree Container */}
        <div style={{ 
          overflowX: 'auto', 
          overflowY: 'auto', 
          WebkitOverflowScrolling: 'touch', 
          padding: '30px 15px', 
          maxHeight: '75vh', 
          position: 'relative', 
          background: '#030712', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%'
        }}>
          <div style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-out',
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 'min-content'
          }}>
            {renderTreeNodeHierarchy(rootNode, 0)}

            {(!referrals.tree || referrals.tree.length === 0) && (
              <div style={{ marginTop: '24px', color: '#64748b', fontSize: '0.88rem', fontWeight: 600, textAlign: 'center', padding: '0 10px' }}>
                No active Level 1 referrals yet. Share your unique referral code to start building your team!
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };



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
              <h3 style={{ margin: '0 0 4px 0', color: '#a7f3d0', fontSize: '1.2rem', fontWeight: 800 }}>
                <i className="fa-solid fa-share-nodes"></i> PLAN-10 Direct Sponsor Referral Program
              </h3>
              <p style={{ margin: 0, color: '#34d399', fontSize: '0.88rem' }}>
                Earn a flat 6% sponsor commission on all direct referrals (Level 1) capital volume!
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

            <div style={{ width: '100%', marginTop: '16px', borderTop: '1px dashed rgba(16, 185, 129, 0.3)', paddingTop: '12px', fontSize: '0.8rem', color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-circle-info" style={{ color: '#34d399' }}></i>
              <span><strong>Referral Notice:</strong> Referral commission is flat 6% only for direct L1 sponsors. Level 2, Level 3, and subsequent generations do not receive referral rewards.</span>
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
                <small>6% Commission Rate</small>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-box blue">
                <i className="fa-solid fa-diagram-project"></i>
              </div>
              <div className="metric-info">
                <label>Total Network Size</label>
                <h3>{referrals.totalTeam} Members</h3>
                <small>Direct & Indirect downlines</small>
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

          {/* Sponsor Referral Code Link Section */}
          <div className="content-section-card" style={{ marginBottom: '28px' }}>
            <div className="section-card-header">
              <div>
                <h3 style={{ margin: 0 }}><i className="fa-solid fa-user-plus"></i> Join Under a Sponsor (Apply Referral Code)</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                  Enter your inviter's referral code to connect your account to their network hierarchy.
                </span>
                {!member.referredBy && (
                  <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <i className="fa-solid fa-triangle-exclamation"></i> Note: A sponsor referral code can only be submitted ONCE per member account.
                  </span>
                )}
              </div>
            </div>

            {refBindMsg.text && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: refBindMsg.type === 'success' ? '#064e3b' : '#7f1d1d',
                color: refBindMsg.type === 'success' ? '#a7f3d0' : '#fecaca',
                border: `1px solid ${refBindMsg.type === 'success' ? '#059669' : '#dc2626'}`
              }}>
                <i className={`fa-solid ${refBindMsg.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
                {refBindMsg.text}
              </div>
            )}

            {member.referredBy ? (
              <div style={{ background: '#0f172a', padding: '18px 22px', borderRadius: '12px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Connected Sponsor</span>
                  <strong style={{ fontSize: '1.1rem', color: '#34d399' }}><i className="fa-solid fa-link"></i> {member.referredBy}</strong>
                </div>
                <span className="status-badge paid" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                  <i className="fa-solid fa-lock"></i> Sponsor Linked (Locked)
                </span>
              </div>
            ) : (
              <form onSubmit={handleBindReferralCode} style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Enter Inviter Referral Code / Member ID *
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Plan10-101 or Sponsor Mobile"
                      value={inputRefCode}
                      onChange={(e) => setInputRefCode(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.95rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ marginTop: '22px' }}>
                    <button 
                      type="submit" 
                      disabled={bindingRef}
                      style={{
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        padding: '11px 24px',
                        borderRadius: '8px',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        cursor: bindingRef ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                      }}
                    >
                      {bindingRef ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i> Validating...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-lock"></i> Submit Referral Code (One-Time)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Interactive Visual Referral Tree */}
          <div className="content-section-card" style={{ padding: 0, overflow: 'hidden' }}>
            {renderUnlimitedMultilevelTree()}
          </div>


        </>
      )}

      {/* TAB 4: ACCOUNT DETAILS */}
      {activeTab === 'account' && (
        <div className="content-section-card">
          <div className="section-card-header" style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0 }}><i className="fa-solid fa-id-card"></i> Investor & Nominee Profile Details</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                {isEditing ? 'Fill out the application form fields below to update your member information.' : 'View your official member account details and nominee beneficiary information.'}
              </p>
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                style={{
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                <i className="fa-solid fa-user-pen"></i> Edit Profile Information
              </button>
            )}
          </div>

          {profileMsg.text && (
            <div style={{
              padding: '14px 18px',
              borderRadius: '10px',
              marginBottom: '24px',
              fontSize: '0.95rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: profileMsg.type === 'success' ? '#064e3b' : '#7f1d1d',
              color: profileMsg.type === 'success' ? '#a7f3d0' : '#fecaca',
              border: `1px solid ${profileMsg.type === 'success' ? '#059669' : '#dc2626'}`
            }}>
              <i className={`fa-solid ${profileMsg.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} style={{ fontSize: '1.2rem' }}></i>
              {profileMsg.text}
            </div>
          )}

          {!isEditing ? (
            /* READ-ONLY INFORMATION VIEW */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {/* Card 1: Applicant Details */}
              <div style={{ background: '#0f172a', padding: '24px', borderRadius: '14px', border: '1px solid #334155', color: '#e2e8f0' }}>
                <h4 style={{ margin: '0 0 18px 0', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
                  <i className="fa-solid fa-user"></i> 1. Applicant Details (আবেদনকারীর তথ্য)
                </h4>
                <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong style={{ color: '#94a3b8' }}>Full Name:</strong> <span style={{ color: '#ffffff', fontWeight: 600 }}>{member.name}</span></p>
                <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong style={{ color: '#94a3b8' }}>Father's / Husband's Name:</strong> <span style={{ color: '#ffffff', fontWeight: 600 }}>{member.fatherName || 'Not Specified'}</span></p>
                <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong style={{ color: '#94a3b8' }}>Mobile Number:</strong> <span style={{ color: '#ffffff', fontWeight: 600 }}>{member.phone}</span></p>
                <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong style={{ color: '#94a3b8' }}>National ID (NID):</strong> <span style={{ color: '#ffffff', fontWeight: 600 }}>{member.nid}</span></p>
                <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong style={{ color: '#94a3b8' }}>Present & Permanent Address:</strong> <span style={{ color: '#ffffff', fontWeight: 600 }}>{member.address || 'Gazipur, Dhaka, Bangladesh'}</span></p>
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Member ID: <strong>{member.memberId}</strong></span>
                  <span className="status-badge paid" style={{ fontSize: '0.75rem' }}>{member.status}</span>
                </div>
              </div>

              {/* Card 2: Investment Scheme Details */}
              <div style={{ background: '#0f172a', padding: '24px', borderRadius: '14px', border: '1px solid #334155', color: '#e2e8f0' }}>
                <h4 style={{ margin: '0 0 18px 0', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
                  <i className="fa-solid fa-file-contract"></i> 2. Investment Scheme Details (বিনিয়োগের বিবরণ)
                </h4>
                <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong style={{ color: '#94a3b8' }}>Capital Invested:</strong> <strong style={{ color: '#34d399', fontSize: '1.1rem' }}>৳ {stats.capitalInvested.toLocaleString()} BDT</strong></p>
                <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong style={{ color: '#94a3b8' }}>Term Duration:</strong> <span style={{ color: '#ffffff', fontWeight: 600 }}>{stats.termMonths} Months ({stats.termMonths} মাস)</span></p>
                <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong style={{ color: '#94a3b8' }}>Monthly Profit (3%):</strong> <span style={{ color: '#a7f3d0' }}>৳ {stats.monthlyProfit.toLocaleString()} BDT</span></p>
                <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong style={{ color: '#94a3b8' }}>Monthly Capital Refund:</strong> <span style={{ color: '#93c5fd' }}>৳ {stats.monthlyCapitalRefund.toLocaleString()} BDT</span></p>
                <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong style={{ color: '#94a3b8' }}>Total Monthly Disbursal:</strong> <strong style={{ color: '#34d399' }}>৳ {stats.monthlyTotalPayout.toLocaleString()} BDT</strong></p>
              </div>

              {/* Card 3: Nominee Beneficiary Info */}
              <div style={{ background: '#0f172a', padding: '24px', borderRadius: '14px', border: '1px solid #334155', color: '#e2e8f0' }}>
                <h4 style={{ margin: '0 0 18px 0', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
                  <i className="fa-solid fa-user-shield"></i> 3. Nominee Information (নমিনীর তথ্য)
                </h4>
                <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong style={{ color: '#94a3b8' }}>Nominee Full Name:</strong> <span style={{ color: '#ffffff', fontWeight: 600 }}>{member.nomineeName || 'N/A'}</span></p>
                <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong style={{ color: '#94a3b8' }}>Relation with Applicant:</strong> <span style={{ color: '#ffffff', fontWeight: 600 }}>{member.relation || 'Legal Heir'}</span></p>
                <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong style={{ color: '#94a3b8' }}>Disbursal Channel:</strong> <span style={{ color: '#cbd5e1' }}>Bank Wire / bKash Disbursal</span></p>
                <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong style={{ color: '#94a3b8' }}>Contract Deed Guarantee:</strong> <span style={{ color: '#34d399', fontWeight: 700 }}>100% Capital Protection</span></p>
              </div>
            </div>
          ) : (
            /* EDIT FORM VIEW MATCHING APPLY NOW FORM */
            <form onSubmit={handleUpdateProfile} style={{ background: '#0f172a', padding: '28px', borderRadius: '16px', border: '1px solid #334155', color: '#e2e8f0' }}>
              
              {/* SECTION 1: APPLICANT DETAILS */}
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <i className="fa-solid fa-user"></i> 1. Applicant Details (আবেদনকারীর তথ্য)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Applicant Name (আবেদনকারীর নাম) *
                  </label>
                  <input 
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    National ID / Passport No (জাতীয় পরিচয়পত্র নং) *
                  </label>
                  <input 
                    type="text"
                    required
                    value={profileForm.nid}
                    onChange={(e) => setProfileForm({ ...profileForm, nid: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Father's / Husband's Name (পিতা/স্বামীর নাম)
                  </label>
                  <input 
                    type="text"
                    value={profileForm.fatherName}
                    onChange={(e) => setProfileForm({ ...profileForm, fatherName: e.target.value })}
                    placeholder="Father / Husband Full Name"
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Mobile Number (মোবাইল নম্বর) *
                  </label>
                  <input 
                    type="tel"
                    required
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Present & Permanent Address (বর্তমান ও স্থায়ী ঠিকানা)
                </label>
                <input 
                  type="text"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  placeholder="Full Village/House, Thana, District"
                  style={{ width: '100%', padding: '10px 14px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                />
              </div>

              {/* SECTION 2: INVESTMENT SCHEME DETAILS */}
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '8px', marginTop: '24px' }}>
                <i className="fa-solid fa-file-contract"></i> 2. Investment Scheme Details (বিনিয়োগের পরিমাণ ও বিবরণ)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Investment Capital Amount (বিনিয়োগের পরিমাণ ৳)
                  </label>
                  <input 
                    type="text"
                    readOnly
                    value={`৳ ${stats.capitalInvested.toLocaleString()} BDT`}
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#334155', border: '1px solid #475569', borderRadius: '8px', color: '#34d399', fontWeight: 700, outline: 'none', cursor: 'not-allowed' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Term Duration (মেয়াদ)
                  </label>
                  <input 
                    type="text"
                    readOnly
                    value={`${stats.termMonths} Months (${stats.termMonths} মাস)`}
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#334155', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', outline: 'none', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              {/* SECTION 3: NOMINEE INFORMATION */}
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#60a5fa', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '8px', marginTop: '24px' }}>
                <i className="fa-solid fa-user-shield"></i> 3. Nominee Information (নমিনীর তথ্য)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Nominee Name (নমিনীর নাম)
                  </label>
                  <input 
                    type="text"
                    required
                    value={profileForm.nomineeName}
                    onChange={(e) => setProfileForm({ ...profileForm, nomineeName: e.target.value })}
                    placeholder="Nominee Full Name"
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Relation with Applicant (সম্পর্ক)
                  </label>
                  <input 
                    type="text"
                    required
                    value={profileForm.relation}
                    onChange={(e) => setProfileForm({ ...profileForm, relation: e.target.value })}
                    placeholder="e.g. Spouse / Son / Brother"
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #334155' }}>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  style={{
                    backgroundColor: '#334155',
                    color: '#e2e8f0',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={updatingProfile}
                  style={{
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 26px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: updatingProfile ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                  }}
                >
                  {updatingProfile ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check-circle"></i> Submit Application Form Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
