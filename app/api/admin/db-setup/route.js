import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/dataStore';
import { hashPassword, needsRehash } from '@/app/lib/crypto';
import { requireAdmin } from '@/app/lib/session';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';

export async function GET(request) {
  // ✅ SECURITY: Validate request origin first to protect against CSRF
  if (!validateOrigin(request)) return csrfDenied();

  const { searchParams } = new URL(request.url);
  const providedSecret = searchParams.get('secret');
  const secretKey = process.env.PLAN10_SECRET_KEY;

  // Allow access via a valid admin session OR a matching PLAN10_SECRET_KEY (min 16 chars) for bootstrapping
  const isSecretValid = secretKey && secretKey.length >= 16 && providedSecret === secretKey;

  if (!requireAdmin(request) && !isSecretValid) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized: Admin access or valid bootstrap secret key required.' },
      { status: 403 }
    );
  }

  const force = searchParams.get('force') === 'true';

  const report = {
    tablesCreated: [],
    tablesSkipped: [],
    dataMigration: {}
  };

  try {
    // 1. Load and parse schema.sql
    const cwd = process.cwd();
    const schemaPath = path.join(cwd, 'schema.sql');
    console.error(`[DB SETUP] CWD: ${cwd}, Schema path: ${schemaPath}, Exists: ${fs.existsSync(schemaPath)}`);
    report.debug = { cwd, schemaPath, schemaExists: fs.existsSync(schemaPath) };

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}. CWD is ${cwd}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Strip comments (lines starting with --) first, then split by semicolon
    const cleanSql = schemaSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.error(`[DB SETUP] Found ${statements.length} clean SQL statements to execute.`);

    // Execute each statement sequentially, ignoring "already exists" errors
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
        report.tablesCreated.push(statement.substring(0, 80) + '...');
      } catch (err) {
        // Table already exists or foreign key exists is expected if run repeatedly
        report.tablesSkipped.push({
          query: statement.substring(0, 80) + '...',
          error: err.message
        });
      }
    }

    // ✅ Run migrations to ensure publicId columns exist
    try {
      await prisma.$executeRawUnsafe("ALTER TABLE `Member` ADD COLUMN `publicId` VARCHAR(191) NULL UNIQUE");
      console.log("[DB SETUP] Added publicId column to Member table.");
    } catch (e) {
      console.log("[DB SETUP] Member.publicId alteration skipped (already exists or failed):", e.message);
    }
    try {
      await prisma.$executeRawUnsafe("ALTER TABLE `User` ADD COLUMN `publicId` VARCHAR(191) NULL UNIQUE");
      console.log("[DB SETUP] Added publicId column to User table.");
    } catch (e) {
      console.log("[DB SETUP] User.publicId alteration skipped (already exists or failed):", e.message);
    }
    try {
      await prisma.$executeRawUnsafe("ALTER TABLE `Member` ADD COLUMN `category` VARCHAR(20) NULL");
      console.log("[DB SETUP] Added category column to Member table.");
    } catch (e) {
      console.log("[DB SETUP] Member.category alteration skipped (already exists or failed):", e.message);
    }

    // 2. Data Migration from dataStore.json
    const dataPath = path.join(process.cwd(), 'data', 'dataStore.json');
    if (fs.existsSync(dataPath)) {
      console.log('[DB SETUP] dataStore.json found. Running migration...');
      const rawData = fs.readFileSync(dataPath, 'utf8');
      const store = JSON.parse(rawData);

      // Verify if database is empty before running migration
      const userCount = await prisma.user.count();
      const memberCount = await prisma.member.count();
      const productCount = await prisma.product.count();

      if (userCount === 0 || memberCount === 0 || productCount === 0 || force) {
        // A. Users
        if (store.users) {
          let count = 0;
          for (const u of store.users) {
            const password = needsRehash(u.password) ? hashPassword(u.password) : u.password;
            await prisma.user.upsert({
              where: { username: u.username },
              update: {},
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
            count++;
          }
          report.dataMigration.users = `${count} users migrated`;
        }

        // B. Applications
        if (store.applications) {
          let count = 0;
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
            count++;
          }
          report.dataMigration.applications = `${count} applications migrated`;
        }

        // C. Members
        if (store.members) {
          let count = 0;
          for (const m of store.members) {
            await prisma.member.upsert({
              where: { memberId: m.memberId },
              update: {},
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
            count++;
          }
          report.dataMigration.members = `${count} members migrated`;
        }

        // D. Payouts
        if (store.payouts) {
          let count = 0;
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
                createdAt: new Date(p.createdAt || Date.now())
              }
            });
            count++;
          }
          report.dataMigration.payouts = `${count} payouts migrated`;
        }

        // E. Products
        if (store.products) {
          let count = 0;
          for (const p of store.products) {
            const urls = p.imageUrls || (p.imageUrl ? [p.imageUrl] : []);
            const imgUrlString = typeof p.imageUrls === 'string' ? p.imageUrls : JSON.stringify(urls);
            const primaryImg = urls[0] || p.imageUrl || '';
            await prisma.product.upsert({
              where: { id: p.id },
              update: {
                name: p.name,
                brand: p.brand || 'PLAN-10',
                category: p.category || 'Consumer Goods',
                price: Number(p.price) || 0,
                description: p.description || '',
                imageUrl: primaryImg,
                imageUrls: imgUrlString,
                stockStatus: p.stockStatus || 'IN_STOCK'
              },
              create: {
                id: p.id,
                name: p.name,
                brand: p.brand || 'PLAN-10',
                category: p.category || 'Consumer Goods',
                price: Number(p.price) || 0,
                description: p.description || '',
                imageUrl: primaryImg,
                imageUrls: imgUrlString,
                stockStatus: p.stockStatus || 'IN_STOCK'
              }
            });
            count++;
          }
          report.dataMigration.products = `${count} products migrated`;
        }

        // F. Inquiries
        if (store.inquiries) {
          let count = 0;
          for (const inq of store.inquiries) {
            await prisma.inquiry.upsert({
              where: { id: inq.id },
              update: {},
              create: {
                id: inq.id,
                name: inq.name,
                phone: inq.phone,
                message: inq.message,
                date: new Date(inq.date),
                status: inq.status || 'UNREAD'
              }
            });
            count++;
          }
          report.dataMigration.inquiries = `${count} inquiries migrated`;
        }

        // G. Categories
        if (store.categories) {
          let count = 0;
          for (const cat of store.categories) {
            await prisma.category.upsert({
              where: { name: cat },
              update: {},
              create: {
                name: cat
              }
            });
            count++;
          }
          report.dataMigration.categories = `${count} categories migrated`;
        }

        // H. Orders
        if (store.orders) {
          let count = 0;
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
                createdAt: new Date(o.createdAt || Date.now())
              }
            });
            count++;
          }
          report.dataMigration.orders = `${count} orders migrated`;
        }

        // I. Wallets & Transactions
        if (store.wallets) {
          let walletCount = 0;
          let txnCount = 0;
          for (const w of store.wallets) {
            await prisma.wallet.upsert({
              where: { username: w.username },
              update: {},
              create: {
                username: w.username,
                balance: Number(w.balance) || 0
              }
            });
            walletCount++;

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
                    date: new Date(txn.date || Date.now())
                  }
                });
                txnCount++;
              }
            }
          }
          report.dataMigration.wallets = `${walletCount} wallets and ${txnCount} transactions migrated`;
        }

        // J. Notifications
        if (store.notifications) {
          let count = 0;
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
                isRead: Boolean(n.isRead)
              }
            });
            count++;
          }
          report.dataMigration.notifications = `${count} notifications migrated`;
        }
      } else {
        report.dataMigration.status = `Skipped: User table (${userCount}), Member table (${memberCount}), and Product table (${productCount}) already contain records. Data is preserved.`;
      }
    } else {
      report.dataMigration.status = 'No dataStore.json file found for migration.';
    }

    // ✅ Backfill publicId for existing members/users that don't have one
    const membersToMigrate = await prisma.member.findMany({
      where: {
        OR: [
          { publicId: null },
          { publicId: '' }
        ]
      }
    });
    let migratedMembersCount = 0;
    for (const m of membersToMigrate) {
      let isUnique = false;
      let candidate = '';
      let attempts = 0;
      while (!isUnique && attempts < 100) {
        candidate = String(Math.floor(1000000 + Math.random() * 9000000));
        const checkM = await prisma.member.findFirst({ where: { publicId: candidate } });
        const checkU = await prisma.user.findFirst({ where: { publicId: candidate } });
        if (!checkM && !checkU) {
          isUnique = true;
        }
        attempts++;
      }
      if (isUnique) {
        await prisma.member.update({
          where: { memberId: m.memberId },
          data: { publicId: candidate }
        });
        await prisma.user.updateMany({
          where: { username: m.memberId },
          data: { publicId: candidate }
        });
        migratedMembersCount++;
      }
    }
    report.publicIdMigration = `${migratedMembersCount} existing member/user accounts assigned public IDs.`;

    return NextResponse.json({
      success: true,
      message: 'Database setup completed successfully.',
      report
    });

  } catch (error) {
    console.error('[DB SETUP ERROR]:', error);
    return NextResponse.json(
      { success: false, message: 'Database setup failed.', error: error.message, report },
      { status: 500 }
    );
  }
}
