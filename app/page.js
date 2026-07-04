'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import InvestmentCalculator from './components/InvestmentCalculator';
import LoginModal from './components/LoginModal';
import ApplicationModal from './components/ApplicationModal';
import ProductCatalog from './components/ProductCatalog';
import ConfirmationModal from './components/ConfirmationModal';


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
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingOrderProduct, setPendingOrderProduct] = useState(null);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const params = new URLSearchParams(search || hash.substring(hash.indexOf('?')));
      if (params.get('ref')) {
        setIsFormModalOpen(true);
      }
    }
  }, []);

  const handleOrderInquiry = (product) => {
    setInquiryTopic('Products');
    setInquiryMessage(`I would like to place an order / make an inquiry for the PLAN-10 product:\n\n- Product Name: ${product.name}\n- Brand: ${product.brand}\n- Price: ৳ ${product.price.toLocaleString()} BDT\n\nPlease let me know the distributor availability, wholesale discounts, and secure payment procedures.`);
    
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
    showToast(`Pre-filled inquiry form for: ${product.name}! Scroll down to review.`, 'info');
  };

  const executeOrder = async (product) => {
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

  const handleOrderNow = async (product) => {
    if (!currentUser) {
      setSelectedProductId(product.id);
      setIsLoginModalOpen(true);
      showToast('Please sign in or create an account to purchase products.', 'info');
      return;
    }

    const alreadyOrdered = userOrders && userOrders.some(o => o.productId === product.id && o.status === 'PENDING');
    if (alreadyOrdered) {
      setPendingOrderProduct(product);
      setIsConfirmModalOpen(true);
      return;
    }

    await executeOrder(product);
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

  // Scroll Handler & Reveal Observer
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

      // Fallback: Manually detect viewport position and add 'revealed' class
      const targets = document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right');
      targets.forEach(t => {
        const rect = t.getBoundingClientRect();
        const isInViewport = (rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.95);
        if (isInViewport) {
          t.classList.add('revealed');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    // Setup fallback trigger intervals/timeouts to ensure items are always visible
    const initialTimeout = setTimeout(handleScroll, 100);
    const backupTimeout = setTimeout(handleScroll, 500);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      clearTimeout(initialTimeout);
      clearTimeout(backupTimeout);
    };
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
            <a href="#products" className={`nav-link ${activeNav === 'products' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Consumer Products</a>
            <a href="#sectors" className={`nav-link ${activeNav === 'sectors' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Sectors & Projects</a>
            <a href="#investment" className={`nav-link highlight-link ${activeNav === 'investment' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}><i className="fa-solid fa-calculator"></i> Investment Plan</a>
            <a href="#about" className={`nav-link ${activeNav === 'about' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>About Us</a>
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

      {/* Consumer Brands Section — extracted component */}
      <ProductCatalog
        products={products}
        currentUser={currentUser}
        handleOrderNow={handleOrderNow}
        activeImageIndexes={activeImageIndexes}
        setActiveImageIndexes={setActiveImageIndexes}
      />

      {/* Sectors & Projects */}
      <section className="sectors-section section-padding bg-light" id="sectors">
        <div className="container">
          <div className="section-header text-center scroll-reveal">
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
              <div className="sector-card scroll-reveal delay-100">
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
              <div className="sector-card scroll-reveal delay-200">
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
              <div className="sector-card scroll-reveal delay-300">
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
              <div className="sector-card scroll-reveal delay-100">
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
              <div className="sector-card scroll-reveal delay-200">
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
              <div className="sector-card scroll-reveal delay-300">
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

      {/* Investment Calculator Section — extracted component */}
      <InvestmentCalculator
        initialAmount={investAmount}
        initialDuration={investDuration}
        onApplyClick={async (amt, dur) => {
          if (currentUser) {
            try {
              const res = await fetch(`/api/user/dashboard?username=${currentUser.username}`);
              const data = await res.json();
              if (data.success && data.data && data.data.member && data.data.member.capitalInvested > 0) {
                showToast("You are already an Investor. If you wish to invest more, please contact the office.", "error");
                return;
              }
            } catch (e) {
              console.error('Failed to check investor status', e);
            }
          }
          setInvestAmount(amt);
          setInvestDuration(dur);
          setIsFormModalOpen(true);
        }}
        currentUser={currentUser}
        sliderToAmount={sliderToAmount}
        amountToSlider={amountToSlider}
      />
      {/* About Section (Relocated) */}
      <section className="about-section section-padding" id="about">
        <div className="container">
          <div className="section-header text-center scroll-reveal">
            <span className="section-subtitle">Who We Are</span>
            <h2 className="section-title">Building Real Businesses with Lasting Value</h2>
            <div className="title-underline"></div>
          </div>

          <div className="about-grid">
            <div className="about-card feature-box scroll-reveal delay-100">
              <div className="box-icon icon-blue"><i className="fa-solid fa-bullseye"></i></div>
              <h3>Our Mission</h3>
              <p>To supply high-quality consumer products, generate empowered earning opportunities for youth, build a robust digital business ecosystem, and bridge agro, fisheries, land, and retail sectors under one roof.</p>
            </div>

            <div className="about-card feature-box scroll-reveal delay-200">
              <div className="box-icon icon-green"><i className="fa-solid fa-eye"></i></div>
              <h3>Our Vision</h3>
              <p>To become Bangladesh's most trusted multi-sector corporate enterprise, creating reliable jobs, transparent halal investments, and smart income opportunities for thousands of members nation-wide.</p>
            </div>

            <div className="about-card feature-box scroll-reveal delay-300">
              <div className="box-icon icon-orange"><i className="fa-solid fa-handshake-angle"></i></div>
              <h3>Our Promise</h3>
              <p>We provide a transparent, ethical, and growth-oriented business system where effort, performance, and capital participation are regularly rewarded with consistent cashbacks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section section-padding bg-light" id="contact">
        <div className="container">
          <div className="section-header text-center scroll-reveal">
            <span className="section-subtitle">Get in Touch</span>
            <h2 className="section-title">Visit Our Registered Headquarters</h2>
            <div className="title-underline"></div>
          </div>

          <div className="contact-grid">
            <div className="contact-card info-card scroll-reveal-left">
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

            <div className="contact-card form-card scroll-reveal-right">
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

      {/* SPL Application Form Modal — extracted component */}
      <ApplicationModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        investAmount={investAmount}
        investDuration={investDuration}
        selectedProductId={selectedProductId}
        showToast={showToast}
        formatBDT={(amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN')}
      />

      {/* Login Modal — extracted component */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSwitchToApply={() => setIsFormModalOpen(true)}
        onLoginSuccess={(userObj, redirectUrl) => {
          setCurrentUser(userObj);
          localStorage.setItem('plan10_user', JSON.stringify(userObj));
          if (redirectUrl && redirectUrl !== '#') {
            setTimeout(() => router.push(redirectUrl), 800);
          }
        }}
        showToast={showToast}
      />

      {/* Duplicate Order Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setPendingOrderProduct(null);
        }}
        onConfirm={async () => {
          setIsConfirmModalOpen(false);
          if (pendingOrderProduct) {
            await executeOrder(pendingOrderProduct);
            setPendingOrderProduct(null);
          }
        }}
        productName={pendingOrderProduct ? pendingOrderProduct.name : ''}
      />

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
