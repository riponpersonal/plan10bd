'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProductsSellingTreePage() {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [placingId, setPlacingId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [placementSlot, setPlacementSlot] = useState(null);
  const [showUnplaced, setShowUnplaced] = useState(false);
  const [expandedUnplaced, setExpandedUnplaced] = useState(null);

  const treeType = 'buyer';
  const parentKey = 'buyerParent';
  const leftKey = 'buyerLeft';
  const rightKey = 'buyerRight';
  const referKey = 'buyerReferredBy';

  async function loadData() {
    try {
      const [memRes, ordRes] = await Promise.all([ fetch('/api/members'), fetch('/api/orders') ]);
      const memData = await memRes.json();
      const ordData = await ordRes.json();
      if (memData.success) setMembers(memData.members || []);
      if (ordData.success) setOrders(ordData.orders || []);
    } catch (e) { console.error('Failed', e); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (notification) { const t = setTimeout(() => setNotification(null), 4000); return () => clearTimeout(t); } }, [notification]);

  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  // ─── Correct Stats: only BUYER and BOTH category members ───
  const stats = useMemo(() => {
    const buyerMembers = members.filter(m => m.category === 'BUYER' || m.category === 'BOTH');
    const total = buyerMembers.length;
    const withReferral = buyerMembers.filter(m => m[referKey] && m[referKey] !== '');
    const withoutReferral = buyerMembers.filter(m => !m[referKey] || m[referKey] === '');
    const totalCapital = buyerMembers.reduce((sum, m) => sum + (m.capitalInvested || 0), 0);
    const unplacedCapital = withoutReferral.reduce((sum, m) => sum + (m.capitalInvested || 0), 0);
    const validOrders = orders.filter(o => o.status === 'PROCESSING' || o.status === 'DELIVERED');
    const totalVolume = validOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const totalOrdersCount = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

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

    return {
      total, withReferral: withReferral.length, withoutReferral: withoutReferral.length,
      totalCapital, unplacedCapital, totalVolume, totalOrdersCount, pendingOrders, maxDepth
    };
  }, [members, orders]);

  const unplacedMembers = useMemo(() => {
    const buyerMembers = members.filter(m => m.category === 'BUYER' || m.category === 'BOTH');
    return buyerMembers.filter(m => !m[referKey] || m[referKey] === '').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [members]);

  // ─── Detail card helper ───
  const handleCardClick = (card) => {
    const paths = {
      total: '/admin/members',
      inTree: '/admin/members?filter=BUYER',
      unplaced: () => setShowUnplaced(!showUnplaced),
      volume: '/admin/orders',
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
      if (data.success) { setNotification({ type: 'success', message: data.message }); setSelectedMember(null); setPlacementSlot(null); await loadData(); }
      else setNotification({ type: 'error', message: data.message });
    } catch (err) { setNotification({ type: 'error', message: 'Network error.' }); }
    finally { setPlacingId(null); }
  };

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.15, 2.0));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.15, 0.4));
  const handleResetZoom = () => setZoomScale(1.0);

  const handleSlotClick = (side, parentId, parentName) => {
    if (unplacedMembers.length === 0) { setNotification({ type: 'error', message: 'No unplaced buyers.' }); return; }
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
          title="Click to place buyer here"
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
        style={{ background: isSelected ? 'linear-gradient(135deg,#0369a1 0%,#0c4a6e 100%)' : 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)', border: isSelected ? '2px solid #38bdf8' : '2px solid #0ea5e9', borderRadius: '12px', padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px', cursor: 'pointer', transform: isSelected ? 'scale(1.05)' : 'none', transition: 'all 0.2s' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3px' }}>
          <i className="fa-solid fa-circle-user" style={{ color: '#0ea5e9', fontSize: '0.85rem' }}></i>
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', textAlign: 'center' }}>{member.name}</span>
        <span style={{ fontSize: '0.6rem', color: '#38bdf8', fontFamily: 'monospace' }}>{member.memberId}</span>
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

  // ─── Orders for sidebar ───
  const memberOrders = useMemo(() => {
    if (!selectedMember) return [];
    return orders.filter(o => o.username === selectedMember.phone || o.username === selectedMember.memberId);
  }, [selectedMember, orders]);

  return (
    <div>


      {notification && (
        <div style={{ padding: '12px 20px', backgroundColor: notification.type === 'success' ? '#d1fae5' : '#fef2f2', color: notification.type === 'success' ? '#065f46' : '#991b1b', borderRadius: '8px', marginBottom: '20px', fontWeight: 600 }}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i> {notification.message}
        </div>
      )}

      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Buyer Binary Tree</h2>
          <p style={{ color: '#64748b' }}>Buyer account tree. Click any empty slot to place an unplaced buyer.</p>
        </div>
        <Link href="/admin/members" className="btn-action btn-view"><i className="fa-solid fa-users"></i> Members</Link>
      </div>

      {/* Stats Cards - all clickable */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => handleCardClick('total')}>
          <div className="metric-info">
            <h4>Total Buyers</h4>
            <h3 className="metric-number">{stats.total}</h3>
            <small style={{ color: '#60a5fa' }}>{stats.totalOrdersCount} orders · {stats.pendingOrders} pending</small>
          </div>
          <div className="metric-icon icon-blue"><i className="fa-solid fa-users"></i></div>
        </div>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => handleCardClick('inTree')}>
          <div className="metric-info">
            <h4>In Tree (With Referral)</h4>
            <h3 className="metric-number" style={{ color: '#0ea5e9' }}>{stats.withReferral}</h3>
            <small style={{ color: '#38bdf8' }}>{formatBDT(stats.totalCapital)} capital</small>
          </div>
          <div className="metric-icon icon-green"><i className="fa-solid fa-link"></i></div>
        </div>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => handleCardClick('unplaced')}>
          <div className="metric-info">
            <h4>Unplaced Buyers <i className={`fa-solid ${showUnplaced ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: '0.7rem', marginLeft: '4px' }}></i></h4>
            <h3 className="metric-number" style={{ color: '#f59e0b' }}>{stats.withoutReferral}</h3>
            <small style={{ color: '#f59e0b' }}>{formatBDT(stats.unplacedCapital)} capital</small>
          </div>
          <div className="metric-icon icon-amber"><i className="fa-solid fa-user-clock"></i></div>
        </div>
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => handleCardClick('volume')}>
          <div className="metric-info">
            <h4>Sales Volume</h4>
            <h3 className="metric-number">{formatBDT(stats.totalVolume)}</h3>
            <small style={{ color: '#94a3b8' }}>Depth L{stats.maxDepth}</small>
          </div>
          <div className="metric-icon icon-purple"><i className="fa-solid fa-cart-shopping"></i></div>
        </div>
      </div>

      {/* Unplaced Buyers Panel */}
      {showUnplaced && (
        <div className="unplaced-members-section" style={{ marginBottom: '24px' }}>
          <div className="unplaced-members-header">
            <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem' }}>Unplaced Buyers <span style={{ color: '#f59e0b', fontWeight: 800 }}>({unplacedMembers.length})</span></h4>
          </div>
          <div className="unplaced-members-body">
            {unplacedMembers.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', padding: '12px' }}>All buyers placed.</p>
            : unplacedMembers.map(m => (
              <div key={m.memberId} style={{ borderBottom: '1px solid #334155', padding: '10px 14px', cursor: 'pointer' }}
                onClick={() => setExpandedUnplaced(expandedUnplaced === m.memberId ? null : m.memberId)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.85rem' }}>{m.name}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '8px' }}>{m.memberId} | {m.phone}</span>
                  </div>
                  <i className={`fa-solid ${expandedUnplaced === m.memberId ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: '#64748b', fontSize: '0.75rem' }}></i>
                </div>
                {expandedUnplaced === m.memberId && (
                  <div style={{ marginTop: '10px', padding: '12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', marginBottom: '12px' }}>
                      <div><strong style={{ color: '#94a3b8' }}>NID:</strong> <span style={{ color: '#fff' }}>{m.nid || 'N/A'}</span></div>
                      <div><strong style={{ color: '#94a3b8' }}>Join:</strong> <span style={{ color: '#fff' }}>{m.joinDate}</span></div>
                      <div><strong style={{ color: '#94a3b8' }}>Status:</strong> <span style={{ color: '#34d399' }}>{m.status}</span></div>
                      <div><strong style={{ color: '#94a3b8' }}>Category:</strong> <span style={{ color: '#60a5fa' }}>{m.category}</span></div>
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

      {/* Zoom */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
        <button onClick={handleZoomOut} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', color: '#fff' }}><i className="fa-solid fa-magnifying-glass-minus"></i></button>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', background: '#0f172a', padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155', minWidth: '46px', textAlign: 'center' }}>{Math.round(zoomScale * 100)}%</span>
        <button onClick={handleZoomIn} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', color: '#fff' }}><i className="fa-solid fa-magnifying-glass-plus"></i></button>
        <button onClick={handleResetZoom} style={{ background: '#0ea5e9', border: 'none', borderRadius: '6px', padding: '0 12px', height: '32px', cursor: 'pointer', color: '#fff', fontWeight: 700 }}><i className="fa-solid fa-rotate-left"></i> Reset</button>
      </div>

      {/* Tree */}
      {loading ? <div className="card-table-container" style={{ padding: '40px', textAlign: 'center' }}><p>Loading...</p></div>
      : !root ? <div className="card-table-container" style={{ padding: '40px', textAlign: 'center' }}><p style={{ color: '#94a3b8' }}>Company root not found.</p></div>
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
                <h4>Inspect Buyer</h4>
                <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>Click a member or <strong style={{ color: '#f59e0b' }}>Empty Slot</strong>.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.72rem', background: '#2563eb', padding: '2px 8px', borderRadius: '10px', color: '#fff', fontWeight: 700 }}>BUYER NODE</span>
                  <button onClick={() => setSelectedMember(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}><i className="fa-solid fa-xmark"></i></button>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>{selectedMember.name}</h3>
                <code style={{ fontSize: '0.85rem', color: '#38bdf8' }}>{selectedMember.memberId}</code>
                <div style={{ background: '#0f172a', borderRadius: '8px', border: '1px solid #334155', padding: '12px', fontSize: '0.85rem', margin: '12px 0' }}>
                  <div><strong style={{ color: '#94a3b8' }}>Phone:</strong> <span style={{ color: '#fff' }}>{selectedMember.phone}</span></div>
                  <div><strong style={{ color: '#94a3b8' }}>Referral:</strong> <span style={{ color: '#38bdf8' }}>{selectedMember[referKey] || 'None'}</span></div>
                </div>
                <h4 style={{ fontSize: '0.9rem', color: '#94a3b8', borderBottom: '1px solid #334155', paddingBottom: '6px', margin: '0 0 8px 0' }}>Orders ({memberOrders.length})</h4>
                {memberOrders.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>No orders.</p>
                : memberOrders.map(ord => (
                  <div key={ord.id} style={{ background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div><strong style={{ color: '#fff' }}>{ord.productName}</strong><span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px' }}>#{ord.id}</span></div>
                    <span style={{ color: '#10b981', fontWeight: 800 }}>{formatBDT(ord.price)}</span>
                  </div>
                ))}
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
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}><i className="fa-solid fa-user-plus" style={{ color: '#f59e0b', marginRight: '8px' }}></i> Place Buyer</h3>
              <button onClick={() => { setPlacementSlot(null); setSearchQuery(''); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.25rem' }}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div style={{ padding: '20px 24px', maxHeight: '420px', overflowY: 'auto' }}>
              {unplacedMembers.length === 0 ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No unplaced buyers.</p>
              : (
                <>
                  <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none', fontSize: '0.85rem', marginBottom: '16px', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredForPlacement.map(m => (
                      <div key={m.memberId} onClick={() => !placingId && handlePlaceMember(m.memberId, placementSlot.side, placementSlot.parentId)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', cursor: placingId === m.memberId ? 'not-allowed' : 'pointer', opacity: placingId ? 0.6 : 1 }}
                        onMouseEnter={(e) => { if (!placingId) { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.background = 'rgba(14,165,233,0.05)'; } }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = '#0f172a'; }}>
                        <div><strong style={{ color: '#fff', fontSize: '0.85rem' }}>{m.name}</strong><span style={{ fontSize: '0.72rem', color: '#94a3b8' }}> {m.memberId} | {m.phone}</span></div>
                        {placingId === m.memberId ? <i className="fa-solid fa-spinner fa-spin" style={{ color: '#f59e0b' }}></i> : <i className="fa-solid fa-arrow-right" style={{ color: '#0ea5e9' }}></i>}
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
