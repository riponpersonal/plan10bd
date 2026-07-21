'use client';

import React, { useState, useEffect } from 'react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'PENDING', 'PROCESSING', 'DELIVERED', 'REJECTED'
  const [message, setMessage] = useState('');

  async function fetchOrders() {
    try {
      const res = await fetch('/api/orders', {
        method: 'GET' // Session auth via httpOnly cookie
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchOrders();
    }, 0);
    return () => clearTimeout(handle);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const statusParam = params.get('status');
      if (statusParam) {
        const upper = statusParam.toUpperCase();
        if (['ALL', 'PENDING', 'PROCESSING', 'DELIVERED', 'REJECTED'].includes(upper)) {
          setTimeout(() => setFilter(upper), 0);
        }
      }
    }
  }, []);

  async function handleStatusChange(orderId, newStatus) {
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Order ${orderId} updated to ${newStatus} successfully!`);
        fetchOrders();
        window.dispatchEvent(new CustomEvent('applications-updated')); // Triggers count update in sidebar
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`Error: ${data.message}`);
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      setMessage('Failed to update order status due to server error.');
      setTimeout(() => setMessage(''), 4000);
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (filter === 'ALL') return true;
    return o.status === filter;
  });

  const formatBDT = (amount) => {
    return '৳' + Math.round(Number(amount) || 0).toLocaleString('en-IN');
  };

  return (
    <div className="admin-page-container">
      <div className="section-card-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0 }}><i className="fa-solid fa-cart-flatbed"></i> Product Sales Orders</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Process buyer product orders and manage delivery stages.
          </p>
        </div>
        
        {/* Status Filtering Tabs */}
        <div style={{ display: 'flex', background: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #334155', gap: '4px', flexWrap: 'wrap' }}>
          {['ALL', 'PENDING', 'PROCESSING', 'DELIVERED', 'REJECTED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                background: filter === tab ? '#2563eb' : 'transparent',
                color: filter === tab ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textTransform: 'uppercase'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div style={{
          backgroundColor: message.startsWith('Error') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${message.startsWith('Error') ? '#ef4444' : '#10b981'}`,
          color: message.startsWith('Error') ? '#fca5a5' : '#d1fae5',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className={`fa-solid ${message.startsWith('Error') ? 'fa-triangle-exclamation' : 'fa-circle-check'}`}></i>
          <span>{message}</span>
        </div>
      )}

      <div className="card-table-container">
        {loading ? (
          <p style={{ padding: '24px', color: '#94a3b8' }}>Loading product order records...</p>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <i className="fa-solid fa-boxes-stacked" style={{ fontSize: '3rem', color: '#475569', marginBottom: '16px', display: 'block' }}></i>
            <h3 style={{ color: '#ffffff', marginBottom: '8px', fontSize: '1.2rem', fontWeight: 600 }}>No Orders Found</h3>
            <p style={{ fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5' }}>
              There are currently no orders registered under the &quot;{filter}&quot; category filter.
            </p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date & Time</th>
                <th>Buyer Contact</th>
                <th>Product Information</th>
                <th>Order Price</th>
                <th>Delivery Status</th>
                <th>Action Options</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((ord) => {
                let badgeClass = 'badge-pending';
                if (ord.status === 'PROCESSING') badgeClass = 'badge-processing';
                else if (ord.status === 'DELIVERED') badgeClass = 'badge-approved';
                else if (ord.status === 'REJECTED') badgeClass = 'badge-rejected';

                let rowStyle = {};
                if (ord.status === 'PENDING') {
                  rowStyle = { backgroundColor: 'rgba(245, 158, 11, 0.02)' };
                }

                // Format timestamp
                const formattedDate = ord.orderedAt 
                  ? new Date(ord.orderedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                  : 'N/A';

                return (
                  <tr key={ord.id} style={rowStyle}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8' }}>{ord.id}</td>
                    <td style={{ fontSize: '0.85rem' }}>{formattedDate}</td>
                    <td>
                      <div><strong>{ord.username}</strong></div>
                      <small style={{ color: '#64748b' }}>Account: Customer</small>
                    </td>
                    <td>
                      <div><strong>{ord.productName}</strong></div>
                      <small style={{ color: '#64748b' }}>Product ID: {ord.productId}</small>
                    </td>
                    <td><strong style={{ color: '#10b981' }}>{formatBDT(ord.price)}</strong></td>
                    <td>
                      <span className={`badge-status ${badgeClass}`} style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {ord.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {ord.status === 'PENDING' && (
                          <>
                            <button 
                              className="btn-action btn-approve" 
                              onClick={() => handleStatusChange(ord.id, 'PROCESSING')}
                              title="Accept Order & Authorize Login"
                            >
                              <i className="fa-solid fa-check"></i> Accept
                            </button>
                            <button 
                              className="btn-action btn-reject" 
                              onClick={() => handleStatusChange(ord.id, 'REJECTED')}
                              title="Decline Order"
                            >
                              <i className="fa-solid fa-xmark"></i> Reject
                            </button>
                          </>
                        )}
                        {ord.status === 'PROCESSING' && (
                          <button 
                            className="btn-action btn-approve" 
                            style={{ backgroundColor: '#2563eb', borderColor: '#3b82f6' }}
                            onClick={() => handleStatusChange(ord.id, 'DELIVERED')}
                            title="Confirm Shipment Delivered"
                          >
                            <i className="fa-solid fa-truck"></i> Confirm Delivery
                          </button>
                        )}
                        {(ord.status === 'DELIVERED' || ord.status === 'REJECTED') && (
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                            No actions required
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
