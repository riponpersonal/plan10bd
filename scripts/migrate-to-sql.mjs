import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { hashPassword, needsRehash } from '../app/lib/crypto.js';

const prisma = new PrismaClient();

const DATA_FILE = path.join(process.cwd(), 'data', 'dataStore.json');

async function main() {
  console.log('🚀 Starting data migration from JSON datastore to SQL database...');

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`❌ Data file not found at: ${DATA_FILE}. Nothing to migrate.`);
    return;
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const store = JSON.parse(raw);

  // 1. Migrate Users
  console.log(`👤 Migrating ${store.users?.length || 0} users...`);
  if (store.users) {
    for (const u of store.users) {
      const password = needsRehash(u.password) ? hashPassword(u.password) : u.password;
      await prisma.user.upsert({
        where: { username: u.username },
        update: {
          password,
          name: u.name,
          email: u.email || '',
          role: u.role,
          phone: u.phone || null,
          createdAt: new Date(u.createdAt)
        },
        create: {
          id: u.id,
          username: u.username,
          password,
          name: u.name,
          email: u.email || '',
          role: u.role,
          phone: u.phone || null,
          createdAt: new Date(u.createdAt)
        }
      });
    }
  }

  // 2. Migrate Applications
  console.log(`📝 Migrating ${store.applications?.length || 0} applications...`);
  if (store.applications) {
    for (const app of store.applications) {
      await prisma.application.upsert({
        where: { id: app.id },
        update: {
          applicantName: app.applicantName,
          phone: app.phone,
          nid: app.nid,
          password: needsRehash(app.password) ? hashPassword(app.password) : app.password,
          email: app.email || null,
          capitalAmount: app.capitalAmount ? Number(app.capitalAmount) : null,
          durationMonths: app.durationMonths ? Number(app.durationMonths) : null,
          purpose: app.purpose,
          nomineeName: app.nomineeName || null,
          relation: app.relation || null,
          fatherName: app.fatherName || null,
          address: app.address || null,
          status: app.status || 'PENDING',
          submittedAt: new Date(app.submittedAt),
          referredBy: app.referredBy || null
        },
        create: {
          id: app.id,
          applicantName: app.applicantName,
          phone: app.phone,
          nid: app.nid,
          password: needsRehash(app.password) ? hashPassword(app.password) : app.password,
          email: app.email || null,
          capitalAmount: app.capitalAmount ? Number(app.capitalAmount) : null,
          durationMonths: app.durationMonths ? Number(app.durationMonths) : null,
          purpose: app.purpose,
          nomineeName: app.nomineeName || null,
          relation: app.relation || null,
          fatherName: app.fatherName || null,
          address: app.address || null,
          status: app.status || 'PENDING',
          submittedAt: new Date(app.submittedAt),
          referredBy: app.referredBy || null
        }
      });
    }
  }

  // 3. Migrate Members
  console.log(`👥 Migrating ${store.members?.length || 0} members...`);
  if (store.members) {
    for (const m of store.members) {
      await prisma.member.upsert({
        where: { memberId: m.memberId },
        update: {
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
        },
        create: {
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

  // 4. Migrate Payouts
  console.log(`💰 Migrating ${store.payouts?.length || 0} payouts...`);
  if (store.payouts) {
    for (const p of store.payouts) {
      await prisma.payout.upsert({
        where: { id: p.id },
        update: {
          memberId: p.memberId,
          memberName: p.memberName,
          monthNumber: Number(p.monthNumber),
          dueDate: p.dueDate,
          profitAmount: Number(p.profitAmount) || 0,
          capitalRefund: Number(p.capitalRefund) || 0,
          totalPayout: Number(p.totalPayout) || 0,
          status: p.status || 'PENDING',
          method: p.method || 'Bank Wire / bKash',
          createdAt: new Date(p.createdAt || Date.now())
        },
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
          createdAt: new Date(p.createdAt || Date.now())
        }
      });
    }
  }

  // 5. Migrate Products
  console.log(`📦 Migrating ${store.products?.length || 0} products...`);
  if (store.products) {
    for (const p of store.products) {
      await prisma.product.upsert({
        where: { id: p.id },
        update: {
          name: p.name,
          brand: p.brand || 'PLAN-10',
          category: p.category || 'Consumer Goods',
          price: Number(p.price) || 0,
          description: p.description || '',
          imageUrl: p.imageUrl || '',
          imageUrls: typeof p.imageUrls === 'string' ? p.imageUrls : JSON.stringify(p.imageUrls || []),
          stockStatus: p.stockStatus || 'IN_STOCK'
        },
        create: {
          id: p.id,
          name: p.name,
          brand: p.brand || 'PLAN-10',
          category: p.category || 'Consumer Goods',
          price: Number(p.price) || 0,
          description: p.description || '',
          imageUrl: p.imageUrl || '',
          imageUrls: typeof p.imageUrls === 'string' ? p.imageUrls : JSON.stringify(p.imageUrls || []),
          stockStatus: p.stockStatus || 'IN_STOCK'
        }
      });
    }
  }

  // 6. Migrate Inquiries
  console.log(`📧 Migrating ${store.inquiries?.length || 0} inquiries...`);
  if (store.inquiries) {
    for (const inq of store.inquiries) {
      await prisma.inquiry.upsert({
        where: { id: inq.id },
        update: {
          name: inq.name,
          phone: inq.phone,
          message: inq.message,
          date: new Date(inq.date),
          status: inq.status || 'UNREAD'
        },
        create: {
          id: inq.id,
          name: inq.name,
          phone: inq.phone,
          message: inq.message,
          date: new Date(inq.date),
          status: inq.status || 'UNREAD'
        }
      });
    }
  }

  // 7. Migrate Categories
  console.log(`🏷️ Migrating ${store.categories?.length || 0} categories...`);
  if (store.categories) {
    for (const cat of store.categories) {
      await prisma.category.upsert({
        where: { name: cat },
        update: {},
        create: {
          name: cat
        }
      });
    }
  }

  // 8. Migrate System Logs
  console.log(`🛡️ Migrating ${store.logs?.length || 0} system logs...`);
  if (store.logs) {
    for (const l of store.logs) {
      await prisma.systemLog.create({
        data: {
          action: l.action,
          operator: l.operator,
          status: l.status,
          timestamp: new Date(l.timestamp)
        }
      });
    }
  }

  // 9. Migrate Orders
  console.log(`🛒 Migrating ${store.orders?.length || 0} orders...`);
  if (store.orders) {
    for (const o of store.orders) {
      await prisma.order.upsert({
        where: { id: o.id },
        update: {
          username: o.username,
          productId: Number(o.productId),
          productName: o.productName,
          price: Number(o.price) || 0,
          status: o.status || 'PENDING',
          createdAt: new Date(o.createdAt || Date.now())
        },
        create: {
          id: o.id,
          username: o.username,
          productId: Number(o.productId),
          productName: o.productName,
          price: Number(o.price) || 0,
          status: o.status || 'PENDING',
          createdAt: new Date(o.createdAt || Date.now())
        }
      });
    }
  }

  // 10. Migrate Wallets and Transactions
  console.log(`💼 Migrating ${store.wallets?.length || 0} wallets...`);
  if (store.wallets) {
    for (const w of store.wallets) {
      await prisma.wallet.upsert({
        where: { username: w.username },
        update: {
          balance: Number(w.balance) || 0
        },
        create: {
          username: w.username,
          balance: Number(w.balance) || 0
        }
      });

      if (w.transactions) {
        for (const txn of w.transactions) {
          await prisma.transaction.upsert({
            where: { id: txn.id },
            update: {
              username: w.username,
              amount: Number(txn.amount) || 0,
              type: txn.type,
              description: txn.description,
              date: new Date(txn.date || Date.now())
            },
            create: {
              id: txn.id,
              username: w.username,
              amount: Number(txn.amount) || 0,
              type: txn.type,
              description: txn.description,
              date: new Date(txn.date || Date.now())
            }
          });
        }
      }
    }
  }

  // 11. Migrate Notifications
  console.log(`🔔 Migrating ${store.notifications?.length || 0} notifications...`);
  if (store.notifications) {
    for (const n of store.notifications) {
      await prisma.notification.upsert({
        where: { id: n.id },
        update: {
          username: n.username,
          message: n.message,
          type: n.type || 'SYSTEM',
          timestamp: new Date(n.timestamp),
          isRead: Boolean(n.isRead)
        },
        create: {
          id: n.id,
          username: n.username,
          message: n.message,
          type: n.type || 'SYSTEM',
          timestamp: new Date(n.timestamp),
          isRead: Boolean(n.isRead)
        }
      });
    }
  }

  console.log('✅ Data migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Data migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
