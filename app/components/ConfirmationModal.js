'use client';

import React from 'react';

/**
 * ConfirmationModal — Custom confirmation modal for ordering products again.
 * Props:
 *   isOpen      {boolean}  — whether the modal is visible
 *   onClose     {function} — called when user clicks Cancel/Close/No
 *   onConfirm   {function} — called when user clicks Yes
 *   productName {string}   — the name of the product
 */
export default function ConfirmationModal({ isOpen, onClose, onConfirm, productName }) {
  if (!isOpen) return null;

  return (
    <div className={`modal-backdrop active`} style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '450px', padding: '24px' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24' }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
            Duplicate Order Warning
          </h3>
          <button className="modal-close" onClick={onClose} style={{ fontSize: '24px', cursor: 'pointer', background: 'none', border: 'none', color: '#94a3b8' }}>&times;</button>
        </div>
        <div className="modal-body" style={{ color: '#e2e8f0', marginBottom: '24px', lineHeight: '1.5' }}>
          <p>
            You have already ordered <strong>{productName}</strong>.
          </p>
          <p style={{ marginTop: '8px' }}>
            Are you sure you want to order this product again?
          </p>
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#334155',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            No
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Yes, Order Again
          </button>
        </div>
      </div>
    </div>
  );
}
