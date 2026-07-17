'use client';

import React, { useState, useEffect } from 'react';

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const statusParam = params.get('status');
      if (statusParam) {
        const upper = statusParam.toUpperCase();
        if (['ALL', 'PENDING', 'APPROVED', 'REJECTED'].includes(upper)) {
          setTimeout(() => setFilter(upper), 0);
        }
      }
    }
  }, []);

  async function fetchApplications() {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success) {
        const splApps = data.applications.filter(a => a.purpose !== 'Buy Product');
        setApps(splApps);
      }
    } catch (err) {
      console.error('Error fetching applications');
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
        setMessage(`Application ${id} status updated to ${newStatus}`);
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
        setMessage(`Application ${id} deleted permanently.`);
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

  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Investor Application Processing</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              className={`btn-action ${filter === st ? 'btn-view' : ''}`}
              style={{ background: filter === st ? '#2563eb' : '#e2e8f0', color: filter === st ? '#fff' : '#475569' }}
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
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Applicant Name & NID</th>
                <th>Contact Phone</th>
                <th>Capital Amount</th>
                <th>Tenure</th>
                <th>Nominee Details</th>
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
                    <small style={{ color: '#64748b' }}>NID: {app.nid}</small>
                  </td>
                  <td>{app.phone}</td>
                  <td><strong style={{ color: '#059669' }}>{formatBDT(app.capitalAmount)}</strong></td>
                  <td>{app.durationMonths} Mos</td>
                  <td>
                    <div>{app.nomineeName || 'N/A'}</div>
                    <small style={{ color: '#64748b' }}>Rel: {app.relation || 'N/A'}</small>
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
