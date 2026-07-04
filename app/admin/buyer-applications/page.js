'use client';

import React, { useState, useEffect } from 'react';

export default function AdminBuyerApplicationsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success) {
        // Filter specifically for "Buy Product" mode
        const buyerApps = data.applications.filter(a => a.purpose === 'Buy Product');
        setApps(buyerApps);
      }
    } catch (err) {
      console.error('Error fetching buyer applications');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id, newStatus) {
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Buyer Application ${id} status updated to ${newStatus}`);
        fetchApplications();
        window.dispatchEvent(new CustomEvent('applications-updated'));
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error updating status');
    }
  }

  async function handleDelete(id) {
    if (!confirm(`Are you sure you want to permanently delete application ${id}?`)) return;
    try {
      const res = await fetch(`/api/applications?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-role': 'ADMIN' }
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Buyer Application ${id} deleted permanently.`);
        fetchApplications();
        window.dispatchEvent(new CustomEvent('applications-updated'));
        setTimeout(() => setMessage(''), 3000);
      } else {
        alert(data.message || 'Failed to delete application.');
      }
    } catch (err) {
      console.error('Error deleting application');
    }
  }

  const filteredApps = apps.filter((a) => {
    if (filter === 'ALL') return true;
    return a.status === filter;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Product Buyer Applications</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
            Process applications from users registering via direct product purchase or the landing page "Order Now" flow.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              className={`btn-action ${filter === st ? 'btn-view' : ''}`}
              style={{ background: filter === st ? '#10b981' : '#e2e8f0', color: filter === st ? '#fff' : '#475569' }}
              onClick={() => setFilter(st)}
            >
              {st}
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
          <p style={{ padding: '24px' }}>Loading application records...</p>
        ) : filteredApps.length === 0 ? (
          <p style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No buyer applications found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Buyer Name & NID</th>
                <th>Contact Phone</th>
                <th>Product / Sector</th>
                <th>Sponsor ID</th>
                <th>Status</th>
                <th>Decision Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app) => (
                <tr key={app.id}>
                  <td><strong>{app.id}</strong></td>
                  <td>
                    <div><strong>{app.applicantName}</strong></div>
                    <small style={{ color: '#64748b' }}>NID: {app.nid || 'N/A'}</small>
                  </td>
                  <td>{app.phone}</td>
                  <td>
                    <div><span style={{ background: '#334155', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>{app.productName || 'Direct Buyer Registration'}</span></div>
                  </td>
                  <td>
                    {app.referredBy ? (
                      <span style={{ color: '#38bdf8', fontWeight: 600, fontFamily: 'monospace' }}>{app.referredBy}</span>
                    ) : (
                      <span style={{ color: '#64748b', fontStyle: 'italic' }}>None</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge-status badge-${app.status.toLowerCase()}`}>
                      {app.status}
                    </span>
                  </td>
                  <td>
                    {app.status === 'PENDING' && (
                      <>
                        <button className="btn-action btn-approve" onClick={() => handleStatusChange(app.id, 'APPROVED')}>
                          <i className="fa-solid fa-check"></i> Approve
                        </button>
                        <button className="btn-action btn-reject" onClick={() => handleStatusChange(app.id, 'REJECTED')}>
                          <i className="fa-solid fa-xmark"></i> Reject
                        </button>
                      </>
                    )}
                    <button className="btn-action btn-delete" onClick={() => handleDelete(app.id)} title="Admin Only: Delete Record">
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
