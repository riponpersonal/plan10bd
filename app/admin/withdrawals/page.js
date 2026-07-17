'use client';

import React, { useState, useEffect, useMemo } from 'react';

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'PENDING', 'APPROVED', 'REJECTED'
  const [actioningId, setActioningId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  async function loadWithdrawals() {
    try {
      const res = await fetch('/api/admin/withdrawals');
      const data = await res.json();
      if (data.success) {
        setWithdrawals(data.withdrawals || []);
      }
    } catch (e) {
      console.error('Failed to load withdrawals', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      loadWithdrawals();
    }, 0);
    return () => clearTimeout(handle);
  }, []);

  const handleWithdrawalAction = async (requestId, action) => {
    setActioningId(requestId);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Request successfully ${action === 'approve' ? 'approved' : 'rejected'}!` });
        loadWithdrawals();
        // Fire event to update badges in layout
        window.dispatchEvent(new Event('applications-updated'));
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update request.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error updating request status.' });
    } finally {
      setActioningId(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const stats = useMemo(() => {
    const pending = withdrawals.filter(w => w.status === 'PENDING');
    const approved = withdrawals.filter(w => w.status === 'APPROVED');
    const rejected = withdrawals.filter(w => w.status === 'REJECTED');

    return {
      pendingCount: pending.length,
      pendingVolume: pending.reduce((sum, w) => sum + w.amount, 0),
      approvedCount: approved.length,
      approvedVolume: approved.reduce((sum, w) => sum + w.amount, 0),
      rejectedCount: rejected.length
    };
  }, [withdrawals]);

  const filteredList = useMemo(() => {
    if (filterStatus === 'ALL') return withdrawals;
    return withdrawals.filter(w => w.status === filterStatus);
  }, [withdrawals, filterStatus]);

  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2>User Wallet Withdrawals Manager</h2>
        <p style={{ color: '#64748b' }}>Manage user cash-out payouts, approve bank wiring, and review system logs.</p>
      </div>

      {message.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '0.95rem',
          fontWeight: 600,
          backgroundColor: message.type === 'success' ? '#064e3b' : '#7f1d1d',
          color: message.type === 'success' ? '#a7f3d0' : '#fecaca',
          border: `1px solid ${message.type === 'success' ? '#059669' : '#dc2626'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Metrics Header Grid */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-info">
            <h4>Pending Requests</h4>
            <h3 className="metric-number">{stats.pendingCount} Requests</h3>
            <small style={{ color: '#fbbf24', fontWeight: 600 }}>Volume: {formatBDT(stats.pendingVolume)}</small>
          </div>
          <div className="metric-icon icon-amber">
            <i className="fa-solid fa-hourglass-half"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Processed / Approved</h4>
            <h3 className="metric-number">{stats.approvedCount} Payouts</h3>
            <small style={{ color: '#10b981', fontWeight: 600 }}>Volume: {formatBDT(stats.approvedVolume)}</small>
          </div>
          <div className="metric-icon icon-green">
            <i className="fa-solid fa-circle-check"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Rejected Requests</h4>
            <h3 className="metric-number">{stats.rejectedCount} Declined</h3>
            <small style={{ color: '#ef4444' }}>Refunded to balance</small>
          </div>
          <div className="metric-icon icon-red">
            <i className="fa-solid fa-ban"></i>
          </div>
        </div>
      </div>

      {/* Filters controls bar */}
      <div className="search-bar-wrapper" style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setFilterStatus('ALL')}
          className={`btn-filter ${filterStatus === 'ALL' ? 'active' : ''}`}
          style={{ background: filterStatus === 'ALL' ? '#059669' : '#1e293b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          All Requests ({withdrawals.length})
        </button>
        <button
          onClick={() => setFilterStatus('PENDING')}
          className={`btn-filter ${filterStatus === 'PENDING' ? 'active' : ''}`}
          style={{ background: filterStatus === 'PENDING' ? '#059669' : '#1e293b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          Pending ({stats.pendingCount})
        </button>
        <button
          onClick={() => setFilterStatus('APPROVED')}
          className={`btn-filter ${filterStatus === 'APPROVED' ? 'active' : ''}`}
          style={{ background: filterStatus === 'APPROVED' ? '#059669' : '#1e293b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          Approved ({stats.approvedCount})
        </button>
        <button
          onClick={() => setFilterStatus('REJECTED')}
          className={`btn-filter ${filterStatus === 'REJECTED' ? 'active' : ''}`}
          style={{ background: filterStatus === 'REJECTED' ? '#059669' : '#1e293b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          Rejected ({stats.rejectedCount})
        </button>
      </div>

      {/* Main requests table */}
      <div className="card-table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading withdrawal list...</div>
        ) : filteredList.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No withdrawal requests found.</div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Member ID / Phone</th>
                  <th>Request Date</th>
                  <th>Amount</th>
                  <th>Payout Method</th>
                  <th>Payment Number</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8' }}>{req.id}</td>
                    <td><strong style={{ color: '#fff' }}>{req.username}</strong></td>
                    <td>{new Date(req.requestedAt).toLocaleString()}</td>
                    <td><strong style={{ color: '#10b981' }}>{formatBDT(req.amount)}</strong></td>
                    <td><span style={{ background: '#334155', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', color: '#e2e8f0' }}>{req.method}</span></td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#f8fafc', fontWeight: 600 }}>
                        {req.paymentNumber || <span style={{ color: '#64748b', fontStyle: 'italic' }}>N/A</span>}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${req.status.toLowerCase()}`}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {req.status === 'PENDING' ? (
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            disabled={actioningId !== null}
                            onClick={() => handleWithdrawalAction(req.id, 'approve')}
                            className="btn-action btn-approve"
                            style={{ background: '#059669', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
                          >
                            {actioningId === req.id ? '...' : 'Approve'}
                          </button>
                          <button
                            disabled={actioningId !== null}
                            onClick={() => handleWithdrawalAction(req.id, 'reject')}
                            className="btn-action btn-reject"
                            style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
                          >
                            {actioningId === req.id ? '...' : 'Reject'}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                          Processed {req.processedAt ? new Date(req.processedAt).toLocaleDateString() : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
