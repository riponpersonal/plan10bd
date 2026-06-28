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
    },
    {
      id: 'usr_101',
      username: 'Plan10-101',
      phone: '01912345678',
      password: 'user123',
      name: 'Rahim Uddin',
      email: 'rahim@gmail.com',
      role: 'USER',
      createdAt: '2026-02-15T00:00:00Z'
    },
    {
      id: 'usr_102',
      username: 'Plan10-102',
      phone: '01755443322',
      password: 'user123',
      name: 'Nusrat Jahan',
      email: 'nusrat@gmail.com',
      role: 'USER',
      createdAt: '2026-03-01T00:00:00Z'
    }
  ],
  applications: [],
  members: [],
  payouts: [],
  products: [],
  inquiries: []
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
      return JSON.parse(fileData);
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
    nomineeName: appObj.nomineeName || 'Nominee Pending',
    relation: appObj.relation || 'Legal Heir',
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
  
  // Level 2: Sub-referrals of Level 1
  const level1Ids = level1.map(m => m.memberId);
  const level2 = dataStore.members.filter(m => level1Ids.includes(m.referredBy));
  
  // Level 3: Sub-referrals of Level 2
  const level2Ids = level2.map(m => m.memberId);
  const level3 = dataStore.members.filter(m => level2Ids.includes(m.referredBy));

  let totalEarnedBonus = 0;
  let totalTeamVolume = 0;

  const buildTreeNodes = (memberList, levelNum, bonusPercent) => {
    return memberList.map(m => {
      const bonus = (m.capitalInvested * bonusPercent) / 100;
      totalEarnedBonus += bonus;
      totalTeamVolume += m.capitalInvested;
      
      let children = [];
      if (levelNum === 1) {
        children = buildTreeNodes(dataStore.members.filter(sub => sub.referredBy === m.memberId), 2, 3);
      } else if (levelNum === 2) {
        children = buildTreeNodes(dataStore.members.filter(sub => sub.referredBy === m.memberId), 3, 1);
      }

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

  const tree = buildTreeNodes(level1, 1, 5);

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
      totalTeam: level1.length + level2.length + level3.length,
      totalTeamVolume,
      totalEarnedBonus,
      tree
    }
  };
}

export function addApplication(appData) {
  const newApp = {
    id: `APP-2026-00${dataStore.applications.length + 1}`,
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
