// Removes leftover data created by automated tests / smoke tests from the DEV database:
// every user whose email ends with "@test.lk", plus their businesses, services, bookings,
// messages, reviews and notifications. The real demo accounts (@fixmate.lk) are kept.
//
// Run: npm run db:clean-test            (shows what would be deleted)
//      npm run db:clean-test -- --yes   (actually deletes it)
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const TEST_EMAIL_SUFFIX = '@test.lk';
const confirmed = process.argv.includes('--yes');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL']! }),
});

async function main() {
  const testUsers = await prisma.user.findMany({
    where: { email: { endsWith: TEST_EMAIL_SUFFIX } },
    select: { id: true },
  });
  const userIds = testUsers.map((u) => u.id);
  // Bookings made BY a test customer or made WITH a test provider's business.
  const bookingWhere = { OR: [{ customerId: { in: userIds } }, { business: { ownerId: { in: userIds } } }] };
  const [bookings, businesses] = await Promise.all([
    prisma.booking.count({ where: bookingWhere }),
    prisma.business.count({ where: { ownerId: { in: userIds } } }),
  ]);

  console.log(`Test users (${TEST_EMAIL_SUFFIX}): ${userIds.length}`);
  console.log(`Businesses owned by them:   ${businesses}`);
  console.log(`Bookings involving them:    ${bookings}`);

  if (!userIds.length) return console.log('\nNothing to clean.');
  if (!confirmed) return console.log('\nDry run only. Run again with --yes to delete:  npm run db:clean-test -- --yes');

  await prisma.$transaction(async (tx) => {
    // Bookings first (their history, payment, review, messages are removed with them),
    // then the users (their business, services, tokens, addresses, notifications go with them).
    await tx.booking.deleteMany({ where: bookingWhere });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });
  console.log('\nDeleted. The demo accounts (@fixmate.lk) were not touched.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
