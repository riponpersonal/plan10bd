'use client';

import React, { useState, useEffect } from 'react';

export default function AdminMembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

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

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2>Active Member & Investor Directory</h2>
        <p style={{ color: '#64748b' }}>Verified investors with active halal capital return accounts.</p>
      </div>

      {message && (
        <div style={{ padding: '12px 20px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '8px', marginBottom: '20px', fontWeight: 600 }}>
          <i className="fa-solid fa-circle-check"></i> {message}
        </div>
      )}

      <div className="card-table-container">
        {loading ? (
          <p style={{ padding: '24px' }}>Loading active members...</p>
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
              {members.map((m) => (
                <tr key={m.memberId}>
                  <td><strong style={{ color: '#2563eb' }}>{m.memberId}</strong></td>
                  <td>
                    <div><strong>{m.name}</strong></div>
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
