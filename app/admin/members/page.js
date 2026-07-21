'use client';

import React, { useState, useEffect } from 'react';

export default function AdminMembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'INVESTOR', 'BUYER', 'BOTH'
  const [searchTerm, setSearchTerm] = useState('');

  // Create Member Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCategory, setCreateCategory] = useState('INVESTOR'); // 'INVESTOR', 'BUYER', or 'BOTH'
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createNid, setCreateNid] = useState('');
  const [createCapital, setCreateCapital] = useState('');
  const [createTermMonths, setCreateTermMonths] = useState('33');
  const [createSponsor, setCreateSponsor] = useState('');
  const [createFatherName, setCreateFatherName] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [createNominee, setCreateNominee] = useState('');
  const [createRelation, setCreateRelation] = useState('');

  // Password Change Modal States
  const [showPassModal, setShowPassModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI State for Submission
  const [submitting, setSubmitting] = useState(false);

  async function loadMembers() {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      if (data.success) setMembers(data.members);
    } catch (e) {
      console.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const filterParam = params.get('filter');
        if (filterParam === 'BUYER' || filterParam === 'INVESTOR' || filterParam === 'BOTH') {
          setFilter(filterParam);
        }
      }
      loadMembers();
    }, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenCreateModal = () => {
    setCreateCategory('INVESTOR');
    setCreateName('');
    setCreatePhone('');
    setCreatePassword('');
    setCreateNid('');
    setCreateCapital('');
    setCreateTermMonths('33');
    setCreateSponsor('');
    setCreateFatherName('');
    setCreateAddress('');
    setCreateNominee('');
    setCreateRelation('');
    setShowCreateModal(true);
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    if (!createName.trim() || !createPhone.trim() || !createPassword.trim()) {
      alert('Name, phone, and password are required.');
      return;
    }
    
    setSubmitting(true);
    const payload = {
      category: createCategory,
      name: createName,
      phone: createPhone,
      password: createPassword,
      nid: createNid,
      capitalInvested: (createCategory === 'INVESTOR' || createCategory === 'BOTH') ? Number(createCapital) || 0 : 0,
      termMonths: (createCategory === 'INVESTOR' || createCategory === 'BOTH') ? Number(createTermMonths) || 0 : 0,
      referredBy: createSponsor,
      fatherName: createFatherName,
      address: createAddress,
      nomineeName: createNominee,
      relation: createRelation
    };

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setMessage('Member account created successfully!');
        setTimeout(() => setMessage(''), 5000);
        loadMembers();
      } else {
        alert(data.message || 'Failed to create member account.');
      }
    } catch (err) {
      alert('Error creating member account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPassModal = (member) => {
    setSelectedMember(member);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassModal(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      alert('Password cannot be empty.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedMember.memberId,
          newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowPassModal(false);
        setMessage(`Password for ${selectedMember.name} updated successfully!`);
        setTimeout(() => setMessage(''), 5000);
      } else {
        alert(data.message || 'Failed to update password.');
      }
    } catch (err) {
      alert('Error updating password.');
    } finally {
      setSubmitting(false);
    }
  };

  async function handleDelete(memberId) {
    if (!confirm(`Are you sure you want to permanently delete member profile ${memberId}?`)) return;
    try {
      const res = await fetch(`/api/members?memberId=${memberId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Member ${memberId} deleted permanently.`);
        loadMembers();
        setTimeout(() => setMessage(''), 3000);
      } else {
        alert(data.message || 'Failed to delete member.');
      }
    } catch (err) {
      console.error('Error deleting member');
    }
  }

  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  // Count occurrences of each phone number to identify multiple accounts
  const phoneCounts = {};
  members.forEach((m) => {
    if (m.phone) {
      const p = m.phone.trim();
      phoneCounts[p] = (phoneCounts[p] || 0) + 1;
    }
  });

  const filteredMembers = members.filter((m) => {
    // 1. Category filter
    let matchCategory = true;
    if (filter === 'INVESTOR') matchCategory = m.category === 'INVESTOR' || m.category === 'BOTH';
    else if (filter === 'BUYER') matchCategory = m.category === 'BUYER' || m.category === 'BOTH';
    else if (filter === 'BOTH') matchCategory = m.category === 'BOTH';

    if (!matchCategory) return false;

    // 2. Search term filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const nameMatch = (m.name || '').toLowerCase().includes(term);
      const phoneMatch = (m.phone || '').toLowerCase().includes(term);
      const idMatch = (m.memberId || '').toLowerCase().includes(term);
      const publicIdMatch = (m.publicId || '').toLowerCase().includes(term);
      return nameMatch || phoneMatch || idMatch || publicIdMatch;
    }

    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2>Active Member & Investor Directory</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Verified members with active halal capital return accounts or buyer statuses.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }}></i>
            <input
              type="text"
              placeholder="Search name, phone, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: 0
                }}
              >
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            )}
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="btn-action btn-approve"
            style={{
              background: '#10b981',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fa-solid fa-user-plus"></i> Create Account
          </button>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All Members' },
            { key: 'INVESTOR', label: 'Investors' },
            { key: 'BUYER', label: 'Buyers' },
            { key: 'BOTH', label: 'Investor & Buyer' }
          ].map((item) => (
            <button
              key={item.key}
              className={`btn-action ${filter === item.key ? 'btn-view' : ''}`}
              style={{
                background: filter === item.key ? '#2563eb' : '#1e293b',
                color: filter === item.key ? '#fff' : '#94a3b8',
                border: '1px solid #334155',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>

      {message && (
        <div style={{ padding: '12px 20px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '8px', marginBottom: '20px', fontWeight: 600 }}>
          <i className="fa-solid fa-circle-check"></i> {message}
        </div>
      )}

      <div className="card-table-container">
        {loading ? (
          <p style={{ padding: '24px' }}>Loading active members...</p>
        ) : filteredMembers.length === 0 ? (
          <p style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No members found matching the selected category.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member Profile ID</th>
                <th>Member Name & Phone</th>
                <th>Capital Balance</th>
                <th>Monthly Profit (3%)</th>
                <th>Monthly Refund</th>
                <th>Total Monthly Payout</th>
                <th>Joining Date</th>
                <th>Account Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr key={m.memberId}>
                  <td>
                    <strong style={{ color: '#2563eb' }}>{m.memberId}</strong>
                    {m.publicId && (
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '2px', opacity: 0.85 }}>
                        Public ID: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}>{m.publicId}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>{m.name}</strong>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          backgroundColor:
                            m.category === 'INVESTOR'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : m.category === 'BUYER'
                              ? 'rgba(59, 130, 246, 0.15)'
                              : 'rgba(139, 92, 246, 0.15)',
                          color:
                            m.category === 'INVESTOR'
                              ? '#34d399'
                              : m.category === 'BUYER'
                              ? '#60a5fa'
                              : '#a78bfa',
                          border:
                            m.category === 'INVESTOR'
                              ? '1px solid rgba(16, 185, 129, 0.3)'
                              : m.category === 'BUYER'
                              ? '1px solid rgba(59, 130, 246, 0.3)'
                              : '1px solid rgba(139, 92, 246, 0.3)'
                        }}
                      >
                        {m.category === 'BOTH' ? 'Both' : m.category.toLowerCase()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <small style={{ color: '#64748b' }}>{m.phone}</small>
                      {phoneCounts[m.phone?.trim()] > 1 && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm(m.phone?.trim())}
                          style={{
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            transition: 'all 0.2s',
                          }}
                          title={`This phone number is shared by ${phoneCounts[m.phone?.trim()]} active accounts. Click to show all sibling accounts.`}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)';
                            e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(245, 158, 11, 0.12)';
                            e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.25)';
                          }}
                        >
                          <i className="fa-solid fa-circle-exclamation"></i>
                          {phoneCounts[m.phone?.trim()]} Accounts
                        </button>
                      )}
                    </div>
                  </td>
                  <td><strong>{formatBDT(m.capitalInvested)}</strong></td>
                  <td style={{ color: '#f59e0b', fontWeight: 600 }}>{formatBDT(m.monthlyProfit)}</td>
                  <td style={{ color: '#3b82f6', fontWeight: 600 }}>{formatBDT(m.monthlyCapitalRefund)}</td>
                  <td style={{ color: '#10b981', fontWeight: 700 }}>{formatBDT(m.monthlyTotalPayout)}</td>
                  <td>{m.joinDate}</td>
                  <td><span className="badge-status badge-active">{m.status}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn-action btn-delete" onClick={() => handleDelete(m.memberId)} title="Admin Only: Delete Member">
                      <i className="fa-solid fa-trash"></i> Delete
                    </button>
                    <button 
                      className="btn-action btn-view" 
                      style={{
                        background: '#4b5563',
                        color: '#fff',
                        border: '1px solid #4b5563',
                        marginLeft: '8px'
                      }}
                      onClick={() => handleOpenPassModal(m)} 
                      title="Admin Only: Change Password"
                    >
                      <i className="fa-solid fa-key"></i> Pass
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2100,
          padding: '20px',
          overflowY: 'auto'
        }}>
          <form 
            onSubmit={handleCreateMember}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '650px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              margin: 'auto'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>
                <i className="fa-solid fa-user-plus" style={{ color: '#10b981', marginRight: '8px' }}></i>
                Create Member Account
              </h3>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
              
              {/* Account Category Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>Account Category *</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff' }}>
                    <input 
                      type="radio" 
                      name="category" 
                      value="INVESTOR" 
                      checked={createCategory === 'INVESTOR'} 
                      onChange={() => setCreateCategory('INVESTOR')} 
                    />
                    Investor Account
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff' }}>
                    <input 
                      type="radio" 
                      name="category" 
                      value="BUYER" 
                      checked={createCategory === 'BUYER'} 
                      onChange={() => setCreateCategory('BUYER')} 
                    />
                    Buyer Account
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff' }}>
                    <input 
                      type="radio" 
                      name="category" 
                      value="BOTH" 
                      checked={createCategory === 'BOTH'} 
                      onChange={() => setCreateCategory('BOTH')} 
                    />
                    Both (Investor & Buyer)
                  </label>
                </div>
              </div>

              {/* Grid: Basic Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={createName} 
                    onChange={(e) => setCreateName(e.target.value)} 
                    placeholder="John Doe"
                    style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Phone Number *</label>
                  <input 
                    type="tel" 
                    required 
                    value={createPhone} 
                    onChange={(e) => setCreatePhone(e.target.value)} 
                    placeholder="e.g. 017XXXXXXXX"
                    style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Grid: Password & NID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Account Password *</label>
                  <input 
                    type="password" 
                    required 
                    value={createPassword} 
                    onChange={(e) => setCreatePassword(e.target.value)} 
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>National ID / Passport Number</label>
                  <input 
                    type="text" 
                    value={createNid} 
                    onChange={(e) => setCreateNid(e.target.value)} 
                    placeholder="NID Number"
                    style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Sponsor Referral Code */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Sponsor ID or Phone (Referred By)</label>
                <input 
                  type="text" 
                  value={createSponsor} 
                  onChange={(e) => setCreateSponsor(e.target.value)} 
                  placeholder="e.g. Plan10-101 or Sponsor Phone"
                  style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                />
              </div>

              {/* Conditional Investment Fields */}
              {(createCategory === 'INVESTOR' || createCategory === 'BOTH') && (
                <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ margin: 0, color: '#60a5fa', fontSize: '0.9rem' }}>Investment Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Capital Invested (BDT)</label>
                      <input 
                        type="number" 
                        value={createCapital} 
                        onChange={(e) => setCreateCapital(e.target.value)} 
                        placeholder="e.g. 100000"
                        style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Term Duration (Months)</label>
                      <input 
                        type="number" 
                        value={createTermMonths} 
                        onChange={(e) => setCreateTermMonths(e.target.value)} 
                        placeholder="e.g. 33"
                        style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced / Personal Profile fields */}
              <div style={{ borderTop: '1px solid #334155', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '0.9rem' }}>Additional Profile Information (Optional)</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Father&apos;s Name</label>
                    <input 
                      type="text" 
                      value={createFatherName} 
                      onChange={(e) => setCreateFatherName(e.target.value)} 
                      placeholder="Father's Name"
                      style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Full Address</label>
                    <input 
                      type="text" 
                      value={createAddress} 
                      onChange={(e) => setCreateAddress(e.target.value)} 
                      placeholder="Address"
                      style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Nominee Name</label>
                    <input 
                      type="text" 
                      value={createNominee} 
                      onChange={(e) => setCreateNominee(e.target.value)} 
                      placeholder="Nominee Full Name"
                      style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Relation to Nominee</label>
                    <input 
                      type="text" 
                      value={createRelation} 
                      onChange={(e) => setCreateRelation(e.target.value)} 
                      placeholder="e.g. Spouse / Brother"
                      style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                className="btn-action btn-view"
                style={{ margin: 0, padding: '10px 20px', background: '#334155', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="btn-action btn-approve"
                style={{ margin: 0, padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change Password Modal */}
      {showPassModal && selectedMember && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2100,
          padding: '20px'
        }}>
          <form 
            onSubmit={handleChangePassword}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '450px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>
                <i className="fa-solid fa-key" style={{ color: '#3b82f6', marginRight: '8px' }}></i>
                Update Password
              </h3>
              <button 
                type="button"
                onClick={() => setShowPassModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                Updating password for: <strong style={{ color: '#fff' }}>{selectedMember.name} ({selectedMember.memberId})</strong>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>New Password *</label>
                <input 
                  type="password" 
                  required
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Confirm New Password *</label>
                <input 
                  type="password" 
                  required
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => setShowPassModal(false)}
                className="btn-action btn-view"
                style={{ margin: 0, padding: '10px 20px', background: '#334155', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="btn-action btn-approve"
                style={{ margin: 0, padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
