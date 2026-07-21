// PLAN-10 BD Centralized Data Store & Prisma SQL Database Interface
// Refactored to use SQL database instead of flat-file JSON datastore.
import { PrismaClient } from './prisma-client/index.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
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

// Phone and Identifier Helper Matches

async function findUserRecord(username) {
  if (!username) return null;
  const trimmed = username.trim();

  // Exact indexed lookups first (username, phone)
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: trimmed },
        { username: trimmed.toLowerCase() },
        { username: trimmed.toUpperCase() },
        { publicId: trimmed }
      ]
    }
  });
  if (user) return user;

  // Normalized phone lookup (strip all non-digits)
  const inputDigits = trimmed.replace(/\D/g, '');
  if (inputDigits.length >= 10) {
    user = await prisma.user.findFirst({
      where: { phone: { contains: inputDigits } }
    });
    if (user) return user;
  }

  return null;
}

export async function getNextNameWithSuffix(phoneStr, fallbackName) {
  if (!phoneStr) return fallbackName;
  const inputClean = phoneStr.trim();

  // Find all member names matching this exact phone
  const existingMembers = await prisma.member.findMany({
    where: { phone: inputClean }
  });

  // Find all user names matching this exact phone
  const existingUsers = await prisma.user.findMany({
    where: { phone: inputClean }
  });

  const allNames = [
    ...existingMembers.map(m => m.name),
    ...existingUsers.map(u => u.name)
  ].filter(Boolean);

  if (allNames.length === 0) {
    return fallbackName;
  }

  // Find the base name from the first name we find
  const firstName = allNames[0];
  const match = firstName.match(/^(.*?)\s+(\d+)$/);
  const baseName = match ? match[1] : firstName;

  let maxSuffix = 1;
  for (const name of allNames) {
    if (name === baseName) {
      // original name is counted as suffix 1 implicitly
    } else {
      const prefix = baseName + ' ';
      if (name.startsWith(prefix)) {
        const suffixStr = name.slice(prefix.length);
        const num = parseInt(suffixStr, 10);
        if (!isNaN(num) && num > maxSuffix) {
          maxSuffix = num;
        }
      }
    }
  }

  return `${baseName} ${maxSuffix + 1}`;
}

async function findUserRecordsByPhone(usernameOrPhone) {
  if (!usernameOrPhone) return [];
  const trimmed = usernameOrPhone.trim();

  // Search exact username or public ID
  let exactUsers = await prisma.user.findMany({
    where: {
      OR: [
        { username: trimmed },
        { username: trimmed.toLowerCase() },
        { username: trimmed.toUpperCase() },
        { publicId: trimmed }
      ]
    }
  });
  if (exactUsers.length > 0) return exactUsers;

  // Search exact phone
  let phoneUsers = await prisma.user.findMany({
    where: { phone: trimmed }
  });
  if (phoneUsers.length > 0) return phoneUsers;

  // Normalized phone lookup (strip all non-digits)
  const inputDigits = trimmed.replace(/\D/g, '');
  if (inputDigits.length >= 10) {
    let digitsUsers = await prisma.user.findMany({
      where: { phone: { contains: inputDigits } }
    });
    if (digitsUsers.length > 0) return digitsUsers;
  }

  return [];
}

async function findMemberRecord(memberIdOrPhone) {
  if (!memberIdOrPhone) return null;
  const trimmed = memberIdOrPhone.trim();

  // Exact indexed lookups first (memberId, phone, publicId)
  let member = await prisma.member.findFirst({
    where: {
      OR: [
        { memberId: trimmed },
        { memberId: trimmed.toLowerCase() },
        { memberId: trimmed.toUpperCase() },
        { publicId: trimmed }
      ]
    }
  });
  if (member) return member;

  member = await prisma.member.findFirst({
    where: { phone: trimmed }
  });
  if (member) return member;

  // Normalized phone lookup (strip all non-digits)
  const inputDigits = trimmed.replace(/\D/g, '');
  if (inputDigits.length >= 10) {
    member = await prisma.member.findFirst({
      where: { phone: { contains: inputDigits } }
    });
    if (member) return member;
  }

  return null;
}

// ─── Exported Database Operations ───

