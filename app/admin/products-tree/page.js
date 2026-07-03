'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';

// Constant values for procedural generation
const FIRST_NAMES = [
  "Rahim", "Karim", "Abul", "Kamal", "Farhana", "Tariq", "Sultana", "Nigar", 
  "Momin", "Sujon", "Arif", "Rina", "Sabina", "Nasim", "Anwar", "Habib", 
  "Imran", "Jesmin", "Liton", "Rubel", "Sajid", "Farid", "Tania", "Salma", 
  "Mitu", "Sumon", "Roni", "Kafi", "Zahid", "Nipa", "Tahsin", "Mashiat",
  "Sadia", "Rifat", "Mizan", "Sumaiya", "Mahmud", "Fahim", "Nusrat", "Tasin"
];

const LAST_NAMES = [
  "Rahman", "Ali", "Islam", "Hasan", "Ahmed", "Chowdhury", "Khan", "Uddin", 
  "Begum", "Sarker", "Hossain", "Akter", "Talukder", "Miah", "Bhuiyan", 
  "Patwary", "Jahan", "Siddique", "Alam", "Maturya", "Majumder", "Bhowmik", 
  "Das", "Sen", "Roy", "Gazi", "Kazi", "Munshi", "Dewan", "Sikder", "Mollah",
  "Ferdous", "Chakraborty", "Haque", "Kabir", "Zaman", "Mia", "Sardar", "Bose"
];

const PRODUCTS = [
  { name: "PLAN-10 Agro Fertilizers", price: 3500 },
  { name: "Premium Mustard Oil (5L)", price: 1200 },
  { name: "Corporate Solar Lantern", price: 4500 },
  { name: "Organic Tea Harvest (1kg)", price: 850 },
  { name: "Eco-Clean Laundry Detergent", price: 650 },
  { name: "Smart LED bulb (12W)", price: 320 },
  { name: "High-yield Paddy Seeds", price: 1800 },
  { name: "PLAN-10 Premium Atta (10kg)", price: 720 },
  { name: "Purified Water Filter (20L)", price: 2900 },
  { name: "Home Solar System Kit", price: 15500 }
];

// Helper to count descendants in complete binary tree of size N
function getDescendantCount(id, N = 100000) {
  if (id > N) return 0;
  let count = 1; // includes self
  let left = id * 2;
  let width = 2;
  while (left <= N) {
    count += Math.min(N - left + 1, width);
    left *= 2;
    width *= 2;
  }
  // Downline refers to descendants excluding self
  return count - 1;
}

// Procedural generation of a member profile
function getProceduralUser(i) {
  if (i < 1 || i > 100000) return null;
  
  // Deterministic name based on id index
  const f = FIRST_NAMES[i % FIRST_NAMES.length];
  const l = LAST_NAMES[(i * 11) % LAST_NAMES.length];
  const name = `${f} ${l}`;
  const memberId = `P10-${i.toString().padStart(6, '0')}`;
  
  // Deterministic phone
  const phone = "01" + (7 + (i % 3)) + ((i * 12345) % 10000000).toString().padStart(8, '0').replace(/(\d{4})(\d{4})/, '$1-$2');
  
  // Deterministic join date (scaled by tree level depth)
  const level = Math.floor(Math.log2(i));
  const baseDate = new Date("2024-01-01");
  baseDate.setDate(baseDate.getDate() + level * 12 + (i % 10));
  const joinDate = baseDate.toISOString().split('T')[0];
  
  // Deterministic direct sales
  const directSales = (i * 317) % 25000 + (i % 5 === 0 ? 15000 : 0) + (i % 11 === 0 ? 40000 : 0);
  
  // Downline network calculations
  const downlineCount = getDescendantCount(i, 100000);
  
  // Group sales (downline count * avg sales per user + deterministic variation)
  const groupSales = directSales + (downlineCount * 11800) + ((i * 37) % 5000);
  
  // MLM Commissions (8% direct sales + 2% downline team sales)
  const teamSales = Math.max(0, groupSales - directSales);
  const commission = Math.round(directSales * 0.08 + teamSales * 0.02);
  
  return {
    id: i,
    memberId,
    name,
    phone,
    email: `${f.toLowerCase()}.${l.toLowerCase()}${i}@plan10bd.com`,
    joinDate,
    directSales,
    groupSales,
    commission,
    level,
    downlineCount,
    leftChildId: i * 2 <= 100000 ? i * 2 : null,
    rightChildId: i * 2 + 1 <= 100000 ? i * 2 + 1 : null,
    parentId: i === 1 ? null : Math.floor(i / 2)
  };
}

