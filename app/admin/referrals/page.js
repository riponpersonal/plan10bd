'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';

export default function AdminReferralsTreePage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRootId, setSelectedRootId] = useState('SYSTEM'); // 'SYSTEM' or specific memberId
  const [selectedMember, setSelectedMember] = useState(null);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState(new Set());
  const [zoomScale, setZoomScale] = useState(1.0);

  // Load members on mount
  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetch('/api/members');
        const data = await res.json();
        if (data.success) {
          setMembers(data.members || []);
        }
      } catch (e) {
        console.error('Failed to load active members', e);
      } finally {
        setLoading(false);
      }
    }
    loadMembers();
  }, []);

  // Compute stats for all members recursively
  const downlineStats = useMemo(() => {
    const stats = {};
    const visited = new Set();

    const calculate = (mId) => {
      if (stats[mId]) return stats[mId];
      if (visited.has(mId)) {
        return { l1: 0, l2: 0, l3: 0, total: 0, volume: 0, depth: 0 };
      }
      visited.add(mId);

      const children = members.filter(m => m.referredBy === mId);
      const l1Count = children.length;
      let l2Count = 0;
      let l3Count = 0;
      let totalCount = l1Count;
      let networkVolume = children.reduce((sum, child) => sum + (child.capitalInvested || 0), 0);
      let maxDepth = 0;

      children.forEach(child => {
        const childStats = calculate(child.memberId);
        l2Count += childStats.l1;
        l3Count += childStats.l2;
        totalCount += childStats.total;
        networkVolume += childStats.volume;
        maxDepth = Math.max(maxDepth, childStats.depth + 1);
      });

      stats[mId] = {
        l1: l1Count,
        l2: l2Count,
        l3: l3Count,
        total: totalCount,
        volume: networkVolume,
        depth: maxDepth
      };
      
      visited.delete(mId); // Allow calculation along other pathways if needed, but tree is DAG
      return stats[mId];
    };

    members.forEach(m => {
      calculate(m.memberId);
    });

    return stats;
  }, [members]);

  // Global Network Stats
  const globalStats = useMemo(() => {
    const totalMembers = members.length;
    const totalCapital = members.reduce((sum, m) => sum + (m.capitalInvested || 0), 0);
    
    // Find deepest level in tree from any root
    let deepestLevel = 0;
    members.forEach(m => {
      if (downlineStats[m.memberId]) {
        deepestLevel = Math.max(deepestLevel, downlineStats[m.memberId].depth);
      }
    });

    // Find recruiter with most direct referrals
    let topRecruiter = { memberId: 'N/A', name: 'None', count: 0 };
    members.forEach(m => {
      const l1Count = members.filter(sub => sub.referredBy === m.memberId).length;
      if (l1Count > topRecruiter.count) {
        topRecruiter = { memberId: m.memberId, name: m.name, count: l1Count };
      }
    });

    // Calculate total referral commissions at 6% direct rate
    const totalReferralCommissions = members
      .filter(m => m.referredBy && members.some(parent => parent.memberId === m.referredBy))
      .reduce((sum, m) => sum + (m.capitalInvested * 0.06), 0);

    return {
      totalMembers,
      totalCapital,
      deepestLevel: totalMembers > 0 ? deepestLevel + 1 : 0, // include root
      topRecruiter,
      totalReferralCommissions
    };
  }, [members, downlineStats]);

  // Build Hierarchical Tree Structure
  const treeData = useMemo(() => {
    if (members.length === 0) return null;

    const visited = new Set();
    
    const buildNode = (member) => {
      if (visited.has(member.memberId)) return null;
      visited.add(member.memberId);
      
      const children = members
        .filter(m => m.referredBy === member.memberId)
        .map(buildNode)
        .filter(Boolean);
        
      return {
        memberId: member.memberId,
        name: member.name,
        phone: member.phone,
        joinDate: member.joinDate,
        capitalInvested: member.capitalInvested,
        children
      };
    };

    if (selectedRootId === 'SYSTEM') {
      const memberIds = new Set(members.map(m => m.memberId));
      const roots = members.filter(m => !m.referredBy || !memberIds.has(m.referredBy));
      
      return {
        memberId: 'SYSTEM',
        name: 'PLAN-10 BD Network',
        capitalInvested: members.reduce((sum, m) => sum + (m.capitalInvested || 0), 0),
        children: roots.map(buildNode).filter(Boolean)
      };
    } else {
      const rootMember = members.find(m => m.memberId === selectedRootId);
      if (!rootMember) return null;
      return buildNode(rootMember);
    }
  }, [members, selectedRootId]);

  // Handle zoom controls
  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.15, 2.0));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.15, 0.4));
  const handleResetZoom = () => setZoomScale(1.0);

  const treeType = 'investor';

  const buildFullBinaryTree = (memberId) => {
    if (!memberId) return null;
    const m = members.find(x => x.memberId === memberId);
    if (!m) return null;

    const leftKey = treeType === 'buyer' ? 'buyerLeft' : 'investorLeft';
    const rightKey = treeType === 'buyer' ? 'buyerRight' : 'investorRight';

    return {
      memberId: m.memberId,
      name: m.name,
      phone: m.phone,
      capitalInvested: m.capitalInvested,
      left: m[leftKey] ? buildFullBinaryTree(m[leftKey]) : null,
      right: m[rightKey] ? buildFullBinaryTree(m[rightKey]) : null
    };
  };

  const parentKey = treeType === 'buyer' ? 'buyerParent' : 'investorParent';
  let rootMember = members.find(m => m.memberId === 'Plan10-101');
  if (!rootMember) {
    rootMember = members.find(m => m[parentKey] === null);
  }
  const binaryRootNode = rootMember ? buildFullBinaryTree(rootMember.memberId) : null;

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

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 10px', position: 'relative' }}>
        <div 
          onClick={() => setSelectedMember(members.find(x => x.memberId === node.memberId))}
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '2px solid #10b981',
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '140px',
            zIndex: 2,
            position: 'relative',
            cursor: 'pointer'
          }}
        >
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
            <i className="fa-solid fa-circle-user" style={{ color: '#10b981', fontSize: '1rem' }}></i>
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

  // Toggle node expansion
  const toggleNodeCollapse = (memberId, e) => {
    e.stopPropagation();
    setCollapsedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  // Find upline sponsor path
  const findUplineSponsors = (memberId) => {
    const path = [];
    let current = members.find(m => m.memberId === memberId);
    const seen = new Set();

    while (current && current.referredBy && !seen.has(current.memberId)) {
      seen.add(current.memberId);
      const sponsor = members.find(m => m.memberId === current.referredBy);
      if (sponsor) {
        path.push(sponsor);
        current = sponsor;
      } else {
        break;
      }
    }
    return path;
  };

  // Find direct referrals for sidebar details
  const directReferralsList = useMemo(() => {
    if (!selectedMember) return [];
    return members.filter(m => m.referredBy === selectedMember.memberId);
  }, [selectedMember, members]);

  const uplinePath = useMemo(() => {
    if (!selectedMember) return [];
    return findUplineSponsors(selectedMember.memberId);
  }, [selectedMember, members]);

  // Recursive renderer for nodes
  const renderTreeNodeHierarchy = (node, level = 0) => {
    const isCollapsed = collapsedNodeIds.has(node.memberId);
    const hasChildren = node.children && node.children.length > 0;
    
    // Check search highlighting
    const isMatch = searchQuery && (
      node.memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (node.phone && node.phone.includes(searchQuery))
    );

    const isSelected = selectedMember && selectedMember.memberId === node.memberId;

    // Node level tag visual
    const theme = level === 0 
      ? { bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '#475569', iconColor: '#94a3b8', text: '#ffffff', id: '#cbd5e1', icon: 'fa-network-wired', badge: 'SYSTEM ROOT' }
      : level === 1 
      ? { bg: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', border: '#059669', iconColor: '#34d399', text: '#ffffff', id: '#6ee7b7', icon: 'fa-user-tie', badge: 'L1 DIRECT (6%)' }
      : level === 2 
      ? { bg: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', border: '#2563eb', iconColor: '#60a5fa', text: '#ffffff', id: '#93c5fd', icon: 'fa-circle-user', badge: 'L2 SPONSOR (0%)' }
      : level === 3 
      ? { bg: 'linear-gradient(135deg, #581c87 0%, #0f172a 100%)', border: '#7c3aed', iconColor: '#c084fc', text: '#ffffff', id: '#d8b4fe', icon: 'fa-circle-user', badge: 'L3 SPONSOR (0%)' }
      : { bg: 'linear-gradient(135deg, #4c1d95 0%, #090514 100%)', border: '#6d28d9', iconColor: '#a78bfa', text: '#cbd5e1', id: '#c084fc', icon: 'fa-users', badge: `L${level} NETWORK (0%)` };

    if (node.memberId === 'SYSTEM') {
      theme.bg = 'linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%)';
      theme.border = '#3b82f6';
      theme.iconColor = '#60a5fa';
    }

    return (
      <div key={node.memberId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 14px', position: 'relative' }}>
        <div 
          className={`tree-node-interactive ${isSelected ? 'tree-node-selected' : ''} ${isMatch ? 'tree-node-highlighted' : ''}`}
          onClick={() => {
            if (node.memberId !== 'SYSTEM') {
              const fullMember = members.find(m => m.memberId === node.memberId);
              if (fullMember) setSelectedMember(fullMember);
            }
          }}
          style={{
            background: theme.bg,
            border: `2px solid ${theme.border}`,
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '150px',
            zIndex: 2,
            position: 'relative',
            borderStyle: isSelected ? 'double' : 'solid'
          }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', border: `1px solid ${theme.border}` }}>
            <i className={`fa-solid ${theme.icon}`} style={{ color: theme.iconColor, fontSize: '0.9rem' }}></i>
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={node.name}>
            {node.name}
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: theme.id, fontFamily: 'monospace' }}>
            {node.memberId}
          </span>
          {node.memberId !== 'SYSTEM' && (
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#34d399', marginTop: '2px' }}>
              ৳{Math.round(node.capitalInvested).toLocaleString()}
            </span>
          )}
          <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', color: theme.iconColor }}>
            {theme.badge}
          </span>
        </div>

        {hasChildren && (
          <button 
            className="toggle-children-btn"
            onClick={(e) => toggleNodeCollapse(node.memberId, e)}
            title={isCollapsed ? "Expand branch" : "Collapse branch"}
          >
            <i className={`fa-solid ${isCollapsed ? 'fa-plus' : 'fa-minus'}`}></i>
          </button>
        )}

        {hasChildren && !isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '0px' }}>
            <div style={{ width: '2px', height: '18px', background: '#475569' }}></div>
            <div style={{ display: 'flex', position: 'relative', justifyContent: 'center' }}>
              {node.children.length > 1 && (
                <div style={{
                  position: 'absolute',
                  top: '0px',
                  left: '89px',
                  right: '89px',
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
    <div>
      {/* Header section */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Investor Referral Tree &amp; Sponsorship Network</h2>
          <p style={{ color: '#64748b' }}>Visualize downlines, sponsor connection maps, and track team volume distribution.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/admin/members" className="btn-action btn-view">
            <i className="fa-solid fa-users"></i> Back to Members List
          </Link>
        </div>
      </div>

      {/* Network Stats Counter cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-info">
            <h4>Total Active Downline Network</h4>
            <h3 className="metric-number">{globalStats.totalMembers} Members</h3>
          </div>
          <div className="metric-icon icon-blue">
            <i className="fa-solid fa-sitemap"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Combined Network Volume</h4>
            <h3 className="metric-number">{formatBDT(globalStats.totalCapital)}</h3>
          </div>
          <div className="metric-icon icon-green">
            <i className="fa-solid fa-vault"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Top Sponsor / Recruiter</h4>
            <h3 className="metric-number" style={{ fontSize: '1.25rem' }}>{globalStats.topRecruiter.name}</h3>
            <small style={{ color: '#10b981', fontWeight: 600 }}>{globalStats.topRecruiter.count} Direct Referrals ({globalStats.topRecruiter.memberId})</small>
          </div>
          <div className="metric-icon icon-amber">
            <i className="fa-solid fa-medal"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Combined Referral Commission</h4>
            <h3 className="metric-number">{formatBDT(globalStats.totalReferralCommissions)}</h3>
            <small style={{ color: '#60a5fa', fontWeight: 600 }}>Calculated at Flat 6% Sponsor Rate</small>
          </div>
          <div className="metric-icon icon-blue">
            <i className="fa-solid fa-coins"></i>
          </div>
        </div>
      </div>

      {/* Search and Focus Controls */}
      <div className="search-bar-wrapper">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <span>Locate:</span>
        </div>
        <input 
          type="text" 
          placeholder="Search by Member ID, Name, or Phone..." 
          className="search-input-box" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--admin-text-muted)', fontSize: '0.9rem', marginLeft: 'auto' }}>
          <i className="fa-solid fa-filter"></i>
          <span>Focus Root:</span>
        </div>
        <select 
          className="select-root-dropdown"
          value={selectedRootId}
          onChange={(e) => {
            setSelectedRootId(e.target.value);
            setCollapsedNodeIds(new Set()); // Reset collapses
          }}
        >
          <option value="SYSTEM">Whole Network Root</option>
          {members.map(m => (
            <option key={m.memberId} value={m.memberId}>
              {m.memberId} - {m.name}
            </option>
          ))}
        </select>

        {/* Zoom Controls */}
        <div className="zoom-controls-wrapper">
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
          <p>Loading database referral structures...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="card-table-container" style={{ padding: '40px', textAlign: 'center' }}>
          <p>No verified members found in the network store.</p>
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
                {binaryRootNode ? (
                  renderBinaryTreeNode(binaryRootNode)
                ) : (
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem', padding: '40px 0' }}>
                    No tree placement record found yet for the selected mode.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Sidebar panel */}
          <div className="tree-sidebar-details">
            {!selectedMember ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--admin-text-muted)' }}>
                <i className="fa-solid fa-circle-info" style={{ fontSize: '2.5rem', marginBottom: '16px', color: '#3b82f6' }}></i>
                <h4>Inspect Member Downline</h4>
                <p style={{ fontSize: '0.85rem', marginTop: '8px', lineHeight: '1.4' }}>
                  Click on any member card in the visual tree layout to check sponsor details, network volume and downline stats.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.72rem', background: '#2563eb', padding: '2px 8px', borderRadius: '10px', color: '#fff', fontWeight: 700 }}>
                    MEMBER PROFILE DETAILS
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
                  <div><strong>Capital Balance:</strong> <strong style={{ color: '#34d399' }}>{formatBDT(selectedMember.capitalInvested)}</strong></div>
                </div>

                {/* Upline information */}
                <h4 style={{ fontSize: '0.9rem', color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border-color)', paddingBottom: '6px', margin: '16px 0 8px 0' }}>
                  Sponsorship Upline (Sponsors)
                </h4>
                {selectedMember.referredBy ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px dashed rgba(59, 130, 246, 0.4)', borderRadius: '8px', padding: '10px', fontSize: '0.85rem' }}>
                      <label style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#60a5fa', fontWeight: 700, display: 'block' }}>Direct Sponsor</label>
                      <strong style={{ color: '#fff' }}>
                        {members.find(m => m.memberId === selectedMember.referredBy)?.name || selectedMember.referredBy}
                      </strong>
                      <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.78rem', marginLeft: '6px' }}>
                        ({selectedMember.referredBy})
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
                    Joined directly. No upline sponsor.
                  </div>
                )}

                {/* Downline statistics */}
                <h4 style={{ fontSize: '0.9rem', color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border-color)', paddingBottom: '6px', margin: '20px 0 8px 0' }}>
                  Sub-network / Downline Statistics
                </h4>
                {downlineStats[selectedMember.memberId] ? (
                  <div>
                    <div className="stats-mini-grid">
                      <div className="stat-mini-card">
                        <label>Direct (L1)</label>
                        <span>{downlineStats[selectedMember.memberId].l1} Members</span>
                      </div>
                      <div className="stat-mini-card">
                        <label>Total Network</label>
                        <span>{downlineStats[selectedMember.memberId].total} Members</span>
                      </div>
                      <div className="stat-mini-card">
                        <label>L2 / L3 Count</label>
                        <span>{downlineStats[selectedMember.memberId].l2} / {downlineStats[selectedMember.memberId].l3}</span>
                      </div>
                      <div className="stat-mini-card">
                        <label>Sub Volume</label>
                        <span style={{ color: '#34d399' }}>{formatBDT(downlineStats[selectedMember.memberId].volume)}</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '10px 12px', borderRadius: '8px', marginTop: '12px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--admin-text-muted)' }}>Earned L1 Referral Commission:</span>
                      <strong style={{ color: '#10b981' }}>{formatBDT(directReferralsList.reduce((sum, ref) => sum + (ref.capitalInvested || 0), 0) * 0.06)} BDT (6%)</strong>
                    </div>
                  </div>
                ) : (
                  <p>Calculating downline stats...</p>
                )}

                {/* Direct Referrals List */}
                <h4 style={{ fontSize: '0.9rem', color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border-color)', paddingBottom: '6px', margin: '20px 0 8px 0' }}>
                  Direct Referrals ({directReferralsList.length})
                </h4>
                {directReferralsList.length === 0 ? (
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem', fontStyle: 'italic', padding: '6px 0' }}>
                    No direct referrals yet.
                  </div>
                ) : (
                  <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                    {directReferralsList.map(ref => (
                      <div 
                        key={ref.memberId} 
                        onClick={() => setSelectedMember(ref)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.15s ease' }}
                        title="Click to view details"
                      >
                        <div>
                          <strong style={{ color: '#fff', display: 'block' }}>{ref.name}</strong>
                          <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.72rem' }}>{ref.memberId}</span>
                        </div>
                        <strong style={{ color: '#34d399' }}>{formatBDT(ref.capitalInvested)}</strong>
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