export async function findUserByCredentials(username, password) {
  if (!username || !password) return null;
  const passClean = password.trim();
  const inputDigits = username.replace(/\D/g, '');
  const isPhoneInput = inputDigits.length >= 10;

  // ──────────────────────────────────────────────
  // NON-ADMIN USERS: Phone-only login enforced
  // Members/investors/buyers CANNOT login with
  // their memberId (Plan10-10X) — only phone number.
  // ──────────────────────────────────────────────

  // First check if it's an ADMIN login attempt (username lookup)
  let adminUser = null;
  if (!isPhoneInput) {
    adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.trim() },
          { username: username.trim().toLowerCase() },
          { username: username.trim().toUpperCase() },
        ],
        role: 'ADMIN'
      }
    });
    if (adminUser && verifyPassword(passClean, adminUser.password)) {
      if (needsRehash(adminUser.password)) {
        const hashed = hashPassword(passClean);
        await prisma.user.update({ where: { id: adminUser.id }, data: { password: hashed } });
        adminUser.password = hashed;
      }
      return { ...adminUser, siblingAccounts: [] };
    }
    // Not an admin and not a phone number → reject. Users must login with phone.
    return null;
  }

  // Phone-based login for all non-admin users
  // Find all user accounts with this phone number
  const phoneUsers = await prisma.user.findMany({
    where: { phone: { contains: inputDigits } }
  });

  for (const user of phoneUsers) {
    if (verifyPassword(passClean, user.password)) {
      if (needsRehash(user.password)) {
        const hashed = hashPassword(passClean);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashed }
        });
        user.password = hashed;
      }

      // Check application status for non-admin
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
            appPurpose: app.purpose || 'Investment',
            siblingAccounts: []
          };
        }
      }

      // Get sibling accounts under the same phone for account switching
      const siblingAccounts = await getSiblingAccounts(user.phone, user.username);
      return { ...user, siblingAccounts };
    }
  }

  // Also check Application records (for users who applied but haven't been made members yet)
  let matchApps = await prisma.application.findMany({
    where: { phone: { contains: inputDigits } }
  });

  for (const matchApp of matchApps) {
    if (matchApp && matchApp.password && verifyPassword(passClean, matchApp.password)) {
      if (needsRehash(matchApp.password)) {
        const hashed = hashPassword(passClean);
        await prisma.application.update({
          where: { id: matchApp.id },
          data: { password: hashed }
        });
        matchApp.password = hashed;
      }

      // Find sibling accounts for the application phone
      const siblingAccounts = await getSiblingAccounts(matchApp.phone);

      return {
        id: `usr_app_${matchApp.id}`,
        username: matchApp.phone,
        phone: matchApp.phone,
        name: matchApp.applicantName,
        role: matchApp.status === 'APPROVED' ? 'USER' : 'PENDING_USER',
        appStatus: matchApp.status,
        appPurpose: matchApp.purpose || 'Investment',
        siblingAccounts
      };
    }
  }

  return null;
}

/**
 * Find all sibling accounts (users and members) sharing the same phone number.
 * @param {string} phone - The phone number
 * @param {string} [excludeUsername] - Optional username to exclude from results
 * @returns {Promise<Array>} List of sibling accounts
 */
