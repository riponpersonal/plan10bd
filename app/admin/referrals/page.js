'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminReferralsTreePage() {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [placingId, setPlacingId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [placementSlot, setPlacementSlot] = useState(null);
  const [showUnplaced, setShowUnplaced] = useState(false);
  const [expandedUnplaced, setExpandedUnplaced] = useState(null);
  const [detailCard, setDetailCard] = useState(null);

  async function loadMembers() {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      if (data.success) setMembers(data.members || []);
    } catch (e) { console.error('Failed to load members', e); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadMembers(); }, []);

  useEffect(() => {
    if (notification) { const t = setTimeout(() => setNotification(null), 4000); return () => clearTimeout(t); }
  }, [notification]);

  const treeType = 'investor';
  const parentKey = 'investorParent';
  const leftKey = 'investorLeft';
  const rightKey = 'investorRight';
  const referKey = 'referredBy';

  // ─── Correct Stats: filter by investor + both categories ───
  const stats = useMemo(() => {
    // Only INVESTOR and BOTH category members count as investor-relevant
    const investorMembers = members.filter(m => m.category === 'INVESTOR' || m.category === 'BOTH');
    const total = investorMembers.length;
    const withReferral = investorMembers.filter(m => m[referKey] && m[referKey] !== '');
    const withoutReferral = investorMembers.filter(m => !m[referKey] || m[referKey] === '');
    const totalCapital = investorMembers.reduce((sum, m) => sum + (m.capitalInvested || 0), 0);
    const referralCapital = withReferral.reduce((sum, m) => sum + (m.capitalInvested || 0), 0);
    const unplacedCapital = withoutReferral.reduce((sum, m) => sum + (m.capitalInvested || 0), 0);
    const totalMonthlyPayout = investorMembers.reduce((sum, m) => sum + (m.monthlyTotalPayout || 0), 0);

    // Count by category across ALL members
    const investors = members.filter(m => m.category === 'INVESTOR').length;
    const buyers = members.filter(m => m.category === 'BUYER').length;
    const both = members.filter(m => m.category === 'BOTH').length;

    // Top referrers
    const referrerCounts = {};
    investorMembers.forEach(m => { if (m[referKey]) { referrerCounts[m[referKey]] = (referrerCounts[m[referKey]] || 0) + 1; } });
    const sortedReferrers = Object.entries(referrerCounts).sort((a, b) => b[1] - a[1]);

    // Tree depth
    let maxDepth = 0;
    const calcDepth = (id, d) => {
      if (!id) return;
      const m = members.find(x => x.memberId === id);
      if (!m) return;
      maxDepth = Math.max(maxDepth, d);
      if (m[leftKey]) calcDepth(m[leftKey], d + 1);
      if (m[rightKey]) calcDepth(m[rightKey], d + 1);
    };
    const root = members.find(m => m.memberId === 'Plan10-101');
    if (root) calcDepth(root.memberId, 1);

    // Avg capital
    const avgCapital = total > 0 ? totalCapital / total : 0;

    return {
      total, withReferral: withReferral.length, withoutReferral: withoutReferral.length,
      totalCapital, referralCapital, unplacedCapital,
      investors, buyers, both,
      totalMonthlyPayout, maxDepth, avgCapital,
      topReferrer: sortedReferrers[0] ? { id: sortedReferrers[0][0], count: sortedReferrers[0][1] } : null,
      avgCapital
    };
  }, [members]);

  // Unplaced investors (no referral code)
  const unplacedMembers = useMemo(() => {
    const investorMembers = members.filter(m => m.category === 'INVESTOR' || m.category === 'BOTH');
    return investorMembers.filter(m => !m[referKey] || m[referKey] === '').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [members]);

  // ─── Detail card helper ───
  const handleCardClick = (card) => {
    const paths = {
      total: '/admin/members',
      withReferral: '/admin/members?filter=INVESTOR',
      unplaced: () => setShowUnplaced(!showUnplaced),
      payout: '/admin/payouts',
    };
    const target = paths[card];
    if (typeof target === 'function') target();
    else if (target) router.push(target);
  };

  const handlePlaceMember = async (memberId, side, parentId) => {
    setPlacingId(memberId); setNotification(null);
    try {
      const res = await fetch('/api/members', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId, treeType, side, parentId }) });
      const data = await res.json();
      if (data.success) { setNotification({ type: 'success', message: data.message }); setSelectedMember(null); setPlacementSlot(null); await loadMembers(); }
      else setNotification({ type: 'error', message: data.message });
    } catch (err) { setNotification({ type: 'error', message: 'Network error.' }); }
    finally { setPlacingId(null); }
  };

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.15, 2.0));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.15, 0.4));
  const handleResetZoom = () => setZoomScale(1.0);
  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  const handleSlotClick = (side, parentId, parentName) => {
    if (unplacedMembers.length === 0) { setNotification({ type: 'error', message: 'No unplaced members.' }); return; }
    setPlacementSlot({ side, parentId, parentName });
  };

  const root = useMemo(() => members.find(m => m.memberId === 'Plan10-101'), [members]);
  const companyLeftId = root ? root[`${leftKey}`] : null;
  const companyRightId = root ? root[`${rightKey}`] : null;
  const leftSideMember = companyLeftId ? members.find(m => m.memberId === companyLeftId) : null;
  const rightSideMember = companyRightId ? members.find(m => m.memberId === companyRightId) : null;
  const slotLL = leftSideMember ? (members.find(m => m.memberId === leftSideMember[`${leftKey}`])) : null;
  const slotLR = leftSideMember ? (members.find(m => m.memberId === leftSideMember[`${rightKey}`])) : null;
  const slotRL = rightSideMember ? (members.find(m => m.memberId === rightSideMember[`${leftKey}`])) : null;
  const slotRR = rightSideMember ? (members.find(m => m.memberId === rightSideMember[`${rightKey}`])) : null;

  const renderMemberCard = (member, slotLabel) => {
    if (!member || !member[referKey]) {
      return (
        <div onClick={() => handleSlotClick(slotLabel.side, slotLabel.parentId, slotLabel.parentName)}
          title="Click to place member here"
          style={{ background: 'rgba(30,41,59,0.4)', border: '2px dashed #f59e0b', borderRadius: '12px', padding: '10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(30,41,59,0.4)'; }}>
          <i className="fa-solid fa-user-plus" style={{ marginBottom: '4px', fontSize: '0.8rem', color: '#f59e0b' }}></i>
          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#f59e0b' }}>Empty Slot</span>
        </div>
      );
    }
    const isSelected = selectedMember && selectedMember.memberId === member.memberId;
    return (
      <div onClick={() => setSelectedMember(member)} className="tree-node-interactive"
        style={{ background: isSelected ? 'linear-gradient(135deg,#059669 0%,#064e3b 100%)' : 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)', border: isSelected ? '2px solid #34d399' : '2px solid #10b981', borderRadius: '12px', padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px', cursor: 'pointer', transform: isSelected ? 'scale(1.05)' : 'none', transition: 'all 0.2s' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3px' }}>
          <i className="fa-solid fa-circle-user" style={{ color: '#10b981', fontSize: '0.85rem' }}></i>
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', textAlign: 'center' }}>{member.name}</span>
        <span style={{ fontSize: '0.6rem', color: '#34d399', fontFamily: 'monospace' }}>{member.memberId}</span>
      </div>
    );
  };

  const renderSlotWithChildren = (member, slotLabel, level = 3) => {
    const slot = renderMemberCard(member, slotLabel);
    if (level >= 5) return slot;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {slot}
        <div className="tree-connector-vertical" />
        <div className="tree-connector-horizontal">
          <div style={{ position: 'absolute', top: '0px', left: '60px', right: '60px', height: '2px', background: '#334155' }}></div>
        </div>
        <div style={{ display: 'flex', gap: '14px', marginTop: '0px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="tree-connector-vertical" />
            {renderSlotWithChildren(null, { side: 'left', parentId: 'Plan10-101', parentName: 'Company', name: 'L4' }, level + 1)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="tree-connector-vertical" />
            {renderSlotWithChildren(null, { side: 'right', parentId: 'Plan10-101', parentName: 'Company', name: 'L4' }, level + 1)}
          </div>
        </div>
      </div>
    );
  };

  const filteredForPlacement = useMemo(() => {
    if (!searchQuery.trim()) return unplacedMembers;
    const q = searchQuery.toLowerCase().trim();
    return unplacedMembers.filter(m => (m.name && m.name.toLowerCase().includes(q)) || (m.memberId && m.memberId.toLowerCase().includes(q)) || (m.phone && m.phone.includes(q)));
  }, [unplacedMembers, searchQuery]);

  return (
    <div>


      {notification && (
        <div style={{ padding: '12px 20px', backgroundColor: notification.type === 'success' ? '#d1fae5' : '#fef2f2', color: notification.type === 'success' ? '#065f46' : '#991b1b', borderRadius: '8px', marginBottom: '20px', fontWeight: 600 }}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i> {notification.message}
        </div>
      )}

      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Investor Binary Tree</h2>
          <p style={{ color: '#64748b' }}>Investor account tree. Click any empty slot to place an unplaced investor.</p>
        </div>
        <Link href="/admin/members" className="btn-action btn-view"><i className="fa-solid fa-users"></i> Members</Link>
      </div>

      {/* Stats Cards - all clickable */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => handleCardClick('total')}>
          <div className="metric-info">
            <h4>Total Investors</h4>
            <h3 className="metric-number">{stats.total}</h3>
            <small style={{ color: '#60a5fa' }}>I:{stats.investors} · B:{stats.buyers} · Both:{stats.both}</small>
          </div>
          <div className="metric-icon icon-blue"><i className="fa-solid fa-users"></i></div>
        </div>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => handleCardClick('withReferral')}>
          <div className="metric-info">
            <h4>In Tree (With Referral)</h4>
            <h3 className="metric-number" style={{ color: '#10b981' }}>{stats.withReferral}</h3>
            <small style={{ color: '#34d399' }}>{formatBDT(stats.referralCapital)} capital</small>
          </div>
          <div className="metric-icon icon-green"><i className="fa-solid fa-link"></i></div>
        </div>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => handleCardClick('unplaced')}>
          <div className="metric-info">
            <h4>Unplaced Investors <i className={`fa-solid ${showUnplaced ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: '0.7rem', marginLeft: '4px' }}></i></h4>
            <h3 className="metric-number" style={{ color: '#f59e0b' }}>{stats.withoutReferral}</h3>
            <small style={{ color: '#f59e0b' }}>{formatBDT(stats.unplacedCapital)} capital</small>
          </div>
          <div className="metric-icon icon-amber"><i className="fa-solid fa-user-clock"></i></div>
        </div>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => handleCardClick('payout')}>
          <div className="metric-info">
            <h4>Monthly Commitment</h4>
            <h3 className="metric-number">{formatBDT(stats.totalMonthlyPayout)}</h3>
            <small style={{ color: '#94a3b8' }}>Depth L{stats.maxDepth}</small>
          </div>
          <div className="metric-icon icon-purple"><i className="fa-solid fa-chart-line"></i></div>
        </div>
      </div>

      {/* Unplaced Members Panel */}
      {showUnplaced && (
        <div className="unplaced-members-section" style={{ marginBottom: '24px' }}>
          <div className="unplaced-members-header">
            <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem' }}>Unplaced Investors <span style={{ color: '#f59e0b', fontWeight: 800 }}>({unplacedMembers.length})</span></h4>
          </div>
          <div className="unplaced-members-body">
            {unplacedMembers.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', padding: '12px' }}>All investors are placed.</p>
            : unplacedMembers.map(m => (
              <div key={m.memberId} style={{ borderBottom: '1px solid #334155', padding: '10px 14px', cursor: 'pointer' }}
                onClick={() => setExpandedUnplaced(expandedUnplaced === m.memberId ? null : m.memberId)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.85rem' }}>{m.name}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '8px' }}>{m.memberId} | {m.phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#34d399', fontWeight: 600, fontSize: '0.8rem' }}>{formatBDT(m.capitalInvested)}</span>
                    <i className={`fa-solid ${expandedUnplaced === m.memberId ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: '#64748b', fontSize: '0.75rem' }}></i>
                  </div>
                </div>
                {expandedUnplaced === m.memberId && (
                  <div style={{ marginTop: '10px', padding: '12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', marginBottom: '12px' }}>
                      <div><strong style={{ color: '#94a3b8' }}>NID:</strong> <span style={{ color: '#fff' }}>{m.nid || 'N/A'}</span></div>
                      <div><strong style={{ color: '#94a3b8' }}>Join:</strong> <span style={{ color: '#fff' }}>{m.joinDate}</span></div>
                      <div><strong style={{ color: '#94a3b8' }}>Status:</strong> <span style={{ color: '#34d399' }}>{m.status}</span></div>
                      <div><strong style={{ color: '#94a3b8' }}>Terms:</strong> <span style={{ color: '#fff' }}>{m.termMonths || 0}mo</span></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="placement-btn-left" onClick={(e) => { e.stopPropagation(); handlePlaceMember(m.memberId, 'left', 'Plan10-101'); }} disabled={placingId === m.memberId}>
                        {placingId === m.memberId ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-arrow-left"></i> Place in Tree</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zoom Controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
        <button onClick={handleZoomOut} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', color: '#fff' }}><i className="fa-solid fa-magnifying-glass-minus"></i></button>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399', background: '#0f172a', padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155', minWidth: '46px', textAlign: 'center' }}>{Math.round(zoomScale * 100)}%</span>
        <button onClick={handleZoomIn} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', color: '#fff' }}><i className="fa-solid fa-magnifying-glass-plus"></i></button>
        <button onClick={handleResetZoom} style={{ background: '#10b981', border: 'none', borderRadius: '6px', padding: '0 12px', height: '32px', cursor: 'pointer', color: '#fff', fontWeight: 700 }}><i className="fa-solid fa-rotate-left"></i> Reset</button>
      </div>

      {/* Tree */}
      {loading ? <div className="card-table-container" style={{ padding: '40px', textAlign: 'center' }}><p>Loading...</p></div>
      : !root ? <div className="card-table-container" style={{ padding: '40px', textAlign: 'center' }}><i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '2rem', color: '#f59e0b', marginBottom: '12px' }}></i><p style={{ color: '#94a3b8' }}>Company root not found.</p></div>
      : (
        <div className="tree-page-layout">
          <div className="tree-main-content">
            <div className="tree-viewport-card">
              <div style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center', transition: 'transform 0.2s', display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="company-root-node" style={{ padding: '10px 16px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                      <i className="fa-solid fa-building" style={{ color: '#60a5fa', fontSize: '1rem' }}></i>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>Plan10bd</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#60a5fa' }}>Company Root</span>
                  </div>
                  <div className="tree-connector-vertical" />
                  <div className="tree-connector-horizontal">
                    <div style={{ position: 'absolute', top: '0px', left: '70px', right: '70px', height: '2px', background: '#475569' }}></div>
                  </div>
                  <div style={{ display: 'flex', gap: '30px', marginTop: '0px' }}>
                    <div className="tree-side-branch">
                      <div className="tree-connector-vertical" />
                      <div className="company-side-node" style={{ padding: '8px 14px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3px' }}>
                          <i className="fa-solid fa-flag" style={{ color: '#c084fc', fontSize: '0.8rem' }}></i>
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff' }}>Company</span>
                        <span style={{ fontSize: '0.62rem', color: '#c084fc' }}>(Left)</span>
                      </div>
                      <div className="tree-connector-vertical" />
                      <div className="tree-connector-horizontal">
                        <div style={{ position: 'absolute', top: '0px', left: '58px', right: '58px', height: '2px', background: '#475569' }}></div>
                      </div>
                      <div style={{ display: 'flex', gap: '14px', marginTop: '0px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div className="tree-connector-vertical" />
                          {renderSlotWithChildren(slotLL, { side: 'left', parentId: companyLeftId || 'Plan10-101', parentName: 'Company (Left)', name: 'L3' })}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div className="tree-connector-vertical" />
                          {renderSlotWithChildren(slotLR, { side: 'right', parentId: companyLeftId || 'Plan10-101', parentName: 'Company (Left)', name: 'L3' })}
                        </div>
                      </div>
                    </div>
                    <div className="tree-side-branch">
                      <div className="tree-connector-vertical" />
                      <div className="company-side-node" style={{ padding: '8px 14px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3px' }}>
                          <i className="fa-solid fa-flag" style={{ color: '#c084fc', fontSize: '0.8rem' }}></i>
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff' }}>Company</span>
                        <span style={{ fontSize: '0.62rem', color: '#c084fc' }}>(Right)</span>
                      </div>
                      <div className="tree-connector-vertical" />
                      <div className="tree-connector-horizontal">
                        <div style={{ position: 'absolute', top: '0px', left: '58px', right: '58px', height: '2px', background: '#475569' }}></div>
                      </div>
                      <div style={{ display: 'flex', gap: '14px', marginTop: '0px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div className="tree-connector-vertical" />
                          {renderSlotWithChildren(slotRL, { side: 'left', parentId: companyRightId || 'Plan10-101', parentName: 'Company (Right)', name: 'L3' })}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div className="tree-connector-vertical" />
                          {renderSlotWithChildren(slotRR, { side: 'right', parentId: companyRightId || 'Plan10-101', parentName: 'Company (Right)', name: 'L3' })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="tree-sidebar-details">
            {!selectedMember ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                <i className="fa-solid fa-circle-info" style={{ fontSize: '2.5rem', marginBottom: '16px', color: '#3b82f6' }}></i>
                <h4>Inspect Investor</h4>
                <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>Click a member or <strong style={{ color: '#f59e0b' }}>Empty Slot</strong>.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.72rem', background: '#2563eb', padding: '2px 8px', borderRadius: '10px', color: '#fff', fontWeight: 700 }}>INVESTOR NODE</span>
                  <button onClick={() => setSelectedMember(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}><i className="fa-solid fa-xmark"></i></button>
                </div>
                <h3 style={{ margin: '0 0 2px 0', fontSize: '1.25rem', color: '#fff' }}>{selectedMember.name}</h3>
                <code style={{ fontSize: '0.85rem', color: '#60a5fa' }}>{selectedMember.memberId}</code>
                <div style={{ background: '#0f172a', borderRadius: '8px', border: '1px solid #334155', padding: '12px', fontSize: '0.85rem', margin: '12px 0' }}>
                  <div><strong style={{ color: '#94a3b8' }}>Phone:</strong> <span style={{ color: '#fff' }}>{selectedMember.phone}</span></div>
                  <div><strong style={{ color: '#94a3b8' }}>Capital:</strong> <strong style={{ color: '#34d399' }}>{formatBDT(selectedMember.capitalInvested)}</strong></div>
                  <div><strong style={{ color: '#94a3b8' }}>Referral:</strong> <span style={{ color: '#60a5fa' }}>{selectedMember[referKey] || 'None'}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Placement Modal */}
      {placementSlot && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, padding: '20px' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}><i className="fa-solid fa-user-plus" style={{ color: '#f59e0b', marginRight: '8px' }}></i> Place Investor</h3>
              <button onClick={() => { setPlacementSlot(null); setSearchQuery(''); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.25rem' }}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div style={{ padding: '20px 24px', maxHeight: '420px', overflowY: 'auto' }}>
              {unplacedMembers.length === 0 ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No unplaced investors.</p>
              : (
                <>
                  <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none', fontSize: '0.85rem', marginBottom: '16px', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredForPlacement.map(m => (
                      <div key={m.memberId} onClick={() => !placingId && handlePlaceMember(m.memberId, placementSlot.side, placementSlot.parentId)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', cursor: placingId === m.memberId ? 'not-allowed' : 'pointer', opacity: placingId ? 0.6 : 1 }}
                        onMouseEnter={(e) => { if (!placingId) { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = 'rgba(16,185,129,0.05)'; } }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = '#0f172a'; }}>
                        <div><strong style={{ color: '#fff', fontSize: '0.85rem' }}>{m.name}</strong><span style={{ fontSize: '0.72rem', color: '#94a3b8' }}> {m.memberId} | {m.phone}</span></div>
                        {placingId === m.memberId ? <i className="fa-solid fa-spinner fa-spin" style={{ color: '#f59e0b' }}></i> : <i className="fa-solid fa-arrow-right" style={{ color: '#10b981' }}></i>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div style={{ padding: '12px 24px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setPlacementSlot(null); setSearchQuery(''); }} style={{ padding: '8px 20px', background: '#334155', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
