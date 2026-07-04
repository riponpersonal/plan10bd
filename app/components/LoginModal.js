'use client';

import React from 'react';

/**
 * LoginModal — extracted from app/page.js
 * Props:
 *   isOpen          {bool}   — whether the modal is visible
 *   onClose         {fn}     — called to close the modal
 *   onSwitchToApply {fn}     — called when user clicks "Create Account"
 *   onLoginSuccess  {fn}     — called with (userObj, redirectUrl) on success
 *   showToast       {fn}     — show toast notification
 */
export default function LoginModal({ isOpen, onClose, onSwitchToApply, onLoginSuccess, showToast }) {
  const [loginUsername, setLoginUsername] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleClose = () => {
    setLoginUsername('');
    setLoginPassword('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      setIsLoggingIn(false);

      if (data.success) {
        const userObj = {
          name: data.name,
          username: data.username,
          role: data.role
        };
        showToast && showToast(data.message, 'success');
        handleClose();
        onLoginSuccess && onLoginSuccess(userObj, data.redirectUrl);
      } else {
        showToast && showToast(data.message || 'Authentication failed', 'error');
      }
    } catch (err) {
      setIsLoggingIn(false);
      showToast && showToast('Server connection error. Please try again.', 'error');
    }
  };

  return (
    <div className={`modal-backdrop ${isOpen ? 'active' : ''}`}>
      <div className="modal-content">
        <div className="modal-header">
          <h3><i className="fa-solid fa-user-lock"></i> PLAN-10 Portal Authentication</h3>
          <button className="modal-close" onClick={handleClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group mb-3">
              <label>Mobile Number / Member ID / Admin Username *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 017XXXXXXXX or Plan10-101"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group mb-3">
              <label>Password / Security Key *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block mt-3" disabled={isLoggingIn}>
              <i className={`fa-solid ${isLoggingIn ? 'fa-spinner fa-spin' : 'fa-right-to-bracket'}`}></i>{' '}
              {isLoggingIn ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
            <p style={{ marginTop: '16px', fontSize: '0.85rem', textAlign: 'center', color: '#94a3b8' }}>
              Don&apos;t have an account?{' '}
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); handleClose(); onSwitchToApply && onSwitchToApply(); }}
                style={{ color: '#10b981', fontWeight: 600 }}
              >
                Create Account / Apply Now
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
