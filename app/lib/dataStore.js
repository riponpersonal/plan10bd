// PLAN-10 BD Centralized Data Store & File Persistence Interface
// Handles state persistence for Users, SPL Applications, Members, Payouts, Products, and Inquiries.
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'dataStore.json');

const initialDataStore = {
  users: [
    {
      id: 'usr_admin',
      username: 'admin',
      password: 'admin',
      name: 'Corporate Executive Admin',
      email: 'admin@plan10bd.com',
      role: 'ADMIN',
      createdAt: '2026-01-01T00:00:00Z'
    }
  ],
  applications: [],
  members: [],
  payouts: [],
  products: [],
  inquiries: [],
  categories: [],
  logs: []
};

function saveDataStoreToFile(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving dataStore to file:', err);
  }
}

function loadDataStoreFromFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(fileData);
      
      // Migrate products to ecommerce schema if needed
      if (parsed.products && Array.isArray(parsed.products)) {
        parsed.products = parsed.products.map(p => ({
          id: p.id,
          name: p.name,
          brand: p.brand || 'PLAN-10',
          category: p.category || 'Consumer Goods',
          price: p.price !== undefined ? p.price : (1500 + (p.id * 350)),
          description: p.description || `${p.name} - Premium quality consumer product designed for maximum user satisfaction.`,
          imageUrl: p.imageUrl || '',
          imageUrls: p.imageUrls || (p.imageUrl ? [p.imageUrl] : []),
          stockStatus: p.stockStatus || 'IN_STOCK'
        }));
      }
      
      // Migrate/Initialize categories if needed
      if (!parsed.categories || !Array.isArray(parsed.categories)) {
        parsed.categories = [];
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error loading dataStore from file:', err);
  }
  saveDataStoreToFile(initialDataStore);
  return initialDataStore;
}

if (!globalThis.plan10DataStore) {
  globalThis.plan10DataStore = loadDataStoreFromFile();
}
const dataStore = globalThis.plan10DataStore;

export function getDataStore() {
  return dataStore;
}

export function findUserByCredentials(username, password) {
  if (!username || !password) return null;
  const inputClean = username.trim().toLowerCase();
  const inputDigits = username.replace(/\D/g, '');
  const passClean = password.trim();

  const matchPhone = (phoneStr) => {
    if (!phoneStr) return false;
    const pClean = phoneStr.trim().toLowerCase();
    if (pClean === inputClean) return true;
    const pDigits = phoneStr.replace(/\D/g, '');
    if (inputDigits.length >= 6 && pDigits.length >= 6) {
      if (pDigits === inputDigits || pDigits.endsWith(inputDigits) || inputDigits.endsWith(pDigits)) {
        return true;
      }
    }
    return false;
  };

  // 1. Search in users array
  for (const u of dataStore.users) {
    const isUserMatch = (u.username && u.username.toLowerCase() === inputClean) || matchPhone(u.phone);
    if (isUserMatch && u.password === passClean) {
      if (u.role !== 'ADMIN') {
        const app = dataStore.applications.find(a => matchPhone(a.phone) || (u.phone && matchPhone(u.phone)));
        if (app && app.status !== 'APPROVED') {
          return {
            ...u,
            role: 'PENDING_USER',
            appStatus: app.status
          };
        }
      }
      return u;
    }
  }

  // 2. Search in applications array
  for (const app of dataStore.applications) {
    const isAppPhoneMatch = matchPhone(app.phone);
    const isPassMatch = app.password && app.password.trim() === passClean;
    if (isAppPhoneMatch && isPassMatch) {
      return {
        id: `usr_app_${app.id}`,
        username: app.phone,
        phone: app.phone,
        name: app.applicantName,
        role: app.status === 'APPROVED' ? 'USER' : 'PENDING_USER',
        appStatus: app.status
      };
    }
  }

  return null;
}

