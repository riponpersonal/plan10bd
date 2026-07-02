'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// Helper functions for nonlinear slider conversion & formatting outside component scope for fast refresh stability
const sliderToAmount = (val) => {
  let amt = 10000;
  if (val <= 25) {
    amt = 10000 + (val / 25) * 90000;
    amt = Math.round(amt / 5000) * 5000;
  } else if (val <= 50) {
    amt = 100000 + ((val - 25) / 25) * 400000;
    amt = Math.round(amt / 10000) * 10000;
  } else if (val <= 75) {
    amt = 500000 + ((val - 50) / 25) * 2000000;
    amt = Math.round(amt / 50000) * 50000;
  } else {
    amt = 2500000 + ((val - 75) / 25) * 7500000;
    amt = Math.round(amt / 100000) * 100000;
  }
  return Math.min(10000000, Math.max(10000, amt));
};

const amountToSlider = (amt) => {
  const cleanAmt = Math.min(10000000, Math.max(10000, Number(amt) || 10000));
  if (cleanAmt <= 100000) {
    return ((cleanAmt - 10000) / 90000) * 25;
  } else if (cleanAmt <= 500000) {
    return 25 + ((cleanAmt - 100000) / 400000) * 25;
  } else if (cleanAmt <= 2500000) {
    return 50 + ((cleanAmt - 500000) / 2000000) * 25;
  } else {
    return 75 + ((cleanAmt - 2500000) / 7500000) * 25;
  }
};



