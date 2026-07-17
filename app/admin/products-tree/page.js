'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';

export default function ProductsSellingTreePage() {
  const [members, setMembers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [zoomScale, setZoomScale] = useState(1.0);

  // Fetch active members and orders from the database
  useEffect(() => {
    async function loadData() {
      try {
        const memRes = await fetch('/api/members');
        const memData = await memRes.json();
        
        const ordRes = await fetch('/api/orders');
        const ordData = await ordRes.json();

        if (memData.success) setMembers(memData.members || []);
        if (ordData.success) setOrders(ordData.orders || []);
      } catch (e) {
        console.error('Failed to load database records', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Format currency helper
  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  // Compute statistics for the Buyer Tree
  const stats = useMemo(() => {
    // Members who have buyer tree placement (buyerParent is defined)
    const buyerTreeMembers = members.filter(m => m.buyerParent !== undefined);
    const totalCount = buyerTreeMembers.length;

    // Total sales volume (sum price of PROCESSING/DELIVERED orders)
    const validOrders = orders.filter(o => o.status === 'PROCESSING' || o.status === 'DELIVERED');
    const totalVolume = validOrders.reduce((sum, o) => sum + (o.price || 0), 0);

    // Estimated commissions paid (৳500 per buyer linked to a sponsor)
    const sponsoredBuyers = buyerTreeMembers.filter(m => m.referredBy);
    const totalCommissions = sponsoredBuyers.length * 500;

    return {
      totalCount,
      totalVolume,
      totalCommissions
    };
  }, [members, orders]);

  // Recursively construct the binary tree layout
  const buildFullBinaryTree = useCallback((memberId) => {
    function traverseTree(id) {
      if (!id) return null;
      const m = members.find(x => x.memberId === id);
      if (!m) return null;

      return {
        memberId: m.memberId,
        name: m.name,
        phone: m.phone,
        joinDate: m.joinDate,
        capitalInvested: m.capitalInvested,
        left: m.buyerLeft ? traverseTree(m.buyerLeft) : null,
        right: m.buyerRight ? traverseTree(m.buyerRight) : null
      };
    }
    return traverseTree(memberId);
  }, [members]);

  // Find root node of Products Buyer Tree (buyerParent === null)
  const rootMember = useMemo(() => {
    let root = members.find(m => m.memberId === 'Plan10-101');
    if (!root) {
      root = members.find(m => m.buyerParent === null);
    }
    return root;
  }, [members]);

  const binaryRootNode = useMemo(() => {
    return rootMember ? buildFullBinaryTree(rootMember.memberId) : null;
  }, [rootMember, buildFullBinaryTree]);

  // Search filter for suggestion list
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return members.filter(m => 
      m.buyerParent !== undefined &&
      ((m.name && m.name.toLowerCase().includes(query)) ||
      (m.memberId && m.memberId.toLowerCase().includes(query)) ||
      (m.phone && m.phone.includes(query)))
    ).slice(0, 5);
  }, [members, searchQuery]);

  // Find direct upline path
  const findUplineSponsors = (memberId) => {
    const path = [];
    let current = members.find(m => m.memberId === memberId);
    const seen = new Set();

    while (current && current.buyerParent && !seen.has(current.memberId)) {
      seen.add(current.memberId);
      const sponsor = members.find(m => m.memberId === current.buyerParent);
      if (sponsor) {
        path.push(sponsor);
        current = sponsor;
      } else {
        break;
      }
    }
    return path;
  };

  const uplinePath = selectedMember ? findUplineSponsors(selectedMember.memberId) : [];

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.15, 2.0));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.15, 0.4));
  const handleResetZoom = () => setZoomScale(1.0);

  const renderBinaryTreeNode = (node, sideLabel = '') => {
    if (!node) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 10px' }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.4)',
            border: '2px dashed #475569',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '140px',
            color: '#64748b'
          }}>
            <i className="fa-solid fa-user-plus" style={{ marginBottom: '6px', fontSize: '0.9rem' }}></i>
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Open Slot</span>
            {sideLabel && <span style={{ fontSize: '0.62rem', background: '#334155', padding: '1px 6px', borderRadius: '4px', marginTop: '4px', color: '#94a3b8' }}>{sideLabel}</span>}
          </div>
        </div>
      );
    }

    const hasChildren = node.left || node.right;
    const isSelected = selectedMember && selectedMember.memberId === node.memberId;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 10px', position: 'relative' }}>
        <div 
          onClick={() => setSelectedMember(members.find(x => x.memberId === node.memberId))}
          style={{
            background: isSelected ? 'linear-gradient(135deg, #059669 0%, #064e3b 100%)' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: isSelected ? '2px solid #34d399' : '2px solid #10b981',
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '140px',
            zIndex: 2,
            position: 'relative',
            cursor: 'pointer',
            transform: isSelected ? 'scale(1.05)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
            <i className="fa-solid fa-circle-user" style={{ color: isSelected ? '#059669' : '#10b981', fontSize: '1rem' }}></i>
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
            {node.name}
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#34d399', fontFamily: 'monospace' }}>
            {node.memberId}
          </span>
          {sideLabel && (
            <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', padding: '1px 6px', borderRadius: '4px', marginTop: '4px', color: '#34d399' }}>
              {sideLabel}
            </span>
          )}
        </div>

        {hasChildren && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '0px' }}>
            <div style={{ width: '2px', height: '18px', background: '#475569' }}></div>
            <div style={{ display: 'flex', position: 'relative', justifyContent: 'center' }}>
              {/* Connector Line */}
              <div style={{
                position: 'absolute',
                top: '0px',
                left: '80px',
                right: '80px',
                height: '2px',
                background: '#475569',
                zIndex: 1
              }}></div>
              
              <div style={{ display: 'flex', gap: '20px', marginTop: '0px', position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '2px', height: '10px', background: '#475569' }}></div>
                  {renderBinaryTreeNode(node.left, 'Left')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '2px', height: '10px', background: '#475569' }}></div>
                  {renderBinaryTreeNode(node.right, 'Right')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header section */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Products Buyer Binary tree (Dynamic)</h2>
          <p style={{ color: '#64748b' }}>Visualize real products buyer auto-pooling branches, check downlines, and inspect seller orders.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/admin/members" className="btn-action btn-view">
            <i className="fa-solid fa-users"></i> Back to Members List
          </Link>
        </div>
      </div>

      {/* Network Stats Cards */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-info">
            <h4>Total Buyer Network</h4>
            <h3 className="metric-number">{stats.totalCount} Members</h3>
          </div>
          <div className="metric-icon icon-blue">
            <i className="fa-solid fa-sitemap"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Combined Sales Volume</h4>
            <h3 className="metric-number">{formatBDT(stats.totalVolume)}</h3>
          </div>
          <div className="metric-icon icon-green">
            <i className="fa-solid fa-cart-shopping"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Total Commissions Disbursed</h4>
            <h3 className="metric-number">{formatBDT(stats.totalCommissions)}</h3>
            <small style={{ color: '#60a5fa', fontWeight: 600 }}>Calculated at Flat ৳500 sponsor bonus</small>
          </div>
          <div className="metric-icon icon-purple">
            <i className="fa-solid fa-coins"></i>
          </div>
        </div>
      </div>

      {/* Search and Focus Controls */}
      <div className="search-bar-wrapper" style={{ position: 'relative', overflow: 'visible', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <span>Locate Buyer:</span>
        </div>
        <input 
          type="text" 
          placeholder="Type member ID, name, or phone..." 
          className="search-input-box" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Suggestion popover box */}
        {filteredSuggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '110px',
            width: '300px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            zIndex: 100,
            overflow: 'hidden',
            marginTop: '5px'
          }}>
            {filteredSuggestions.map(m => (
              <div 
                key={m.memberId}
                onClick={() => {
                  setSelectedMember(m);
                  setSearchQuery('');
                }}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid #334155',
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#0f172a'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <strong style={{ display: 'block', fontSize: '0.85rem' }}>{m.name}</strong>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{m.memberId} | {m.phone}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Zoom Controls */}
        <div className="zoom-controls-wrapper" style={{ marginLeft: 'auto' }}>
          <button 
            onClick={handleZoomOut} 
            title="Zoom Out (-)"
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#ffffff', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700 }}
          >
            <i className="fa-solid fa-magnifying-glass-minus"></i>
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399', alignSelf: 'center', background: '#0f172a', padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155', minWidth: '46px', textAlign: 'center' }}>
            {Math.round(zoomScale * 100)}%
          </span>
          <button 
            onClick={handleZoomIn} 
            title="Zoom In (+)"
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#ffffff', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700 }}
          >
            <i className="fa-solid fa-magnifying-glass-plus"></i>
          </button>
          <button 
            onClick={handleResetZoom} 
            title="Reset Zoom (100%)"
            style={{ background: '#10b981', border: 'none', color: '#ffffff', borderRadius: '6px', padding: '0 12px', height: '32px', cursor: 'pointer', fontWeight: 700 }}
          >
            <i className="fa-solid fa-rotate-left"></i> Reset
          </button>
        </div>
      </div>

      {/* Main visual tree view and details layout */}
      {loading ? (
        <div className="card-table-container" style={{ padding: '40px', textAlign: 'center' }}>
          <p>Loading database Products Buyer tree structures...</p>
        </div>
      ) : !binaryRootNode ? (
        <div className="card-table-container" style={{ padding: '40px', textAlign: 'center' }}>
          <p>No active Products Buyer accounts placed in the tree yet.</p>
        </div>
      ) : (
        <div className="tree-page-layout">
          {/* Main Visualizer Area */}
          <div className="tree-main-content">
            <div className="tree-viewport-card">
              {/* Scrollable scale canvas container */}
              <div style={{ 
                transform: `scale(${zoomScale})`, 
                transformOrigin: 'top center',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '100%',
                width: 'max-content',
                padding: '10px 0'
              }}>
                {renderBinaryTreeNode(binaryRootNode)}
              </div>
            </div>
          </div>

          {/* Details Sidebar panel */}
          <div className="tree-sidebar-details">
            {!selectedMember ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--admin-text-muted)' }}>
                <i className="fa-solid fa-circle-info" style={{ fontSize: '2.5rem', marginBottom: '16px', color: '#3b82f6' }}></i>
                <h4>Inspect Buyer Node</h4>
                <p style={{ fontSize: '0.85rem', marginTop: '8px', lineHeight: '1.4' }}>
                  Click on any buyer card in the visual tree layout to check sponsor details, order histories, and network stats.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.72rem', background: '#2563eb', padding: '2px 8px', borderRadius: '10px', color: '#fff', fontWeight: 700 }}>
                    BUYER NODE DETAILS
                  </span>
                  <button 
                    onClick={() => setSelectedMember(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer', fontSize: '1rem' }}
                    title="Close Panel"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', color: '#fff' }}>{selectedMember.name}</h3>
                <code style={{ fontSize: '0.85rem', color: '#60a5fa', display: 'block', marginBottom: '12px' }}>{selectedMember.memberId}</code>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#0f172a', borderRadius: '8px', border: '1px solid var(--admin-border-color)', marginBottom: '16px', fontSize: '0.85rem' }}>
                  <div><strong>Phone:</strong> {selectedMember.phone}</div>
                  <div><strong>NID:</strong> {selectedMember.nid || 'N/A'}</div>
                  <div><strong>Joining Date:</strong> {selectedMember.joinDate}</div>
                  <div><strong>Address:</strong> {selectedMember.address || 'Gazipur Center'}</div>
                </div>

                {/* Upline information */}
                <h4 style={{ fontSize: '0.9rem', color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border-color)', paddingBottom: '6px', margin: '16px 0 8px 0' }}>
                  Buyer Tree Upline Path
                </h4>
                {selectedMember.buyerParent ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px dashed rgba(59, 130, 246, 0.4)', borderRadius: '8px', padding: '10px', fontSize: '0.85rem' }}>
                      <label style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#60a5fa', fontWeight: 700, display: 'block' }}>Direct Sponsor</label>
                      <strong style={{ color: '#fff' }}>
                        {members.find(m => m.memberId === selectedMember.buyerParent)?.name || selectedMember.buyerParent}
                      </strong>
                      <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.78rem', marginLeft: '6px' }}>
                        ({selectedMember.buyerParent})
                      </span>
                    </div>

                    {uplinePath.length > 1 && (
                      <div style={{ paddingLeft: '12px', borderLeft: '2px dotted #334155', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {uplinePath.slice(1).map((up, i) => (
                          <div key={up.memberId} style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                            <i className="fa-solid fa-turn-up" style={{ transform: 'rotate(90deg)', marginRight: '6px', fontSize: '0.7rem' }}></i>
                            Gen {i + 2}: {up.name} ({up.memberId})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem', fontStyle: 'italic', padding: '6px 0' }}>
                    Joined directly at Root of Products Buyer tree.
                  </div>
                )}

                {/* Orders tracking */}
                <h4 style={{ fontSize: '0.9rem', color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border-color)', paddingBottom: '6px', margin: '20px 0 8px 0' }}>
                  Product Purchase History
                </h4>
                {orders.filter(o => o.username === selectedMember.phone || o.username === selectedMember.memberId).length === 0 ? (
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem', fontStyle: 'italic', padding: '6px 0' }}>
                    No orders recorded.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {orders.filter(o => o.username === selectedMember.phone || o.username === selectedMember.memberId).map(ord => (
                      <div key={ord.id} style={{ background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--admin-border-color)', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#fff', display: 'block' }}>{ord.productName}</strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Order #{ord.id}</span>
                        </div>
                        <span style={{ color: '#10b981', fontWeight: 800 }}>{formatBDT(ord.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
