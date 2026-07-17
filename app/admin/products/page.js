'use client';

import React, { useState, useEffect } from 'react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  
  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [stockStatus, setStockStatus] = useState('IN_STOCK');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4500);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      } else {
        setError(data.message || 'Failed to load products.');
      }
    } catch (err) {
      setError('Connection error. Could not fetch products.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
        if (data.categories.length > 0 && !category) {
          setCategory(data.categories[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchProducts();
      fetchCategories();
    }, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentProductId(null);
    setName('');
    setPrice('');
    setBrand('');
    setCategory(categories.length > 0 ? categories[0] : '');
    setDescription('');
    setImageUrl('');
    setImageUrls([]);
    setStockStatus('IN_STOCK');
    setShowModal(true);
  };

  const handleOpenEditModal = (product) => {
    setIsEditing(true);
    setCurrentProductId(product.id);
    setName(product.name || '');
    setPrice(product.price || '');
    setBrand(product.brand || '');
    setCategory(product.category || (categories.length > 0 ? categories[0] : ''));
    setDescription(product.description || '');
    setImageUrl(product.imageUrl || '');
    setImageUrls(product.imageUrls || (product.imageUrl ? [product.imageUrl] : []));
    setStockStatus(product.stockStatus || 'IN_STOCK');
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const newUploadedUrls = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'x-admin-role': 'ADMIN'
          },
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          newUploadedUrls.push(data.url);
        }
      } catch (err) {
        console.error('File upload error for:', file.name, err);
      }
    }

    if (newUploadedUrls.length > 0) {
      setImageUrls(prev => [...prev, ...newUploadedUrls]);
    }
    setUploading(false);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      price: Number(price) || 0,
      brand,
      category,
      description,
      imageUrl: imageUrls[0] || '',
      imageUrls,
      stockStatus
    };

    try {
      let res;
      if (isEditing) {
        res = await fetch(`/api/products?id=${currentProductId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-role': 'ADMIN'
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-role': 'ADMIN'
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchProducts();
        showNotification(isEditing ? 'Product updated successfully!' : 'Product added successfully!', 'success');
      } else {
        showNotification(data.message || 'Failed to save product.', 'error');
      }
    } catch (err) {
      showNotification('Error occurred while saving product.', 'error');
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': 'ADMIN'
        },
        body: JSON.stringify({ name: newCategoryName })
      });
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
        setCategory(newCategoryName.trim()); // auto-select newly created category
        setNewCategoryName('');
        setShowCategoryModal(false);
        showNotification('Category created successfully!', 'success');
      } else {
        showNotification(data.message || 'Failed to save category.', 'error');
      }
    } catch (err) {
      showNotification('Error occurred while adding category.', 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-role': 'ADMIN'
        }
      });
      const data = await res.json();
      if (data.success) {
        fetchProducts();
        showNotification('Product deleted successfully!', 'success');
      } else {
        showNotification(data.message || 'Failed to delete product.', 'error');
      }
    } catch (err) {
      showNotification('Error occurred while deleting product.', 'error');
    }
  };

  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>PLAN-10 Branded Products & Sectors CMS</h2>
          <p style={{ color: '#64748b', margin: 0 }}>Manage consumer goods, home appliances, and sector portfolios listed on the portal.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setShowCategoryModal(true)} 
            className="btn-action btn-view" 
            style={{ padding: '10px 18px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-solid fa-folder-plus"></i> Add Category
          </button>
          <button 
            onClick={handleOpenAddModal} 
            className="btn-action btn-approve" 
            style={{ padding: '10px 18px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-solid fa-plus"></i> Add New Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8' }}></i>
          <input 
            type="text"
            placeholder="Search by product title, category or brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flexGrow: 1,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: '8px' }}></i> Loading products...
        </div>
      ) : error ? (
        <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', textAlign: 'center' }}>
          {error}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ padding: '40px', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', textAlign: 'center', color: '#94a3b8' }}>
          <i className="fa-solid fa-box-open" style={{ fontSize: '2rem', display: 'block', marginBottom: '12px' }}></i>
          No products found. Click &quot;Add New Product&quot; to create one.
        </div>
      ) : (
        <div className="card-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product Info</th>
                <th>Category</th>
                <th>Brand / Specification</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '45px',
                        height: '45px',
                        borderRadius: '8px',
                        background: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <i className="fa-solid fa-cube" style={{ color: '#60a5fa', fontSize: '1.2rem' }}></i>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                        <small style={{ color: '#64748b', display: 'inline-block', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.description}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '4px 8px', borderRadius: '4px', fontSize: '0.82rem' }}>
                      {p.category}
                    </span>
                  </td>
                  <td>{p.brand}</td>
                  <td style={{ fontWeight: 'bold', color: '#10b981' }}>{formatBDT(p.price)}</td>
                  <td>
                    <span className={`badge-status ${p.stockStatus === 'IN_STOCK' ? 'badge-active' : 'badge-pending'}`}>
                      {p.stockStatus === 'IN_STOCK' ? 'IN STOCK' : 'OUT OF STOCK'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleOpenEditModal(p)} 
                        className="btn-action btn-view"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <i className="fa-solid fa-pen"></i> Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(p.id)} 
                        className="btn-action btn-view" 
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <i className="fa-solid fa-trash"></i> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <form 
            onSubmit={handleSaveProduct}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>
                <i className="fa-solid fa-box" style={{ color: '#60a5fa', marginRight: '8px' }}></i>
                {isEditing ? 'Modify Product Details' : 'Add Brand Product'}
              </h3>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.3rem' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Product Title *</label>
                <input 
                  type="text" 
                  required
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. High-Speed Ceiling Fan"
                  style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Price BDT (৳) *</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    placeholder="e.g. 3500"
                    style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Brand Name</label>
                  <input 
                    type="text" 
                    value={brand} 
                    onChange={(e) => setBrand(e.target.value)} 
                    placeholder="e.g. PLAN-10 Smart Appliances"
                    style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>
                    Category * 
                    <button 
                      type="button" 
                      onClick={() => setShowCategoryModal(true)} 
                      style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '0.78rem', marginLeft: '8px', padding: 0 }}
                    >
                      <i className="fa-solid fa-plus-circle"></i> Add New
                    </button>
                  </label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Stock Availability</label>
                  <select 
                    value={stockStatus} 
                    onChange={(e) => setStockStatus(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                  >
                    <option value="IN_STOCK">IN STOCK</option>
                    <option value="OUT_OF_STOCK">OUT OF STOCK</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Product Images (Multiple allowed)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input 
                      type="file" 
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                      id="product-image-file"
                    />
                    <label 
                      htmlFor="product-image-file"
                      style={{
                        padding: '10px 16px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#38bdf8',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        userSelect: 'none'
                      }}
                    >
                      <i className="fa-solid fa-cloud-arrow-up"></i> {uploading ? 'Uploading...' : 'Upload Image Files'}
                    </label>
                  </div>
                  
                  {imageUrls.length > 0 && (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: '#0f172a', padding: '12px', borderRadius: '12px', border: '1px solid #334155' }}>
                      {imageUrls.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
                          <img src={url} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {idx === 0 && (
                            <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(16, 185, 129, 0.95)', color: '#fff', fontSize: '0.62rem', textAlign: 'center', fontWeight: 700, padding: '2px 0' }}>
                              COVER
                            </span>
                          )}
                          <button 
                            type="button" 
                            onClick={() => setImageUrls(prev => prev.filter((_, i) => i !== idx))}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: 'rgba(239, 68, 68, 0.9)',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              padding: 0
                            }}
                            title="Remove"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <small style={{ color: '#64748b', marginTop: '6px', display: 'block' }}>Upload one or more images directly from your device. The first image will be used as the cover image.</small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Description</label>
                <textarea 
                  rows="3"
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Enter details about this product..."
                  style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none', resize: 'vertical' }}
                ></textarea>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="btn-action btn-view"
                style={{ margin: 0 }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-action btn-approve"
                style={{ margin: 0, padding: '10px 20px' }}
              >
                {isEditing ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2100,
          padding: '20px'
        }}>
          <form 
            onSubmit={handleSaveCategory}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '450px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>
                <i className="fa-solid fa-folder-plus" style={{ color: '#60a5fa', marginRight: '8px' }}></i>
                Create Product Category
              </h3>
              <button 
                type="button"
                onClick={() => setShowCategoryModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Category Name *</label>
              <input 
                type="text" 
                required
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)} 
                placeholder="e.g. Household Groceries"
                style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>This category will immediately become selectable in the Product creation form dropdown menu.</span>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => setShowCategoryModal(false)}
                className="btn-action btn-view"
                style={{ margin: 0 }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-action btn-approve"
                style={{ margin: 0 }}
              >
                Create Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Alert Notification */}
      {notification.show && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: notification.type === 'success' ? '#065f46' : '#991b1b',
          border: notification.type === 'success' ? '1px solid #059669' : '1px solid #dc2626',
          borderRadius: '12px',
          padding: '16px 20px',
          color: '#fff',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          animation: 'fadeInUp 0.3s ease-out'
        }}>
          <i className={notification.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'} style={{ fontSize: '1.25rem', color: notification.type === 'success' ? '#34d399' : '#f87171' }}></i>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.88rem' }}>{notification.type === 'success' ? 'Success' : 'Action Failed'}</span>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>{notification.message}</span>
          </div>
          <button 
            type="button"
            onClick={() => setNotification({ show: false, message: '', type: 'success' })}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.7, padding: 0, marginLeft: '8px', display: 'flex', alignItems: 'center' }}
            title="Dismiss"
          >
            <i className="fa-solid fa-xmark" style={{ fontSize: '1rem' }}></i>
          </button>
        </div>
      )}
    </div>
  );
}