// Client-side search utility over the 100,000 procedurally generated users
function searchProceduralUsers(query, limit = 8) {
  if (!query || query.trim().length < 2) return [];
  const clean = query.toLowerCase().trim();
  const results = [];
  
  // 1. Direct ID lookup check
  const idMatch = clean.match(/(?:p10-)?0*(\d+)/i);
  if (idMatch) {
    const idNum = parseInt(idMatch[1], 10);
    if (idNum >= 1 && idNum <= 100000) {
      results.push(getProceduralUser(idNum));
    }
  }
  
  // 2. Scan names (limited loop for fast response)
  for (let i = 1; i <= 100000; i++) {
    if (results.length >= limit) break;
    if (results.some(r => r.id === i)) continue;
    
    // Quick procedural name check
    const f = FIRST_NAMES[i % FIRST_NAMES.length];
    const l = LAST_NAMES[(i * 11) % LAST_NAMES.length];
    const fullName = `${f} ${l}`;
    
    if (fullName.toLowerCase().includes(clean)) {
      results.push(getProceduralUser(i));
    }
  }
  
  return results;
}

export default function ProductsSellingTreePage() {
  const [currentRootId, setCurrentRootId] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState({
    1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true
  });
  const [zoomScale, setZoomScale] = useState(0.5);
  const viewMode = zoomScale >= 0.9 ? 'interactive' : 'macro';
  
  // Live Feed State
  const [liveSales, setLiveSales] = useState([]);
  
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const searchRef = useRef(null);
  const [panState, setPanState] = useState({ isDragging: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });

  // Format BDT currency helper
  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  const jumpToUser100k = () => {
    const user100k = getProceduralUser(100000);
    if (!user100k) return;
    
    const path = [];
    let curr = 100000;
    while (curr >= 1) {
      path.unshift(curr);
      curr = Math.floor(curr / 2);
    }
    
    setCurrentRootId(1);
    setZoomScale(1.0);
    
    setExpandedNodes(prev => {
      const next = { ...prev };
      path.forEach(id => {
        next[id] = true;
      });
      return next;
    });
    
    setSelectedNode(user100k);
    
    setTimeout(() => {
      const nodeEl = document.getElementById(`tree-node-wrapper-100000`);
      if (nodeEl) {
        nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, 200);
  };

  // Load root details and start Live Ticker
  useEffect(() => {
    setSelectedNode(getProceduralUser(1));
    
    // Generate initial live sales records
    const initialSales = [];
    for (let j = 0; j < 5; j++) {
      initialSales.push(generateRandomSaleRecord());
    }
    setLiveSales(initialSales);

    // Live sale tick every 4.5 seconds
    const interval = setInterval(() => {
      setLiveSales(prev => [generateRandomSaleRecord(), ...prev.slice(0, 9)]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Close suggestions box on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const scaleX = 3000 / rect.width;
    const scaleY = 1500 / rect.height;
    const xVal = clickX * scaleX;
    const yVal = clickY * scaleY;
    
    const maxLevel = 16;
    const levelSpacing = (1500 - 120) / maxLevel;
    const yOffset = 60;
    const xOffset = 50;
    const width = 3000 - 100;
    
    const L = Math.max(0, Math.min(16, Math.round((yVal - yOffset) / levelSpacing)));
    const numNodesInLevel = Math.pow(2, L);
    const pos = Math.max(0, Math.min(numNodesInLevel - 1, Math.floor((xVal - xOffset) / (width / numNodesInLevel))));
    const nodeId = numNodesInLevel + pos;
    
    if (nodeId >= 1 && nodeId <= 100000) {
      setSelectedNode(getProceduralUser(nodeId));
    }
  };

  useEffect(() => {
    if (viewMode !== 'macro') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const W = 3000;
    const H = 1500;
    canvas.width = W;
    canvas.height = H;
    
    ctx.fillStyle = '#070e1b';
    ctx.fillRect(0, 0, W, H);
    
    const maxLevel = 16;
    const levelSpacing = (H - 120) / maxLevel;
    const yOffset = 60;
    const xOffset = 50;
    const width = W - 100;
    
    const selectedPathSet = new Set();
    if (selectedNode) {
      let curr = selectedNode.id;
      while (curr >= 1) {
        selectedPathSet.add(curr);
        curr = Math.floor(curr / 2);
      }
    }
    
    ctx.lineWidth = 1;
    for (let i = 2; i <= 100000; i++) {
      const L = Math.floor(Math.log2(i));
      const y = yOffset + L * levelSpacing;
      const numNodesInLevel = Math.pow(2, L);
      const pos = i - numNodesInLevel;
      const x = xOffset + (pos + 0.5) * (width / numNodesInLevel);
      
      const pId = Math.floor(i / 2);
      const pL = L - 1;
      const pNum = Math.pow(2, pL);
      const pPos = pId - pNum;
      const px = xOffset + (pPos + 0.5) * (width / pNum);
      const py = yOffset + pL * levelSpacing;
      
      const isPath = selectedPathSet.has(i) && selectedPathSet.has(pId);
      
      ctx.strokeStyle = isPath 
        ? 'rgba(244, 63, 94, 0.95)'
        : L <= 3 
        ? 'rgba(59, 130, 246, 0.35)' 
        : 'rgba(59, 130, 246, 0.08)';
      
      ctx.lineWidth = isPath ? 2.5 : 1;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    for (let i = 1; i <= 100000; i++) {
      const L = Math.floor(Math.log2(i));
      const y = yOffset + L * levelSpacing;
      const numNodesInLevel = Math.pow(2, L);
      const pos = i - numNodesInLevel;
      const x = xOffset + (pos + 0.5) * (width / numNodesInLevel);
      
      const isSelected = selectedNode && selectedNode.id === i;
      const isPath = selectedPathSet.has(i);
      
      let color = '#475569';
      let radius = 1.8;
      
      if (i === 1) {
        color = '#f59e0b';
        radius = 7.0;
      } else if (L <= 2) {
        color = '#38bdf8';
        radius = 4.5;
      } else if (L <= 5) {
        color = '#10b981';
        radius = 3.2;
      }
      
      if (isPath) {
        color = '#f43f5e';
      }
      if (isSelected) {
        color = '#fbbf24';
        radius = 8.5;
      }
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
  }, [viewMode, selectedNode]);

  // Pan Canvas Mouse Event Handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.interactive-tree-card') || e.target.closest('.toggle-branch-btn') || e.target.closest('button')) {
      return; // prevent pan trigger when interacting with elements
    }
    setPanState({
      isDragging: true,
      startX: e.pageX - viewportRef.current.offsetLeft,
      startY: e.pageY - viewportRef.current.offsetTop,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop
    });
    viewportRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e) => {
    if (!panState.isDragging) return;
    e.preventDefault();
    const x = e.pageX - viewportRef.current.offsetLeft;
    const y = e.pageY - viewportRef.current.offsetTop;
    const walkX = (x - panState.startX) * 1.3;
    const walkY = (y - panState.startY) * 1.3;
    viewportRef.current.scrollLeft = panState.scrollLeft - walkX;
    viewportRef.current.scrollTop = panState.scrollTop - walkY;
  };

  const handleMouseUpOrLeave = () => {
    setPanState(prev => ({ ...prev, isDragging: false }));
    if (viewportRef.current) {
      viewportRef.current.style.cursor = 'grab';
    }
  };

  // Helper to generate dynamic random sale
  function generateRandomSaleRecord() {
    const randomId = Math.floor(Math.random() * 100000) + 1;
    const user = getProceduralUser(randomId);
    const prod = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
    const comm = Math.round(prod.price * 0.08);
    return {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      userName: user.name,
      userMemberId: user.memberId,
      productName: prod.name,
      amount: prod.price,
      commission: comm
    };
  }

  // Handle Search Input Change
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length >= 2) {
      const matches = searchProceduralUsers(val);
      setSearchResults(matches);
      setShowSuggestions(true);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  };

  // Locate and auto-expand path to a searched user
  const handleSelectUser = (user) => {
    setShowSuggestions(false);
    setSearchQuery('');
    
    // Calculate path from current root down to the target user
    const path = [];
    let curr = user.id;
    
    // We traverse up to either the current root or global root (1)
    while (curr >= currentRootId) {
      path.unshift(curr);
      if (curr === currentRootId) break;
      curr = Math.floor(curr / 2);
    }
    
    // If target user is not under the current isolated root, we must reset root to global (1) to show them
    if (path.length === 0 || path[0] !== currentRootId) {
      setCurrentRootId(1);
      // Recalculate path from global root (1)
      let globalCurr = user.id;
      const globalPath = [];
      while (globalCurr >= 1) {
        globalPath.unshift(globalCurr);
        globalCurr = Math.floor(globalCurr / 2);
      }
      
      // Auto expand all nodes along the path
      setExpandedNodes(prev => {
        const next = { ...prev };
        globalPath.forEach(id => {
          next[id] = true;
        });
        return next;
      });
    } else {
      // Auto expand nodes along the local path
      setExpandedNodes(prev => {
        const next = { ...prev };
        path.forEach(id => {
          next[id] = true;
        });
        return next;
      });
    }
    
    setZoomScale(1.0);
    setSelectedNode(user);
    
    // Scroll highlighted node into view
    setTimeout(() => {
      const nodeEl = document.getElementById(`tree-node-wrapper-${user.id}`);
      if (nodeEl) {
        nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, 150);
  };

  // Toggle node children display
  const toggleNodeExpansion = (id, e) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Calculate sponsor chain path for the inspector sidebar
  const sponsorChain = useMemo(() => {
    if (!selectedNode) return [];
    const chain = [];
    let currParentId = selectedNode.parentId;
    
    // Trace up to 4 sponsors above
    let steps = 0;
    while (currParentId && currParentId >= 1 && steps < 4) {
      chain.push(getProceduralUser(currParentId));
      currParentId = Math.floor(currParentId / 2);
      steps++;
    }
    return chain;
  }, [selectedNode]);

  // Total sales computed deterministically for global statistics
  const globalSummaryStats = useMemo(() => {
    // 100,000 sellers, average direct volume of ৳17,800 per user
    const totalVolume = 100000 * 17850;
    const totalCommissions = totalVolume * 0.048; // balanced avg binary MLM payout rate
    return {
      totalSellers: 100000,
      generations: 17,
      totalVolume,
      totalCommissions
    };
  }, []);

  // Recursive Tree Node Renderer
  const renderBinaryTreeNode = (nodeId, isLeftHand = null) => {
    const user = getProceduralUser(nodeId);
    if (!user) return null;
    
    const isExpanded = expandedNodes[nodeId];
    const isSelected = selectedNode && selectedNode.id === user.id;
    const hasChildren = user.leftChildId || user.rightChildId;
    
    // Aesthetic Styling parameters based on tree hierarchy level
    let levelTheme = {
      bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      border: '#334155',
      icon: 'fa-user',
      color: '#94a3b8',
      role: 'Seller'
    };

    if (user.id === 1) {
      levelTheme = {
        bg: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
        border: '#d97706',
        icon: 'fa-crown',
        color: '#f59e0b',
        role: 'Founder / Root'
      };
    } else if (user.level <= 2) {
      levelTheme = {
        bg: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)',
        border: '#3b82f6',
        icon: 'fa-user-tie',
        color: '#60a5fa',
        role: 'Director'
      };
    } else if (user.level <= 5) {
      levelTheme = {
        bg: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
        border: '#10b981',
        icon: 'fa-briefcase',
        color: '#34d399',
        role: 'Manager'
      };
    }

    return (
      <div 
        id={`tree-node-wrapper-${user.id}`}
        key={user.id} 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          position: 'relative',
          padding: '0 10px'
        }}
      >
        {/* Connection node cards */}
        <div 
          className={`interactive-tree-card ${isSelected ? 'selected-glow' : ''}`}
          onClick={() => setSelectedNode(user)}
          style={{
            background: levelTheme.bg,
            border: `1px solid ${isSelected ? '#e0f2fe' : levelTheme.border}`,
            boxShadow: isSelected 
              ? '0 0 20px rgba(59, 130, 246, 0.6), inset 0 0 10px rgba(59, 130, 246, 0.3)' 
              : '0 4px 12px rgba(0, 0, 0, 0.4)',
            borderRadius: '12px',
            padding: '12px 16px',
            width: '170px',
            zIndex: 10,
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            marginTop: '8px'
          }}
        >
          {/* Left/Right Hand Side Badging */}
          {isLeftHand !== null && (
            <span style={{
              position: 'absolute',
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '0.62rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: '#ffffff',
              background: isLeftHand ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
              padding: '2px 8px',
              borderRadius: '20px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              whiteSpace: 'nowrap'
            }}>
              {isLeftHand ? 'Left Hand' : 'Right Hand'}
            </span>
          )}

          {/* Level Generation Badge (L1, L2, L3, L4...) */}
          <span style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            fontSize: '0.62rem',
            fontWeight: 800,
            color: user.level === 0 ? '#f59e0b' : 
                   user.level === 1 ? '#38bdf8' : 
                   user.level === 2 ? '#34d399' : 
                   user.level === 3 ? '#a78bfa' : 
                   user.level === 4 ? '#fb7185' : '#94a3b8',
            background: 'rgba(0, 0, 0, 0.45)',
            padding: '2px 5px',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            pointerEvents: 'none'
          }}>
            {user.level === 0 ? 'Root' : `L${user.level}`}
          </span>

          {/* Node Icon */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: `1px solid ${levelTheme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px auto'
          }}>
            <i className={`fa-solid ${levelTheme.icon}`} style={{ color: levelTheme.color, fontSize: '0.9rem' }}></i>
          </div>

          <h4 style={{ 
            fontSize: '0.82rem', 
            fontWeight: 700, 
            color: '#ffffff', 
            margin: '0 0 2px 0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }} title={user.name}>
            {user.name}
          </h4>
          
          <code style={{ 
            fontSize: '0.68rem', 
            color: levelTheme.color, 
            fontFamily: 'monospace',
            display: 'block',
            marginBottom: '4px'
          }}>
            {user.memberId}
          </code>

          <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
            Sales: {formatBDT(user.directSales)}
          </div>
          
          <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '2px' }}>
            Downline: {user.downlineCount.toLocaleString()} users
          </div>
          
          <div style={{ 
            fontSize: '0.58rem', 
            background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '4px', 
            padding: '2px 4px', 
            color: '#94a3b8', 
            marginTop: '6px',
            display: 'inline-block'
          }}>
            {levelTheme.role}
          </div>
        </div>

        {/* Expand/Collapse Toggle Button */}
        {hasChildren && (
          <button
            className="toggle-branch-btn"
            onClick={(e) => toggleNodeExpansion(user.id, e)}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#1e293b',
              border: '1px solid #475569',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.6rem',
              zIndex: 20,
              marginTop: '-8px',
              marginBottom: isExpanded ? '0px' : '8px',
              transition: 'all 0.15s ease'
            }}
            title={isExpanded ? "Collapse Branch" : "Expand Downline"}
          >
            <i className={`fa-solid ${isExpanded ? 'fa-minus' : 'fa-plus'}`}></i>
          </button>
        )}

        {/* Children Render Block */}
        {hasChildren && isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 'max-content' }}>
            {/* Parent-to-children vertical drop line */}
            <div style={{ width: '2px', height: '18px', background: '#3b82f6', boxShadow: '0 0 6px #3b82f6', zIndex: 2 }}></div>
            
            {/* Horizontal Connector Row (Flex container for compact automatic spacing) */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row',
              position: 'relative', 
              width: 'max-content',
              justifyContent: 'center'
            }}>
              {/* Left Child Spike & Call */}
              {user.leftChildId && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {/* Left horizontal arm line (extends to right boundary) */}
                  {user.rightChildId && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      right: 0,
                      height: '2px',
                      background: '#10b981',
                      boxShadow: '0 0 6px #10b981',
                      zIndex: 1
                    }}></div>
                  )}
                  <div style={{ width: '2px', height: '18px', background: '#10b981', boxShadow: '0 0 6px #10b981', zIndex: 2 }}></div>
                  {renderBinaryTreeNode(user.leftChildId, true)}
                </div>
              )}

              {/* Right Child Spike & Call */}
              {user.rightChildId && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {/* Right horizontal arm line (extends to left boundary) */}
                  {user.leftChildId && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: '50%',
                      height: '2px',
                      background: '#8b5cf6',
                      boxShadow: '0 0 6px #8b5cf6',
                      zIndex: 1
                    }}></div>
                  )}
                  <div style={{ width: '2px', height: '18px', background: '#8b5cf6', boxShadow: '0 0 6px #8b5cf6', zIndex: 2 }}></div>
                  {renderBinaryTreeNode(user.rightChildId, false)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="products-tree-page" style={{ color: '#e2e8f0' }}>
      {/* Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .products-tree-layout {
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: auto;
          min-height: auto;
        }
        .tree-main-canvas {
          width: 100%;
          height: 620px;
          background-color: #070e1b;
          border: 1px solid var(--admin-border-color);
          border-radius: 12px;
          overflow: auto;
          position: relative;
          box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.8);
          user-select: none;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .tree-main-canvas::-webkit-scrollbar {
          display: none;
        }
        .tree-viewport-container {
          min-width: 100%;
          min-height: 100%;
          padding: 80px 40px;
          display: inline-flex;
          justify-content: center;
          align-items: flex-start;
          transform-origin: top center;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .tree-sidebar-details-panel {
          width: 100%;
          background: #0b1329;
          border: 1px solid var(--admin-border-color);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .interactive-tree-card:hover {
          transform: translateY(-4px) scale(1.03);
          box-shadow: 0 12px 24px rgba(59, 130, 246, 0.4) !important;
        }
        .toggle-branch-btn:hover {
          background: #3b82f6 !important;
          color: #ffffff !important;
          border-color: #60a5fa !important;
          transform: scale(1.15);
        }
        .selected-glow {
          border-style: double !important;
          animation: glowPulse 2s infinite alternate;
        }
        @keyframes glowPulse {
          0% { box-shadow: 0 0 12px rgba(59, 130, 246, 0.4), inset 0 0 4px rgba(59, 130, 246, 0.2); }
          100% { box-shadow: 0 0 24px rgba(59, 130, 246, 0.8), inset 0 0 10px rgba(59, 130, 246, 0.4); }
        }
        .live-feed-ticker {
          background: rgba(16, 24, 48, 0.65);
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 8px 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: hidden;
        }
        .live-badge {
          background: #ef4444;
          color: #fff;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          animation: blinker 1.8s linear infinite;
        }
        @keyframes blinker {
          50% { opacity: 0.3; }
        }
        .ticker-scroller {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          position: relative;
        }
        .ticker-text {
          display: inline-block;
          animation: tickerSlide 25s linear infinite;
          font-size: 0.8rem;
          color: #94a3b8;
        }
        @keyframes tickerSlide {
          0% { transform: translate3d(100%, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
        .search-suggestions-box {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          margin-top: 4px;
          z-index: 1000;
          box-shadow: 0 8px 24px rgba(0,0,0,0.6);
          max-height: 280px;
          overflow-y: auto;
        }
        .suggestion-item {
          padding: 10px 14px;
          cursor: pointer;
          border-bottom: 1px solid #1e293b;
          transition: background 0.15s ease;
        }
        .suggestion-item:hover {
          background: #1e293b;
        }
      ` }} />

      {/* Header section */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Products Selling Binary Tree</h2>
          <p style={{ color: '#64748b' }}>Visualize downlines, sponsor hand connections, and inspect sales volumes of 100,000 members.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => {
              setCurrentRootId(1);
              setExpandedNodes({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true });
              setSelectedNode(getProceduralUser(1));
              setZoomScale(0.5);
            }}
            className="btn-action btn-view"
            style={{ padding: '8px 14px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-solid fa-house"></i> Reset Global Root
          </button>
          <button 
            onClick={jumpToUser100k}
            className="btn-action btn-view"
            style={{ padding: '8px 14px', background: '#e11d48', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Jump down to user index 100,000 at level 16"
          >
            <i className="fa-solid fa-bolt"></i> Jump to User 100,000
          </button>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="metric-card" style={{ display: 'flex', padding: '16px', background: '#0b1329', border: '1px solid var(--admin-border-color)', borderRadius: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 6px 0' }}>Total Network Sellers</h4>
            <h3 style={{ fontSize: '1.5rem', color: '#fff', margin: 0 }}>{globalSummaryStats.totalSellers.toLocaleString()} Users</h3>
          </div>
          <div className="metric-icon icon-blue" style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <i className="fa-solid fa-users" style={{ fontSize: '1.2rem' }}></i>
          </div>
        </div>

        <div className="metric-card" style={{ display: 'flex', padding: '16px', background: '#0b1329', border: '1px solid var(--admin-border-color)', borderRadius: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 6px 0' }}>Tree Depth / Generation</h4>
            <h3 style={{ fontSize: '1.5rem', color: '#fff', margin: 0 }}>{globalSummaryStats.generations} Levels</h3>
          </div>
          <div className="metric-icon icon-purple" style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <i className="fa-solid fa-sitemap" style={{ fontSize: '1.2rem' }}></i>
          </div>
        </div>

        <div className="metric-card" style={{ display: 'flex', padding: '16px', background: '#0b1329', border: '1px solid var(--admin-border-color)', borderRadius: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 6px 0' }}>Total Sales Volume</h4>
            <h3 style={{ fontSize: '1.5rem', color: '#10b981', margin: 0 }}>{formatBDT(globalSummaryStats.totalVolume)}</h3>
          </div>
          <div className="metric-icon icon-green" style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <i className="fa-solid fa-bag-shopping" style={{ fontSize: '1.2rem' }}></i>
          </div>
        </div>

        <div className="metric-card" style={{ display: 'flex', padding: '16px', background: '#0b1329', border: '1px solid var(--admin-border-color)', borderRadius: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 6px 0' }}>Commissions Distributed</h4>
            <h3 style={{ fontSize: '1.5rem', color: '#f59e0b', margin: 0 }}>{formatBDT(globalSummaryStats.totalCommissions)}</h3>
          </div>
          <div className="metric-icon icon-amber" style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <i className="fa-solid fa-hand-holding-dollar" style={{ fontSize: '1.2rem' }}></i>
          </div>
        </div>
      </div>

      {/* Live Sales Simulator Feed Ticker */}
      <div className="live-feed-ticker">
        <span className="live-badge"><i className="fa-solid fa-circle"></i> Live Activity</span>
        <div className="ticker-scroller">
          <div className="ticker-text">
            {liveSales.map((sale, idx) => (
              <span key={idx} style={{ marginRight: '40px' }}>
                <i className="fa-solid fa-shopping-cart" style={{ color: '#10b981', marginRight: '6px' }}></i>
                [{sale.time}] <strong>{sale.userName}</strong> ({sale.userMemberId}) sold <em>{sale.productName}</em> - Volume: <strong>{formatBDT(sale.amount)}</strong>. Network Comm: <strong style={{ color: '#f59e0b' }}>{formatBDT(sale.commission)}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Search and Canvas Viewport Controls */}
      <div className="search-bar-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', padding: '14px 20px', background: '#0b1329', border: '1px solid var(--admin-border-color)', borderRadius: '12px', marginBottom: '20px', position: 'relative' }}>
        
        {/* Search Panel */}
        <div ref={searchRef} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '380px', position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: '#64748b' }}></i>
          <input 
            type="text" 
            placeholder="Search by User ID (e.g. P10-004812) or Name..." 
            value={searchQuery}
            onChange={handleSearchChange}
            style={{ 
              background: '#070e1b', 
              border: '1px solid #1e293b', 
              color: '#fff', 
              padding: '8px 12px', 
              borderRadius: '6px', 
              width: '100%', 
              fontSize: '0.85rem' 
            }}
            onFocus={() => { if (searchQuery.trim().length >= 2) setShowSuggestions(true); }}
          />

          {showSuggestions && (
            <div className="search-suggestions-box">
              {searchResults.length === 0 ? (
                <div style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.85rem' }}>No results found</div>
              ) : (
                searchResults.map(user => (
                  <div 
                    key={user.id} 
                    className="suggestion-item"
                    onClick={() => handleSelectUser(user)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{user.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontFamily: 'monospace' }}>{user.memberId}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      <span>Level {user.level} • Downline: {user.downlineCount}</span>
                      <span style={{ color: '#10b981' }}>Sales: {formatBDT(user.directSales)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: '#070e1b', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <button
            onClick={() => setZoomScale(1.0)}
            style={{
              padding: '6px 12px',
              background: viewMode === 'interactive' ? '#3b82f6' : 'transparent',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
              transition: 'background 0.15s ease'
            }}
          >
            Interactive Card View
          </button>
          <button
            onClick={() => setZoomScale(0.5)}
            style={{
              padding: '6px 12px',
              background: viewMode === 'macro' ? '#3b82f6' : 'transparent',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
              transition: 'background 0.15s ease'
            }}
            title="Render all 100,000 users and their connections on a high-performance Canvas"
          >
            Macro View (100,000 Users)
          </button>
        </div>

        {/* Viewport Zoom Controls */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Zoom Controls:</span>
          <button 
            onClick={() => setZoomScale(prev => Math.max(0.01, prev - 0.02))}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer' }}
            title="Zoom Out"
          >
            <i className="fa-solid fa-magnifying-glass-minus"></i>
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, padding: '4px 8px', background: '#070e1b', border: '1px solid #1e293b', borderRadius: '6px', minWidth: '45px', textAlign: 'center', color: '#34d399' }}>
            {Math.round(zoomScale * 100)}%
          </span>
          <button 
            onClick={() => setZoomScale(prev => Math.min(2.0, prev + 0.02))}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer' }}
            title="Zoom In"
          >
            <i className="fa-solid fa-magnifying-glass-plus"></i>
          </button>
          <button 
            onClick={() => setZoomScale(0.5)}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '0 10px', height: '32px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
            title="Reset Zoom"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main Content Area: Viewport Canvas and Details Side panel */}
      <div className="products-tree-layout">
        
        {/* Visualizer Scroll Canvas */}
        <div 
          className="tree-main-canvas"
          ref={viewportRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          style={{ cursor: 'grab' }}
        >
          {viewMode === 'interactive' ? (
            <div 
              className="tree-viewport-container"
              style={{ 
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center'
              }}
            >
              {/* Start recursion at isolated currentRootId */}
              {renderBinaryTreeNode(currentRootId)}
            </div>
          ) : (
            <div 
              className="tree-viewport-container"
              style={{ 
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                padding: '40px'
              }}
            >
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                style={{
                  width: '3000px',
                  height: '1500px',
                  background: '#070e1b',
                  borderRadius: '16px',
                  border: '2px solid #1e293b',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.85)',
                  cursor: 'crosshair',
                  display: 'block'
                }}
              />
            </div>
          )}
        </div>

        {/* Sidebar Inspector Panel */}
        <div className="tree-sidebar-details-panel">
          {!selectedNode ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b' }}>
              <i className="fa-solid fa-circle-info" style={{ fontSize: '2rem', color: '#3b82f6', marginBottom: '12px' }}></i>
              <h4>Member Inspector</h4>
              <p style={{ fontSize: '0.8rem', marginTop: '6px', lineHeight: '1.4' }}>
                Select any node card within the visual binary tree canvas to analyze their detailed product selling network profile.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
                <span style={{ fontSize: '0.62rem', background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                  SELLER PROFILE CARD
                </span>
                {currentRootId !== selectedNode.id && (
                  <button 
                    onClick={() => {
                      setCurrentRootId(selectedNode.id);
                      setExpandedNodes(prev => ({ ...prev, [selectedNode.id]: true }));
                    }}
                    style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    <i className="fa-solid fa-arrows-to-eye"></i> Set as Root
                  </button>
                )}
              </div>

              {/* 3-Column Grid for Horizontal Presentation */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
                marginTop: '8px'
              }}>
                {/* Column 1: Identity Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <h3 style={{ color: '#fff', fontSize: '1.25rem', margin: '0 0 4px 0' }}>{selectedNode.name}</h3>
                    <code style={{ fontSize: '0.85rem', color: '#3b82f6', fontFamily: 'monospace' }}>{selectedNode.memberId}</code>
                  </div>
                  <div style={{ padding: '12px', background: '#070e1b', borderRadius: '8px', border: '1px solid #1e293b', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    <div><strong>Phone:</strong> {selectedNode.phone}</div>
                    <div><strong>Email:</strong> {selectedNode.email}</div>
                    <div><strong>Joining Date:</strong> {selectedNode.joinDate}</div>
                    <div><strong>Network Level:</strong> Level {selectedNode.level} (L{selectedNode.level})</div>
                  </div>
                </div>

                {/* Column 2: Financial Sales Metrics */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid #1e293b', paddingBottom: '6px', margin: '0 0 12px 0', fontWeight: 700 }}>Sales Volume Analysis</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ padding: '8px 12px', background: '#070e1b', borderRadius: '6px', border: '1px solid #1e293b' }}>
                      <label style={{ fontSize: '0.62rem', color: '#64748b', display: 'block' }}>Direct Volume</label>
                      <strong style={{ fontSize: '0.95rem', color: '#fff' }}>{formatBDT(selectedNode.directSales)}</strong>
                    </div>
                    <div style={{ padding: '8px 12px', background: '#070e1b', borderRadius: '6px', border: '1px solid #1e293b' }}>
                      <label style={{ fontSize: '0.62rem', color: '#64748b', display: 'block' }}>Group Volume</label>
                      <strong style={{ fontSize: '0.95rem', color: '#34d399' }}>{formatBDT(selectedNode.groupSales)}</strong>
                    </div>
                    <div style={{ padding: '8px 12px', background: '#070e1b', borderRadius: '6px', border: '1px solid #1e293b' }}>
                      <label style={{ fontSize: '0.62rem', color: '#64748b', display: 'block' }}>Downline Size</label>
                      <strong style={{ fontSize: '0.95rem', color: '#fff' }}>{selectedNode.downlineCount.toLocaleString()} users</strong>
                    </div>
                    <div style={{ padding: '8px 12px', background: '#070e1b', borderRadius: '6px', border: '1px solid #1e293b' }}>
                      <label style={{ fontSize: '0.62rem', color: '#64748b', display: 'block' }}>Estimated Payout</label>
                      <strong style={{ fontSize: '0.95rem', color: '#f59e0b' }}>{formatBDT(selectedNode.commission)}</strong>
                    </div>
                  </div>
                </div>

                {/* Column 3: Sponsors & Direct Hands */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Direct Binary Hands */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid #1e293b', paddingBottom: '6px', margin: '0 0 10px 0', fontWeight: 700 }}>Direct Binary Hands</h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {/* Left child */}
                      <div style={{ flex: 1 }}>
                        {selectedNode.leftChildId ? (
                          <div 
                            onClick={() => setSelectedNode(getProceduralUser(selectedNode.leftChildId))}
                            style={{ padding: '6px 10px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', textAlign: 'center' }}
                            title="Inspect Left Hand child"
                          >
                            <span style={{ fontSize: '0.58rem', color: '#10b981', fontWeight: 800, display: 'block' }}>LEFT</span>
                            <span style={{ color: '#fff', fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {getProceduralUser(selectedNode.leftChildId).name}
                            </span>
                          </div>
                        ) : (
                          <div style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.01)', border: '1px dashed #1e293b', borderRadius: '6px', color: '#64748b', fontSize: '0.72rem', textAlign: 'center' }}>
                            Empty
                          </div>
                        )}
                      </div>

                      {/* Right child */}
                      <div style={{ flex: 1 }}>
                        {selectedNode.rightChildId ? (
                          <div 
                            onClick={() => setSelectedNode(getProceduralUser(selectedNode.rightChildId))}
                            style={{ padding: '6px 10px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', textAlign: 'center' }}
                            title="Inspect Right Hand child"
                          >
                            <span style={{ fontSize: '0.58rem', color: '#8b5cf6', fontWeight: 800, display: 'block' }}>RIGHT</span>
                            <span style={{ color: '#fff', fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {getProceduralUser(selectedNode.rightChildId).name}
                            </span>
                          </div>
                        ) : (
                          <div style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.01)', border: '1px dashed #1e293b', borderRadius: '6px', color: '#64748b', fontSize: '0.72rem', textAlign: 'center' }}>
                            Empty
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sponsorship Upline Tracker */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid #1e293b', paddingBottom: '6px', margin: '0 0 10px 0', fontWeight: 700 }}>Upline Sponsor</h4>
                    {sponsorChain.length === 0 ? (
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>No parent sponsors (Root).</span>
                    ) : (
                      <div 
                        onClick={() => setSelectedNode(sponsorChain[0])}
                        style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid #1e293b', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.78rem', transition: 'background 0.15s ease' }}
                        title="Click to inspect direct sponsor"
                      >
                        <div>
                          <strong style={{ color: '#fff' }}>{sponsorChain[0].name}</strong>
                          <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '0.68rem' }}>Gen {sponsorChain[0].level + 1}</span>
                        </div>
                        <code style={{ fontSize: '0.68rem', color: '#60a5fa' }}>{sponsorChain[0].memberId}</code>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