export default function Home() {
  const router = useRouter();

  // 1. Navigation & UI State
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('hero');
  const [sectorFilter, setSectorFilter] = useState('all');

  // 2. Dynamic Calculator State
  const [investAmount, setInvestAmount] = useState(100000);
  const [investDuration, setInvestDuration] = useState(33); // Months: 12, 24, 33, 36
  const [calcView, setCalcView] = useState('summary'); // 'summary' or 'schedule'

  // 3. Modals & Authentication State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // SPL Application Form State
  const [appApplicantName, setAppApplicantName] = useState('');
  const [appNid, setAppNid] = useState('');
  const [appFatherName, setAppFatherName] = useState('');
  const [appPhone, setAppPhone] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [appAddress, setAppAddress] = useState('');
  const [appNomineeName, setAppNomineeName] = useState('');
  const [appRelation, setAppRelation] = useState('');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  // 4. Toast Notifications
  const [toasts, setToasts] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeImageIndexes, setActiveImageIndexes] = useState({});
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryArea, setInquiryArea] = useState('');
  const [inquiryTopic, setInquiryTopic] = useState('Investment');
  const [inquiryMessage, setInquiryMessage] = useState('');

  // 5. Product Orders State
  const [userOrders, setUserOrders] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [appPurpose, setAppPurpose] = useState('Investment');

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.success && data.products) {
          setProducts(data.products);
        }
      } catch (err) {
        console.error('Failed to fetch products on homepage:', err);
      }
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    async function fetchUserOrders() {
      if (!currentUser) {
        setUserOrders([]);
        return;
      }
      try {
        const res = await fetch(`/api/orders?username=${encodeURIComponent(currentUser.username || currentUser.phone || '')}`);
        const data = await res.json();
        if (data.success && data.orders) {
          setUserOrders(data.orders);
        }
      } catch (err) {
        console.error('Failed to fetch user orders:', err);
      }
    }
    fetchUserOrders();
  }, [currentUser]);

  const handleOrderInquiry = (product) => {
    setInquiryTopic('Products');
    setInquiryMessage(`I would like to place an order / make an inquiry for the PLAN-10 product:\n\n- Product Name: ${product.name}\n- Brand: ${product.brand}\n- Price: ৳ ${product.price.toLocaleString()} BDT\n\nPlease let me know the distributor availability, wholesale discounts, and secure payment procedures.`);
    
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
    showToast(`Pre-filled inquiry form for: ${product.name}! Scroll down to review.`, 'info');
  };

  const handleOrderNow = async (product) => {
    if (!currentUser) {
      setSelectedProductId(product.id);
      setIsLoginModalOpen(true);
      showToast('Please sign in or create an account to purchase products.', 'info');
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username || currentUser.phone || '',
          productId: product.id
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Your product order was placed successfully and is pending admin review!', 'success');
        const freshRes = await fetch(`/api/orders?username=${encodeURIComponent(currentUser.username || currentUser.phone || '')}`);
        const freshData = await freshRes.json();
        if (freshData.success && freshData.orders) {
          setUserOrders(freshData.orders);
        }
      } else {
        showToast(data.message || 'Failed to place order.', 'error');
      }
    } catch (err) {
      showToast('Error placing order. Please try again.', 'error');
    }
  };

  const getProductOrderStatus = (productId) => {
    if (!currentUser) return null;
    const order = userOrders.find(o => o.productId === productId);
    return order ? order.status : null;
  };

  // Restore login session from localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('plan10_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Failed to restore session');
    }
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('plan10_user');
    setProfileDropdownOpen(false);
    showToast('Logged out successfully', 'info');
  };

  // Scroll Handler
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      const sections = ['hero', 'about', 'sectors', 'products', 'investment', 'contact'];
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop - 120;
          const height = el.offsetHeight;
          if (window.scrollY >= top && window.scrollY < top + height) {
            setActiveNav(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dynamic Investment Calculations
  const principal = Number(investAmount) || 0;
  const monthlyProfit = (principal / 100000) * 3000;
  const monthlyCapital = (principal / investDuration);
  const monthlyTotal = monthlyProfit + monthlyCapital;
  const grandTotal = monthlyTotal * investDuration;
  const netProfitTotal = monthlyProfit * investDuration;
  const capitalRefundTotal = monthlyCapital * investDuration;
  const roiPercent = principal > 0 ? (((grandTotal - principal) / principal) * 100).toFixed(1) : 0;

  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  return (
    <div>
      {/* Header / Navbar */}
      <header className={`navbar-header ${isScrolled ? 'scrolled' : ''}`} id="navbar">
        <div className="container nav-container">
          <a href="#" className="brand-logo">
            <div className="logo-icon">
              <i className="fa-solid fa-chart-line"></i>
              <span>P10</span>
            </div>
            <div className="logo-text">
              <span className="brand-name">PLAN-10 BD <small>(PVT). LTD</small></span>
              <span className="brand-tagline">Build, Grow & Earn Together</span>
            </div>
          </a>

          <nav className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`} id="navMenu">
            <a href="#hero" className={`nav-link ${activeNav === 'hero' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Home</a>
            <a href="#about" className={`nav-link ${activeNav === 'about' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>About Us</a>
            <a href="#sectors" className={`nav-link ${activeNav === 'sectors' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Sectors & Projects</a>
            <a href="#products" className={`nav-link ${activeNav === 'products' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Consumer Products</a>
            <a href="#investment" className={`nav-link highlight-link ${activeNav === 'investment' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}><i className="fa-solid fa-calculator"></i> Investment Plan</a>
            <a href="#contact" className={`nav-link ${activeNav === 'contact' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Contact</a>

            <div className="mobile-menu-actions">
              {!currentUser ? (
                <>
                  <button className="btn btn-outline" onClick={() => { setMobileMenuOpen(false); setIsLoginModalOpen(true); }}><i className="fa-solid fa-right-to-bracket"></i> Login</button>
                  <button className="btn btn-primary" onClick={() => { setMobileMenuOpen(false); setIsFormModalOpen(true); }}><i className="fa-solid fa-hand-holding-dollar"></i> Apply Now</button>
                </>
              ) : (
                <div style={{ padding: '16px 0', borderTop: '1px solid rgba(255, 255, 255, 0.15)', marginTop: '12px', width: '100%' }}>
                  <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '12px', fontSize: '1.05rem', textAlign: 'center' }}>
                    <i className="fa-solid fa-circle-user text-primary" style={{ fontSize: '1.4rem', color: '#34d399', marginRight: '6px' }}></i> {currentUser.name}
                    <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500, marginTop: '2px' }}>Account ID: {currentUser.username}</small>
                  </div>
                  {currentUser.role === 'ADMIN' ? (
                    <a href="/admin" className="btn btn-primary" style={{ width: '100%', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-gauge"></i> Admin Dashboard
                    </a>
                  ) : (
                    <a href="/dashboard" className="btn btn-primary" style={{ width: '100%', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#059669', borderColor: '#059669' }}>
                      <i className="fa-solid fa-user-gear"></i> Go to Member Profile
                    </a>
                  )}
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="btn btn-outline" style={{ width: '100%', color: '#fca5a5', borderColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700 }}>
                    <i className="fa-solid fa-right-from-bracket"></i> Sign Out
                  </button>
                </div>
              )}
            </div>
          </nav>

          <div className="nav-actions">
            {!currentUser ? (
              <>
                <button className="btn btn-outline" onClick={() => setIsLoginModalOpen(true)}><i className="fa-solid fa-right-to-bracket"></i> Login</button>
                <button className="btn btn-primary" onClick={() => setIsFormModalOpen(true)}><i className="fa-solid fa-hand-holding-dollar"></i> Apply Now</button>
              </>
            ) : (
              <div className="profile-nav-wrapper" style={{ position: 'relative' }}>
                <button
                  className="btn btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '30px', padding: '6px 16px', background: '#1e293b', borderColor: '#334155' }}
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                >
                  <i className="fa-solid fa-circle-user" style={{ fontSize: '1.3rem', color: '#34d399' }}></i>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{currentUser.name}</span>
                  <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.75rem', color: '#94a3b8' }}></i>
                </button>
                {profileDropdownOpen && (
                  <div className="profile-dropdown-menu" style={{ position: 'absolute', right: 0, top: '120%', backgroundColor: '#1e293b', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', borderRadius: '12px', padding: '12px', minWidth: '220px', zIndex: 1000, border: '1px solid #334155' }}>
                    <div style={{ paddingBottom: '8px', marginBottom: '8px', borderBottom: '1px solid #334155' }}>
                      <strong style={{ display: 'block', color: '#ffffff', fontSize: '0.95rem' }}>{currentUser.name}</strong>
                      <small style={{ color: '#94a3b8' }}>{currentUser.role === 'ADMIN' ? 'Corporate Executive Admin' : `Account ID: ${currentUser.username}`}</small>
                    </div>
                    {currentUser.role === 'ADMIN' ? (
                      <a href="/admin" className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', color: '#60a5fa', textDecoration: 'none', fontWeight: 600, borderRadius: '6px', backgroundColor: 'rgba(37, 99, 235, 0.15)', marginBottom: '6px' }}>
                        <i className="fa-solid fa-gauge"></i> Admin Dashboard
                      </a>
                    ) : (
                      <a href="/dashboard" className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', color: '#34d399', textDecoration: 'none', fontWeight: 600, borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', marginBottom: '6px' }}>
                        <i className="fa-solid fa-user-gear"></i> Member Profile
                      </a>
                    )}
                    <button
                      onClick={handleLogout}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '8px 10px', color: '#fca5a5', background: 'rgba(220, 38, 38, 0.15)', border: 'none', cursor: 'pointer', fontWeight: 600, borderRadius: '6px' }}
                    >
                      <i className="fa-solid fa-right-from-bracket"></i> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
            <button className="menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle Menu">
              <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section" id="hero">
        <div className="hero-overlay"></div>
        <div className="container hero-container">
          <div className="hero-content">
            <h1 className="hero-title">Real Products. <br /><span className="gradient-text">Real Business. Real Growth.</span></h1>
            <p className="hero-description">
              Welcome to <strong>PLAN-10 BD (PVT). LTD</strong>, a premier Bangladesh-based multi-sector investment enterprise. We drive sustainable growth across Agro Farming, Fisheries, Real Estate, FMCG Manufacturing, and Direct Consumer Networks through transparent profit-sharing model.
            </p>
            <div className="hero-cta-group">
              <a href="#investment" className="btn btn-lg btn-primary"><i className="fa-solid fa-chart-pie"></i> Explore Investment Scheme</a>
              {!currentUser ? (
                <button className="btn btn-lg btn-glass" onClick={() => setIsFormModalOpen(true)}><i className="fa-solid fa-file-signature"></i> Apply Online Now</button>
              ) : currentUser.role === 'ADMIN' ? (
                <a href="/admin" className="btn btn-lg btn-glass"><i className="fa-solid fa-gauge"></i> Go to Admin Dashboard</a>
              ) : (
                <a href="/dashboard" className="btn btn-lg btn-glass"><i className="fa-solid fa-user-gear"></i> Go to Member Profile</a>
              )}
            </div>

            <div className="hero-stats">
              <div className="stat-card">
                <span className="stat-number">33</span>
                <span className="stat-label">Months Fixed Term</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">6,000<span className="stat-unit">৳</span></span>
                <span className="stat-label">Monthly Return / 1 Lakh</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">10+</span>
                <span className="stat-label">Active Sectors</span>
              </div>
            </div>
          </div>

          <div className="hero-card-visual">
            <div className="glass-card main-card">
              <div className="card-header-badge">Smart Investment Scheme</div>
              <div className="investment-summary">
                <h3>33-Month Halal Return Plan</h3>
                <p>For every ৳1,00,000 Capital Investment:</p>
                <div className="breakdown-grid">
                  <div className="b-item">
                    <span className="b-label"><i className="fa-solid fa-coins"></i> Monthly Profit</span>
                    <span className="b-val text-success">৳3,000</span>
                  </div>
                  <div className="b-item">
                    <span className="b-label"><i className="fa-solid fa-rotate-left"></i> Capital Refund</span>
                    <span className="b-val text-info">৳3,000</span>
                  </div>
                </div>
                <div className="total-payout">
                  <span>Total Monthly Return:</span>
                  <strong>৳6,000 <small>/ month</small></strong>
                </div>
                <a href="#investment" className="btn btn-block btn-accent mt-3"><i className="fa-solid fa-calculator"></i> Calculate Your Return</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Notice Bar */}
      <section className="notice-bar">
        <div className="container notice-flex">
          <div className="notice-label"><i className="fa-solid fa-bullhorn"></i> Important Announcement:</div>
          <div className="notice-text">Minimum Investment starting at only ৳10,000! Start your journey towards financial freedom with genuine product-backed businesses.</div>
          <a href="#contact" className="notice-link">Visit Gazipur Office <i className="fa-solid fa-arrow-right"></i></a>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section section-padding" id="about">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-subtitle">Who We Are</span>
            <h2 className="section-title">Building Real Businesses with Lasting Value</h2>
            <div className="title-underline"></div>
          </div>

          <div className="about-grid">
            <div className="about-card feature-box">
              <div className="box-icon icon-blue"><i className="fa-solid fa-bullseye"></i></div>
              <h3>Our Mission</h3>
              <p>To supply high-quality consumer products, generate empowered earning opportunities for youth, build a robust digital business ecosystem, and bridge agro, fisheries, land, and retail sectors under one roof.</p>
            </div>

            <div className="about-card feature-box">
              <div className="box-icon icon-green"><i className="fa-solid fa-eye"></i></div>
              <h3>Our Vision</h3>
              <p>To become Bangladesh's most trusted multi-sector corporate enterprise, creating reliable jobs, transparent halal investments, and smart income opportunities for thousands of members nation-wide.</p>
            </div>

            <div className="about-card feature-box">
              <div className="box-icon icon-orange"><i className="fa-solid fa-handshake-angle"></i></div>
              <h3>Our Promise</h3>
              <p>We provide a transparent, ethical, and growth-oriented business system where effort, performance, and capital participation are regularly rewarded with consistent cashbacks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors & Projects */}
      <section className="sectors-section section-padding bg-light" id="sectors">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-subtitle">Our Multi-Sector Portfolio</span>
            <h2 className="section-title">Diverse Business Projects & Expansion Plans</h2>
            <p className="section-desc">We diversify investments into tangible assets and high-demand daily commodities to minimize risk and maximize steady yields.</p>
            <div className="title-underline"></div>
          </div>

          <div className="sector-tabs">
            {['all', 'agro', 'realestate', 'fmcg', 'retail'].map((cat) => (
              <button
                key={cat}
                className={`sector-tab ${sectorFilter === cat ? 'active' : ''}`}
                onClick={() => setSectorFilter(cat)}
              >
                {cat === 'all' && 'All Projects'}
                {cat === 'agro' && 'Agro & Fisheries'}
                {cat === 'realestate' && 'Housing & Land'}
                {cat === 'fmcg' && 'FMCG & Consumer Goods'}
                {cat === 'retail' && 'Logistics & Retail'}
              </button>
            ))}
          </div>

          <div className="sector-grid">
            {(sectorFilter === 'all' || sectorFilter === 'agro') && (
              <div className="sector-card">
                <div className="sector-img-box">
                  <img src="/assets/image (1).jpeg" alt="Aqua Farm & Fisheries" className="sector-img" />
                  <span className="sector-tag">Fisheries</span>
                </div>
                <div className="sector-content">
                  <h3>Aqua Farm & Fish Culture</h3>
                  <p>Large-scale commercial fish farming projects across prime wetlands in Bangladesh delivering organic fish supplies directly to wholesale markets.</p>
                  <ul className="sector-highlights">
                    <li><i className="fa-solid fa-check text-success"></i> Modern bio-floc & pond culture</li>
                    <li><i className="fa-solid fa-check text-success"></i> High commercial yield species</li>
                  </ul>
                </div>
              </div>
            )}

            {(sectorFilter === 'all' || sectorFilter === 'realestate') && (
              <div className="sector-card">
                <div className="sector-img-box">
                  <img src="/assets/image (3).jpeg" alt="Land Development & Housing" className="sector-img" />
                  <span className="sector-tag">Real Estate</span>
                </div>
                <div className="sector-content">
                  <h3>Land Development & Housing</h3>
                  <p>Developing prime residential land plots and multi-story apartment construction projects in rapidly developing urban zones near Gazipur and Dhaka outskirts.</p>
                  <ul className="sector-highlights">
                    <li><i className="fa-solid fa-check text-success"></i> Residential plot allocation</li>
                    <li><i className="fa-solid fa-check text-success"></i> Modern architectural designs</li>
                  </ul>
                </div>
              </div>
            )}

            {(sectorFilter === 'all' || sectorFilter === 'fmcg') && (
              <div className="sector-card">
                <div className="sector-img-box">
                  <img src="/assets/image (2).jpeg" alt="FMCG & Appliances" className="sector-img" />
                  <span className="sector-tag">Consumer Goods</span>
                </div>
                <div className="sector-content">
                  <h3>FMCG & Home Appliances</h3>
                  <p>Own manufacturing and distribution units producing PLAN-10 branded daily essentials, kitchen electronics, hygiene products, and textiles.</p>
                  <ul className="sector-highlights">
                    <li><i className="fa-solid fa-check text-success"></i> Home & Kitchen electronics</li>
                    <li><i className="fa-solid fa-check text-success"></i> Personal care toiletries</li>
                  </ul>
                </div>
              </div>
            )}

            {(sectorFilter === 'all' || sectorFilter === 'agro') && (
              <div className="sector-card">
                <div className="sector-img-box">
                  <img src="/assets/image (7).jpeg" alt="Livestock & Dairy" className="sector-img" />
                  <span className="sector-tag">Agriculture</span>
                </div>
                <div className="sector-content">
                  <h3>Livestock & Dairy Farming</h3>
                  <p>Scientific cattle fattening and dairy production facilities supplying pure milk, organic ghee, and high-grade livestock for national distribution.</p>
                  <ul className="sector-highlights">
                    <li><i className="fa-solid fa-check text-success"></i> Organic dairy production</li>
                    <li><i className="fa-solid fa-check text-success"></i> Modern cattle management</li>
                  </ul>
                </div>
              </div>
            )}

            {(sectorFilter === 'all' || sectorFilter === 'retail') && (
              <div className="sector-card">
                <div className="sector-img-box">
                  <img src="/assets/image (6).jpeg" alt="Cold Storage & Logistics" className="sector-img" />
                  <span className="sector-tag">Logistics</span>
                </div>
                <div className="sector-content">
                  <h3>Cold Storage & Supply Chain</h3>
                  <p>Temperature-controlled warehousing and fleet logistics to store agricultural produce, preventing post-harvest losses and regulating market pricing.</p>
                  <ul className="sector-highlights">
                    <li><i className="fa-solid fa-check text-success"></i> Preservation infrastructure</li>
                    <li><i className="fa-solid fa-check text-success"></i> Nationwide distribution chain</li>
                  </ul>
                </div>
              </div>
            )}

            {(sectorFilter === 'all' || sectorFilter === 'retail') && (
              <div className="sector-card">
                <div className="sector-img-box">
                  <img src="/assets/image (2).jpeg" alt="Grocery Superstores" className="sector-img" />
                  <span className="sector-tag">Direct Sell</span>
                </div>
                <div className="sector-content">
                  <h3>Grocery Superstores & Direct Sell</h3>
                  <p>Establishing branded express retail outlets and member distribution hubs allowing direct consumer purchasing with member discounts.</p>
                  <ul className="sector-highlights">
                    <li><i className="fa-solid fa-check text-success"></i> Member cashback rewards</li>
                    <li><i className="fa-solid fa-check text-success"></i> Quality guaranteed items</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Consumer Brands Section */}
      <section className="products-section section-padding" id="products">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-subtitle">Our Quality Brands</span>
            <h2 className="section-title">PLAN-10 Consumer Products & Appliances</h2>
            <p className="section-desc">Manufactured and marketed under strict quality compliance for Bangladeshi households.</p>
            <div className="title-underline"></div>
          </div>

          <div className="product-gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', gridColumn: '1 / -1' }}>
                <i className="fa-solid fa-boxes-open" style={{ fontSize: '3rem', color: '#64748b', marginBottom: '16px', display: 'block' }}></i>
                <h3 style={{ color: '#ffffff', marginBottom: '8px', fontSize: '1.2rem', fontWeight: 600 }}>No Products Available</h3>
                <p style={{ fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5' }}>
                  There are currently no products registered in the system. Go to the Admin Control Panel to add new products and categories.
                </p>
              </div>
            ) : (
              products.map((p) => {
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
                  setActiveImageIndexes(prev => ({
                    ...prev,
                    [p.id]: (activeIndex - 1 + urls.length) % urls.length
                  }));
                };

                const handleNextImage = (e) => {
                  e.stopPropagation();
                  setActiveImageIndexes(prev => ({
                    ...prev,
                    [p.id]: (activeIndex + 1) % urls.length
                  }));
                };

                return (
                  <div key={p.id} className="product-card-premium" style={{
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
                            onClick={() => handleOrderNow(p)}
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

      {/* Investment Calculator Section */}
      <section className="investment-section section-padding bg-dark text-white" id="investment">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-subtitle text-accent">Transparent Investment Scheme</span>
            <h2 className="section-title text-white">Dynamic Cashback & Capital Refund Plan</h2>
            <p className="section-desc text-light">Invest safely in halal, product-backed multi-sector ventures with guaranteed monthly payout schedules.</p>
            <div className="title-underline"></div>
          </div>

          <div className="investment-calculator-wrapper">
            <div className="calc-card">
              <div className="calc-header">
                <div className="calc-header-title">
                  <h3><i className="fa-solid fa-calculator text-accent"></i> Interactive Investment Calculator</h3>
                  <p>Customize your investment capital and tenure duration to see live real-time projected returns.</p>
                </div>
                <div className="calc-roi-badge">
                  <span className="roi-label">Est. Net ROI</span>
                  <span className="roi-val">+{roiPercent}%</span>
                </div>
              </div>

              <div className="calc-body">
                {/* 1. Quick Select Chips */}
                <div className="calc-section-box mb-4">
                  <label className="input-label mb-2"><i className="fa-solid fa-bolt text-warning"></i> Quick Select Investment Amount:</label>
                  <div className="preset-chips-grid">
                    {[25000, 50000, 100000, 500000, 1000000, 2500000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className={`chip-btn ${investAmount === amt ? 'active' : ''}`}
                        onClick={() => setInvestAmount(amt)}
                      >
                        {amt >= 100000 ? `৳${amt / 100000} Lakh` : `৳${amt.toLocaleString('en-IN')}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Slider & Input Box */}
                <div className="form-group mb-4">
                  <div className="slider-label-row">
                    <label htmlFor="investAmountRange" className="input-label">Custom Investment Capital (BDT):</label>
                    <span className="min-max-text">Min ৳10,000 — Max ৳1,00,00,000</span>
                  </div>
                  <div className="amount-display-box">
                    <span className="currency-symbol">৳</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={investAmount === 0 ? '' : investAmount.toLocaleString('en-IN')}
                      className="amount-input"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setInvestAmount(raw === '' ? 0 : Number(raw));
                      }}
                      onBlur={() => {
                        if (investAmount < 10000) setInvestAmount(10000);
                        if (investAmount > 10000000) setInvestAmount(10000000);
                      }}
                    />
                    <div className="amount-formatted-badge">
                      Selected Capital: <strong>{formatBDT(investAmount)}</strong>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={amountToSlider(investAmount)}
                    className="slider"
                    onChange={(e) => setInvestAmount(sliderToAmount(Number(e.target.value)))}
                  />
                  <div className="range-labels">
                    <span>৳10,000</span>
                    <span>৳1 Lakh</span>
                    <span>৳5 Lakh</span>
                    <span>৳25 Lakh</span>
                    <span>৳1 Crore</span>
                  </div>
                </div>

                {/* 3. Dynamic Tenure Duration Selector */}
                <div className="tenure-section-box mb-4">
                  <label className="input-label mb-2"><i className="fa-solid fa-clock-rotate-left text-info"></i> Select Investment Tenure / Duration:</label>
                  <div className="tenure-grid">
                    {[
                      { months: 12, label: '12 Months (1 Yr)' },
                      { months: 24, label: '24 Months (2 Yrs)' },
                      { months: 33, label: '33 Months (Standard)', badge: 'Most Popular' },
                      { months: 36, label: '36 Months (3 Yrs)' }
                    ].map((t) => (
                      <button
                        key={t.months}
                        type="button"
                        className={`tenure-btn ${investDuration === t.months ? 'active' : ''}`}
                        onClick={() => setInvestDuration(t.months)}
                      >
                        <span className="t-months">{t.months} Months</span>
                        <small className="t-sub">{t.label}</small>
                        {t.badge && <span className="t-badge">{t.badge}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Calculator Navigation Tabs */}
                <div className="calc-nav-tabs mb-4">
                  <button
                    type="button"
                    className={`calc-tab-btn ${calcView === 'summary' ? 'active' : ''}`}
                    onClick={() => setCalcView('summary')}
                  >
                    <i className="fa-solid fa-chart-pie"></i> Return Summary Overview
                  </button>
                  <button
                    type="button"
                    className={`calc-tab-btn ${calcView === 'schedule' ? 'active' : ''}`}
                    onClick={() => setCalcView('schedule')}
                  >
                    <i className="fa-solid fa-table-list"></i> Monthly Payout Timeline
                  </button>
                </div>

                {calcView === 'summary' ? (
                  <>
                    {/* Visual Ratio Bar */}
                    <div className="ratio-bar-box mb-4">
                      <div className="ratio-labels">
                        <span><i className="fa-solid fa-circle text-accent"></i> Net Profit Yield (3%/mo)</span>
                        <span><i className="fa-solid fa-circle text-info"></i> Capital Return ({(100 / investDuration).toFixed(1)}%/mo)</span>
                      </div>
                      <div className="ratio-progress-track">
                        <div className="ratio-segment bg-accent" style={{ width: `${(netProfitTotal / grandTotal) * 100}%` }}></div>
                        <div className="ratio-segment bg-info" style={{ width: `${(capitalRefundTotal / grandTotal) * 100}%` }}></div>
                      </div>
                    </div>

                    <div className="calc-results-grid">
                      <div className="calc-res-box">
                        <span className="res-label">Monthly Profit (মাসিক লভ্যাংশ)</span>
                        <span className="res-value text-accent">{formatBDT(monthlyProfit)}</span>
                        <small className="text-light">3% per month guaranteed yield</small>
                      </div>

                      <div className="calc-res-box highlight-box accent-border">
                        <span className="res-label">Total Net Profit ({investDuration} Months)</span>
                        <span className="res-value text-warning">{formatBDT(netProfitTotal)}</span>
                        <small className="text-light">Total pure profit over full term ({roiPercent}% ROI)</small>
                      </div>

                      <div className="calc-res-box">
                        <span className="res-label">Monthly Capital Refund</span>
                        <span className="res-value text-info">{formatBDT(monthlyCapital)}</span>
                        <small className="text-light">Equal split across {investDuration} months</small>
                      </div>

                      <div className="calc-res-box highlight-box">
                        <span className="res-label">Total Monthly Bank Payout</span>
                        <span className="res-value text-success">{formatBDT(monthlyTotal)}</span>
                        <small className="text-white">Monthly Profit + Capital Refund</small>
                      </div>

                      <div className="calc-res-box highlight-box accent-bg span-full">
                        <span className="res-label">Grand Total Return ({investDuration} Months)</span>
                        <span className="res-value text-dark">{formatBDT(grandTotal)}</span>
                        <small className="text-dark font-semibold">
                          Capital Returned ({formatBDT(capitalRefundTotal)}) + Pure Profit ({formatBDT(netProfitTotal)})
                        </small>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="schedule-table-wrapper mb-4">
                    <div className="table-responsive">
                      <table className="schedule-table">
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th>Monthly Profit</th>
                            <th>Capital Refund</th>
                            <th>Total Monthly Payout</th>
                            <th>Cumulative Payout</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[1, 2, 3, 6, 12, 18, 24, 30, investDuration]
                            .filter((m, i, arr) => m <= investDuration && arr.indexOf(m) === i)
                            .map((m) => (
                              <tr key={m} className={m === investDuration ? 'final-row' : ''}>
                                <td><strong>Month {m}</strong> {m === investDuration ? '(Term End)' : ''}</td>
                                <td className="text-accent">{formatBDT(monthlyProfit)}</td>
                                <td className="text-info">{formatBDT(monthlyCapital)}</td>
                                <td className="text-success font-bold">{formatBDT(monthlyTotal)}</td>
                                <td className="font-bold">{formatBDT(monthlyTotal * m)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="table-note mt-2 text-center text-muted"><small>* Preview showing key milestones over the selected {investDuration}-month duration.</small></p>
                  </div>
                )}

                <div className="calc-footer-note mt-4">
                  <p><i className="fa-solid fa-shield-halal text-success"></i> <strong>Halal Business Commitment:</strong> Profit distribution is generated from real operational sales in fisheries, consumer appliances, and agriculture. Payout begins exactly 30 days after investment confirmation.</p>
                  {!currentUser && (
                    <div className="text-center mt-3">
                      <button className="btn btn-lg btn-accent calc-apply-btn" onClick={() => setIsFormModalOpen(true)}><i className="fa-solid fa-file-signature"></i> Fill Up SPL Investment Application Form ({formatBDT(principal)} for {investDuration} Mos)</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section section-padding bg-light" id="contact">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-subtitle">Get in Touch</span>
            <h2 className="section-title">Visit Our Registered Headquarters</h2>
            <div className="title-underline"></div>
          </div>

          <div className="contact-grid">
            <div className="contact-card info-card">
              <h3>Contact Information</h3>
              <p>Reach out directly to our corporate management team or visit our head office in Gazipur.</p>

              <div className="contact-item">
                <div className="c-icon"><i className="fa-solid fa-location-dot"></i></div>
                <div className="c-text">
                  <strong>Head Office Address:</strong>
                  <p>Meraj Tower, Shafipur Bazar, Andarmanik Road, Shafipur, Kaliakoir, Gazipur, Bangladesh.</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="c-icon"><i className="fa-solid fa-phone-volume"></i></div>
                <div className="c-text">
                  <strong>Official Hotlines:</strong>
                  <p><a href="tel:01939342980">01939342980</a> / <a href="tel:01710562656">01710562656</a></p>
                </div>
              </div>

              <div className="contact-item">
                <div className="c-icon"><i className="fa-solid fa-envelope"></i></div>
                <div className="c-text">
                  <strong>Official Email:</strong>
                  <p><a href="mailto:Plan10bdprivateltd@gmail.com">Plan10bdprivateltd@gmail.com</a></p>
                </div>
              </div>

              <div className="contact-item">
                <div className="c-icon"><i className="fa-solid fa-clock"></i></div>
                <div className="c-text">
                  <strong>Business Hours:</strong>
                  <p>Saturday – Thursday: 9:00 AM – 7:00 PM</p>
                </div>
              </div>
            </div>

            <div className="contact-card form-card">
              <h3>Send Us a Message</h3>
              <form onSubmit={async (e) => { 
                e.preventDefault(); 
                try {
                  const res = await fetch('/api/inquiries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: inquiryName,
                      phone: inquiryPhone,
                      area: inquiryArea,
                      topic: inquiryTopic,
                      message: inquiryMessage
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                    showToast('Your inquiry has been sent to Plan-10 management team.', 'success');
                    setInquiryName('');
                    setInquiryPhone('');
                    setInquiryArea('');
                    setInquiryTopic('Investment');
                    setInquiryMessage('');
                  } else {
                    showToast(data.message || 'Failed to submit inquiry.', 'error');
                  }
                } catch (err) {
                  showToast('Your inquiry has been sent to Plan-10 management team.', 'success');
                }
              }}>
                <div className="form-group mb-3">
                  <label>Your Full Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Tanvir Hossain" 
                    required 
                    value={inquiryName}
                    onChange={(e) => setInquiryName(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group col-6">
                    <label>Phone Number *</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      placeholder="01700000000" 
                      required 
                      value={inquiryPhone}
                      onChange={(e) => setInquiryPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group col-6">
                    <label>District / Area</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Gazipur / Dhaka" 
                      value={inquiryArea}
                      onChange={(e) => setInquiryArea(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group mb-3">
                  <label>Inquiry Topic</label>
                  <select 
                    className="form-control"
                    value={inquiryTopic}
                    onChange={(e) => setInquiryTopic(e.target.value)}
                  >
                    <option value="Investment">Investment Scheme Enquiry</option>
                    <option value="Products">Product Distributorship / Dealership</option>
                    <option value="Member">Member Registration & Binary Tree</option>
                    <option value="Other">General Question</option>
                  </select>
                </div>
                <div className="form-group mb-3">
                  <label>Message Details</label>
                  <textarea 
                    className="form-control" 
                    rows="4" 
                    placeholder="Write your message or inquiry details here..."
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value)}
                  ></textarea>
                </div>
                <button type="submit" className="btn btn-primary btn-block"><i className="fa-solid fa-paper-plane"></i> Submit Message</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="main-footer bg-dark text-white">
        <div className="container footer-container">
          <div className="footer-col brand-col">
            <div className="logo-icon mb-2">
              <i className="fa-solid fa-chart-line"></i>
              <span>P10</span>
            </div>
            <h3>PLAN-10 BD (PVT). LTD</h3>
            <p>Smart Business and Investment Group in Bangladesh. Halal investment, sustainable agro projects, real estate, and consumer products.</p>
          </div>

          <div className="footer-col">
            <h4>Quick Navigation</h4>
            <ul>
              <li><a href="#hero">Home</a></li>
              <li><a href="#about">About Company</a></li>
              <li><a href="#sectors">Business Sectors</a></li>
              <li><a href="#products">Consumer Brands</a></li>
              <li><a href="#investment">33-Month Plan</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Core Sectors</h4>
            <ul>
              <li><a href="#sectors">Aqua Farming & Fisheries</a></li>
              <li><a href="#sectors">Land Development & Plots</a></li>
              <li><a href="#sectors">FMCG & Home Electronics</a></li>
              <li><a href="#sectors">Livestock & Dairy</a></li>
              <li><a href="#sectors">Cold Storage Supply Chain</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Member Portal</h4>
            <ul>
              {!currentUser ? (
                <>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsLoginModalOpen(true); }}>Member Login</a></li>
                  <li><a href="#binary-tree">Genealogy Tree View</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); setIsFormModalOpen(true); }}>SPL Application Form</a></li>
                </>
              ) : (
                <>
                  <li><span style={{ color: '#94a3b8' }}>Logged in: <strong>{currentUser.name}</strong></span></li>
                  {currentUser.role === 'ADMIN' ? (
                    <li><a href="/admin" style={{ color: '#3b82f6', fontWeight: 600 }}><i className="fa-solid fa-gauge"></i> Admin Dashboard</a></li>
                  ) : (
                    <li><a href="#binary-tree">Genealogy Tree View</a></li>
                  )}
                  <li><a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} style={{ color: '#ef4444' }}><i className="fa-solid fa-right-from-bracket"></i> Sign Out</a></li>
                </>
              )}
              <li><a href="#contact">Office Directions</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="container bottom-flex">
            <p>&copy; 2026 PLAN-10 BD (PVT). LTD. All Rights Reserved. Smart Business and Investment Group.</p>
            <div className="social-links">
              <a href="#" aria-label="Facebook"><i className="fa-brands fa-facebook"></i></a>
              <a href="#" aria-label="WhatsApp"><i className="fa-brands fa-whatsapp"></i></a>
              <a href="#" aria-label="YouTube"><i className="fa-brands fa-youtube"></i></a>
            </div>
          </div>
        </div>
      </footer>

      {/* SPL Form Modal */}
      <div className={`modal-backdrop ${isFormModalOpen ? 'active' : ''}`}>
        <div className="modal-content large-modal">
          <div className="modal-header">
            <h3><i className="fa-solid fa-file-contract"></i> PLAN-10 BD (PVT). LTD - SPL Investment Application</h3>
            <button className="modal-close" onClick={() => setIsFormModalOpen(false)}>&times;</button>
          </div>
          <div className="modal-body">
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmittingApp(true);
              try {
                const res = await fetch('/api/applications', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    applicantName: appApplicantName,
                    nid: appNid,
                    fatherName: appFatherName,
                    phone: appPhone,
                    password: appPassword,
                    address: appAddress,
                    capitalAmount: appPurpose === 'Investment' ? Number(investAmount) : 0,
                    durationMonths: appPurpose === 'Investment' ? Number(investDuration) : 0,
                    nomineeName: appNomineeName,
                    relation: appRelation,
                    purpose: appPurpose,
                    productId: appPurpose === 'Buy Product' ? selectedProductId : null
                  })
                });
                const data = await res.json();
                setIsSubmittingApp(false);
                if (data.success) {
                  setIsFormModalOpen(false);
                  const successMsg = appPurpose === 'Buy Product'
                    ? 'Account created and product order placed successfully! Your account will be active once the admin accepts your order.'
                    : 'SPL Application submitted successfully! Our Gazipur desk will verify your details.';
                  showToast(successMsg, 'success');
                  // Reset form
                  setAppApplicantName('');
                  setAppNid('');
                  setAppFatherName('');
                  setAppPhone('');
                  setAppPassword('');
                  setAppAddress('');
                  setAppNomineeName('');
                  setAppRelation('');
                  setAppPurpose('Investment');
                } else {
                  showToast(data.message || 'Failed to submit application.', 'error');
                }
              } catch (err) {
                setIsSubmittingApp(false);
                showToast('Server error while submitting application.', 'error');
              }
            }}>
              <div className="form-section-title">1. Applicant Details (আবেদনকারীর তথ্য)</div>
              <div className="form-group mb-3" style={{ padding: '0 15px' }}>
                <label style={{ fontWeight: 'bold', color: '#10b981' }}>Account Type / Purpose (নিবন্ধনের উদ্দেশ্য) *</label>
                <select
                  className="form-control"
                  style={{ background: '#1e293b', color: '#fff', border: '1px solid #475569', borderRadius: '8px', padding: '10px' }}
                  value={appPurpose}
                  onChange={(e) => setAppPurpose(e.target.value)}
                  required
                >
                  <option value="Investment">Investment Account (বিনিয়োগকারী একাউন্ট)</option>
                  <option value="Buy Product">Product Buyer Account (পণ্য ক্রেতা একাউন্ট)</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group col-6">
                  <label>Applicant Name (আবেদনকারীর নাম) *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="Full Name"
                    value={appApplicantName}
                    onChange={(e) => setAppApplicantName(e.target.value)}
                  />
                </div>
                <div className="form-group col-6">
                  <label>National ID / Passport No (জাতীয় পরিচয়পত্র নং) *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="NID Number"
                    value={appNid}
                    onChange={(e) => setAppNid(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group col-6">
                  <label>Father's / Husband's Name (পিতা/স্বামীর নাম)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Name"
                    value={appFatherName}
                    onChange={(e) => setAppFatherName(e.target.value)}
                  />
                </div>
                <div className="form-group col-6">
                  <label>Mobile Number (মোবাইল নম্বর) *</label>
                  <input
                    type="tel"
                    className="form-control"
                    required
                    placeholder="017XXXXXXXX"
                    value={appPhone}
                    onChange={(e) => setAppPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group col-6">
                  <label>Account Password (একাউন্ট পাসওয়ার্ড) *</label>
                  <input
                    type="password"
                    className="form-control"
                    required
                    placeholder="Set Portal Password"
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                  />
                </div>
                <div className="form-group col-6">
                  <label>Present & Permanent Address (বর্তমান ও স্থায়ী ঠিকানা)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Full Address"
                    value={appAddress}
                    onChange={(e) => setAppAddress(e.target.value)}
                  />
                </div>
              </div>

              {appPurpose === 'Investment' && (
                <>
                  <div className="form-section-title mt-4">2. Investment Scheme Details (বিনিয়োগের পরিমাণ ও বিবরণ)</div>
                  <div className="form-row">
                    <div className="form-group col-6">
                      <label>Investment Capital Amount (বিনিয়োগের পরিমাণ ৳) *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={investAmount}
                        onChange={(e) => setInvestAmount(Number(e.target.value))}
                        step="10000"
                        min="10000"
                        required
                      />
                    </div>
                    <div className="form-group col-6">
                      <label>Term Duration (মেয়াদ)</label>
                      <input type="text" className="form-control" value={`${investDuration} Months (${investDuration} মাস)`} readOnly />
                    </div>
                  </div>

                  <div className="summary-box-modal bg-light p-3 rounded mb-3">
                    <div className="form-row">
                      <div className="col-6"><strong>Estimated Monthly Profit:</strong> <span className="text-success">{formatBDT(monthlyProfit)}</span></div>
                      <div className="col-6"><strong>Estimated Monthly Refund:</strong> <span className="text-info">{formatBDT(monthlyCapital)}</span></div>
                    </div>
                  </div>
                </>
              )}

              <div className="form-section-title mt-4">3. Nominee Information (নমিনীর তথ্য)</div>
              <div className="form-row">
                <div className="form-group col-6">
                  <label>Nominee Name (নমিনীর নাম)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nominee Full Name"
                    value={appNomineeName}
                    onChange={(e) => setAppNomineeName(e.target.value)}
                  />
                </div>
                <div className="form-group col-6">
                  <label>Relation with Applicant (সম্পর্ক)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Spouse / Son / Brother"
                    value={appRelation}
                    onChange={(e) => setAppRelation(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setIsFormModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingApp}>
                  <i className={`fa-solid ${isSubmittingApp ? 'fa-spinner fa-spin' : 'fa-check-circle'}`}></i>{' '}
                  {isSubmittingApp ? 'Submitting...' : 'Submit Application Form'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <div className={`modal-backdrop ${isLoginModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h3><i className="fa-solid fa-user-lock"></i> PLAN-10 Portal Authentication</h3>
            <button className="modal-close" onClick={() => setIsLoginModalOpen(false)}>&times;</button>
          </div>
          <div className="modal-body">
            <form onSubmit={async (e) => {
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
                  setCurrentUser(userObj);
                  localStorage.setItem('plan10_user', JSON.stringify(userObj));
                  showToast(data.message, 'success');
                  setIsLoginModalOpen(false);
                  setLoginUsername('');
                  setLoginPassword('');
                  if (data.redirectUrl && data.redirectUrl !== '#') {
                    setTimeout(() => {
                      router.push(data.redirectUrl);
                    }, 800);
                  }
                } else {
                  showToast(data.message || 'Authentication failed', 'error');
                }
              } catch (err) {
                setIsLoggingIn(false);
                showToast('Server connection error. Please try again.', 'error');
              }
            }}>
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
                Don't have an account?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setIsLoginModalOpen(false); setIsFormModalOpen(true); }} style={{ color: '#10b981', fontWeight: 600 }}>Create Account / Apply Now</a>
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check text-success' : 'fa-circle-info text-info'}`}></i>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
