'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function AdminInfoPage() {
  const [copied, setCopied] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);
  const [showUsersList, setShowUsersList] = useState(false);

  const [loadingBackup, setLoadingBackup] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const fileInputRef = useRef(null);

  // Dynamic system logs state
  const [logsList, setLogsList] = useState([]);

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchUsers();
      fetchLogs();

      // Check query parameters for database operations status post-reload
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        if (status === 'reset_success') {
          setActionMessage({
            type: 'success',
            text: 'System database factory reset completed successfully! All records cleared.'
          });
          window.history.replaceState({}, document.title, window.location.pathname);
          setTimeout(() => setActionMessage(null), 5000);
        } else if (status === 'import_success') {
          setActionMessage({
            type: 'success',
            text: 'System database restored successfully from JSON backup!'
          });
          window.history.replaceState({}, document.title, window.location.pathname);
          setTimeout(() => setActionMessage(null), 5000);
        }
      }
    }, 0);
    return () => clearTimeout(handle);
  }, []);

  async function fetchLogs() {
    try {
      const res = await fetch('/api/admin/logs');
      const data = await res.json();
      if (data.success) {
        setLogsList(data.logs);
      }
    } catch (err) {
      console.error('Failed to load system logs:', err);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      if (data.success) {
        setUsersList(data.users);
      }
    } catch (err) {
      console.error('Failed to load active users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }

  const handleToggleAdminPower = async (username, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({
          type: 'success',
          text: currentRole === 'ADMIN' 
            ? `Revoked admin power from ${username}.` 
            : `Granted Admin Power to ${username} successfully!`
        });
        fetchUsers();
        fetchLogs();
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        setActionMessage({ type: 'error', text: data.message || 'Action failed.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Network error processing request.' });
    }
  };

  const handleCopyToken = () => {
    // Token copy removed — hardcoded tokens are a security risk
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportData = async () => {
    setLoadingBackup(true);
    try {
      const res = await fetch('/api/admin/backup');
      const data = await res.json();
      if (data.success) {
        const jsonStr = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Format timestamp
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        
        link.href = url;
        link.download = `plan10_db_backup_${dateStr}_${timeStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setActionMessage({
          type: 'success',
          text: 'Database snapshot exported and downloaded successfully!'
        });
        fetchLogs();
      } else {
        setActionMessage({ type: 'error', text: data.message || 'Export failed.' });
      }
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: 'Network error exporting database.' });
    } finally {
      setLoadingBackup(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingBackup(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsedData = JSON.parse(event.target.result);
        
        const res = await fetch('/api/admin/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import', data: parsedData })
        });
        
        const data = await res.json();
        if (data.success) {
          window.location.href = '/admin/info?status=import_success';
        } else {
          setActionMessage({ type: 'error', text: data.message || 'Failed to restore database.' });
          setTimeout(() => setActionMessage(null), 5000);
        }
      } catch (err) {
        console.error(err);
        setActionMessage({ type: 'error', text: 'Invalid JSON file. Please upload a correct database backup.' });
        setTimeout(() => setActionMessage(null), 4000);
      } finally {
        setLoadingBackup(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    if (resetConfirmText !== 'RESET') return;
    
    setLoadingBackup(true);
    setShowResetModal(false);
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = '/admin/info?status=reset_success';
      } else {
        setActionMessage({ type: 'error', text: data.message || 'Reset failed.' });
        setTimeout(() => setActionMessage(null), 5000);
      }
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: 'Network error resetting database.' });
      setTimeout(() => setActionMessage(null), 4000);
    } finally {
      setLoadingBackup(false);
      setResetConfirmText('');
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '16px',
          padding: '30px',
          border: '1px solid #334155',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div 
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem',
              boxShadow: '0 8px 20px rgba(37,99,235,0.4)',
              border: '2px solid rgba(255,255,255,0.2)'
            }}
          >
            <i className="fa-solid fa-user-shield"></i>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
                Corporate Executive Admin
              </h2>
              <span className="badge-status badge-approved" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i> Active Superadmin
              </span>
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
              PLAN-10 BD Central Control Center &amp; Executive System Operations
            </p>
          </div>
        </div>

        <Link href="/admin" className="btn-action btn-view" style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '0.9rem' }}>
          <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
        </Link>
      </div>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div 
          style={{
            padding: '14px 20px',
            borderRadius: '10px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 600,
            fontSize: '0.95rem',
            background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: actionMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            color: actionMessage.type === 'success' ? '#34d399' : '#fca5a5'
          }}
        >
          <i className={`fa-solid ${actionMessage.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          {actionMessage.text}
        </div>
      )}

      {/* Quick Overview Cards */}
      <div className="metrics-grid" style={{ marginBottom: '30px' }}>
        <div className="metric-card">
          <div className="metric-info">
            <h4>Admin Level</h4>
            <h3 className="metric-number" style={{ fontSize: '1.2rem', color: '#60a5fa' }}>Full Access</h3>
          </div>
          <div className="metric-icon icon-blue">
            <i className="fa-solid fa-key"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Session</h4>
            <h3 className="metric-number" style={{ fontSize: '1.2rem', color: '#34d399' }}>Authenticated</h3>
          </div>
          <div className="metric-icon icon-green">
            <i className="fa-solid fa-lock"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>System Role</h4>
            <h3 className="metric-number" style={{ fontSize: '1.2rem', color: '#fbbf24' }}>Administrator</h3>
          </div>
          <div className="metric-icon icon-amber">
            <i className="fa-solid fa-gavel"></i>
          </div>
        </div>
      </div>

      {/* Admin Power Delegation Section */}
      <div className="card-table-container" style={{ padding: '24px', marginBottom: '30px' }}>
        <div style={{ borderBottom: '1px solid #334155', paddingBottom: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <i className="fa-solid fa-user-gear"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>Admin Power Delegation &amp; Management</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>Grant administrative authority to active users or revoke privileges</p>
            </div>
          </div>
          <button 
            onClick={() => setShowUsersList(!showUsersList)}
            className="btn-action"
            style={{ 
              fontSize: '0.85rem', 
              background: showUsersList ? '#2563eb' : '#0f172a', 
              padding: '8px 16px', 
              borderRadius: '20px', 
              border: '1px solid #334155', 
              color: '#ffffff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            title="Click to show or hide active user list"
          >
            <i className="fa-solid fa-users" style={{ color: showUsersList ? '#ffffff' : '#3b82f6' }}></i> 
            <span>Active Users ({usersList.length})</span>
            <i className={`fa-solid fa-chevron-${showUsersList ? 'up' : 'down'}`} style={{ fontSize: '0.75rem', marginLeft: '4px' }}></i>
          </button>
        </div>

        {showUsersList && (
          loadingUsers ? (
            <p style={{ color: '#94a3b8', padding: '10px 0' }}>Loading active system users...</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User / Member</th>
                  <th>Username / Contact</th>
                  <th>Current Role</th>
                  <th>Administrative Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => {
                  const isAdmin = u.role === 'ADMIN';
                  const isSuperAdmin = u.username === 'admin';
                  return (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{u.email || 'No email attached'}</div>
                      </td>
                      <td>
                        <code style={{ color: '#60a5fa' }}>{u.username}</code>
                        {u.phone && <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{u.phone}</div>}
                      </td>
                      <td>
                        <span className={`badge-status ${isAdmin ? 'badge-approved' : 'badge-pending'}`}>
                          {isAdmin ? 'Corporate Admin' : 'Active User'}
                        </span>
                      </td>
                      <td>
                        {isAdmin ? (
                          <span style={{ color: '#34d399', fontWeight: 600, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-shield-check"></i> Full Admin Power
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-user"></i> Standard Access
                          </span>
                        )}
                      </td>
                      <td>
                        {isSuperAdmin ? (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Primary Superadmin</span>
                        ) : (
                          <button
                            onClick={() => handleToggleAdminPower(u.username, u.role)}
                            className={`btn-action ${isAdmin ? 'btn-reject' : 'btn-approve'}`}
                            style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 }}
                          >
                            <i className={`fa-solid ${isAdmin ? 'fa-user-minus' : 'fa-user-shield'}`}></i>
                            {isAdmin ? 'Revoke Admin Power' : 'Grant Admin Power'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Detailed Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '30px' }}>
        
        {/* Personal & Profile Details */}
        <div className="card-table-container" style={{ padding: '24px', margin: 0 }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-id-card" style={{ color: '#3b82f6', fontSize: '1.2rem' }}></i>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Account Identity Details</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Full Legal Name</span>
              <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '1rem' }}>Corporate System Administrator</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Administrative Username</span>
              <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.98rem', fontFamily: 'monospace' }}>@admin_p10</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Designated Corporate Email</span>
              <span style={{ color: '#ffffff', fontWeight: 500, fontSize: '0.95rem' }}>admin@plan10bd.com</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Department / Division</span>
              <span style={{ color: '#ffffff', fontWeight: 500, fontSize: '0.95rem' }}>Executive Board &amp; IT Operations</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Primary Regional Office</span>
              <span style={{ color: '#ffffff', fontWeight: 500, fontSize: '0.95rem' }}>Dhaka HQ, Bangladesh</span>
            </div>
          </div>
        </div>

        {/* Security & Access Matrix */}
        <div className="card-table-container" style={{ padding: '24px', margin: 0 }}>
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-shield-halved" style={{ color: '#10b981', fontSize: '1.2rem' }}></i>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>System Permissions &amp; Privileges</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 500 }}>
                <i className="fa-solid fa-file-signature" style={{ color: '#60a5fa', marginRight: '8px' }}></i> SPL Application Approval
              </span>
              <span className="badge-status badge-approved">Granted</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 500 }}>
                <i className="fa-solid fa-hand-holding-dollar" style={{ color: '#34d399', marginRight: '8px' }}></i> Disbursal Authorization
              </span>
              <span className="badge-status badge-approved">Authorized</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 500 }}>
                <i className="fa-solid fa-users-gear" style={{ color: '#fbbf24', marginRight: '8px' }}></i> Member Directory Management
              </span>
              <span className="badge-status badge-approved">Full Access</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 500 }}>
                <i className="fa-solid fa-database" style={{ color: '#c084fc', marginRight: '8px' }}></i> Database &amp; System Audit
              </span>
              <span className="badge-status badge-approved">Root Access</span>
            </div>
          </div>
        </div>

      </div>

      {/* System Database Operations (Backup, Import & Factory Reset) */}
      <div className="card-table-container" style={{ padding: '24px', marginBottom: '30px' }}>
        <div style={{ borderBottom: '1px solid #334155', paddingBottom: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            <i className="fa-solid fa-server"></i>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>System Database Operations</h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>Backup, restore or initialize system records and database files</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Export Card */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa' }}>
              <i className="fa-solid fa-download" style={{ fontSize: '1.2rem' }}></i>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Export Database Backup</h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.4' }}>
              Download a complete JSON database dump. Contains user accounts, login credentials, investments, applications, and payout records.
            </p>
            <button 
              onClick={handleExportData}
              disabled={loadingBackup}
              className="btn-action btn-view"
              style={{ width: '100%', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '0.85rem' }}
            >
              <i className="fa-solid fa-file-arrow-down"></i>
              {loadingBackup ? 'Generating snapshot...' : 'Export JSON Backup'}
            </button>
          </div>

          {/* Import Card */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#34d399' }}>
              <i className="fa-solid fa-upload" style={{ fontSize: '1.2rem' }}></i>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Import &amp; Restore Database</h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.4' }}>
              Upload a previously exported database JSON backup to restore all system records. <strong>Warning:</strong> This will replace all current data.
            </p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={loadingBackup}
              className="btn-action btn-approve"
              style={{ width: '100%', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '0.85rem' }}
            >
              <i className="fa-solid fa-file-import"></i>
              {loadingBackup ? 'Restoring snapshot...' : 'Import JSON Backup'}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportFile} 
              accept=".json" 
              style={{ display: 'none' }} 
            />
          </div>

          {/* Reset Card */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.2rem' }}></i>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Factory Reset System</h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.4' }}>
              Clear all user records, investments, applications, payouts, and inquiries. Preserves master admin authority to maintain system access.
            </p>
            <button 
              onClick={() => {
                setResetConfirmText('');
                setShowResetModal(true);
              }}
              disabled={loadingBackup}
              className="btn-action btn-reject"
              style={{ width: '100%', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '0.85rem', backgroundColor: '#991b1b', borderColor: '#b91c1c' }}
            >
              <i className="fa-solid fa-trash-can"></i>
              Factory Reset System
            </button>
          </div>
        </div>
      </div>

      {/* Session & Audit Information */}
      <div className="card-table-container" style={{ padding: '24px' }}>
        <div style={{ borderBottom: '1px solid #334155', paddingBottom: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: '#f59e0b', fontSize: '1.2rem' }}></i>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Active Session Security Logs</h3>
          </div>
          <button 
            onClick={handleCopyToken}
            className="btn-action" 
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1' }}
          >
            <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i> {copied ? 'Token Copied!' : 'Copy Security Token'}
          </button>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action / Event</th>
              <th>IP Address</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {logsList.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                  No system logs found in the database.
                </td>
              </tr>
            ) : (
              logsList.map((log) => {
                const isSuccess = log.status?.toLowerCase() === 'success';
                const isVerified = log.status?.toLowerCase() === 'verified';
                return (
                  <tr key={log.id}>
                    <td>{log.timestamp}</td>
                    <td><strong>{log.action}</strong></td>
                    <td><code>{log.ipAddress}</code></td>
                    <td>
                      <span className={`badge-status ${isSuccess || isVerified ? 'badge-approved' : 'badge-rejected'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Factory Reset Confirmation Modal */}
      {showResetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '2px solid #ef4444',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ margin: 0, color: '#fca5a5', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-circle-exclamation" style={{ color: '#ef4444' }}></i>
              Confirm System Factory Reset
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: '1.5', margin: 0 }}>
              You are about to wipe all database entries on this website. This action is <strong>irreversible</strong> and will delete all member records, investments, applications, and logs.
            </p>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px' }}>
              <span style={{ color: '#fca5a5', fontSize: '0.82rem', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                To confirm this operation, type &quot;RESET&quot; below:
              </span>
              <input 
                type="text" 
                placeholder="RESET"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px', 
                  border: '1px solid #ef4444',
                  backgroundColor: '#0f172a', 
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  letterSpacing: '2px',
                  textAlign: 'center',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                onClick={() => setShowResetModal(false)}
                className="btn-action"
                style={{ background: '#334155', color: '#cbd5e1', border: '1px solid #475569', margin: 0, padding: '8px 16px', borderRadius: '6px' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleResetData}
                disabled={resetConfirmText !== 'RESET'}
                className="btn-action btn-reject"
                style={{ 
                  background: resetConfirmText === 'RESET' ? '#dc2626' : 'rgba(220, 38, 38, 0.3)', 
                  borderColor: resetConfirmText === 'RESET' ? '#ef4444' : 'transparent',
                  color: resetConfirmText === 'RESET' ? '#ffffff' : '#94a3b8',
                  margin: 0, 
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: resetConfirmText === 'RESET' ? 'pointer' : 'not-allowed' 
                }}
              >
                Yes, Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
