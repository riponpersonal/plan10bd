'use client';

import React, { useState } from 'react';

/**
 * ProductCatalog — extracted from app/page.js
 * Props:
 *   products             {Array}  — list of products from server
 *   currentUser          {object} — currently logged in user
 *   handleOrderNow       {fn}     — function to handle ordering a product
 *   activeImageIndexes   {object} — active index of images per product
 *   setActiveImageIndexes {fn}    — state updater for activeImageIndexes
 */
export default function ProductCatalog({
  products = [],
  currentUser,
  handleOrderNow,
  activeImageIndexes = {},
  setActiveImageIndexes,
}) {
  return (
    <section className="products-section section-padding" id="products">
      <div className="container">
        <div className="section-header text-center scroll-reveal">
          <span className="section-subtitle">Our Quality Brands</span>
          <h2 className="section-title">PLAN-10 Consumer Products &amp; Appliances</h2>
          <p className="section-desc">Manufactured and marketed under strict quality compliance for Bangladeshi households.</p>
          <div className="title-underline"></div>
        </div>

        <div className="product-gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', gridColumn: '1 / -1' }} className="scroll-reveal">
              <i className="fa-solid fa-boxes-open" style={{ fontSize: '3rem', color: '#64748b', marginBottom: '16px', display: 'block' }}></i>
              <h3 style={{ color: '#ffffff', marginBottom: '8px', fontSize: '1.2rem', fontWeight: 600 }}>No Products Available</h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5' }}>
                There are currently no products registered in the system. Go to the Admin Control Panel to add new products and categories.
              </p>
            </div>
          ) : (
            products.map((p, idx) => {
              let iconClass = "fa-cube";
              if (p.category.includes("FMCG") || p.category.includes("Toiletries")) iconClass = "fa-soap";
              else if (p.name.toLowerCase().includes("blender")) iconClass = "fa-blender";
              else if (p.name.toLowerCase().includes("iron")) iconClass = "fa-shirt";
              else if (p.name.toLowerCase().includes("cooker") || p.name.toLowerCase().includes("cooktop")) iconClass = "fa-fire-burner";
              else if (p.name.toLowerCase().includes("fan")) iconClass = "fa-fan";
              else if (p.name.toLowerCase().includes("water") || p.category.includes("Purifier")) iconClass = "fa-water";

              const urls = p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls : (p.imageUrl ? [p.imageUrl] : []);
              const activeIndex = activeImageIndexes[p.id] || 0;
              const hasMultiple = urls.length > 1;

              const handlePrevImage = (e) => {
                e.stopPropagation();
                if (setActiveImageIndexes) {
                  setActiveImageIndexes(prev => ({
                    ...prev,
                    [p.id]: (activeIndex - 1 + urls.length) % urls.length
                  }));
                }
              };

              const handleNextImage = (e) => {
                e.stopPropagation();
                if (setActiveImageIndexes) {
                  setActiveImageIndexes(prev => ({
                    ...prev,
                    [p.id]: (activeIndex + 1) % urls.length
                  }));
                }
              };

              return (
                <div key={p.id} className={`product-card-premium scroll-reveal delay-${(idx % 4) * 100}`} style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative'
                }}>
                  {/* Image/Icon Header */}
                  <div style={{
                    height: '160px',
                    width: '100%',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    borderBottom: '1px solid #334155'
                  }}>
                    {urls.length > 0 ? (
                      <img src={urls[activeIndex]} alt={`${p.name} image ${activeIndex + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.2s ease' }} />
                    ) : (
                      <div style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '50%',
                        background: 'rgba(16, 185, 129, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}>
                        <i className={`fa-solid ${iconClass}`} style={{ color: '#10b981', fontSize: '2.2rem' }}></i>
                      </div>
                    )}
                    
                    {/* Navigation chevrons overlay if multiple images exist */}
                    {hasMultiple && (
                      <>
                        <button 
                          onClick={handlePrevImage}
                          style={{
                            position: 'absolute',
                            left: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'rgba(15, 23, 42, 0.75)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            padding: 0,
                            zIndex: 10
                          }}
                          title="Previous Image"
                        >
                          <i className="fa-solid fa-chevron-left"></i>
                        </button>
                        <button 
                          onClick={handleNextImage}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'rgba(15, 23, 42, 0.75)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            padding: 0,
                            zIndex: 10
                          }}
                          title="Next Image"
                        >
                          <i className="fa-solid fa-chevron-right"></i>
                        </button>

                        {/* Slide Indicator Dots */}
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          gap: '6px',
                          zIndex: 10,
                          backgroundColor: 'rgba(15, 23, 42, 0.6)',
                          padding: '4px 8px',
                          borderRadius: '10px'
                        }}>
                          {urls.map((_, i) => (
                            <div 
                              key={i} 
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: i === activeIndex ? '#10b981' : 'rgba(255, 255, 255, 0.4)',
                                transition: 'background-color 0.2s ease'
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Category Overlay */}
                    <span style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(4px)',
                      color: '#34d399',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      border: '1px solid rgba(52, 211, 153, 0.2)',
                      zIndex: 5
                    }}>
                      {p.category}
                    </span>

                    {/* Stock Status Badge */}
                    <span style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      backgroundColor: p.stockStatus === 'IN_STOCK' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
                      color: '#ffffff',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      zIndex: 5
                    }}>
                      {p.stockStatus === 'IN_STOCK' ? 'IN STOCK' : 'OUT OF STOCK'}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: '16px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                      {p.brand}
                    </span>
                    <h4 style={{ fontSize: '1rem', margin: '0 0 4px 0', fontWeight: 700, color: '#fff' }}>
                      {p.name}
                    </h4>
                    <p style={{
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.4'
                    }}>
                      {p.description}
                    </p>
                  </div>

                  {/* Price & Action Footer */}
                  <div style={{
                    padding: '12px 16px',
                    borderTop: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#0f172a'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Price</span>
                      <strong style={{ fontSize: '1.1rem', color: '#10b981', fontWeight: 800 }}>৳{Math.round(p.price).toLocaleString('en-IN')}</strong>
                    </div>
                    
                    {(() => {
                      const isOutOfStock = p.stockStatus !== 'IN_STOCK';

                      return (
                        <button
                          onClick={() => handleOrderNow && handleOrderNow(p)}
                          disabled={isOutOfStock}
                          className="btn"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            backgroundColor: isOutOfStock ? '#334155' : '#10b981',
                            color: isOutOfStock ? '#64748b' : '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            margin: 0,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <i className={`fa-solid ${isOutOfStock ? 'fa-ban' : 'fa-cart-shopping'}`}></i>
                          {isOutOfStock ? 'Sold Out' : 'Order Now'}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="catalog-cta text-center mt-5">
          <h3>Want to become a local dealer or stockist for PLAN-10 products?</h3>
          <p>Join our direct distribution network and earn exclusive commissions on wholesale retail orders.</p>
          <a href="#contact" className="btn btn-primary mt-2"><i className="fa-solid fa-boxes-packing"></i> Become a Distributer</a>
        </div>
      </div>
    </section>
  );
}