async function getSiblingAccounts(phone, excludeUsername) {
  if (!phone) return [];
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 10) return [];

  const allUsers = await prisma.user.findMany({
    where: {
      phone: { contains: phoneDigits },
      ...(excludeUsername ? { NOT: { username: excludeUsername } } : {})
    }
  });

  const allMembers = await prisma.member.findMany({
    where: { phone: { contains: phoneDigits } }
  });

  const result = [];
  for (const u of allUsers) {
    const m = allMembers.find(sm => sm.memberId === u.username);
    let rProfile = 'USER';

    if (m) {
      // Use the stored category as the authoritative source
      if (['INVESTOR', 'BUYER', 'BOTH'].includes(m.category)) {
        rProfile = m.category === 'BOTH' ? 'DUAL' : m.category;
      } else {
        // Legacy fallback for members without a stored category
        const mInvested = Number(m.capitalInvested) > 0;
        const orders = await prisma.order.findMany({
          where: { username: u.username }
        });
        const mOrders = orders.length > 0;
        const inInvestorTree = m.investorParent !== null && m.investorParent !== undefined && m.investorParent !== '';
        const inBuyerTree = m.buyerParent !== null && m.buyerParent !== undefined && m.buyerParent !== '';

        const acctIsInvestor = mInvested || inInvestorTree;
        const acctIsBuyer = mOrders || inBuyerTree;

        if (acctIsInvestor && acctIsBuyer) rProfile = 'DUAL';
        else if (acctIsInvestor) rProfile = 'INVESTOR';
        else if (acctIsBuyer) rProfile = 'BUYER';
        else rProfile = mInvested ? 'INVESTOR' : 'BUYER';
      }
    }

    result.push({
      username: u.username,
      publicId: u.publicId,
      name: u.name,
      role: u.role,
      roleProfile: rProfile
    });
  }

  return result;
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
        { username: trimmed.toUpperCase() },
        { publicId: trimmed }
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
        publicId: m.publicId,
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
        publicId: m.publicId,
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

  // Only match orders placed under THIS member's exact memberId (not shared phone)
  const ordersList = await prisma.order.findMany({
    where: {
      username: activeMember.memberId
    }
  });

  // Determine role strictly from this member's own tree placement + capital.
  const hasInvested = activeMember && Number(activeMember.capitalInvested) > 0;
  const isInvestorTreeMember = activeMember.investorParent !== null && activeMember.investorParent !== undefined && activeMember.investorParent !== '';
  const isBuyerTreeMember = activeMember.buyerParent !== null && activeMember.buyerParent !== undefined && activeMember.buyerParent !== '';
  const hasOrders = ordersList.length > 0;

  const isInvestor = hasInvested || isInvestorTreeMember;
  const isBuyer = hasOrders || isBuyerTreeMember;

  let roleProfile = 'INVESTOR';
  if (isInvestor && isBuyer) {
    roleProfile = 'DUAL';
  } else if (isBuyer && !isInvestor) {
    roleProfile = 'BUYER';
  } else if (isInvestor && !isBuyer) {
    roleProfile = 'INVESTOR';
  } else {
    // Neither clear signal — fall back to capital
    roleProfile = hasInvested ? 'INVESTOR' : 'BUYER';
  }

  const wallet = await getWallet(activeMember.memberId || activeMember.phone);
  const notifications = await getNotifications(activeMember.memberId || activeMember.phone);
  const withdrawals = await getWithdrawals(activeMember.memberId || activeMember.phone);

  const buyerBinaryTree = await buildBinaryTreeUI(activeMember.memberId, 'buyer');
  const investorBinaryTree = await buildBinaryTreeUI(activeMember.memberId, 'investor');

  // Retrieve sibling accounts under the same phone number
  const activePhone = activeMember.phone || (userObj && userObj.phone);
  let accounts = [];
  if (activePhone) {
    const siblingUsers = await prisma.user.findMany({
      where: { phone: activePhone }
    });
    const siblingUsernames = siblingUsers.map(u => u.username);
    const siblingMembers = await prisma.member.findMany({
      where: { memberId: { in: siblingUsernames } }
    });

    for (const u of siblingUsers) {
      const m = siblingMembers.find(sm => sm.memberId === u.username);

      let rProfile = 'USER';
      if (m) {
        if (['INVESTOR', 'BUYER', 'BOTH'].includes(m.category)) {
          rProfile = m.category === 'BOTH' ? 'DUAL' : m.category;
        } else {
          // Legacy fallback for members without stored category
          const mInvested = Number(m.capitalInvested) > 0;
          const orders = await prisma.order.findMany({
            where: { OR: [{ username: u.username }, { username: activePhone }] }
          });
          const mOrders = orders.length > 0;
          if (mInvested && mOrders) rProfile = 'DUAL';
          else if (mInvested) rProfile = 'INVESTOR';
          else rProfile = 'BUYER';
        }
      }

      accounts.push({
        username: u.username,
        publicId: u.publicId,
        name: u.name,
        role: u.role,
        roleProfile: rProfile
      });
    }
  }

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
    investorBinaryTree,
    accounts
  };
}