export function getUserDashboardData(identifier) {
  if (!identifier) return null;
  const cleanId = identifier.trim().toLowerCase();
  const inputDigits = identifier.replace(/\D/g, '');

  const matchPhone = (phoneStr) => {
    if (!phoneStr) return false;
    const pClean = phoneStr.trim().toLowerCase();
    if (pClean === cleanId) return true;
    const pDigits = phoneStr.replace(/\D/g, '');
    if (inputDigits.length >= 6 && pDigits.length >= 6) {
      return pDigits === inputDigits || pDigits.endsWith(inputDigits) || inputDigits.endsWith(pDigits);
    }
    return false;
  };

  // Find User account
  const userObj = dataStore.users.find(u => 
    (u.username && u.username.toLowerCase() === cleanId) || 
    matchPhone(u.phone)
  );

  // Find Member record
  let memberObj = dataStore.members.find(m => 
    (m.memberId && m.memberId.toLowerCase() === cleanId) || 
    matchPhone(m.phone) ||
    (userObj && m.memberId === userObj.username) ||
    (userObj && matchPhone(m.phone))
  );

  // If not found in members, look in applications
  let appObj = null;
  if (!memberObj) {
    appObj = dataStore.applications.find(a => matchPhone(a.phone) || (userObj && userObj.phone === a.phone));
  }

  // If still no member or application found, return basic user profile
  if (!memberObj && !appObj) {
    return {
      user: userObj || { name: identifier, username: identifier, role: 'USER' },
      member: null,
      stats: { totalInvested: 0, monthlyProfit: 0, monthlyCapitalRefund: 0, totalMonthlyPayout: 0, payoutsCompleted: 0, remainingMonths: 33 },
      schedule: [],
      referrals: { totalDirect: 0, totalTeam: 0, totalEarnedBonus: 0, tree: [] }
    };
  }

  // Construct active member profile if using appObj
  const activeMember = memberObj || {
    memberId: `Plan10-${100 + dataStore.members.length + 1}`,
    name: appObj.applicantName,
    phone: appObj.phone,
    nid: appObj.nid || '19922691234567891',
    capitalInvested: appObj.capitalAmount || 100000,
    termMonths: appObj.durationMonths || 33,
    monthlyProfit: (appObj.capitalAmount / 100000) * 3000 || 3000,
    monthlyCapitalRefund: Math.round((appObj.capitalAmount || 100000) / (appObj.durationMonths || 33)),
    monthlyTotalPayout: ((appObj.capitalAmount / 100000) * 3000 || 3000) + Math.round((appObj.capitalAmount || 100000) / (appObj.durationMonths || 33)),
    joinDate: appObj.submittedAt ? appObj.submittedAt.split('T')[0] : new Date().toISOString().split('T')[0],
    status: appObj.status === 'APPROVED' ? 'ACTIVE' : 'PENDING',
    nomineeName: appObj ? appObj.nomineeName || 'Nominee Pending' : 'Nominee Pending',
    relation: appObj ? appObj.relation || 'Legal Heir' : 'Legal Heir',
    fatherName: memberObj ? memberObj.fatherName || '' : (appObj ? appObj.fatherName || '' : ''),
    address: memberObj ? memberObj.address || '' : (appObj ? appObj.address || '' : ''),
    referredBy: null
  };

  // Generate 33-Month Complete Payout Schedule
  const termMonths = activeMember.termMonths || 33;
  const joinDateObj = new Date(activeMember.joinDate || '2026-01-01');
  const existingPayouts = dataStore.payouts.filter(p => p.memberId === activeMember.memberId);

  const schedule = [];
  let totalPaidSoFar = 0;
  let payoutsCompletedCount = 0;

  for (let m = 1; m <= termMonths; m++) {
    const pDate = new Date(joinDateObj);
    pDate.setMonth(pDate.getMonth() + m);
    const dueDateStr = pDate.toISOString().split('T')[0];

    const recorded = existingPayouts.find(p => p.monthNumber === m);
    let status = 'UPCOMING';
    let method = 'Bank Wire / bKash';
    let payoutId = `PAY-SCHED-${m}`;

    if (recorded) {
      status = recorded.status;
      method = recorded.method || method;
      payoutId = recorded.id;
      if (status === 'PAID') {
        totalPaidSoFar += recorded.totalPayout || activeMember.monthlyTotalPayout;
        payoutsCompletedCount++;
      }
    } else {
      const today = new Date().toISOString().split('T')[0];
      if (dueDateStr < today) {
        status = 'PAID';
        totalPaidSoFar += activeMember.monthlyTotalPayout;
        payoutsCompletedCount++;
      }
    }

    schedule.push({
      monthNumber: m,
      id: payoutId,
      dueDate: dueDateStr,
      profitAmount: activeMember.monthlyProfit,
      capitalRefund: activeMember.monthlyCapitalRefund,
      totalPayout: activeMember.monthlyTotalPayout,
      status,
      method
    });
  }

  // Generate Multilevel Referral Tree & Bonus Calculations
  // Level 1: Direct referrals
  const level1 = dataStore.members.filter(m => m.referredBy === activeMember.memberId);
  
  let totalEarnedBonus = 0;
  let totalTeamVolume = 0;
  let totalTeamCount = 0;

  const buildTreeNodes = (memberList, levelNum) => {
    return memberList.map(m => {
      // Calculate bonus percentage based on level: L1 (5%), L2 (3%), L3 (1%), L4+ (0%)
      let bonusPercent = 0;
      if (levelNum === 1) bonusPercent = 5;
      else if (levelNum === 2) bonusPercent = 3;
      else if (levelNum === 3) bonusPercent = 1;

      const bonus = (m.capitalInvested * bonusPercent) / 100;
      totalEarnedBonus += bonus;
      totalTeamVolume += m.capitalInvested;
      totalTeamCount += 1;
      
      const children = buildTreeNodes(
        dataStore.members.filter(sub => sub.referredBy === m.memberId), 
        levelNum + 1
      );

      return {
        memberId: m.memberId,
        name: m.name,
        phone: m.phone,
        joinDate: m.joinDate,
        capitalInvested: m.capitalInvested,
        level: levelNum,
        bonusEarned: bonus,
        children
      };
    });
  };

  const tree = buildTreeNodes(level1, 1);

  return {
    user: userObj || {
      id: activeMember.memberId,
      username: activeMember.memberId,
      phone: activeMember.phone,
      name: activeMember.name,
      role: 'USER'
    },
    member: activeMember,
    stats: {
      capitalInvested: activeMember.capitalInvested,
      termMonths: activeMember.termMonths,
      monthlyProfit: activeMember.monthlyProfit,
      monthlyCapitalRefund: activeMember.monthlyCapitalRefund,
      monthlyTotalPayout: activeMember.monthlyTotalPayout,
      totalPaidSoFar,
      payoutsCompletedCount,
      remainingMonths: termMonths - payoutsCompletedCount,
      maturityTotalReturn: activeMember.monthlyTotalPayout * termMonths
    },
    schedule,
    referrals: {
      referralCode: activeMember.memberId,
      totalDirect: level1.length,
      totalTeam: totalTeamCount,
      totalTeamVolume,
      totalEarnedBonus,
      tree
    }
  };
}

