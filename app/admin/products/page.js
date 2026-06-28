'use client';

import React from 'react';

export default function AdminProductsPage() {
  const products = [
    { id: 1, name: 'Electric Blenders & Juicers', brand: 'PLAN-10 Smart Appliances', category: 'FMCG & Home Electronics', status: 'ACTIVE' },
    { id: 2, name: 'Induction & Cooktops', brand: 'Energy Efficient 2000W', category: 'FMCG & Home Electronics', status: 'ACTIVE' },
    { id: 3, name: 'Heavy Dry Irons', brand: 'Non-stick Coating', category: 'FMCG & Home Electronics', status: 'ACTIVE' },
    { id: 4, name: 'Electric Pressure Cookers', brand: 'Multi-functional Smart Cooker', category: 'FMCG & Home Electronics', status: 'ACTIVE' },
    { id: 5, name: 'Hygiene Soaps & Shampoos', brand: 'PLAN-10 Herbal & Beauty', category: 'Toiletries & Toiletries', status: 'ACTIVE' },
    { id: 6, name: 'High-Speed Ceiling Fans', brand: 'Aerodynamic Blades', category: 'Electrical Appliances', status: 'ACTIVE' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>PLAN-10 Branded Products & Sectors CMS</h2>
          <p style={{ color: '#64748b' }}>Manage consumer goods, home appliances, and sector portfolios listed on the portal.</p>
        </div>
        <button className="btn-action btn-approve" style={{ padding: '10px 18px', fontSize: '0.9rem' }}>
          <i className="fa-solid fa-plus"></i> Add New Product
        </button>
      </div>

      <div className="card-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product Title</th>
              <th>Brand / Specification</th>
              <th>Category</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>#{p.id}</td>
                <td><strong>{p.name}</strong></td>
                <td>{p.brand}</td>
                <td><span style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{p.category}</span></td>
                <td><span className="badge-status badge-active">{p.status}</span></td>
                <td>
                  <button className="btn-action btn-view"><i className="fa-solid fa-pen"></i> Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
