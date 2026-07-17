// PLAN-10 BD Centralized Data Store & Prisma SQL Database Interface
// Refactored to use SQL database instead of flat-file JSON datastore.
import { PrismaClient } from './prisma-client/index.js';
import { hashPassword, verifyPassword, needsRehash } from './crypto.js';

// Prevent multiple instances of Prisma Client in development hot reloading
let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export { prisma };

// Helper: Normalize date to ISO string safely
function ensureISOString(dateVal) {
  if (!dateVal) return new Date().toISOString();
  try {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// ─── Core DataStore Compatibility Layer ───

/**
 * Returns all records in a shape matching the old in-memory JSON dataStore.
 * Used for exporting backup data or legacy handlers.
 */
export async function getDataStore() {
  const [users, applications, members, payouts, products, inquiries, categories, logs, orders, wallets, withdrawals, notifications] = await Promise.all([
    prisma.user.findMany(),
    prisma.application.findMany({ orderBy: { submittedAt: 'desc' } }),
    prisma.member.findMany(),
    prisma.payout.findMany(),
    prisma.product.findMany(),
    prisma.inquiry.findMany({ orderBy: { date: 'desc' } }),
    prisma.category.findMany(),
    prisma.systemLog.findMany({ orderBy: { timestamp: 'desc' } }),
    prisma.order.findMany(),
    prisma.wallet.findMany({ include: { transactions: true } }),
    prisma.withdrawal.findMany({ orderBy: { requestedAt: 'desc' } }),
    prisma.notification.findMany({ orderBy: { timestamp: 'desc' } }),
  ]);

  return {
    users,
    applications,
    members,
    payouts,
    products,
    inquiries,
    categories: categories.map(c => c.name),
    logs,
    orders,
    wallets,
    withdrawals,
    notifications
  };
}

// ─── Phone and Identifier Helper Matches ───

async function findUserRecord(username) {
  if (!username) return null;
  const trimmed = username.trim();
  const inputDigits = username.replace(/\D/g, '');

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: trimmed },
        { username: trimmed.toLowerCase() },
        { username: trimmed.toUpperCase() }
      ]
    }
  });
  if (user) return user;

  user = await prisma.user.findFirst({
    where: { phone: trimmed }
  });
  if (user) return user;

  if (inputDigits.length >= 10) {
    const allUsers = await prisma.user.findMany({
      where: { phone: { not: null } }
    });
    for (const u of allUsers) {
      const pDigits = u.phone.replace(/\D/g, '');
      if (pDigits.length >= 10 && (pDigits === inputDigits || pDigits.endsWith(inputDigits) || inputDigits.endsWith(pDigits))) {
        return u;
      }
    }
  }
  return null;
}

async function findMemberRecord(memberIdOrPhone) {
  if (!memberIdOrPhone) return null;
  const trimmed = memberIdOrPhone.trim();
  const inputDigits = memberIdOrPhone.replace(/\D/g, '');

  let member = await prisma.member.findFirst({
    where: {
      OR: [
        { memberId: trimmed },
        { memberId: trimmed.toLowerCase() },
        { memberId: trimmed.toUpperCase() }
      ]
    }
  });
  if (member) return member;

  member = await prisma.member.findFirst({
    where: { phone: trimmed }
  });
  if (member) return member;

  if (inputDigits.length >= 10) {
    const allMembers = await prisma.member.findMany();
    for (const m of allMembers) {
      const pDigits = m.phone.replace(/\D/g, '');
      if (pDigits.length >= 10 && (pDigits === inputDigits || pDigits.endsWith(inputDigits) || inputDigits.endsWith(pDigits))) {
        return m;
      }
    }
  }
  return null;
}

// ─── Exported Database Operations ───

export async function findUserByCredentials(username, password) {
  if (!username || !password) return null;
  const passClean = password.trim();

  // Search User Account
  const user = await findUserRecord(username);
  if (user && verifyPassword(passClean, user.password)) {
    // Auto-migrate: hash if needed
    if (needsRehash(user.password)) {
      const hashed = hashPassword(passClean);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed }
      });
      user.password = hashed;
    }

    if (user.role !== 'ADMIN') {
      const app = await prisma.application.findFirst({
        where: {
          OR: [
            { phone: user.phone || '' },
            { phone: user.username }
          ]
        }
      });
      if (app && app.status !== 'APPROVED') {
        return {
          ...user,
          role: 'PENDING_USER',
          appStatus: app.status,
          appPurpose: app.purpose || 'Investment'
        };
      }
    }
    return user;
  }

  // Search Application Account
  const cleanId = username.trim().toLowerCase();
  const inputDigits = username.replace(/\D/g, '');
  let matchApp = await prisma.application.findFirst({
    where: { phone: { equals: username.trim() } }
  });

  if (!matchApp && inputDigits.length >= 10) {
    const allApps = await prisma.application.findMany();
    for (const a of allApps) {
      const pDigits = a.phone.replace(/\D/g, '');
      if (pDigits.length >= 10 && (pDigits === inputDigits || pDigits.endsWith(inputDigits) || inputDigits.endsWith(pDigits))) {
        matchApp = a;
        break;
      }
    }
  }

  if (matchApp && matchApp.password && verifyPassword(passClean, matchApp.password)) {
    if (needsRehash(matchApp.password)) {
      const hashed = hashPassword(passClean);
      await prisma.application.update({
        where: { id: matchApp.id },
        data: { password: hashed }
      });
      matchApp.password = hashed;
    }
    return {
      id: `usr_app_${matchApp.id}`,
      username: matchApp.phone,
      phone: matchApp.phone,
      name: matchApp.applicantName,
      role: matchApp.status === 'APPROVED' ? 'USER' : 'PENDING_USER',
      appStatus: matchApp.status,
      appPurpose: matchApp.purpose || 'Investment'
    };
  }

  return null;
}

export async function findUserById(idOrUsername) {
  if (!idOrUsername) return null;
  const trimmed = idOrUsername.trim();
  return prisma.user.findFirst({
    where: {
      OR: [
        { id: trimmed },
        { username: trimmed },
        { username: trimmed.toLowerCase() },
        { username: trimmed.toUpperCase() }
      ]
    }
  });
}

