'use client';

import React, { useState, useEffect } from 'react';

export default function AdminMembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'INVESTOR', 'BUYER', 'BOTH'

  useEffect(() => {
    loadMembers();
  }, []);

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

  async function handleDelete(memberId) {
    if (!confirm(`Are you sure you want to permanently delete member profile ${memberId}?`)) return;
    try {
      const res = await fetch(`/api/members?memberId=${memberId}`, {
        method: 'DELETE',
        headers: { 'x-admin-role': 'ADMIN' }
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

  const filteredMembers = members.filter((m) => {
    if (filter === 'ALL') return true;
    return m.category === filter;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2>Active Member & Investor Directory</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Verified members with active halal capital return accounts or buyer statuses.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All Members' },
            { key: 'INVESTOR', label: 'Investors Only' },
            { key: 'BUYER', label: 'Buyers Only' },
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
                  <td><strong style={{ color: '#2563eb' }}>{m.memberId}</strong></td>
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
                    <small style={{ color: '#64748b' }}>{m.phone}</small>
                  </td>
                  <td><strong>{formatBDT(m.capitalInvested)}</strong></td>
                  <td style={{ color: '#f59e0b', fontWeight: 600 }}>{formatBDT(m.monthlyProfit)}</td>
                  <td style={{ color: '#3b82f6', fontWeight: 600 }}>{formatBDT(m.monthlyCapitalRefund)}</td>
                  <td style={{ color: '#10b981', fontWeight: 700 }}>{formatBDT(m.monthlyTotalPayout)}</td>
                  <td>{m.joinDate}</td>
                  <td><span className="badge-status badge-active">{m.status}</span></td>
                  <td>
                    <button className="btn-action btn-delete" onClick={() => handleDelete(m.memberId)} title="Admin Only: Delete Member">
                      <i className="fa-solid fa-trash"></i> Delete
                    </button>
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
