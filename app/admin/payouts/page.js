'use client';

import React, { useState, useEffect } from 'react';

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchPayouts();
  }, []);

  async function fetchPayouts() {
    try {
      const res = await fetch('/api/payouts');
      const data = await res.json();
      if (data.success) setPayouts(data.payouts);
    } catch (err) {
      console.error('Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkPaid(id) {
    try {
      const res = await fetch('/api/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'PAID' })
      });
      const data = await res.json();
      if (data.success) {
        setMsg(`Payout ${id} marked as PAID! Bank transfer logged.`);
        fetchPayouts();
        setTimeout(() => setMsg(''), 3000);
      }
    } catch (e) {
      console.error('Error updating payout');
    }
  }

  async function handleDelete(id) {
    if (!confirm(`Are you sure you want to permanently delete payout record ${id}?`)) return;
    try {
      const res = await fetch(`/api/payouts?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-role': 'ADMIN' }
      });
      const data = await res.json();
      if (data.success) {
        setMsg(`Payout record ${id} deleted permanently.`);
        fetchPayouts();
        setTimeout(() => setMsg(''), 3000);
      } else {
        alert(data.message || 'Failed to delete payout.');
      }
    } catch (err) {
      console.error('Error deleting payout');
    }
  }

  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2>Monthly Payout Disbursal Tracker</h2>
        <p style={{ color: '#64748b' }}>Scheduled profit distribution and capital refund ledger for member bank accounts.</p>
      </div>

      {msg && (
        <div style={{ padding: '12px 20px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '8px', marginBottom: '20px', fontWeight: 600 }}>
          <i className="fa-solid fa-circle-check"></i> {msg}
        </div>
      )}

      <div className="card-table-container">
        {loading ? (
          <p style={{ padding: '24px' }}>Loading payout schedules...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Payout ID</th>
                <th>Member Profile</th>
                <th>Tenure Month</th>
                <th>Profit (3%)</th>
                <th>Capital Refund</th>
                <th>Total Disbursal</th>
                <th>Disbursal Method</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.id}</strong></td>
                  <td>
                    <div><strong>{p.memberName}</strong></div>
                    <small style={{ color: '#64748b' }}>{p.memberId}</small>
                  </td>
                  <td>Month {p.monthNumber}</td>
                  <td>{formatBDT(p.profitAmount)}</td>
                  <td>{formatBDT(p.capitalRefund)}</td>
                  <td><strong style={{ color: '#059669' }}>{formatBDT(p.totalPayout)}</strong></td>
                  <td><small style={{ color: '#475569' }}>{p.method}</small></td>
                  <td>
                    <span className={`badge-status badge-${p.status.toLowerCase()}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    {p.status === 'PENDING' ? (
                      <button className="btn-action btn-approve" onClick={() => handleMarkPaid(p.id)}>
                        <i className="fa-solid fa-check"></i> Mark Disbursed
                      </button>
                    ) : (
                      <span style={{ color: '#059669', fontWeight: 600, marginRight: '8px' }}><i className="fa-solid fa-circle-check"></i> Complete</span>
                    )}
                    <button className="btn-action btn-delete" onClick={() => handleDelete(p.id)} title="Admin Only: Delete Payout">
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
