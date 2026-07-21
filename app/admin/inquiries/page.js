'use client';

import React, { useState, useEffect } from 'react';

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadInquiries() {
    try {
      const res = await fetch('/api/inquiries');
      const data = await res.json();
      if (data.success) setInquiries(data.inquiries);
    } catch (e) {
      console.error('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      loadInquiries();
    }, 0);
    return () => clearTimeout(handle);
  }, []);

  async function handleDelete(id) {
    if (!confirm(`Are you sure you want to permanently delete inquiry ${id}?`)) return;
    try {
      const res = await fetch(`/api/inquiries?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Inquiry ${id} deleted permanently.`);
        loadInquiries();
        setTimeout(() => setMessage(''), 3000);
      } else {
        alert(data.message || 'Failed to delete inquiry.');
      }
    } catch (err) {
      console.error('Error deleting inquiry');
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2>Customer Inquiries & Dealership Applications</h2>
        <p style={{ color: '#64748b' }}>Messages and partnership requests submitted through the public portal contact forms.</p>
      </div>

      {message && (
        <div style={{ padding: '12px 20px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '8px', marginBottom: '20px', fontWeight: 600 }}>
          <i className="fa-solid fa-circle-check"></i> {message}
        </div>
      )}

      <div className="card-table-container">
        {loading ? (
          <p style={{ padding: '24px' }}>Loading incoming messages...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Sender Name & Area</th>
                <th>Phone Number</th>
                <th>Inquiry Topic</th>
                <th>Message Details</th>
                <th>Date Sent</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => (
                <tr key={inq.id}>
                  <td><strong>{inq.id}</strong></td>
                  <td>
                    <div><strong>{inq.name}</strong></div>
                    <small style={{ color: '#64748b' }}>{inq.area || 'N/A'}</small>
                  </td>
                  <td><a href={`tel:${inq.phone}`} style={{ color: '#2563eb', fontWeight: 600 }}>{inq.phone}</a></td>
                  <td><span className="badge-status badge-pending">{inq.topic}</span></td>
                  <td style={{ maxWidth: '400px', whiteSpace: 'normal', wordBreak: 'break-word' }}><small>{inq.message}</small></td>
                  <td><small style={{ color: '#64748b' }}>{new Date(inq.date).toLocaleDateString()}</small></td>
                  <td>
                    <button className="btn-action btn-delete" onClick={() => handleDelete(inq.id)} title="Admin Only: Delete Inquiry">
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