export async function getUserDashboardData(identifier) {
  if (!identifier) return null;

  const userObj = await findUserRecord(identifier);
  let memberObj = await findMemberRecord(identifier);

  if (!memberObj && userObj) {
    memberObj = await findMemberRecord(userObj.username);
  }

  let appObj = null;
  if (!memberObj) {
    const cleanId = identifier.trim().toLowerCase();
    const inputDigits = identifier.replace(/\D/g, '');
    appObj = await prisma.application.findFirst({
      where: { phone: identifier.trim() }
    });
    if (!appObj && userObj && userObj.phone) {
      appObj = await prisma.application.findFirst({
        where: { phone: userObj.phone }
      });
    }
    if (!appObj && inputDigits.length >= 10) {
      const allApps = await prisma.application.findMany();
      for (const a of allApps) {
        const pDigits = a.phone.replace(/\D/g, '');
        if (pDigits.length >= 10 && (pDigits === inputDigits || pDigits.endsWith(inputDigits) || inputDigits.endsWith(pDigits))) {
          appObj = a;
          break;
        }
      }
    }
  }

  if (!memberObj && !appObj) {
    return {
      user: userObj || { name: identifier, username: identifier, role: 'USER' },
      member: null,
      stats: { totalInvested: 0, monthlyProfit: 0, monthlyCapitalRefund: 0, totalMonthlyPayout: 0, payoutsCompleted: 0, remainingMonths: 33 },
      schedule: [],
      referrals: { totalDirect: 0, totalTeam: 0, totalEarnedBonus: 0, tree: [] }
    };
  }

  const activeMember = memberObj || {
    memberId: `Plan10-${100 + (await prisma.member.count()) + 1}`,
    name: appObj.applicantName,
    phone: appObj.phone,
    nid: appObj.nid || '19922691234567891',
    capitalInvested: appObj.capitalAmount || 0,
    termMonths: appObj.durationMonths || 0,
    monthlyProfit: appObj.capitalAmount ? (appObj.capitalAmount / 100000) * 3000 : 0,
    monthlyCapitalRefund: appObj.durationMonths ? Math.round((appObj.capitalAmount || 0) / appObj.durationMonths) : 0,
    monthlyTotalPayout: (appObj.capitalAmount ? (appObj.capitalAmount / 100000) * 3000 : 0) + (appObj.durationMonths ? Math.round((appObj.capitalAmount || 0) / appObj.durationMonths) : 0),
    joinDate: appObj.submittedAt ? ensureISOString(appObj.submittedAt).split('T')[0] : new Date().toISOString().split('T')[0],
    status: appObj.status === 'APPROVED' ? 'ACTIVE' : 'PENDING',
    nomineeName: appObj.nomineeName || 'Nominee Pending',
    relation: appObj.relation || 'Legal Heir',
    fatherName: appObj.fatherName || '',
    address: appObj.address || '',
    referredBy: appObj.referredBy || null,
    buyerReferredBy: null,
    buyerParent: null,
    buyerLeft: null,
    buyerRight: null,
    investorParent: null,
    investorLeft: null,
    investorRight: null
  };

  const termMonths = activeMember.termMonths || 33;
  const joinDateObj = new Date(activeMember.joinDate || '2026-01-01');
  const existingPayouts = await prisma.payout.findMany({
    where: { memberId: activeMember.memberId }
  });

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

  // Get all members for referral calculations
  const allMembers = await prisma.member.findMany();

  // Level 1: Direct referrals
  const level1 = allMembers.filter(m => m.referredBy === activeMember.memberId);
  
  let totalEarnedBonus = 0;
  let totalTeamVolume = 0;
  let totalTeamCount = 0;

  const buildTreeNodes = (memberList, levelNum) => {
    return memberList.map(m => {
      let bonusPercent = 0;
      if (levelNum === 1) bonusPercent = 5;
      else if (levelNum === 2) bonusPercent = 3;
      else if (levelNum === 3) bonusPercent = 1;

      const bonus = (m.capitalInvested * bonusPercent) / 100;
      totalEarnedBonus += bonus;
      totalTeamVolume += m.capitalInvested;
      totalTeamCount += 1;
      
      const children = buildTreeNodes(
        allMembers.filter(sub => sub.referredBy === m.memberId), 
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

  // Level 1: Direct buyer referrals
  const buyerLevel1 = allMembers.filter(m => m.buyerReferredBy === activeMember.memberId);
  
  let totalBuyerEarnedBonus = 0;
  let totalBuyerTeamCount = 0;

  const buildBuyerTreeNodes = (memberList, levelNum) => {
    return memberList.map(m => {
      const bonus = levelNum === 1 ? 500 : 0;
      totalBuyerEarnedBonus += bonus;
      totalBuyerTeamCount += 1;
      
      const children = buildBuyerTreeNodes(
        allMembers.filter(sub => sub.buyerReferredBy === m.memberId), 
        levelNum + 1
      );

      return {
        memberId: m.memberId,
        name: m.name,
        phone: m.phone,
        joinDate: m.joinDate,
        level: levelNum,
        bonusEarned: bonus,
        children
      };
    });
  };

  const buyerTree = buildBuyerTreeNodes(buyerLevel1, 1);

  const ordersList = await prisma.order.findMany({
    where: {
      OR: [
        { username: activeMember.phone },
        { username: activeMember.memberId }
      ]
    }
  });
  
  const hasInvested = activeMember && Number(activeMember.capitalInvested) > 0;
  const hasOrders = ordersList.length > 0;
  let roleProfile = 'INVESTOR';
  if (hasInvested && hasOrders) {
    roleProfile = 'DUAL';
  } else if (hasInvested) {
    roleProfile = 'INVESTOR';
  } else {
    roleProfile = 'BUYER';
  }

  const wallet = await getWallet(activeMember.memberId || activeMember.phone);
  const notifications = await getNotifications(activeMember.memberId || activeMember.phone);
  const withdrawals = await getWithdrawals(activeMember.memberId || activeMember.phone);

  const buyerBinaryTree = await buildBinaryTreeUI(activeMember.memberId, 'buyer');
  const investorBinaryTree = await buildBinaryTreeUI(activeMember.memberId, 'investor');

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
    },
    buyerReferrals: {
      referralCode: activeMember.memberId,
      totalDirect: buyerLevel1.length,
      totalTeam: totalBuyerTeamCount,
      totalEarnedBonus: totalBuyerEarnedBonus,
      tree: buyerTree
    },
    roleProfile,
    wallet,
    notifications,
    withdrawals,
    orders: ordersList,
    buyerBinaryTree,
    investorBinaryTree
  };
}

export async function isPhoneRegistered(phoneStr) {
  if (!phoneStr) return false;
  const inputClean = phoneStr.trim().toLowerCase();
  const inputDigits = phoneStr.replace(/\D/g, '');
  if (!inputDigits) return false;

  const matchCondition = (p) => {
    if (!p) return false;
    const pClean = p.trim().toLowerCase();
    if (pClean === inputClean) return true;
    const pDigits = p.replace(/\D/g, '');
    if (inputDigits.length >= 10 && pDigits.length >= 10) {
      return pDigits === inputDigits || pDigits.endsWith(inputDigits) || inputDigits.endsWith(pDigits);
    }
    return false;
  };

  const allApps = await prisma.application.findMany();
  if (allApps.some(a => matchCondition(a.phone))) return true;

  const allMembers = await prisma.member.findMany();
  if (allMembers.some(m => matchCondition(m.phone))) return true;

  const allUsers = await prisma.user.findMany();
  if (allUsers.some(u => matchCondition(u.phone))) return true;

  return false;
}

export async function addApplication(appData) {
  if (await isPhoneRegistered(appData.phone)) {
    throw new Error('This mobile number is already registered in our database. Please sign in or use a different mobile number.');
  }

  const allApps = await prisma.application.findMany();
  const maxNum = allApps.reduce((max, app) => {
    const match = app.id.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);

  const nextNum = maxNum + 1;
  const padding = nextNum < 10 ? '00' : (nextNum < 100 ? '0' : '');
  const id = `APP-2026-${padding}${nextNum}`;

  const newApp = await prisma.application.create({
    data: {
      id,
      applicantName: appData.applicantName,
      phone: appData.phone,
      nid: appData.nid,
      password: needsRehash(appData.password) ? hashPassword(appData.password) : appData.password,
      email: appData.email || null,
      capitalAmount: appData.capitalAmount ? Number(appData.capitalAmount) : null,
      durationMonths: appData.durationMonths ? Number(appData.durationMonths) : null,
      purpose: appData.purpose,
      nomineeName: appData.nomineeName || null,
      relation: appData.relation || null,
      fatherName: appData.fatherName || null,
      address: appData.address || null,
      referredBy: appData.referredBy || null,
      status: 'PENDING',
      submittedAt: new Date()
    }
  });

  if (appData.purpose === 'Buy Product' && appData.productId) {
    const product = await prisma.product.findUnique({ where: { id: Number(appData.productId) } });
    const productName = product ? product.name : 'PLAN-10 Product';
    const price = product ? product.price : 0;
    
    await addOrder({
      username: appData.phone,
      productId: appData.productId,
      productName: productName,
      price: price
    });
  }

  return newApp;
}

export async function updateApplicationStatus(id, status) {
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) return null;

  const updatedApp = await prisma.application.update({
    where: { id },
    data: { status }
  });

  if (status === 'APPROVED') {
    const memberId = await getNextMemberId();
    const monthlyProfit = app.capitalAmount ? (app.capitalAmount / 100000) * 3000 : 0;
    const monthlyCapitalRefund = app.durationMonths ? Math.round((app.capitalAmount || 0) / app.durationMonths) : 0;
    
    const newMember = await prisma.member.create({
      data: {
        memberId,
        name: app.applicantName,
        phone: app.phone,
        nid: app.nid,
        capitalInvested: app.capitalAmount || 0,
        termMonths: app.durationMonths || 0,
        monthlyProfit,
        monthlyCapitalRefund,
        monthlyTotalPayout: monthlyProfit + monthlyCapitalRefund,
        joinDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        nomineeName: app.nomineeName || 'Legal Heir',
        relation: app.relation || 'Family',
        referredBy: app.referredBy || null
      }
    });

    if (app.purpose === 'Buy Product') {
      await addToBinaryTree('buyer', memberId);
    } else if (app.purpose === 'Investment') {
      await addToBinaryTree('investor', memberId);
    }

    if (newMember.referredBy) {
      const cleanRefCode = newMember.referredBy.trim().toLowerCase();
      const refDigits = cleanRefCode.replace(/\D/g, '');
      
      const matchPhone = (phoneStr) => {
        if (!phoneStr) return false;
        const pClean = phoneStr.trim().toLowerCase();
        if (pClean === cleanRefCode) return true;
        const pDigits = phoneStr.replace(/\D/g, '');
        if (refDigits.length >= 10 && pDigits.length >= 10) {
          return pDigits === refDigits || pDigits.endsWith(refDigits) || refDigits.endsWith(pDigits);
        }
        return false;
      };

      const allMembers = await prisma.member.findMany();
      let sponsor = allMembers.find(m => 
        (m.memberId && m.memberId.toLowerCase() === cleanRefCode) || matchPhone(m.phone)
      );

      if (!sponsor) {
        const allUsers = await prisma.user.findMany();
        const sponsorUser = allUsers.find(u => 
          (u.username && u.username.toLowerCase() === cleanRefCode) || matchPhone(u.phone)
        );
        if (sponsorUser) {
          sponsor = { memberId: sponsorUser.username, name: sponsorUser.name };
        }
      }

      if (sponsor) {
        const sponsorId = sponsor.memberId;
        if (app.purpose === 'Buy Product') {
          await updateWalletBalance(sponsorId, 500, 'REFERRAL_BONUS', `Direct Referral Bonus for new Buyer (${newMember.name})`);
        } else if (app.purpose === 'Investment') {
          const bonusAmount = (app.capitalAmount || 0) * 0.06;
          if (bonusAmount > 0) {
            await updateWalletBalance(sponsorId, bonusAmount, 'REFERRAL_BONUS', `Direct Referral Commission (6%) for new Investor (${newMember.name})`);
          }
        }
      }
    }

    const inputDigits = app.phone ? app.phone.replace(/\D/g, '') : '';
    const allUsers = await prisma.user.findMany();
    const existingUser = allUsers.find(u => {
      if (u.username === memberId) return true;
      if (u.phone && inputDigits.length >= 10) {
        const uDigits = u.phone.replace(/\D/g, '');
        if (uDigits === inputDigits || uDigits.endsWith(inputDigits) || inputDigits.endsWith(uDigits)) return true;
      }
      return false;
    });

    if (existingUser) {
      const dataUpdate = { role: 'USER' };
      if (app.password) {
        dataUpdate.password = needsRehash(app.password) ? hashPassword(app.password) : app.password;
      }
      if (app.phone) dataUpdate.phone = app.phone;
      await prisma.user.update({
        where: { id: existingUser.id },
        data: dataUpdate
      });
    } else {
      const rawPassword = app.password || 'user123';
      await prisma.user.create({
        data: {
          id: `usr_${Date.now()}`,
          username: memberId,
          phone: app.phone,
          password: needsRehash(rawPassword) ? hashPassword(rawPassword) : rawPassword,
          name: app.applicantName,
          email: app.email || `${app.applicantName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
          role: 'USER',
          createdAt: new Date()
        }
      });
    }
  }

  return updatedApp;
}

export async function getPayouts() {
  const todayStr = new Date().toISOString().split('T')[0];
  const members = await prisma.member.findMany({ where: { status: 'ACTIVE' } });

  let modified = false;

  for (const member of members) {
    if (member.capitalInvested > 0 && member.termMonths > 0) {
      for (let m = 1; m <= member.termMonths; m++) {
        const exists = await prisma.payout.findFirst({
          where: { memberId: member.memberId, monthNumber: m }
        });
        if (!exists) {
          let dueDateStr = todayStr;
          try {
            const joinDate = member.joinDate || todayStr;
            const pDate = new Date(joinDate);
            if (!isNaN(pDate.getTime())) {
              pDate.setMonth(pDate.getMonth() + m);
              dueDateStr = pDate.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error('Invalid date parsing for member', member.memberId, e);
          }
          const status = dueDateStr < todayStr ? 'PAID' : 'PENDING';

          await prisma.payout.create({
            data: {
              id: `PAY-${member.memberId}-${m}`,
              memberId: member.memberId,
              memberName: member.name,
              monthNumber: m,
              dueDate: dueDateStr,
              profitAmount: member.monthlyProfit || 0,
              capitalRefund: member.monthlyCapitalRefund || 0,
              totalPayout: member.monthlyTotalPayout || 0,
              status: status,
              method: 'Bank Wire / bKash',
              createdAt: new Date()
            }
          });
          modified = true;
        }
      }
    }
  }

  const payouts = await prisma.payout.findMany();
  return payouts.sort((a, b) => {
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
}

export async function updatePayoutStatus(id, status) {
  const exists = await prisma.payout.findUnique({ where: { id } });
  if (!exists) return null;

  return prisma.payout.update({
    where: { id },
    data: { status }
  });
}

export async function addInquiry(inquiryData) {
  const total = await prisma.inquiry.count();
  const id = `INQ-${500 + total + 1}`;
  return prisma.inquiry.create({
    data: {
      id,
      name: inquiryData.name,
      phone: inquiryData.phone,
      message: inquiryData.message,
      status: 'UNREAD',
      date: new Date()
    }
  });
}

export async function deleteApplication(id) {
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) return null;
  await prisma.application.delete({ where: { id } });
  return app;
}

export async function deleteMember(memberId) {
  const m = await prisma.member.findUnique({ where: { memberId } });
  if (!m) return null;
  
  // Also delete corresponding user account to prevent orphaned records & ID collisions
  await prisma.user.deleteMany({ where: { username: memberId } });

  await prisma.member.delete({ where: { memberId } });
  return m;
}

export async function deleteInquiry(id) {
  const inq = await prisma.inquiry.findUnique({ where: { id } });
  if (!inq) return null;
  await prisma.inquiry.delete({ where: { id } });
  return inq;
}

export async function deletePayout(id) {
  const p = await prisma.payout.findUnique({ where: { id } });
  if (!p) return null;
  await prisma.payout.delete({ where: { id } });
  return p;
}

export async function getAllUsersWithRoles() {
  const users = await prisma.user.findMany();
  const members = await prisma.member.findMany();

  const userList = users.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email || '',
    phone: u.phone || '',
    role: u.role || 'USER'
  }));

  members.forEach(m => {
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

export async function updateUserAdminRole(username, newRole) {
  const userObj = await prisma.user.findFirst({
    where: {
      OR: [
        { username: username },
        { id: username }
      ]
    }
  });

  if (userObj) {
    await prisma.user.update({
      where: { id: userObj.id },
      data: { role: newRole }
    });
    await addSystemLog(`Admin Authority Delegation: ${username} set to ${newRole}`, 'Internal System Process', 'Success');
    return true;
  }

  const memberObj = await prisma.member.findUnique({ where: { memberId: username } });
  if (memberObj) {
    await prisma.user.create({
      data: {
        id: `usr_${memberObj.memberId}`,
        username: memberObj.memberId,
        phone: memberObj.phone,
        password: hashPassword('user123'),
        name: memberObj.name,
        email: `${memberObj.name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        role: newRole,
        createdAt: new Date()
      }
    });
    await addSystemLog(`Admin Authority Delegation: ${username} set to ${newRole}`, 'Internal System Process', 'Success');
    return true;
  }

  return false;
}

export async function updateMemberProfile(identifier, updateData) {
  if (!identifier) return false;
  const cleanId = identifier.trim().toLowerCase();

  const memberObj = await findMemberRecord(identifier);
  let updated = false;

  if (memberObj) {
    const mUpdate = {};
    if (updateData.name !== undefined) mUpdate.name = updateData.name;
    if (updateData.phone !== undefined) mUpdate.phone = updateData.phone;
    if (updateData.nid !== undefined) mUpdate.nid = updateData.nid;
    if (updateData.fatherName !== undefined) mUpdate.fatherName = updateData.fatherName;
    if (updateData.address !== undefined) mUpdate.address = updateData.address;
    if (updateData.nomineeName !== undefined) mUpdate.nomineeName = updateData.nomineeName;
    if (updateData.relation !== undefined) mUpdate.relation = updateData.relation;

    await prisma.member.update({
      where: { memberId: memberObj.memberId },
      data: mUpdate
    });
    updated = true;
  }

  const userObj = await findUserRecord(identifier);
  if (userObj) {
    const uUpdate = {};
    if (updateData.name !== undefined) uUpdate.name = updateData.name;
    if (updateData.phone !== undefined) uUpdate.phone = updateData.phone;

    await prisma.user.update({
      where: { id: userObj.id },
      data: uUpdate
    });
    updated = true;
  }

  // Update matching application
  let appObj = await prisma.application.findFirst({ where: { phone: identifier.trim() } });
  if (!appObj && memberObj) {
    appObj = await prisma.application.findFirst({ where: { phone: memberObj.phone } });
  }
  if (appObj) {
    const aUpdate = {};
    if (updateData.name !== undefined) aUpdate.applicantName = updateData.name;
    if (updateData.phone !== undefined) aUpdate.phone = updateData.phone;
    if (updateData.nid !== undefined) aUpdate.nid = updateData.nid;
    if (updateData.fatherName !== undefined) aUpdate.fatherName = updateData.fatherName;
    if (updateData.address !== undefined) aUpdate.address = updateData.address;
    if (updateData.nomineeName !== undefined) aUpdate.nomineeName = updateData.nomineeName;
    if (updateData.relation !== undefined) aUpdate.relation = updateData.relation;

    await prisma.application.update({
      where: { id: appObj.id },
      data: aUpdate
    });
    updated = true;
  }

  return updated;
}

export async function bindReferralCode(memberIdentifier, referrerCode, type = 'investor') {
  if (!memberIdentifier || !referrerCode) {
    return { success: false, message: 'Both member identifier and referral code are required.' };
  }

  const targetMember = await findMemberRecord(memberIdentifier);
  if (!targetMember) {
    return { success: false, message: 'Member account not found.' };
  }

  const refKey = type === 'buyer' ? 'buyerReferredBy' : 'referredBy';

  if (targetMember[refKey]) {
    return { success: false, message: `Account is already linked to a ${type === 'buyer' ? 'buyer' : 'investor'} sponsor (${targetMember[refKey]}). This code can only be submitted once.` };
  }

  let referrerMember = await findMemberRecord(referrerCode);
  if (!referrerMember) {
    const referrerUser = await findUserRecord(referrerCode);
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

  await prisma.member.update({
    where: { memberId: targetMember.memberId },
    data: { [refKey]: referrerMember.memberId }
  });

  let hasAwarded = false;
  if (type === 'buyer') {
    await updateWalletBalance(referrerMember.memberId, 500, 'REFERRAL_BONUS', `Direct Referral Bonus for linking Buyer (${targetMember.name})`);
    hasAwarded = true;
  } else {
    if (targetMember.capitalInvested > 0) {
      const bonus = targetMember.capitalInvested * 0.06;
      if (bonus > 0) {
        await updateWalletBalance(referrerMember.memberId, bonus, 'REFERRAL_BONUS', `Direct Referral Commission (6%) for linking Investor (${targetMember.name})`);
        hasAwarded = true;
      }
    }
  }

  return { 
    success: true, 
    message: `Successfully linked to ${type === 'buyer' ? 'buyer' : 'investor'} sponsor ${referrerMember.name} (${referrerMember.memberId})!${hasAwarded ? ' Referral commission credited.' : ''}`,
    [refKey]: referrerMember.memberId
  };
}

export function parseProductJSON(p) {
  if (!p) return p;
  let parsedUrls = [];
  try {
    if (p.imageUrls) {
      parsedUrls = JSON.parse(p.imageUrls);
      if (typeof parsedUrls === 'string') {
        parsedUrls = JSON.parse(parsedUrls);
      }
    }
  } catch {
    parsedUrls = [];
  }
  if (!Array.isArray(parsedUrls)) {
    parsedUrls = [];
  }
  
  let cleanImageUrl = p.imageUrl;
  if (!cleanImageUrl || cleanImageUrl === '[' || cleanImageUrl === '""') {
    cleanImageUrl = parsedUrls[0] || '';
  }
  
  return {
    ...p,
    imageUrl: cleanImageUrl,
    imageUrls: parsedUrls
  };
}

export async function getProducts() {
  const list = await prisma.product.findMany();
  return list.map(parseProductJSON);
}

export async function addProduct(productData) {
  const urls = productData.imageUrls || (productData.imageUrl ? [productData.imageUrl] : []);
  const newProduct = await prisma.product.create({
    data: {
      name: productData.name,
      brand: productData.brand || 'PLAN-10 Branded',
      category: productData.category || 'Consumer Goods',
      price: Number(productData.price) || 0,
      description: productData.description || '',
      imageUrl: urls[0] || '',
      imageUrls: JSON.stringify(urls),
      stockStatus: productData.stockStatus || 'IN_STOCK'
    }
  });

  return {
    ...newProduct,
    imageUrls: urls
  };
}

export async function updateProduct(id, productData) {
  const numericId = Number(id);
  const exists = await prisma.product.findUnique({ where: { id: numericId } });
  if (!exists) return null;

  const dataUpdate = {};
  if (productData.name !== undefined) dataUpdate.name = productData.name;
  if (productData.brand !== undefined) dataUpdate.brand = productData.brand;
  if (productData.category !== undefined) dataUpdate.category = productData.category;
  if (productData.price !== undefined) dataUpdate.price = Number(productData.price);
  if (productData.description !== undefined) dataUpdate.description = productData.description;
  if (productData.imageUrl !== undefined) dataUpdate.imageUrl = productData.imageUrl;
  if (productData.imageUrls !== undefined) {
    dataUpdate.imageUrls = JSON.stringify(productData.imageUrls);
    dataUpdate.imageUrl = productData.imageUrls[0] || '';
  }
  if (productData.stockStatus !== undefined) dataUpdate.stockStatus = productData.stockStatus;

  const updated = await prisma.product.update({
    where: { id: numericId },
    data: dataUpdate
  });

  return parseProductJSON(updated);
}

async function deleteProductPhotos(product) {
  if (!product) return;
  const urls = [];
  if (product.imageUrl) urls.push(product.imageUrl);
  const parsedUrls = JSON.parse(product.imageUrls || '[]');
  parsedUrls.forEach(url => {
    if (!urls.includes(url)) urls.push(url);
  });

  urls.forEach(url => {
    if (typeof url === 'string' && url.startsWith('/uploads/')) {
      try {
        const filePath = path.join(process.cwd(), 'public', url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error(`Failed to delete file: ${url}`, err);
      }
    }
  });
}

export async function deleteProduct(id) {
  const numericId = Number(id);
  const p = await prisma.product.findUnique({ where: { id: numericId } });
  if (!p) return null;

  await deleteProductPhotos(p);
  await prisma.product.delete({ where: { id: numericId } });
  return parseProductJSON(p);
}

export async function getCategories() {
  const list = await prisma.category.findMany();
  return list.map(c => c.name);
}

export async function addCategory(name) {
  const cleanName = name.trim();
  const exists = await prisma.category.findUnique({ where: { name: cleanName } });
  if (exists) {
    return { success: false, message: 'Category already exists.' };
  }

  await prisma.category.create({ data: { name: cleanName } });
  const list = await getCategories();
  return { success: true, categories: list };
}

export async function resetDataStore() {
  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.payout.deleteMany(),
    prisma.member.deleteMany(),
    prisma.application.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.order.deleteMany(),
    prisma.inquiry.deleteMany(),
    prisma.category.deleteMany(),
    prisma.systemLog.deleteMany(),
    prisma.user.deleteMany(),
    prisma.product.deleteMany()
  ]);

  await prisma.user.create({
    data: {
      id: 'usr_admin',
      username: 'admin',
      password: hashPassword('admin'),
      name: 'Corporate Executive Admin',
      email: 'admin@plan10bd.com',
      role: 'ADMIN',
      createdAt: new Date()
    }
  });

  await addSystemLog('Factory Reset Executed', 'Internal System Process', 'Success');
}

export async function importDataStore(newData) {
  await resetDataStore();

  // Re-seed all tables using newData properties
  if (newData.users) {
    for (const u of newData.users) {
      if (u.username === 'admin') continue;
      await prisma.user.create({
        data: {
          id: u.id || `usr_${Date.now()}`,
          username: u.username,
          password: needsRehash(u.password) ? hashPassword(u.password) : u.password,
          name: u.name,
          email: u.email || '',
          role: u.role || 'USER',
          phone: u.phone || null,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date()
        }
      });
    }
  }

  if (newData.applications) {
    for (const a of newData.applications) {
      await prisma.application.create({
        data: {
          id: a.id,
          applicantName: a.applicantName,
          phone: a.phone,
          nid: a.nid,
          password: needsRehash(a.password) ? hashPassword(a.password) : a.password,
          email: a.email || null,
          capitalAmount: a.capitalAmount ? Number(a.capitalAmount) : null,
          durationMonths: a.durationMonths ? Number(a.durationMonths) : null,
          purpose: a.purpose,
          nomineeName: a.nomineeName || null,
          relation: a.relation || null,
          fatherName: a.fatherName || null,
          address: a.address || null,
          status: a.status || 'PENDING',
          submittedAt: a.submittedAt ? new Date(a.submittedAt) : new Date(),
          referredBy: a.referredBy || null
        }
      });
    }
  }

  if (newData.members) {
    for (const m of newData.members) {
      await prisma.member.create({
        data: {
          memberId: m.memberId,
          name: m.name,
          phone: m.phone,
          nid: m.nid,
          capitalInvested: Number(m.capitalInvested) || 0,
          termMonths: Number(m.termMonths) || 0,
          monthlyProfit: Number(m.monthlyProfit) || 0,
          monthlyCapitalRefund: Number(m.monthlyCapitalRefund) || 0,
          monthlyTotalPayout: Number(m.monthlyTotalPayout) || 0,
          joinDate: m.joinDate,
          status: m.status || 'ACTIVE',
          nomineeName: m.nomineeName || null,
          relation: m.relation || null,
          fatherName: m.fatherName || null,
          address: m.address || null,
          referredBy: m.referredBy || null,
          buyerReferredBy: m.buyerReferredBy || null,
          buyerParent: m.buyerParent || null,
          buyerLeft: m.buyerLeft || null,
          buyerRight: m.buyerRight || null,
          investorParent: m.investorParent || null,
          investorLeft: m.investorLeft || null,
          investorRight: m.investorRight || null
        }
      });
    }
  }

  if (newData.payouts) {
    for (const p of newData.payouts) {
      await prisma.payout.create({
        data: {
          id: p.id,
          memberId: p.memberId,
          memberName: p.memberName,
          monthNumber: Number(p.monthNumber),
          dueDate: p.dueDate,
          profitAmount: Number(p.profitAmount) || 0,
          capitalRefund: Number(p.capitalRefund) || 0,
          totalPayout: Number(p.totalPayout) || 0,
          status: p.status || 'PENDING',
          method: p.method || 'Bank Wire / bKash',
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date()
        }
      });
    }
  }

  if (newData.products) {
    for (const p of newData.products) {
      const urls = p.imageUrls || (p.imageUrl ? [p.imageUrl] : []);
      await prisma.product.create({
        data: {
          id: p.id,
          name: p.name,
          brand: p.brand || 'PLAN-10',
          category: p.category || 'Consumer Goods',
          price: Number(p.price) || 0,
          description: p.description || '',
          imageUrl: urls[0] || '',
          imageUrls: JSON.stringify(urls),
          stockStatus: p.stockStatus || 'IN_STOCK'
        }
      });
    }
  }

  if (newData.inquiries) {
    for (const inq of newData.inquiries) {
      await prisma.inquiry.create({
        data: {
          id: inq.id,
          name: inq.name,
          phone: inq.phone,
          message: inq.message,
          date: inq.date ? new Date(inq.date) : new Date(),
          status: inq.status || 'UNREAD'
        }
      });
    }
  }

  if (newData.categories) {
    for (const cat of newData.categories) {
      await prisma.category.create({ data: { name: cat } });
    }
  }

  if (newData.orders) {
    for (const o of newData.orders) {
      await prisma.order.create({
        data: {
          id: o.id,
          username: o.username,
          productId: Number(o.productId),
          productName: o.productName,
          price: Number(o.price) || 0,
          status: o.status || 'PENDING',
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date()
        }
      });
    }
  }

  if (newData.wallets) {
    for (const w of newData.wallets) {
      await prisma.wallet.create({
        data: {
          username: w.username,
          balance: Number(w.balance) || 0
        }
      });
      if (w.transactions) {
        for (const txn of w.transactions) {
          await prisma.transaction.create({
            data: {
              id: txn.id,
              username: w.username,
              amount: Number(txn.amount) || 0,
              type: txn.type,
              description: txn.description,
              date: txn.date ? new Date(txn.date) : new Date()
            }
          });
        }
      }
    }
  }

  if (newData.notifications) {
    for (const n of newData.notifications) {
      await prisma.notification.create({
        data: {
          id: n.id,
          username: n.username,
          message: n.message,
          type: n.type || 'SYSTEM',
          timestamp: n.timestamp ? new Date(n.timestamp) : new Date(),
          isRead: Boolean(n.isRead)
        }
      });
    }
  }
}

export async function addSystemLog(action, ipAddress = 'Internal System Process', status = 'Success') {
  return prisma.systemLog.create({
    data: {
      action,
      operator: ipAddress || 'Internal System Process',
      status,
      timestamp: new Date()
    }
  });
}

export async function getSystemLogs() {
  return prisma.systemLog.findMany({ orderBy: { timestamp: 'desc' } });
}

export async function getOrders() {
  return prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function addOrder(orderData) {
  const nextNum = (await prisma.order.count()) + 1;
  const padding = nextNum < 10 ? '00' : (nextNum < 100 ? '0' : '');
  const id = `ORD-2026-${padding}${nextNum}`;

  return prisma.order.create({
    data: {
      id,
      username: orderData.username,
      productId: Number(orderData.productId),
      productName: orderData.productName,
      price: Number(orderData.price) || 0,
      status: 'PENDING',
      createdAt: new Date()
    }
  });
}

export async function updateOrderStatus(orderId, status) {
  const exists = await prisma.order.findUnique({ where: { id: orderId } });
  if (!exists) return null;

  return prisma.order.update({
    where: { id: orderId },
    data: { status }
  });
}

export async function getWallet(username) {
  const cleanId = username ? username.trim().toLowerCase() : '';
  const member = await findMemberRecord(cleanId);
  const primaryId = member ? member.memberId : username;

  let wallet = await prisma.wallet.findUnique({
    where: { username: primaryId },
    include: { transactions: true }
  });
  
  if (!wallet) {
    if (member && member.phone) {
      wallet = await prisma.wallet.findUnique({
        where: { username: member.phone },
        include: { transactions: true }
      });
      if (wallet) {
        const updated = await prisma.wallet.update({
          where: { username: member.phone },
          data: { username: primaryId }
        });
        return {
          ...updated,
          transactions: wallet.transactions
        };
      }
    }

    wallet = await prisma.wallet.create({
      data: {
        username: primaryId,
        balance: 0
      },
      include: { transactions: true }
    });
  }

  // Sort transactions in descending order of date/id
  if (wallet.transactions) {
    wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  return wallet;
}

export async function updateWalletBalance(username, amount, type, description) {
  const wallet = await getWallet(username);
  const newBalance = wallet.balance + Number(amount);

  const updatedWallet = await prisma.wallet.update({
    where: { username: wallet.username },
    data: {
      balance: newBalance
    }
  });

  const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  await prisma.transaction.create({
    data: {
      id: txnId,
      username: wallet.username,
      amount: Number(amount),
      type,
      description,
      date: new Date()
    }
  });
  
  await addNotification(username, `Wallet updated: ${amount > 0 ? '+' : ''}৳${amount} - ${description}`, 'WALLET');
  return {
    ...updatedWallet,
    transactions: [
      { id: txnId, amount: Number(amount), type, description, date: new Date() },
      ...(wallet.transactions || [])
    ]
  };
}

export async function addNotification(username, message, type = 'SYSTEM') {
  const id = `NTF_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  return prisma.notification.create({
    data: {
      id,
      username,
      message,
      type,
      timestamp: new Date(),
      isRead: false
    }
  });
}

export async function getNotifications(username) {
  const cleanId = username ? username.trim().toLowerCase() : '';
  const member = await findMemberRecord(cleanId);

  const ids = [username.trim().toLowerCase()];
  if (member) {
    if (member.memberId) ids.push(member.memberId.toLowerCase());
    if (member.phone) ids.push(member.phone.toLowerCase());
  }

  const digits = username.replace(/\D/g, '');

  const notifs = await prisma.notification.findMany({
    orderBy: { timestamp: 'desc' }
  });

  return notifs.filter(n => {
    if (!n.username) return false;
    const nClean = n.username.trim().toLowerCase();
    if (ids.includes(nClean)) return true;
    
    const nDigits = n.username.replace(/\D/g, '');
    if (digits.length >= 10 && nDigits.length >= 10) {
      return digits === nDigits || digits.endsWith(nDigits) || nDigits.endsWith(digits);
    }
    return false;
  });
}

export async function addWithdrawalRequest(username, amount, method, paymentNumber) {
  const wallet = await getWallet(username);
  if (wallet.balance < amount) {
    return { success: false, message: 'Insufficient wallet balance.' };
  }

  await prisma.wallet.update({
    where: { username: wallet.username },
    data: { balance: wallet.balance - Number(amount) }
  });

  const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  await prisma.transaction.create({
    data: {
      id: txnId,
      username: wallet.username,
      amount: -Number(amount),
      type: 'WITHDRAW',
      description: `Withdrawal request submitted (${method} - ${paymentNumber || ''})`,
      date: new Date()
    }
  });

  const wthId = `WTH_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const newRequest = await prisma.withdrawal.create({
    data: {
      id: wthId,
      username,
      amount: Number(amount),
      method,
      paymentNumber: paymentNumber || '',
      status: 'PENDING',
      requestedAt: new Date(),
      processedAt: null
    }
  });

  await addNotification(username, `Withdrawal request of ৳${amount} BDT (${method} to ${paymentNumber || ''}) submitted.`, 'WALLET');
  return { success: true, request: newRequest };
}

export async function getWithdrawals(username = null) {
  if (username) {
    const cleanId = username.trim().toLowerCase();
    const member = await findMemberRecord(cleanId);

    const ids = [cleanId];
    if (member) {
      if (member.memberId) ids.push(member.memberId.toLowerCase());
      if (member.phone) ids.push(member.phone.toLowerCase());
    }

    const digits = username.replace(/\D/g, '');

    const list = await prisma.withdrawal.findMany({ orderBy: { requestedAt: 'desc' } });
    return list.filter(w => {
      if (!w.username) return false;
      const wClean = w.username.trim().toLowerCase();
      if (ids.includes(wClean)) return true;

      const wDigits = w.username.replace(/\D/g, '');
      if (digits.length >= 10 && wDigits.length >= 10) {
        return digits === wDigits || digits.endsWith(wDigits) || wDigits.endsWith(digits);
      }
      return false;
    });
  }

  return prisma.withdrawal.findMany({ orderBy: { requestedAt: 'desc' } });
}

export async function updateWithdrawalStatus(requestId, status) {
  const req = await prisma.withdrawal.findUnique({ where: { id: requestId } });
  if (!req) return { success: false, message: 'Withdrawal request not found.' };
  if (req.status !== 'PENDING') {
    return { success: false, message: 'Withdrawal request already processed.' };
  }

  const updatedReq = await prisma.withdrawal.update({
    where: { id: requestId },
    data: {
      status,
      processedAt: new Date()
    }
  });

  if (status === 'REJECTED') {
    const wallet = await getWallet(req.username);
    await prisma.wallet.update({
      where: { username: wallet.username },
      data: { balance: wallet.balance + req.amount }
    });

    const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await prisma.transaction.create({
      data: {
        id: txnId,
        username: wallet.username,
        amount: req.amount,
        type: 'DEPOSIT',
        description: `Refund for rejected withdrawal request #${req.id}`,
        date: new Date()
      }
    });
    await addNotification(req.username, `Withdrawal request of ৳${req.amount} BDT was rejected. Wallet refunded.`, 'WALLET');
  } else if (status === 'APPROVED') {
    await addNotification(req.username, `Withdrawal request of ৳${req.amount} BDT was approved.`, 'WALLET');
  }

  return { success: true, request: updatedReq };
}

export async function addToBinaryTree(treeType, memberId) {
  const parentKey = treeType === 'buyer' ? 'buyerParent' : 'investorParent';
  const leftKey = treeType === 'buyer' ? 'buyerLeft' : 'investorLeft';
  const rightKey = treeType === 'buyer' ? 'buyerRight' : 'investorRight';

  const member = await prisma.member.findUnique({ where: { memberId } });
  if (!member) return;

  if (member[parentKey] !== null && member[parentKey] !== undefined) {
    return;
  }

  const allMembers = await prisma.member.findMany();
  const treeMembers = allMembers.filter(m => m.memberId === 'Plan10-101' || (m[parentKey] !== null && m[parentKey] !== undefined));

  if (treeMembers.length === 0) {
    const plan101 = allMembers.find(m => m.memberId === 'Plan10-101');
    if (plan101 && plan101.memberId !== memberId) {
      await prisma.member.update({
        where: { memberId: plan101.memberId },
        data: {
          [parentKey]: null,
          [leftKey]: null,
          [rightKey]: null
        }
      });
      await addToBinaryTree(treeType, memberId);
      return;
    } else {
      await prisma.member.update({
        where: { memberId },
        data: {
          [parentKey]: null,
          [leftKey]: null,
          [rightKey]: null
        }
      });
      await addNotification(member.phone || member.memberId, `Placed at root of ${treeType === 'buyer' ? 'Buyer' : 'Investor'} Tree.`, treeType === 'buyer' ? 'ORDER' : 'INVESTMENT');
      return;
    }
  }

  const root = treeMembers.find(m => m[parentKey] === null);
  if (!root) {
    await prisma.member.update({
      where: { memberId: treeMembers[0].memberId },
      data: { [parentKey]: null }
    });
    await addToBinaryTree(treeType, memberId);
    return;
  }

  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift();

    if (!current[leftKey]) {
      await prisma.member.update({
        where: { memberId: current.memberId },
        data: { [leftKey]: memberId }
      });
      await prisma.member.update({
        where: { memberId },
        data: {
          [parentKey]: current.memberId,
          [leftKey]: null,
          [rightKey]: null
        }
      });
      await addNotification(member.phone || member.memberId, `Placed under ${current.name} (Left) in ${treeType === 'buyer' ? 'Buyer' : 'Investor'} Tree.`, treeType === 'buyer' ? 'ORDER' : 'INVESTMENT');
      await addNotification(current.phone || current.memberId, `${member.name} joined Left under you in ${treeType === 'buyer' ? 'Buyer' : 'Investor'} Tree.`, treeType === 'buyer' ? 'ORDER' : 'INVESTMENT');
      return;
    } else {
      const leftChild = allMembers.find(m => m.memberId === current[leftKey]);
      if (leftChild) queue.push(leftChild);
    }

    if (!current[rightKey]) {
      await prisma.member.update({
        where: { memberId: current.memberId },
        data: { [rightKey]: memberId }
      });
      await prisma.member.update({
        where: { memberId },
        data: {
          [parentKey]: current.memberId,
          [leftKey]: null,
          [rightKey]: null
        }
      });
      await addNotification(member.phone || member.memberId, `Placed under ${current.name} (Right) in ${treeType === 'buyer' ? 'Buyer' : 'Investor'} Tree.`, treeType === 'buyer' ? 'ORDER' : 'INVESTMENT');
      await addNotification(current.phone || current.memberId, `${member.name} joined Right under you in ${treeType === 'buyer' ? 'Buyer' : 'Investor'} Tree.`, treeType === 'buyer' ? 'ORDER' : 'INVESTMENT');
      return;
    } else {
      const rightChild = allMembers.find(m => m.memberId === current[rightKey]);
      if (rightChild) queue.push(rightChild);
    }
  }
}

export async function buildBinaryTreeUI(memberId, treeType, depth = 1) {
  if (!memberId || depth > 4) return null;
  const m = await prisma.member.findUnique({ where: { memberId } });
  if (!m) return null;

  const leftKey = treeType === 'buyer' ? 'buyerLeft' : 'investorLeft';
  const rightKey = treeType === 'buyer' ? 'buyerRight' : 'investorRight';

  const leftNode = m[leftKey] ? await buildBinaryTreeUI(m[leftKey], treeType, depth + 1) : null;
  const rightNode = m[rightKey] ? await buildBinaryTreeUI(m[rightKey], treeType, depth + 1) : null;

  return {
    memberId: m.memberId,
    name: m.name,
    phone: m.phone,
    left: leftNode,
    right: rightNode
  };
}

export async function getNextMemberId() {
  const allMembers = await prisma.member.findMany({ select: { memberId: true } });
  let nextNum = 101;
  if (allMembers.length > 0) {
    const numbers = allMembers
      .map(m => {
        const parts = m.memberId.split('-');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
      })
      .filter(num => !isNaN(num));
    if (numbers.length > 0) {
      nextNum = Math.max(...numbers) + 1;
    }
  }
  return `Plan10-${nextNum}`;
}

export async function createMemberAccount(memberData) {
  if (await isPhoneRegistered(memberData.phone)) {
    throw new Error('This mobile number is already registered in our database. Please use a different mobile number.');
  }

  const memberId = await getNextMemberId();
  const capitalAmount = Number(memberData.capitalInvested) || 0;
  const termMonths = Number(memberData.termMonths) || 0;
  
  const monthlyProfit = capitalAmount ? (capitalAmount / 100000) * 3000 : 0;
  const monthlyCapitalRefund = termMonths ? Math.round(capitalAmount / termMonths) : 0;

  const newMember = await prisma.member.create({
    data: {
      memberId,
      name: memberData.name,
      phone: memberData.phone,
      nid: memberData.nid || '',
      capitalInvested: capitalAmount,
      termMonths,
      monthlyProfit,
      monthlyCapitalRefund,
      monthlyTotalPayout: monthlyProfit + monthlyCapitalRefund,
      joinDate: memberData.joinDate || new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      nomineeName: memberData.nomineeName || 'Legal Heir',
      relation: memberData.relation || 'Family',
      fatherName: memberData.fatherName || '',
      address: memberData.address || '',
      referredBy: memberData.referredBy || null
    }
  });

  if (memberData.category === 'BOTH') {
    await addToBinaryTree('buyer', memberId);
    await addToBinaryTree('investor', memberId);
  } else {
    const treeType = memberData.category === 'BUYER' ? 'buyer' : 'investor';
    await addToBinaryTree(treeType, memberId);
  }

  // Awards sponsor direct commission or referral bonus if referredBy is set
  if (newMember.referredBy) {
    const cleanRefCode = newMember.referredBy.trim().toLowerCase();
    const refDigits = cleanRefCode.replace(/\D/g, '');
    
    const matchPhone = (phoneStr) => {
      if (!phoneStr) return false;
      const pClean = phoneStr.trim().toLowerCase();
      if (pClean === cleanRefCode) return true;
      const pDigits = phoneStr.replace(/\D/g, '');
      if (refDigits.length >= 10 && pDigits.length >= 10) {
        return pDigits === refDigits || pDigits.endsWith(refDigits) || refDigits.endsWith(pDigits);
      }
      return false;
    };

    const allMembers = await prisma.member.findMany();
    let sponsor = allMembers.find(m => 
      (m.memberId && m.memberId.toLowerCase() === cleanRefCode) || matchPhone(m.phone)
    );

    if (!sponsor) {
      const allUsers = await prisma.user.findMany();
      const sponsorUser = allUsers.find(u => 
        (u.username && u.username.toLowerCase() === cleanRefCode) || matchPhone(u.phone)
      );
      if (sponsorUser) {
        sponsor = { memberId: sponsorUser.username, name: sponsorUser.name };
      }
    }

    if (sponsor) {
      const sponsorId = sponsor.memberId;
      if (memberData.category === 'BUYER') {
        await updateWalletBalance(sponsorId, 500, 'REFERRAL_BONUS', `Direct Referral Bonus for new Buyer (${newMember.name})`);
      } else if (memberData.category === 'INVESTOR') {
        const bonusAmount = (newMember.capitalInvested || 0) * 0.06;
        if (bonusAmount > 0) {
          await updateWalletBalance(sponsorId, bonusAmount, 'REFERRAL_BONUS', `Direct Referral Commission (6%) for new Investor (${newMember.name})`);
        }
      } else if (memberData.category === 'BOTH') {
        await updateWalletBalance(sponsorId, 500, 'REFERRAL_BONUS', `Direct Referral Bonus for new Buyer (${newMember.name})`);
        const bonusAmount = (newMember.capitalInvested || 0) * 0.06;
        if (bonusAmount > 0) {
          await updateWalletBalance(sponsorId, bonusAmount, 'REFERRAL_BONUS', `Direct Referral Commission (6%) for new Investor (${newMember.name})`);
        }
      }
    }
  }

  const rawPassword = memberData.password || 'user123';
  const hashedPassword = needsRehash(rawPassword) ? hashPassword(rawPassword) : rawPassword;
  
  // Clean up any orphaned user record with the same username to avoid duplicate key errors
  await prisma.user.deleteMany({ where: { username: memberId } });

  await prisma.user.create({
    data: {
      id: `usr_${Date.now()}`,
      username: memberId,
      phone: memberData.phone,
      password: hashedPassword,
      name: memberData.name,
      email: memberData.email || `${memberData.name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      role: 'USER',
      createdAt: new Date()
    }
  });

  await addSystemLog(`Created new member account ${memberId} (${memberData.category})`, 'Admin Panel', 'Success');
  return newMember;
}

export async function updateUserPassword(username, newPassword) {
  const user = await findUserRecord(username);
  if (!user) return false;

  const hashed = hashPassword(newPassword.trim());
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed }
  });

  // Keep any matching application passwords synchronized
  const appObj = await prisma.application.findFirst({
    where: {
      OR: [
        { phone: user.phone || '' },
        { phone: user.username }
      ]
    }
  });
  if (appObj) {
    await prisma.application.update({
      where: { id: appObj.id },
      data: { password: hashed }
    });
  }

  await addSystemLog(`Updated password for user ${username}`, 'Admin Panel', 'Success');
  return true;
}

