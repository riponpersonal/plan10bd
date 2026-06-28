'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboardOverview() {
  const [apps, setApps] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [resApps, resMembers] = await Promise.all([
          fetch('/api/applications'),
          fetch('/api/members')
        ]);
        const dataApps = await resApps.json();
        const dataMembers = await resMembers.json();

        if (dataApps.success) setApps(dataApps.applications);
        if (dataMembers.success) setMembers(dataMembers.members);
      } catch (e) {
        console.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalCapital = members.reduce((acc, m) => acc + (m.capitalInvested || 0), 0);
  const totalMonthlyObligation = members.reduce((acc, m) => acc + (m.monthlyTotalPayout || 0), 0);
  const pendingApps = apps.filter((a) => a.status === 'PENDING').length;

  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  return (
    <div>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-info">
            <h4>Total Managed Capital</h4>
            <h3 className="metric-number">{formatBDT(totalCapital)}</h3>
          </div>
          <div className="metric-icon icon-blue">
            <i className="fa-solid fa-vault"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Monthly Disbursal Obligation</h4>
            <h3 className="metric-number">{formatBDT(totalMonthlyObligation)}</h3>
          </div>
          <div className="metric-icon icon-green">
            <i className="fa-solid fa-hand-holding-dollar"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Pending SPL Applications</h4>
            <h3 className="metric-number">{pendingApps}</h3>
          </div>
          <div className="metric-icon icon-amber">
            <i className="fa-solid fa-clock"></i>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Active Investors / Members</h4>
            <h3 className="metric-number">{members.length}</h3>
          </div>
          <div className="metric-icon icon-purple">
            <i className="fa-solid fa-users"></i>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="card-table-container">
        <div className="table-header-row">
          <h3>Recent SPL Investment Submissions</h3>
          <Link href="/admin/applications" className="btn-action btn-view">
            View All Applications ({apps.length})
          </Link>
        </div>

        {loading ? (
          <p style={{ padding: '24px' }}>Loading real-time data...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>App ID</th>
                <th>Applicant Name</th>
                <th>Mobile Contact</th>
                <th>Capital Amount</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.slice(0, 5).map((app) => (
                <tr key={app.id}>
                  <td><strong>{app.id}</strong></td>
                  <td>{app.applicantName}</td>
                  <td>{app.phone}</td>
                  <td><strong>{formatBDT(app.capitalAmount)}</strong></td>
                  <td>{app.durationMonths} Mos</td>
                  <td>
                    <span className={`badge-status badge-${app.status.toLowerCase()}`}>
                      {app.status}
                    </span>
                  </td>
                  <td>
                    <Link href="/admin/applications" className="btn-action btn-view">
                      Process
                    </Link>
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
