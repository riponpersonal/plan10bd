'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import '../../admin.css';

export default function ReferralCommissionsPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetch('/api/members');
        const data = await res.json();
        if (data.success) {
          setMembers(data.members || []);
        }
      } catch (e) {
        console.error('Failed to load active members', e);
      } finally {
        setLoading(false);
      }
    }
    loadMembers();
  }, []);

  // Compute all referral distribution events
  const referralEvents = useMemo(() => {
    return members
      .filter(m => m.referredBy && members.some(parent => parent.memberId === m.referredBy))
      .map(m => {
        const sponsor = members.find(parent => parent.memberId === m.referredBy);
        return {
          sponsorName: sponsor ? sponsor.name : m.referredBy,
          sponsorId: m.referredBy,
          referredName: m.name,
          referredId: m.memberId,
          capital: m.capitalInvested,
          commissionAmount: m.capitalInvested * 0.06,
          date: m.joinDate
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [members]);

  // Filter based on search query
  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return referralEvents;
    return referralEvents.filter(
      evt =>
        evt.sponsorName.toLowerCase().includes(q) ||
        evt.sponsorId.toLowerCase().includes(q) ||
        evt.referredName.toLowerCase().includes(q) ||
        evt.referredId.toLowerCase().includes(q)
    );
  }, [referralEvents, searchQuery]);

  const totalReferralCommissions = useMemo(() => {
    return referralEvents.reduce((acc, evt) => acc + evt.commissionAmount, 0);
  }, [referralEvents]);

  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  return (
    <div>
      {/* Header section */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Referral Commissions Distributed (Flat 6%)</h2>
          <p style={{ color: '#64748b' }}>Complete audit log of 6% sponsor rewards distributed to members.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/admin" className="btn-action btn-view" style={{ background: '#3b82f6', color: '#fff' }}>
            <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
          </Link>
          <Link href="/admin/referrals" className="btn-action btn-view">
            <i className="fa-solid fa-sitemap"></i> View Referral Tree
          </Link>
        </div>
      </div>

      {/* Network Stats Cards */}
      <div className="metrics-grid" style={{ marginBottom: '30px' }}>
        <div className="metric-card">
          <div className="metric-info">
            <h4>Total Distributed Commission</h4>
            <h3 className="metric-number" style={{ color: '#10b981' }}>{formatBDT(totalReferralCommissions)}</h3>
          </div>
          <div className="metric-icon icon-green">
            <i className="fa-solid fa-coins"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Total Commission Payments</h4>
            <h3 className="metric-number">{referralEvents.length}</h3>
          </div>
          <div className="metric-icon icon-blue">
            <i className="fa-solid fa-gift"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Unique Active Sponsors</h4>
            <h3 className="metric-number">
              {new Set(referralEvents.map(evt => evt.sponsorId)).size}
            </h3>
          </div>
          <div className="metric-icon icon-purple">
            <i className="fa-solid fa-user-check"></i>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="search-bar-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#1e293b', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #334155' }}>
        <i className="fa-solid fa-magnifying-glass" style={{ color: '#64748b' }}></i>
        <input 
          type="text" 
          placeholder="Filter by Sponsor or Referred Member Name / ID..." 
          style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '0.95rem' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table Log */}
      <div className="card-table-container">
        {loading ? (
          <p style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading referral logs...</p>
        ) : filteredEvents.length === 0 ? (
          <p style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No referral commissions match your criteria.</p>
        ) : (
          <table className="admin-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Sponsor Name & ID</th>
                <th>Referred Member</th>
                <th>Capital Balance</th>
                <th>Sponsor Bonus (6%)</th>
                <th>Joining Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((evt, idx) => (
                <tr key={idx}>
                  <td>
                    <div><strong>{evt.sponsorName}</strong></div>
                    <small style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{evt.sponsorId}</small>
                  </td>
                  <td>
                    <div><strong>{evt.referredName}</strong></div>
                    <small style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{evt.referredId}</small>
                  </td>
                  <td>
                    <strong>{formatBDT(evt.capital)}</strong>
                  </td>
                  <td style={{ color: '#10b981', fontWeight: 700 }}>
                    {formatBDT(evt.commissionAmount)}
                  </td>
                  <td>
                    {evt.date}
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