export function isPhoneRegistered(phoneStr) {
  if (!phoneStr) return false;
  const inputClean = phoneStr.trim().toLowerCase();
  const inputDigits = phoneStr.replace(/\D/g, '');
  if (!inputDigits) return false;

  const match = (p) => {
    if (!p) return false;
    const pClean = p.trim().toLowerCase();
    if (pClean === inputClean) return true;
    const pDigits = p.replace(/\D/g, '');
    if (inputDigits.length >= 6 && pDigits.length >= 6) {
      return pDigits === inputDigits || pDigits.endsWith(inputDigits) || inputDigits.endsWith(pDigits);
    }
    return false;
  };

  const existsInApps = dataStore.applications.some(a => match(a.phone));
  if (existsInApps) return true;

  const existsInMembers = dataStore.members.some(m => match(m.phone));
  if (existsInMembers) return true;

  const existsInUsers = dataStore.users.some(u => match(u.phone));
  if (existsInUsers) return true;

  return false;
}

export function addApplication(appData) {
  if (isPhoneRegistered(appData.phone)) {
    throw new Error('This mobile number is already registered in our database. Please sign in or use a different mobile number.');
  }

  const maxNum = dataStore.applications.reduce((max, app) => {
    const match = app.id.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);

  const nextNum = maxNum + 1;
  const padding = nextNum < 10 ? '00' : (nextNum < 100 ? '0' : '');

  const newApp = {
    id: `APP-2026-${padding}${nextNum}`,
    ...appData,
    status: 'PENDING',
    submittedAt: new Date().toISOString()
  };
  dataStore.applications.unshift(newApp);
  saveDataStoreToFile(dataStore);
  return newApp;
}

export function updateApplicationStatus(id, status) {
  const app = dataStore.applications.find((a) => a.id === id);
  if (app) {
    app.status = status;
    if (status === 'APPROVED') {
      const memberId = `Plan10-${100 + dataStore.members.length + 1}`;
      const monthlyProfit = (app.capitalAmount / 100000) * 3000;
      const monthlyCapitalRefund = Math.round(app.capitalAmount / app.durationMonths);
      const newMember = {
        memberId,
        name: app.applicantName,
        phone: app.phone,
        nid: app.nid,
        capitalInvested: app.capitalAmount,
        termMonths: app.durationMonths,
        monthlyProfit,
        monthlyCapitalRefund,
        monthlyTotalPayout: monthlyProfit + monthlyCapitalRefund,
        joinDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        nomineeName: app.nomineeName || 'Legal Heir',
        relation: app.relation || 'Family',
        referredBy: app.referredBy || null
      };
      dataStore.members.push(newMember);

      const inputDigits = app.phone ? app.phone.replace(/\D/g, '') : '';
      const existingUser = dataStore.users.find(u => {
        if (u.username === memberId) return true;
        if (u.phone && inputDigits.length >= 6) {
          const uDigits = u.phone.replace(/\D/g, '');
          if (uDigits === inputDigits || uDigits.endsWith(inputDigits) || inputDigits.endsWith(uDigits)) return true;
        }
        return false;
      });

      if (existingUser) {
        if (app.password) existingUser.password = app.password;
        if (app.phone) existingUser.phone = app.phone;
        existingUser.role = 'USER';
      } else {
        const newUser = {
          id: `usr_${Date.now()}`,
          username: memberId,
          phone: app.phone,
          password: app.password || 'user123',
          name: app.applicantName,
          email: app.email || `${app.applicantName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
          role: 'USER',
          createdAt: new Date().toISOString()
        };
        dataStore.users.push(newUser);
      }
    }
    saveDataStoreToFile(dataStore);
  }
  return app;
}

export function updatePayoutStatus(id, status) {
  const payout = dataStore.payouts.find((p) => p.id === id);
  if (payout) {
    payout.status = status;
    saveDataStoreToFile(dataStore);
  }
  return payout;
}

export function addInquiry(inquiryData) {
  const newInq = {
    id: `INQ-${500 + dataStore.inquiries.length + 1}`,
    ...inquiryData,
    date: new Date().toISOString(),
    status: 'UNREAD'
  };
  dataStore.inquiries.unshift(newInq);
  saveDataStoreToFile(dataStore);
  return newInq;
}

export function deleteApplication(id) {
  const index = dataStore.applications.findIndex((a) => a.id === id);
  if (index !== -1) {
    const deleted = dataStore.applications.splice(index, 1)[0];
    saveDataStoreToFile(dataStore);
    return deleted;
  }
  return null;
}

export function deleteMember(memberId) {
  const index = dataStore.members.findIndex((m) => m.memberId === memberId);
  if (index !== -1) {
    const deleted = dataStore.members.splice(index, 1)[0];
    saveDataStoreToFile(dataStore);
    return deleted;
  }
  return null;
}

export function deleteInquiry(id) {
  const index = dataStore.inquiries.findIndex((i) => i.id === id);
  if (index !== -1) {
    const deleted = dataStore.inquiries.splice(index, 1)[0];
    saveDataStoreToFile(dataStore);
    return deleted;
  }
  return null;
}

export function deletePayout(id) {
  const index = dataStore.payouts.findIndex((p) => p.id === id);
  if (index !== -1) {
    const deleted = dataStore.payouts.splice(index, 1)[0];
    saveDataStoreToFile(dataStore);
    return deleted;
  }
  return null;
}

export function getAllUsersWithRoles() {
  const userList = dataStore.users.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email || '',
    phone: u.phone || '',
    role: u.role || 'USER'
  }));

  dataStore.members.forEach(m => {
    const exists = userList.find(u => u.username === m.memberId || (u.phone && m.phone && u.phone === m.phone));
    if (!exists) {
      userList.push({
        id: `usr_${m.memberId}`,
        username: m.memberId,
        name: m.name,
        email: `${m.name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        phone: m.phone,
        role: 'USER'
      });
    }
  });

  return userList;
}

export function updateUserAdminRole(username, newRole) {
  let updated = false;
  const userObj = dataStore.users.find(u => u.username === username || u.id === username);
  if (userObj) {
    userObj.role = newRole;
    updated = true;
  } else {
    const memberObj = dataStore.members.find(m => m.memberId === username);
    if (memberObj) {
      const newUser = {
        id: `usr_${memberObj.memberId}`,
        username: memberObj.memberId,
        phone: memberObj.phone,
        password: 'user123',
        name: memberObj.name,
        email: `${memberObj.name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        role: newRole,
        createdAt: new Date().toISOString()
      };
      dataStore.users.push(newUser);
      updated = true;
    }
  }

  if (updated) {
    saveDataStoreToFile(dataStore);
    addSystemLog(`Admin Authority Delegation: ${username} set to ${newRole}`, 'Internal System Process', 'Success');
  }
  return updated;
}


export function updateMemberProfile(identifier, updateData) {
  if (!identifier) return false;
  const cleanId = identifier.trim().toLowerCase();
  const inputDigits = identifier.replace(/\D/g, '');

  const matchPhone = (phoneStr) => {
    if (!phoneStr) return false;
    const pClean = phoneStr.trim().toLowerCase();
    if (pClean === cleanId) return true;
    const pDigits = phoneStr.replace(/\D/g, '');
    if (inputDigits.length >= 6 && pDigits.length >= 6) {
      return pDigits === inputDigits || pDigits.endsWith(inputDigits) || inputDigits.endsWith(pDigits);
    }
    return false;
  };

  let updated = false;

  // 1. Update in members array
  const memberObj = dataStore.members.find(m => 
    (m.memberId && m.memberId.toLowerCase() === cleanId) || matchPhone(m.phone)
  );

  if (memberObj) {
    if (updateData.name !== undefined) memberObj.name = updateData.name;
    if (updateData.phone !== undefined) memberObj.phone = updateData.phone;
    if (updateData.nid !== undefined) memberObj.nid = updateData.nid;
    if (updateData.fatherName !== undefined) memberObj.fatherName = updateData.fatherName;
    if (updateData.address !== undefined) memberObj.address = updateData.address;
    if (updateData.nomineeName !== undefined) memberObj.nomineeName = updateData.nomineeName;
    if (updateData.relation !== undefined) memberObj.relation = updateData.relation;
    updated = true;
  }

  // 2. Update matching user in users array
  const userObj = dataStore.users.find(u => 
    (u.username && u.username.toLowerCase() === cleanId) || matchPhone(u.phone) || (memberObj && u.username === memberObj.memberId)
  );

  if (userObj) {
    if (updateData.name !== undefined) userObj.name = updateData.name;
    if (updateData.phone !== undefined) userObj.phone = updateData.phone;
    updated = true;
  }

  // 3. Update matching application in applications array
  const appObj = dataStore.applications.find(a => 
    matchPhone(a.phone) || (memberObj && matchPhone(memberObj.phone))
  );

  if (appObj) {
    if (updateData.name !== undefined) appObj.applicantName = updateData.name;
    if (updateData.phone !== undefined) appObj.phone = updateData.phone;
    if (updateData.nid !== undefined) appObj.nid = updateData.nid;
    if (updateData.fatherName !== undefined) appObj.fatherName = updateData.fatherName;
    if (updateData.address !== undefined) appObj.address = updateData.address;
    if (updateData.nomineeName !== undefined) appObj.nomineeName = updateData.nomineeName;
    if (updateData.relation !== undefined) appObj.relation = updateData.relation;
    updated = true;
  }

  if (updated) {
    saveDataStoreToFile(dataStore);
  }

  return updated;
}

export function bindReferralCode(memberIdentifier, referrerCode) {
  if (!memberIdentifier || !referrerCode) {
    return { success: false, message: 'Both member identifier and referral code are required.' };
  }

  const cleanMemberId = memberIdentifier.trim().toLowerCase();
  const cleanRefCode = referrerCode.trim().toLowerCase();
  const memberDigits = memberIdentifier.replace(/\D/g, '');
  const refDigits = referrerCode.replace(/\D/g, '');

  const matchPhone = (phoneStr, targetClean, targetDigits) => {
    if (!phoneStr) return false;
    const pClean = phoneStr.trim().toLowerCase();
    if (pClean === targetClean) return true;
    const pDigits = phoneStr.replace(/\D/g, '');
    if (targetDigits.length >= 6 && pDigits.length >= 6) {
      return pDigits === targetDigits || pDigits.endsWith(targetDigits) || targetDigits.endsWith(pDigits);
    }
    return false;
  };

  // Find target member updating referral
  let targetMember = dataStore.members.find(m => 
    (m.memberId && m.memberId.toLowerCase() === cleanMemberId) || matchPhone(m.phone, cleanMemberId, memberDigits)
  );

  if (!targetMember) {
    return { success: false, message: 'Member account not found.' };
  }

  if (targetMember.referredBy) {
    return { success: false, message: `Account is already linked to sponsor (${targetMember.referredBy}). A referral code can only be submitted once.` };
  }

  // Find referrer member
  let referrerMember = dataStore.members.find(m => 
    (m.memberId && m.memberId.toLowerCase() === cleanRefCode) || matchPhone(m.phone, cleanRefCode, refDigits)
  );

  // Fallback to users array if not found in members
  if (!referrerMember) {
    const referrerUser = dataStore.users.find(u => 
      (u.username && u.username.toLowerCase() === cleanRefCode) || matchPhone(u.phone, cleanRefCode, refDigits)
    );
    if (referrerUser) {
      referrerMember = { memberId: referrerUser.username, name: referrerUser.name };
    }
  }

  if (!referrerMember) {
    return { success: false, message: 'Invalid referral code. No matching sponsor member found.' };
  }

  if (referrerMember.memberId && targetMember.memberId && referrerMember.memberId.toLowerCase() === targetMember.memberId.toLowerCase()) {
    return { success: false, message: 'You cannot use your own referral code as a sponsor.' };
  }

  targetMember.referredBy = referrerMember.memberId;
  saveDataStoreToFile(dataStore);

  return { 
    success: true, 
    message: `Successfully linked to sponsor ${referrerMember.name} (${referrerMember.memberId})!`,
    referredBy: referrerMember.memberId
  };
}

// Product Management Helpers
export function getProducts() {
  return dataStore.products || [];
}

export function addProduct(productData) {
  const nextId = dataStore.products.length > 0 
    ? Math.max(...dataStore.products.map(p => p.id)) + 1 
    : 1;

  const newProduct = {
    id: nextId,
    name: productData.name,
    brand: productData.brand || 'PLAN-10 Branded',
    category: productData.category || 'Consumer Goods',
    price: Number(productData.price) || 0,
    description: productData.description || '',
    imageUrl: productData.imageUrls?.[0] || productData.imageUrl || '',
    imageUrls: productData.imageUrls || (productData.imageUrl ? [productData.imageUrl] : []),
    stockStatus: productData.stockStatus || 'IN_STOCK'
  };

  dataStore.products.push(newProduct);
  saveDataStoreToFile(dataStore);
  return newProduct;
}

export function updateProduct(id, productData) {
  const product = dataStore.products.find(p => p.id === Number(id));
  if (!product) return null;

  if (productData.name !== undefined) product.name = productData.name;
  if (productData.brand !== undefined) product.brand = productData.brand;
  if (productData.category !== undefined) product.category = productData.category;
  if (productData.price !== undefined) product.price = Number(productData.price);
  if (productData.description !== undefined) product.description = productData.description;
  if (productData.imageUrl !== undefined) product.imageUrl = productData.imageUrl;
  if (productData.imageUrls !== undefined) {
    product.imageUrls = productData.imageUrls;
    product.imageUrl = productData.imageUrls[0] || '';
  }
  if (productData.stockStatus !== undefined) product.stockStatus = productData.stockStatus;

  saveDataStoreToFile(dataStore);
  return product;
}

export function deleteProduct(id) {
  const index = dataStore.products.findIndex(p => p.id === Number(id));
  if (index !== -1) {
    const deleted = dataStore.products.splice(index, 1)[0];
    saveDataStoreToFile(dataStore);
    return deleted;
  }
  return null;
}

// Categories Management Helpers
export function getCategories() {
  return dataStore.categories || [];
}

export function addCategory(name) {
  if (!dataStore.categories) dataStore.categories = [];
  const cleanName = name.trim();
  if (dataStore.categories.some(c => c.toLowerCase() === cleanName.toLowerCase())) {
    return { success: false, message: 'Category already exists.' };
  }
  dataStore.categories.push(cleanName);
  saveDataStoreToFile(dataStore);
  return { success: true, categories: dataStore.categories };
}

// System Database Operations: Reset and Import/Restore
// System Database Operations: Reset and Import/Restore with logging support
export function resetDataStore() {
  // Reset users array to only contain the default primary superadmin account
  dataStore.users = [{
    id: 'usr_admin',
    username: 'admin',
    password: 'admin',
    name: 'Corporate Executive Admin',
    email: 'admin@plan10bd.com',
    role: 'ADMIN',
    createdAt: new Date().toISOString()
  }];

  dataStore.applications = [];
  dataStore.members = [];
  dataStore.payouts = [];
  dataStore.products = [];
  dataStore.inquiries = [];
  dataStore.categories = [];


  // Initialize fresh logs array with the factory reset action logged
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const timestamp = `${dateStr} ${timeStr}`;

  dataStore.logs = [{
    id: `log_${Date.now()}`,
    timestamp,
    action: 'Factory Reset Executed',
    ipAddress: 'Internal System Process',
    status: 'Success'
  }];

  saveDataStoreToFile(dataStore);
  return true;
}

export function importDataStore(newData) {
  if (!newData || typeof newData !== 'object') {
    throw new Error('Invalid data format: Expected a JSON object.');
  }

  // Basic validation to check that the uploaded object is a valid plan10 database
  if (!newData.users || !Array.isArray(newData.users)) {
    throw new Error('Invalid backup file: Missing or invalid "users" array.');
  }

  // Ensure there is at least one ADMIN user to prevent accidental lockout
  const hasAdmin = newData.users.some(u => u.role === 'ADMIN');
  if (!hasAdmin) {
    throw new Error('Invalid backup file: Must contain at least one ADMIN user to prevent system lockout.');
  }

  // Mutate dataStore keys in-place
  dataStore.users = newData.users;
  dataStore.applications = newData.applications || [];
  dataStore.members = newData.members || [];
  dataStore.payouts = newData.payouts || [];
  dataStore.products = newData.products || [];
  dataStore.inquiries = newData.inquiries || [];
  dataStore.categories = newData.categories || [];

  // Restore existing logs or initialize
  dataStore.logs = newData.logs || [];
  
  // Log the restore event itself
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const timestamp = `${dateStr} ${timeStr}`;

  if (!Array.isArray(dataStore.logs)) {
    dataStore.logs = [];
  }

  dataStore.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp,
    action: 'Database Restored from JSON Backup',
    ipAddress: 'Internal System Process',
    status: 'Success'
  });

  if (dataStore.logs.length > 30) {
    dataStore.logs = dataStore.logs.slice(0, 30);
  }

  saveDataStoreToFile(dataStore);
  return true;
}

// System Logging Helper Functions
export function addSystemLog(action, ipAddress = 'Internal System Process', status = 'Success') {
  if (!dataStore.logs) {
    dataStore.logs = [];
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const timestamp = `${dateStr} ${timeStr}`;

  dataStore.logs.unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp,
    action,
    ipAddress,
    status
  });

  // Keep only the last 30 logs to avoid file bloat
  if (dataStore.logs.length > 30) {
    dataStore.logs = dataStore.logs.slice(0, 30);
  }

  saveDataStoreToFile(dataStore);
}

export function getSystemLogs() {
  return dataStore.logs || [];
}

