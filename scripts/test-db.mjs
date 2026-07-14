import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  console.log('🔍 Testing connection to the SQLite database...');
  try {
    const userCount = await prisma.user.count();
    const memberCount = await prisma.member.count();
    const applicationCount = await prisma.application.count();
    const payoutCount = await prisma.payout.count();
    
    console.log('✅ Database connection is OK!');
    console.log(`📊 Current SQL Database Statistics:`);
    console.log(`- Users: ${userCount}`);
    console.log(`- Members: ${memberCount}`);
    console.log(`- Applications: ${applicationCount}`);
    console.log(`- Payouts: ${payoutCount}`);
    
    const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
    if (admin) {
      console.log(`✅ Admin account query successful! Found: ${admin.name}`);
    } else {
      console.log(`⚠️ Warning: Admin account not found in the database.`);
    }

  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
