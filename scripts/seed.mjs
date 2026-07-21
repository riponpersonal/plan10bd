// Quick seed script — imports dataStore.json into MariaDB
import { PrismaClient } from '../app/lib/prisma-client/index.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pw, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function needsRehash(pw) {
  return !pw || !pw.includes(':');
}

async function main() {
  const dataPath = path.join(__dirname, '..', 'data', 'dataStore.json');
  if (!fs.existsSync(dataPath)) {
    console.error('dataStore.json not found at', dataPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(dataPath, 'utf8');
  const store = JSON.parse(raw);

  console.log('Seeding database...');

  // Users
  if (store.users) {
    for (const u of store.users) {
      const password = needsRehash(u.password) ? hashPassword(u.password) : u.password;
      await prisma.user.upsert({
        where: { username: u.username },
        update: {},
        create: {
          id: u.id,
          username: u.username,
          publicId: u.publicId || null,
          password,
          name: u.name,
          email: u.email || '',
          role: u.role,
          phone: u.phone || null,
          createdAt: new Date(u.createdAt),
        },
      });
    }
    console.log(`  ✓ ${store.users.length} users`);
  }

  // Applications
  if (store.applications) {
    for (const app of store.applications) {
      await prisma.application.upsert({
        where: { id: app.id },
        update: {},
        create: {
          id: app.id,
          applicantName: app.applicantName,
          phone: app.phone,
          nid: app.nid,
          password: needsRehash(app.password) ? hashPassword(app.password) : app.password,
          email: app.email || null,
          capitalAmount: app.capitalAmount != null ? Number(app.capitalAmount) : null,
          durationMonths: app.durationMonths != null ? Number(app.durationMonths) : null,
          purpose: app.purpose,
          nomineeName: app.nomineeName || null,
          relation: app.relation || null,
          fatherName: app.fatherName || null,
          address: app.address || null,
          status: app.status || 'PENDING',
          submittedAt: new Date(app.submittedAt),
          referredBy: app.referredBy || null,
        },
      });
    }
    console.log(`  ✓ ${store.applications.length} applications`);
  }

  // Members
  if (store.members) {
    for (const m of store.members) {
      await prisma.member.upsert({
        where: { memberId: m.memberId },
        update: {},
        create: {
          memberId: m.memberId,
          publicId: m.publicId || null,
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
        },
      });
    }
    console.log(`  ✓ ${store.members.length} members`);
  }

  // Payouts
  if (store.payouts) {
    for (const p of store.payouts) {
      await prisma.payout.upsert({
        where: { id: p.id },
        update: {},
        create: {
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
          createdAt: new Date(p.createdAt || Date.now()),
        },
      });
    }
    console.log(`  ✓ ${store.payouts.length} payouts`);
  }

  // Products
  if (store.products) {
    for (const p of store.products) {
      const urls = p.imageUrls || (p.imageUrl ? [p.imageUrl] : []);
      const imgUrlString = typeof p.imageUrls === 'string' ? p.imageUrls : JSON.stringify(urls);
      const primaryImg = urls[0] || p.imageUrl || '';
      await prisma.product.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          name: p.name,
          brand: p.brand || 'PLAN-10',
          category: p.category || 'Consumer Goods',
          price: Number(p.price) || 0,
          description: p.description || '',
          imageUrl: primaryImg,
          imageUrls: imgUrlString,
          stockStatus: p.stockStatus || 'IN_STOCK',
        },
      });
    }
    console.log(`  ✓ ${store.products.length} products`);
  }

  // Orders
  if (store.orders) {
    for (const o of store.orders) {
      await prisma.order.upsert({
        where: { id: o.id },
        update: {},
        create: {
          id: o.id,
          username: o.username,
          productId: Number(o.productId),
          productName: o.productName,
          price: Number(o.price) || 0,
          status: o.status || 'PENDING',
          createdAt: new Date(o.createdAt || Date.now()),
        },
      });
    }
    console.log(`  ✓ ${store.orders.length} orders`);
  }

  // Wallets & Transactions
  if (store.wallets) {
    for (const w of store.wallets) {
      await prisma.wallet.upsert({
        where: { username: w.username },
        update: {},
        create: {
          username: w.username,
          balance: Number(w.balance) || 0,
        },
      });
      if (w.transactions) {
        for (const txn of w.transactions) {
          await prisma.transaction.upsert({
            where: { id: txn.id },
            update: {},
            create: {
              id: txn.id,
              username: w.username,
              amount: Number(txn.amount) || 0,
              type: txn.type,
              description: txn.description,
              date: new Date(txn.date || Date.now()),
            },
          });
        }
      }
    }
    console.log(`  ✓ ${store.wallets.length} wallets with transactions`);
  }

  // Notifications
  if (store.notifications) {
    for (const n of store.notifications) {
      await prisma.notification.upsert({
        where: { id: n.id },
        update: {},
        create: {
          id: n.id,
          username: n.username,
          message: n.message,
          type: n.type || 'SYSTEM',
          timestamp: new Date(n.timestamp),
          isRead: Boolean(n.isRead),
        },
      });
    }
    console.log(`  ✓ ${store.notifications.length} notifications`);
  }

  // Categories
  if (store.categories) {
    for (const cat of store.categories) {
      await prisma.category.upsert({
        where: { name: cat },
        update: {},
        create: { name: cat },
      });
    }
    console.log(`  ✓ ${store.categories.length} categories`);
  }

  console.log('\n✅ Database seeded successfully!');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
