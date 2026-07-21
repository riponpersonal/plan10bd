import { PrismaClient } from '../app/lib/prisma-client/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding publicId columns if missing...');

  try {
    await prisma.$executeRawUnsafe("ALTER TABLE `User` ADD COLUMN `publicId` VARCHAR(191) NULL UNIQUE");
    console.log('  ✓ Added User.publicId');
  } catch (e) {
    console.log('  - User.publicId:', e.message.includes('Duplicate') ? 'already exists' : e.message);
  }

  try {
    await prisma.$executeRawUnsafe("ALTER TABLE `Member` ADD COLUMN `publicId` VARCHAR(191) NULL UNIQUE");
    console.log('  ✓ Added Member.publicId');
  } catch (e) {
    console.log('  - Member.publicId:', e.message.includes('Duplicate') ? 'already exists' : e.message);
  }

  console.log('Done fixing schema.');
  await prisma.$disconnect();
}

main().catch(console.error);
