'use client';

import React, { useState, useEffect, useContext, useRef } from 'react';
import { DashboardTabContext } from './layout';

export default function UserDashboardPage() {
  const context = useContext(DashboardTabContext);
  const activeTab = context ? context.activeTab : 'overview';
  const setActiveTab = context ? context.setActiveTab : () => {};
  const setUser = context ? context.setUser : () => {};
  const roleProfile = context ? context.roleProfile : 'INVESTOR';
  const setRoleProfile = context ? context.setRoleProfile : () => {};

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
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bKash');
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const methodDropdownRef = useRef(null);
  const [paymentNumber, setPaymentNumber] = useState('');
  const [withdrawStatusMsg, setWithdrawStatusMsg] = useState({ type: '', text: '' });
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [zoomScale, setZoomScale] = useState(1.0);

  const handleZoomIn = () => setZoomScale(prev => Math.min(Number((prev + 0.15).toFixed(2)), 2.0));
  const handleZoomOut = () => setZoomScale(prev => Math.max(Number((prev - 0.15).toFixed(2)), 0.4));
  const handleResetZoom = () => setZoomScale(1.0);

  // Close custom method dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (methodDropdownRef.current && !methodDropdownRef.current.contains(e.target)) {
        setShowMethodDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedTrackingOrderId, setSelectedTrackingOrderId] = useState(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        let username = 'Plan10-101';
        const saved = localStorage.getItem('plan10_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          username = parsed.username || parsed.phone || 'Plan10-101';
        }
        const res = await fetch(`/api/orders?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (data.success && data.orders) {
          setOrders(data.orders);
          if (data.orders.length > 0 && !selectedTrackingOrderId) {
            setSelectedTrackingOrderId(data.orders[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch orders in dashboard:', err);
      } finally {
        setOrdersLoading(false);
      }
    }
    fetchOrders();
  }, [activeTab]);

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
          if (result.data && result.data.roleProfile) {
            setRoleProfile(result.data.roleProfile);
          }
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
  }, [refreshTrigger]);

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

  const { member, schedule, referrals } = dashData;
  const stats = {
    capitalInvested: dashData.stats?.capitalInvested || 0,
    termMonths: dashData.stats?.termMonths || 0,
    monthlyProfit: dashData.stats?.monthlyProfit || 0,
    monthlyCapitalRefund: dashData.stats?.monthlyCapitalRefund || 0,
    monthlyTotalPayout: dashData.stats?.monthlyTotalPayout || 0,
    totalPaidSoFar: dashData.stats?.totalPaidSoFar || 0,
    payoutsCompletedCount: dashData.stats?.payoutsCompletedCount || 0,
    remainingMonths: dashData.stats?.remainingMonths || 0,
    maturityTotalReturn: dashData.stats?.maturityTotalReturn || 0
  };

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



  const renderOrderTracking = () => {
    if (!selectedTrackingOrderId) return null;
    const ord = orders.find(o => o.id === selectedTrackingOrderId);
    if (!ord) return null;

    let step = 1; // 1 = Placed, 2 = Verification, 3 = Dispatch, 4 = Delivered
    if (ord.status === 'PROCESSING') step = 3;
    else if (ord.status === 'DELIVERED') step = 4;
    else if (ord.status === 'REJECTED') step = 2;

    const steps = [
      { label: 'Order Placed', desc: 'Order received by desk', icon: 'fa-file-invoice-dollar' },
      { label: 'Verification', desc: ord.status === 'REJECTED' ? 'Declined by Admin' : 'Review & Approval', icon: 'fa-shield-halved' },
      { label: 'Dispatch & Shipping', desc: 'Package transit', icon: 'fa-truck-fast' },
      { label: 'Delivered', desc: 'Handed to client', icon: 'fa-circle-check' }
    ];

    let lineWidth = '0%';
    if (ord.status === 'PENDING') lineWidth = '33%';
    else if (ord.status === 'REJECTED') lineWidth = '33%';
    else if (ord.status === 'PROCESSING') lineWidth = '66%';
    else if (ord.status === 'DELIVERED') lineWidth = '100%';

    const activeLineStyle = {
      width: lineWidth,
      background: ord.status === 'REJECTED' ? '#ef4444' : 'linear-gradient(90deg, #10b981, #2563eb)'
    };

    return (
      <div className="content-section-card tracking-card">
        <div className="tracking-header">
          <div>
            <span className="tracking-order-badge">
              Tracking Order: {ord.id}
            </span>
            <h3 style={{ margin: '8px 0 0 0', color: '#ffffff' }}>
              <i className="fa-solid fa-map-location-dot text-primary" style={{ marginRight: '8px' }}></i> Shipment Progress Tracker
            </h3>
          </div>
          <div className="tracking-est-box">
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Est. Delivery:</span>
            <div style={{ fontWeight: 700, color: '#10b981' }}>Within 3-5 Working Days</div>
          </div>
        </div>

        {/* Visual Stepper */}
        <div className="stepper-wrapper">
          {/* Progress background line contains active line so overflow:hidden clips correctly */}
          <div className="stepper-bg-line">
            <div className="stepper-active-line" style={activeLineStyle}></div>
          </div>

          <div className="stepper-steps">
            {steps.map((s, idx) => {
              const currentIdx = idx + 1;
              let isCompleted = currentIdx < step;
              let isActive = currentIdx === step && ord.status !== 'REJECTED';
              let isFailed = currentIdx === 2 && ord.status === 'REJECTED';
              
              if (ord.status === 'DELIVERED') {
                isCompleted = true;
                isActive = false;
              }

              let statusClass = 'upcoming';
              if (isCompleted) statusClass = 'completed';
              else if (isFailed) statusClass = 'failed';
              else if (isActive) statusClass = 'active';

              return (
                <div key={idx} className={`step-item ${statusClass}`}>
                  <div className="step-circle">
                    {isCompleted ? (
                      <i className="fa-solid fa-check"></i>
                    ) : isFailed ? (
                      <i className="fa-solid fa-xmark"></i>
                    ) : (
                      <i className={`fa-solid ${s.icon}`}></i>
                    )}
                  </div>
                  <span className="step-label">
                    {s.label}
                  </span>
                  <span className="step-desc">
                    {s.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Courier & Destination details */}
        <div className="tracking-details-grid">
          <div>
            <div className="detail-label"><i className="fa-solid fa-truck-ramp-box" style={{ marginRight: '6px' }}></i> Logistics Carrier</div>
            <strong style={{ color: '#f8fafc' }}>PLAN-10 Express Delivery desk</strong>
          </div>
          <div>
            <div className="detail-label"><i className="fa-solid fa-box" style={{ marginRight: '6px' }}></i> Product Quantity</div>
            <strong style={{ color: '#f8fafc' }}>1 Unit ({ord.productName})</strong>
          </div>
          <div>
            <div className="detail-label"><i className="fa-solid fa-location-dot" style={{ marginRight: '6px' }}></i> Ship-To Address</div>
            <strong style={{ color: '#f8fafc' }}>{member.address || 'Member Residence / Gazipur Center'}</strong>
          </div>
          <div>
            <div className="detail-label"><i className="fa-solid fa-receipt" style={{ marginRight: '6px' }}></i> Payment Method</div>
            <strong style={{ color: '#10b981' }}>Cash on Delivery (COD)</strong>
          </div>
        </div>
      </div>
    );
  };

  const handleRequestWithdraw = async (e) => {
    e.preventDefault();
    const amountVal = Number(withdrawAmount);
    if (!withdrawAmount || isNaN(amountVal)) {
      setWithdrawStatusMsg({ type: 'error', text: 'Please enter a valid withdrawal amount.' });
      return;
    }
    if (amountVal < 1000 || amountVal > 25000) {
      setWithdrawStatusMsg({ type: 'error', text: 'Withdrawal amount must be between ৳1,000 and ৳25,000 BDT.' });
      return;
    }
    if (!paymentNumber.trim()) {
      setWithdrawStatusMsg({ type: 'error', text: 'Please enter your payment account number.' });
      return;
    }
    setSubmittingWithdraw(true);
    setWithdrawStatusMsg({ type: '', text: '' });
    try {
      const username = dashData.member?.memberId || dashData.member?.phone;
      const res = await fetch('/api/user/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          amount: amountVal,
          method: withdrawMethod,
          paymentNumber: paymentNumber.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setWithdrawStatusMsg({ type: 'success', text: `Withdrawal request for ৳${withdrawAmount} BDT submitted successfully!` });
        setWithdrawAmount('');
        setPaymentNumber('');
        setRefreshTrigger(prev => prev + 1);
      } else {
        setWithdrawStatusMsg({ type: 'error', text: data.message || 'Failed to submit withdrawal request.' });
      }
    } catch (err) {
      console.error(err);
      setWithdrawStatusMsg({ type: 'error', text: 'Network error submitting withdrawal request.' });
    } finally {
      setSubmittingWithdraw(false);
      setTimeout(() => setWithdrawStatusMsg({ type: '', text: '' }), 5000);
    }
  };

  const renderBinaryTreeNode = (node, sideLabel = '') => {
    if (!node) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 10px' }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '2px dashed #475569',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '130px',
            color: '#64748b'
          }}>
            <i className="fa-solid fa-user-plus" style={{ marginBottom: '6px', fontSize: '1rem' }}></i>
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Open Slot</span>
            {sideLabel && <span style={{ fontSize: '0.62rem', background: '#334155', padding: '1px 6px', borderRadius: '4px', marginTop: '4px', color: '#94a3b8' }}>{sideLabel}</span>}
          </div>
        </div>
      );
    }

    const hasChildren = node.left || node.right;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 10px', position: 'relative' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '2px solid #10b981',
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
                left: '75px',
                right: '75px',
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
      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          {/* --- INVESTOR VIEW --- */}
          {(roleProfile === 'INVESTOR' || roleProfile === 'DUAL') && (
            <>
              {roleProfile === 'DUAL' && (
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-chart-pie"></i> SPL Investment Portfolio
                </div>
              )}
              
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

              {/* Recent Payout Summary */}
              <div className="content-section-card" style={{ marginBottom: roleProfile === 'DUAL' ? '40px' : '0' }}>
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

          {/* --- BUYER VIEW --- */}
          {(roleProfile === 'BUYER' || roleProfile === 'DUAL') && (
            <>
              {roleProfile === 'DUAL' && (
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6', marginBottom: '16px', marginTop: '30px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #334155', paddingTop: '30px' }}>
                  <i className="fa-solid fa-cart-shopping"></i> Consumer Products Purchasing
                </div>
              )}

              <div className="welcome-hero-card" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)' }}>
                <span className="hero-tag" style={{ background: '#2563eb' }}>Active Product Buyer Account</span>
                <h2>Welcome Back, {member.name}!</h2>
                <p>Explore your purchased consumer goods, track package shipments in real-time, and check your network referral tree details.</p>
                
                <div className="hero-quick-stats">
                  <div className="quick-stat-box">
                    <label>Member Account ID</label>
                    <span>{member.memberId}</span>
                  </div>
                  <div className="quick-stat-box">
                    <label>Total Items Ordered</label>
                    <span>{orders.length} Products</span>
                  </div>
                  <div className="quick-stat-box">
                    <label>Pending Deliveries</label>
                    <span>{orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'REJECTED').length} Items</span>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon-box green">
                    <i className="fa-solid fa-cart-flatbed"></i>
                  </div>
                  <div className="metric-info">
                    <label>Total Products Ordered</label>
                    <h3>{orders.length} Items</h3>
                    <small><i className="fa-solid fa-circle-check"></i> Quality Guaranteed</small>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-box blue">
                    <i className="fa-solid fa-truck-ramp-box"></i>
                  </div>
                  <div className="metric-info">
                    <label>Active Shipments</label>
                    <h3>{orders.filter(o => o.status === 'PROCESSING').length} Items</h3>
                    <small>Currently in transit</small>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-box purple">
                    <i className="fa-solid fa-circle-check"></i>
                  </div>
                  <div className="metric-info">
                    <label>Completed Deliveries</label>
                    <h3>{orders.filter(o => o.status === 'DELIVERED').length} Items</h3>
                    <small>Successfully received</small>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-box amber">
                    <i className="fa-solid fa-wallet"></i>
                  </div>
                  <div className="metric-info">
                    <label>Referral Account Balance</label>
                    <h3>৳ {(dashData.wallet?.balance || 0).toLocaleString()}</h3>
                    <small>Received from invitations</small>
                  </div>
                </div>
              </div>

              {/* Order Tracking & Shipment Stepper */}
              {orders.length > 0 && selectedTrackingOrderId && renderOrderTracking()}

              {/* Orders History Section */}
              <div className="content-section-card">
                <div className="section-card-header" style={{ marginBottom: '20px' }}>
                  <div>
                    <h3><i className="fa-solid fa-cart-flatbed"></i> My Product Orders</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      Track your product purchases and delivery processing status. Click any order row to track shipping status.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('orders')}
                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }}
                  >
                    View All Orders &rarr;
                  </button>
                </div>

                {ordersLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.8rem', marginBottom: '8px' }}></i>
                    <p style={{ margin: 0 }}>Loading orders...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                    <i className="fa-solid fa-cart-shopping" style={{ fontSize: '2.5rem', color: '#475569', marginBottom: '12px', display: 'block' }}></i>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9' }}>No orders found</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem' }}>Go to the homepage product gallery to place your order.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="payout-schedule-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Date</th>
                          <th>Product Name</th>
                          <th>Price</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map((ord) => {
                          let badgeBg = '#d97706';
                          let statusText = 'Pending';
                          if (ord.status === 'PROCESSING') {
                            badgeBg = '#2563eb';
                            statusText = 'Processing';
                          } else if (ord.status === 'DELIVERED') {
                            badgeBg = '#059669';
                            statusText = 'Delivered';
                          } else if (ord.status === 'REJECTED') {
                            badgeBg = '#ef4444';
                            statusText = 'Rejected';
                          }

                          const isSelected = ord.id === selectedTrackingOrderId;

                          return (
                            <tr 
                              key={ord.id} 
                              onClick={() => setSelectedTrackingOrderId(ord.id)}
                              style={{
                                cursor: 'pointer',
                                backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                                borderLeft: isSelected ? '4px solid #2563eb' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8' }}>
                                {isSelected && <i className="fa-solid fa-chevron-right text-primary" style={{ marginRight: '6px', fontSize: '0.75rem' }}></i>}
                                {ord.id}
                              </td>
                              <td>{ord.orderedAt ? new Date(ord.orderedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                              <td style={{ fontWeight: 600 }}>{ord.productName}</td>
                              <td style={{ fontWeight: 800, color: '#10b981' }}>৳{Math.round(ord.price).toLocaleString()}</td>
                              <td>
                                <span 
                                  style={{
                                    display: 'inline-block',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    backgroundColor: badgeBg,
                                    color: '#ffffff',
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  {statusText}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
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

          {/* Interactive Visual Referral Tree (Investor Binary Tree) */}
          <div className="content-section-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-sitemap text-primary"></i> My Investor Binary Tree Network
            </h3>
            <div style={{ 
              overflowX: 'auto', 
              padding: '30px 15px', 
              background: '#030712', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              borderRadius: '12px'
            }}>
              {dashData?.investorBinaryTree ? (
                renderBinaryTreeNode(dashData.investorBinaryTree)
              ) : (
                <div style={{ color: '#64748b', fontSize: '0.9rem', padding: '20px 0' }}>
                  No Investor tree placement record found yet.
                </div>
              )}
            </div>
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

      {/* TAB 5: ORDERS */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Visual Tracking Timeline Stepper */}
          {renderOrderTracking()}

          {/* Orders History Section */}
          <div className="content-section-card">
            <div className="section-card-header" style={{ marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0 }}><i className="fa-solid fa-cart-flatbed"></i> My Product Orders</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Track your product purchases and delivery processing status.
                </p>
              </div>
            </div>

            {ordersLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.8rem', marginBottom: '8px' }}></i>
                <p style={{ margin: 0 }}>Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                <i className="fa-solid fa-cart-shopping" style={{ fontSize: '2.5rem', color: '#475569', marginBottom: '12px', display: 'block' }}></i>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9' }}>No orders found</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem' }}>Go to the homepage product gallery to place your order.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="payout-schedule-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Product Name</th>
                      <th>Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((ord) => {
                      let badgeBg = '#d97706';
                      let statusText = 'Pending';
                      if (ord.status === 'PROCESSING') {
                        badgeBg = '#2563eb';
                        statusText = 'Processing';
                      } else if (ord.status === 'DELIVERED') {
                        badgeBg = '#059669';
                        statusText = 'Delivered';
                      } else if (ord.status === 'REJECTED') {
                        badgeBg = '#ef4444';
                        statusText = 'Rejected';
                      }

                      const isSelected = ord.id === selectedTrackingOrderId;

                      return (
                        <tr 
                          key={ord.id} 
                          onClick={() => setSelectedTrackingOrderId(ord.id)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                            borderLeft: isSelected ? '4px solid #2563eb' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8' }}>
                            {isSelected && <i className="fa-solid fa-chevron-right text-primary" style={{ marginRight: '6px', fontSize: '0.75rem' }}></i>}
                            {ord.id}
                          </td>
                          <td>{ord.orderedAt ? new Date(ord.orderedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                          <td style={{ fontWeight: 600 }}>{ord.productName}</td>
                          <td style={{ fontWeight: 800, color: '#10b981' }}>৳{Math.round(ord.price).toLocaleString()}</td>
                          <td>
                            <span 
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: badgeBg,
                                color: '#ffffff',
                                textTransform: 'uppercase'
                              }}
                            >
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PRODUCTS BUYER TREE */}
      {activeTab === 'buyerTree' && (
        <div className="content-section-card">
          <div className="section-card-header" style={{ marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0 }}><i className="fa-solid fa-sitemap text-success"></i> My Products Buyer Tree Network</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Your auto-pooling position and binary downline network in the Products Buyer tree.
              </p>
            </div>
          </div>
          
          {/* Scrollable Binary Tree Container */}
          <div style={{ 
            overflowX: 'auto', 
            padding: '30px 15px', 
            background: '#030712', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: '12px'
          }}>
            {dashData?.buyerBinaryTree ? (
              renderBinaryTreeNode(dashData.buyerBinaryTree)
            ) : (
              <div style={{ color: '#64748b', fontSize: '0.9rem', padding: '20px 0' }}>
                No Products Buyer placement record found yet. Purchase products to get automatically placed in the tree.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: WALLET & TRANSACTION HISTORY */}
      {activeTab === 'wallet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Wallet Balance Card */}
          <div className="content-section-card wallet-balance-card">
            <div className="wallet-balance-inner">
              <div>
                <span className="wallet-balance-title">Available Wallet Balance</span>
                <h2 className="wallet-balance-amount">৳ {Math.round(dashData?.wallet?.balance || 0).toLocaleString()} BDT</h2>
              </div>
              <div className="wallet-balance-icon-box">
                <i className="fa-solid fa-wallet" style={{ margin: 'auto' }}></i>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="wallet-grid-mobile">
            {/* Request Withdrawal Form */}
            <div className="content-section-card">
              <h3 style={{ margin: '0 0 16px 0' }}><i className="fa-solid fa-money-bill-transfer"></i> Request Withdrawal</h3>
              <form onSubmit={handleRequestWithdraw}>
                <div className="form-group mb-3">
                  <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Amount (৳ BDT) *</span>
                    <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>Limit: ৳1,000 - ৳25,000</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min="1000"
                    max="25000"
                    placeholder="Enter amount to withdraw"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                </div>
                <div className="form-group mb-3">
                  <label>Payment Method *</label>
                  {/* Custom dropdown — fully constrained, no viewport overflow */}
                  <div className="custom-select-wrapper" ref={methodDropdownRef}>
                    <button
                      type="button"
                      className="custom-select-btn"
                      onClick={() => setShowMethodDropdown(prev => !prev)}
                      aria-haspopup="listbox"
                      aria-expanded={showMethodDropdown}
                    >
                      <span>
                        {withdrawMethod === 'bKash' && 'bKash (Mobile Wallet)'}
                        {withdrawMethod === 'Nagad' && 'Nagad (Mobile Wallet)'}
                        {withdrawMethod === 'Rocket' && 'Rocket (Mobile Wallet)'}
                        {withdrawMethod === 'Bank Transfer' && 'Bank Wire Transfer'}
                      </span>
                      <i className={`fa-solid fa-chevron-${showMethodDropdown ? 'up' : 'down'}`} style={{ fontSize: '0.75rem', color: '#94a3b8' }}></i>
                    </button>
                    {showMethodDropdown && (
                      <ul className="custom-select-list" role="listbox">
                        {[
                          { value: 'bKash',         label: 'bKash (Mobile Wallet)',  icon: '📱' },
                          { value: 'Nagad',         label: 'Nagad (Mobile Wallet)',  icon: '📱' },
                          { value: 'Rocket',        label: 'Rocket (Mobile Wallet)', icon: '📱' },
                          { value: 'Bank Transfer', label: 'Bank Wire Transfer',      icon: '🏦' },
                        ].map(opt => (
                          <li
                            key={opt.value}
                            role="option"
                            aria-selected={withdrawMethod === opt.value}
                            className={`custom-select-option${withdrawMethod === opt.value ? ' selected' : ''}`}
                            onClick={() => { setWithdrawMethod(opt.value); setShowMethodDropdown(false); }}
                          >
                            <span>{opt.icon}</span>
                            <span>{opt.label}</span>
                            {withdrawMethod === opt.value && <i className="fa-solid fa-check" style={{ marginLeft: 'auto', color: '#10b981', fontSize: '0.8rem' }}></i>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="form-group mb-3">
                  <label>Payment Account Number / Details *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="Enter account/wallet number or details"
                    value={paymentNumber}
                    onChange={(e) => setPaymentNumber(e.target.value)}
                  />
                </div>

                {withdrawStatusMsg.text && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    backgroundColor: withdrawStatusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: withdrawStatusMsg.type === 'success' ? '#34d399' : '#ef4444',
                    border: `1px solid ${withdrawStatusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                  }}>
                    {withdrawStatusMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingWithdraw}
                  className="btn btn-primary w-100"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', fontWeight: 700 }}
                >
                  {submittingWithdraw ? 'Processing...' : 'Submit Withdrawal Request'}
                </button>
              </form>
            </div>

            {/* Withdrawal Status History */}
            <div className="content-section-card">
              <h3 style={{ margin: '0 0 16px 0' }}><i className="fa-solid fa-clock-rotate-left"></i> Withdrawal Requests</h3>
              {!dashData?.withdrawals || dashData.withdrawals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>No withdrawal requests found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
                  {dashData.withdrawals.map((req) => (
                    <div key={req.id} className="withdraw-request-item">
                      <div>
                        <strong style={{ display: 'block', color: '#f1f5f9' }}>৳ {req.amount} BDT</strong>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          via {req.method} ({req.paymentNumber || 'N/A'}) | {new Date(req.requestedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={`status-badge ${req.status.toLowerCase()}`}>{req.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Wallet Transaction History */}
          <div className="content-section-card">
            <h3 style={{ margin: '0 0 16px 0' }}><i className="fa-solid fa-list-check"></i> Transaction History</h3>
            {!dashData?.wallet?.transactions || dashData.wallet.transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '45px 0', color: '#64748b' }}>No transactions recorded yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="payout-schedule-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashData.wallet.transactions.map((txn) => (
                      <tr key={txn.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8' }}>{txn.id}</td>
                        <td>{new Date(txn.date).toLocaleDateString()}</td>
                        <td>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: txn.type === 'WITHDRAW' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: txn.type === 'WITHDRAW' ? '#f87171' : '#34d399'
                          }}>
                            {txn.type}
                          </span>
                        </td>
                        <td>{txn.description}</td>
                        <td style={{ fontWeight: 800, color: txn.amount > 0 ? '#10b981' : '#ef4444' }}>
                          {txn.amount > 0 ? '+' : ''}৳ {Math.round(txn.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: NOTIFICATIONS & MESSAGES */}
      {activeTab === 'notifications' && (
        <div className="content-section-card">
          <h3 style={{ margin: '0 0 20px 0' }}><i className="fa-solid fa-envelope-open-text text-primary"></i> Notifications &amp; Message Center</h3>
          {!dashData?.notifications || dashData.notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <i className="fa-regular fa-bell-slash" style={{ fontSize: '3rem', color: '#334155', marginBottom: '16px', display: 'block' }}></i>
              <h4>All Clean! No new alerts.</h4>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>We will notify you here about your order status, tree changes, and wallet payouts.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {dashData.notifications.map((notif) => {
                let notifIcon = 'fa-info-circle text-primary';
                let notifBg = 'rgba(37, 99, 235, 0.05)';
                let notifBorder = 'rgba(37, 99, 235, 0.15)';

                if (notif.type === 'WALLET') {
                  notifIcon = 'fa-wallet text-success';
                  notifBg = 'rgba(16, 185, 129, 0.05)';
                  notifBorder = 'rgba(16, 185, 129, 0.15)';
                } else if (notif.type === 'ORDER') {
                  notifIcon = 'fa-cart-shopping text-warning';
                  notifBg = 'rgba(217, 119, 6, 0.05)';
                  notifBorder = 'rgba(217, 119, 6, 0.15)';
                } else if (notif.type === 'INVESTMENT') {
                  notifIcon = 'fa-money-bill-trend-up text-info';
                  notifBg = 'rgba(6, 182, 212, 0.05)';
                  notifBorder = 'rgba(6, 182, 212, 0.15)';
                }

                return (
                  <div key={notif.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 20px',
                    background: notifBg,
                    border: `1px solid ${notifBorder}`,
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className={`fa-solid ${notifIcon}`} style={{ fontSize: '1.2rem' }}></i>
                    </div>
                    <div style={{ flexGrow: 1 }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '0.92rem', color: '#f1f5f9', fontWeight: 600 }}>{notif.message}</p>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(notif.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