export async function isPhoneRegistered(phoneStr) {
  if (!phoneStr) return false;
  const inputClean = phoneStr.trim().toLowerCase();
  const inputDigits = phoneStr.replace(/\D/g, '');
  if (!inputDigits) return false;

  // Use indexed queries instead of loading entire tables
  const appMatch = await prisma.application.findFirst({ where: { phone: inputClean } });
  if (appMatch) return true;

  const memberMatch = await prisma.member.findFirst({ where: { phone: inputClean } });
  if (memberMatch) return true;

  const userMatch = await prisma.user.findFirst({ where: { phone: inputClean } });
  if (userMatch) return true;

  // Also check normalized phone via contains (indexed prefix)
  if (inputDigits.length >= 10) {
    const appDigits = await prisma.application.findFirst({ where: { phone: { contains: inputDigits } } });
    if (appDigits) return true;
    const memberDigits = await prisma.member.findFirst({ where: { phone: { contains: inputDigits } } });
    if (memberDigits) return true;
    const userDigits = await prisma.user.findFirst({ where: { phone: { contains: inputDigits } } });
    if (userDigits) return true;
  }

  return false;
}

export async function addApplication(appData) {
  if (await isPhoneRegistered(appData.phone)) {
    throw new Error('This mobile number is already registered in our database. Please sign in or use a different mobile number.');
  }

  // Use aggregation instead of loading all rows
  const lastApp = await prisma.application.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  let maxNum = 0;
  if (lastApp) {
    const match = lastApp.id.match(/(\d+)$/);
    if (match) maxNum = parseInt(match[1], 10) || 0;
  }
  // Use a short random ID instead of sequential for security (prevents enumeration)
  const id = `APP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  const newApp = await prisma.application.create({
    data: {
      id,
      applicantName: appData.applicantName,
      phone: appData.phone,
      nid: appData.nid,
      password: appData.password ? (needsRehash(appData.password) ? hashPassword(appData.password) : appData.password) : null,
      email: appData.email || null,
      capitalAmount: appData.capitalAmount !== undefined && appData.capitalAmount !== null ? Number(appData.capitalAmount) : null,
      durationMonths: appData.durationMonths !== undefined && appData.durationMonths !== null ? Number(appData.durationMonths) : null,
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
    
    let nameToUse = app.applicantName;
    if (await isPhoneRegistered(app.phone)) {
      nameToUse = await getNextNameWithSuffix(app.phone, app.applicantName);
    }

    const newMember = await prisma.member.create({
      data: {
        memberId,
        name: nameToUse,
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

    // Only look up by username, since multiple users can have the same phone now
    const existingUser = await prisma.user.findFirst({
      where: { username: memberId }
    });

    if (existingUser) {
      const dataUpdate = { role: 'USER', name: nameToUse };
      if (app.password) {
        dataUpdate.password = needsRehash(app.password) ? hashPassword(app.password) : app.password;
      }
      if (app.phone) dataUpdate.phone = app.phone;
      await prisma.user.update({
        where: { id: existingUser.id },
        data: dataUpdate
      });
    } else {
      const passToUse = app.password || hashPassword(crypto.randomBytes(16).toString('hex'));
      const rawPassword = needsRehash(passToUse) ? hashPassword(passToUse) : passToUse;
      await prisma.user.create({
        data: {
          id: `usr_${Date.now()}`,
          username: memberId,
          phone: app.phone,
          password: rawPassword,
          name: nameToUse,
          email: app.email || `${nameToUse.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
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

  const payouts = await prisma.payout.findMany({
    orderBy: [
      { status: 'asc' },
      { dueDate: 'asc' }
    ]
  });

  return payouts;
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
  const id = `INQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
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
        password: hashPassword(crypto.randomBytes(16).toString('hex')),
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

  // Atomic check-and-update using a Prisma transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Re-read the member inside the transaction to get current state
      const currentMember = await tx.member.findUnique({ where: { memberId: targetMember.memberId } });
      if (!currentMember) throw new Error('MEMBER_NOT_FOUND');

      if (currentMember[refKey]) {
        throw new Error('ALREADY_LINKED');
      }

      let referrerMember = await findMemberRecord(referrerCode);
      if (!referrerMember) {
        const referrerUser = await findUserRecord(referrerCode);
        if (referrerUser) {
          referrerMember = { memberId: referrerUser.username, name: referrerUser.name };
        }
      }

      if (!referrerMember) {
        throw new Error('INVALID_REFERRAL_CODE');
      }

      if (referrerMember.memberId && currentMember.memberId && referrerMember.memberId.toLowerCase() === currentMember.memberId.toLowerCase()) {
        throw new Error('SELF_REFERRAL');
      }

      await tx.member.update({
        where: { memberId: currentMember.memberId },
        data: { [refKey]: referrerMember.memberId }
      });

      let hasAwarded = false;
      if (type === 'buyer') {
        await updateWalletBalance(referrerMember.memberId, 500, 'REFERRAL_BONUS', `Direct Referral Bonus for linking Buyer (${currentMember.name})`);
        hasAwarded = true;
      } else {
        if (currentMember.capitalInvested > 0) {
          const bonus = currentMember.capitalInvested * 0.06;
          if (bonus > 0) {
            await updateWalletBalance(referrerMember.memberId, bonus, 'REFERRAL_BONUS', `Direct Referral Commission (6%) for linking Investor (${currentMember.name})`);
            hasAwarded = true;
          }
        }
      }

      return { referrerMember, hasAwarded };
    });

    // Award level 2 & 3 bonuses outside the transaction (non-critical)
    if (result.hasAwarded && type !== 'buyer') {
      try {
        const upline2 = await findReferrer(result.referrerMember.memberId);
        if (upline2) {
          const bonus2 = (targetMember.capitalInvested || 0) * 0.03;
          if (bonus2 > 0) {
            await updateWalletBalance(upline2.memberId, bonus2, 'REFERRAL_BONUS', `Level 2 Referral Commission (3%) for ${targetMember.name}`);
          }
          const upline3 = await findReferrer(upline2.memberId);
          if (upline3) {
            const bonus3 = (targetMember.capitalInvested || 0) * 0.01;
            if (bonus3 > 0) {
              await updateWalletBalance(upline3.memberId, bonus3, 'REFERRAL_BONUS', `Level 3 Referral Commission (1%) for ${targetMember.name}`);
            }
          }
        }
      } catch (e) {
        console.error('Error awarding level 2/3 referral bonuses:', e);
      }
    }

    // Place member in the appropriate binary tree now that referral is linked
    try {
      const treeType = type === 'buyer' ? 'buyer' : 'investor';
      await addToBinaryTree(treeType, targetMember.memberId);
    } catch (e) {
      console.error(`Error placing in ${type} binary tree after referral binding:`, e);
    }

    return { success: true, message: `Referral code linked successfully! Sponsor: ${result.referrerMember.name || result.referrerMember.memberId}` };
  } catch (err) {
    if (err.message === 'ALREADY_LINKED') {
      return { success: false, message: `Account is already linked to a ${type === 'buyer' ? 'buyer' : 'investor'} sponsor. This code can only be submitted once.` };
    }
    if (err.message === 'INVALID_REFERRAL_CODE') {
      return { success: false, message: 'Invalid referral code. No matching sponsor member found.' };
    }
    if (err.message === 'SELF_REFERRAL') {
      return { success: false, message: 'You cannot use your own referral code as a sponsor.' };
    }
    if (err.message === 'MEMBER_NOT_FOUND') {
      return { success: false, message: 'Member account not found.' };
    }
    console.error('[REFERRAL] Error binding referral code:', err);
    return { success: false, message: 'Failed to bind referral code. Please try again.' };
  }
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
          investorRight: m.investorRight || null,
          category: ['INVESTOR', 'BUYER', 'BOTH'].includes(m.category) ? m.category : null
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
  const id = `ORD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

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
  // Resolve the canonical wallet username (handles member → wallet mapping)
  const cleanId = username ? username.trim().toLowerCase() : '';
  const member = await findMemberRecord(cleanId);
  const primaryId = member ? member.memberId : username;

  // Use atomic increment to prevent race conditions
  const updatedWallet = await prisma.wallet.update({
    where: { username: primaryId },
    data: {
      balance: { increment: Number(amount) }
    }
  });

  const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  await prisma.transaction.create({
    data: {
      id: txnId,
      username: primaryId,
      amount: Number(amount),
      type,
      description,
      date: new Date()
    }
  });

  await addNotification(username, `Wallet updated: ${amount > 0 ? '+' : ''}৳${amount} - ${description}`, 'WALLET');

  // Fetch updated wallet with transactions for response
  const walletWithTxns = await prisma.wallet.findUnique({
    where: { username: primaryId },
    include: { transactions: true }
  });
  if (walletWithTxns && walletWithTxns.transactions) {
    walletWithTxns.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  return walletWithTxns || updatedWallet;
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
  const cleanId = username ? username.trim().toLowerCase() : '';
  const member = await findMemberRecord(cleanId);
  const primaryId = member ? member.memberId : username;

  // Atomic withdrawal with balance check using a Prisma transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Read current balance first
      const wallet = await tx.wallet.findUnique({ where: { username: primaryId } });
      if (!wallet) {
        throw new Error('WALLET_NOT_FOUND');
      }
      if (Number(wallet.balance) < Number(amount)) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Deduct balance
      const updatedWallet = await tx.wallet.update({
        where: { username: primaryId },
        data: { balance: { increment: -Number(amount) } }
      });

      const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await tx.transaction.create({
        data: {
          id: txnId,
          username: primaryId,
          amount: -Number(amount),
          type: 'WITHDRAW',
          description: `Withdrawal request submitted (${method} - ${paymentNumber || ''})`,
          date: new Date()
        }
      });

      const wthId = `WTH_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newRequest = await tx.withdrawal.create({
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

      return { updatedWallet, newRequest };
    });

    await addNotification(username, `Withdrawal request of ৳${amount} BDT (${method} to ${paymentNumber || ''}) submitted.`, 'WALLET');
    return { success: true, request: result.newRequest };
  } catch (err) {
    if (err.message === 'WALLET_NOT_FOUND') {
      return { success: false, message: 'Wallet not found. Please create a wallet first.' };
    }
    if (err.message === 'INSUFFICIENT_BALANCE') {
      return { success: false, message: 'Insufficient wallet balance.' };
    }
    console.error('[WITHDRAW] Error processing withdrawal:', err);
    return { success: false, message: 'Failed to process withdrawal. Please try again.' };
  }
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
    // Use atomic increment for refund to prevent race conditions
    const cleanId = req.username ? req.username.trim().toLowerCase() : '';
    const member = await findMemberRecord(cleanId);
    const primaryId = member ? member.memberId : req.username;

    await prisma.wallet.update({
      where: { username: primaryId },
      data: { balance: { increment: req.amount } }
    });

    const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await prisma.transaction.create({
      data: {
        id: txnId,
        username: primaryId,
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
  const referredByKey = treeType === 'buyer' ? 'buyerReferredBy' : 'referredBy';

  const member = await prisma.member.findUnique({ where: { memberId } });
  if (!member) return;

  // Already placed in tree — skip
  if (member[parentKey] !== null && member[parentKey] !== undefined) {
    return;
  }

  const allMembers = await prisma.member.findMany();
  const treeMembers = allMembers.filter(m => m.memberId === 'Plan10-101' || (m[parentKey] !== null && m[parentKey] !== undefined));

  // EMPTY TREE: First member becomes root
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

  // Find the root (member with null parent)
  const root = treeMembers.find(m => m[parentKey] === null);
  if (!root) {
    await prisma.member.update({
      where: { memberId: treeMembers[0].memberId },
      data: { [parentKey]: null }
    });
    await addToBinaryTree(treeType, memberId);
    return;
  }

  // Determine BFS starting node: place under the referrer's node if possible
  const referrerId = member[referredByKey];
  let startNode = root;
  if (referrerId && referrerId !== memberId) {
    const referrerMember = allMembers.find(m => m.memberId === referrerId);
    // Referrer must be in the tree (has parent, is the company root, or already has children)
    if (referrerMember && (referrerMember[parentKey] !== null || referrerMember.memberId === 'Plan10-101' || referrerMember[leftKey] !== null || referrerMember[rightKey] !== null)) {
      startNode = referrerMember;
    }
  }

  // BFS from startNode to find first available slot
  const result = await bfsPlaceUnderNode(startNode, memberId, treeType, allMembers);
  if (result) {
    await addNotification(member.phone || member.memberId, `Placed under ${result.parentName} (${result.side}) in ${treeType === 'buyer' ? 'Buyer' : 'Investor'} Tree.`, treeType === 'buyer' ? 'ORDER' : 'INVESTMENT');
    await addNotification(result.parentPhone || result.parentMemberId, `${member.name} joined ${result.side} under you in ${treeType === 'buyer' ? 'Buyer' : 'Investor'} Tree.`, treeType === 'buyer' ? 'ORDER' : 'INVESTMENT');
  }
}

/**
 * BFS from a starting node to find the first available left/right slot.
 * Places memberId in the first open slot found.
 * @returns {object|null} { parentName, parentPhone, parentMemberId, side } or null if no slot
 */
async function bfsPlaceUnderNode(startNode, memberId, treeType, allMembers) {
  const parentKey = treeType === 'buyer' ? 'buyerParent' : 'investorParent';
  const leftKey = treeType === 'buyer' ? 'buyerLeft' : 'investorLeft';
  const rightKey = treeType === 'buyer' ? 'buyerRight' : 'investorRight';

  const queue = [startNode];
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
      return { parentName: current.name, parentPhone: current.phone, parentMemberId: current.memberId, side: 'Left' };
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
      return { parentName: current.name, parentPhone: current.phone, parentMemberId: current.memberId, side: 'Right' };
    } else {
      const rightChild = allMembers.find(m => m.memberId === current[rightKey]);
      if (rightChild) queue.push(rightChild);
    }
  }
  return null; // No slot found (tree completely filled)
}

/**
 * Admin-only: Manually place a member into a binary tree under a specific parent node.
 * If parentId is provided, places under that parent on the specified side.
 * If parentId is not provided, places under Company root (Plan10-101) on the specified side.
 * @param {'buyer'|'investor'} treeType
 * @param {string} memberId
 * @param {'left'|'right'} side
 * @param {string} [parentId] — optional parent node to place under (defaults to Plan10-101)
 * @returns {{ success: boolean, message: string }}
 */
export async function adminPlaceMemberInTree(treeType, memberId, side, parentId) {
  const parentKey = treeType === 'buyer' ? 'buyerParent' : 'investorParent';
  const leftKey = treeType === 'buyer' ? 'buyerLeft' : 'investorLeft';
  const rightKey = treeType === 'buyer' ? 'buyerRight' : 'investorRight';

  const member = await prisma.member.findUnique({ where: { memberId } });
  if (!member) {
    return { success: false, message: 'Member not found.' };
  }

  if (member[parentKey]) {
    return { success: false, message: 'Member is already placed in the tree.' };
  }

  // Determine the parent node
  const targetParentId = parentId || 'Plan10-101';
  const parentNode = await prisma.member.findUnique({ where: { memberId: targetParentId } });
  if (!parentNode) {
    return { success: false, message: `Parent node (${targetParentId}) not found.` };
  }

  const sideKey = side === 'left' ? leftKey : rightKey;
  const sideLabel = side === 'left' ? 'Left' : 'Right';

  // If the parent already has a child on that side, do BFS from that child
  if (parentNode[sideKey]) {
    const allMembers = await prisma.member.findMany();
    const sideChild = allMembers.find(m => m.memberId === parentNode[sideKey]);
    if (sideChild) {
      const result = await bfsPlaceUnderNode(sideChild, memberId, treeType, allMembers);
      if (result) {
        return { success: true, message: `Member placed under ${parentNode.name} (${sideLabel}) → ${result.parentName} (${result.side}).` };
      }
      return { success: false, message: `No available slots under ${parentNode.name} (${sideLabel}). All positions are filled.` };
    }
  }

  // Direct placement: parent has no child on this side
  await prisma.member.update({
    where: { memberId: targetParentId },
    data: { [sideKey]: memberId }
  });
  await prisma.member.update({
    where: { memberId },
    data: {
      [parentKey]: targetParentId,
      [leftKey]: null,
      [rightKey]: null
    }
  });

  const parentName = parentNode.memberId === 'Plan10-101' ? 'Company' : parentNode.name;
  return { success: true, message: `Member placed under ${parentName} (${sideLabel}).` };
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
    publicId: m.publicId,
    name: m.name,
    phone: m.phone,
    left: leftNode,
    right: rightNode
  };
}

export async function getNextMemberId() {
  // Use findMany and sort numerically to handle Plan10-99 < Plan10-100 correctly
  const allMembers = await prisma.member.findMany({
    select: { memberId: true }
  });
  let maxNum = 0;
  for (const m of allMembers) {
    const parts = m.memberId.split('-');
    const num = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  let nextNum = maxNum > 0 ? maxNum + 1 : 101;
  return `Plan10-${nextNum}`;
}

export async function createMemberAccount(memberData) {
  let nameToUse = memberData.name;
  let isDuplicatePhone = false;

  if (await isPhoneRegistered(memberData.phone)) {
    // Generate suffix name based on previous registration(s)
    nameToUse = await getNextNameWithSuffix(memberData.phone, memberData.name);
    isDuplicatePhone = true;
  }

  const memberId = await getNextMemberId();
  const capitalAmount = Number(memberData.capitalInvested) || 0;
  const termMonths = Number(memberData.termMonths) || 0;

  const monthlyProfit = capitalAmount ? (capitalAmount / 100000) * 3000 : 0;
  const monthlyCapitalRefund = termMonths ? Math.round(capitalAmount / termMonths) : 0;

  // Generate a unique 7-digit random publicId
  let isUnique = false;
  let publicId = '';
  let attempts = 0;
  while (!isUnique && attempts < 100) {
    publicId = String(Math.floor(1000000 + Math.random() * 9000000));
    const checkM = await prisma.member.findFirst({ where: { publicId } });
    const checkU = await prisma.user.findFirst({ where: { publicId } });
    if (!checkM && !checkU) {
      isUnique = true;
    }
    attempts++;
  }

  // ──────────────────────────────────────────────────────────────
  // DUPLICATE PHONE LOGIC:
  // If this phone already has accounts, subsequent accounts are
  // treated as "sub-accounts" of the first account.
  //   1. Ignore whatever referral code was submitted — it's not
  //      a new independent member, it's a sibling.
  //   2. Auto-link the FIRST member under this phone as the
  //      sponsor so the referral commission goes to the main account.
  //   3. The sub-account itself does NOT get its own referral tree.
  // ──────────────────────────────────────────────────────────────
  let effectiveReferrer = memberData.referredBy || null;

  if (isDuplicatePhone) {
    // Find the first member who registered with this phone (the "main" account)
    const allWithPhone = await prisma.member.findMany({
      where: { phone: memberData.phone },
      orderBy: { joinDate: 'asc' }
    });

    if (allWithPhone.length > 0) {
      // The first account under this phone becomes the automatic sponsor
      effectiveReferrer = allWithPhone[0].memberId;
    } else {
      // Fallback: check users table
      const userWithPhone = await prisma.user.findFirst({
        where: { phone: memberData.phone },
        orderBy: { createdAt: 'asc' }
      });
      if (userWithPhone) {
        effectiveReferrer = userWithPhone.username;
      }
    }
  }

  const newMember = await prisma.member.create({
    data: {
      memberId,
      publicId: isUnique ? publicId : null,
      name: nameToUse,
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
      referredBy: effectiveReferrer,
      category: ['INVESTOR', 'BUYER', 'BOTH'].includes(memberData.category) ? memberData.category : 'INVESTOR'
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
  if (effectiveReferrer) {
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
      const bonusLabel = isDuplicatePhone
        ? `Sibling Sub-Account Bonus for ${newMember.name}`
        : `Direct Referral Commission (6%) for ${newMember.name}`;

      if (memberData.category === 'BUYER') {
        await updateWalletBalance(sponsorId, 500, 'REFERRAL_BONUS', `Direct Referral Bonus for new Buyer (${newMember.name})`);
      } else if (memberData.category === 'INVESTOR') {
        const bonusAmount = (newMember.capitalInvested || 0) * 0.06;
        if (bonusAmount > 0) {
          await updateWalletBalance(sponsorId, bonusAmount, 'REFERRAL_BONUS', bonusLabel);
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

  const passToUse2 = memberData.password || hashPassword(crypto.randomBytes(16).toString('hex'));
  const hashedPassword = needsRehash(passToUse2) ? hashPassword(passToUse2) : passToUse2;
  
  // Clean up any orphaned user record with the same username to avoid duplicate key errors
  await prisma.user.deleteMany({ where: { username: memberId } });

  await prisma.user.create({
    data: {
      id: `usr_${Date.now()}`,
      username: memberId,
      publicId: isUnique ? publicId : null,
      phone: memberData.phone,
      password: hashedPassword,
      name: nameToUse,
      email: memberData.email || `${nameToUse.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
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

