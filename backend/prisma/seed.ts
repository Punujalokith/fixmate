// Fills the database with starter data. Safe to run many times (uses upsert).
// Run: npx prisma db seed
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL']! }),
});

const categories = [
  { name: 'Plumbing', slug: 'plumbing', icon: 'water', description: 'Leaks, pipes, taps, bathroom and kitchen fittings' },
  { name: 'Electrical', slug: 'electrical', icon: 'flash', description: 'Wiring, sockets, lights, breakers and fans' },
  { name: 'AC Repair', slug: 'ac-repair', icon: 'snow', description: 'Air conditioner service, gas refill and repairs' },
  { name: 'Appliance Repair', slug: 'appliance-repair', icon: 'construct', description: 'Washing machines, fridges, ovens and more' },
  { name: 'Cleaning', slug: 'cleaning', icon: 'sparkles', description: 'Home, office and deep cleaning' },
  { name: 'Carpentry', slug: 'carpentry', icon: 'hammer', description: 'Furniture repair, doors, windows and cabinets' },
  { name: 'Painting', slug: 'painting', icon: 'color-palette', description: 'Interior and exterior painting' },
  { name: 'Pest Control', slug: 'pest-control', icon: 'bug', description: 'Termites, cockroaches, rodents and mosquitoes' },
];

async function main() {
  for (const [index, category] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { ...category, sortOrder: index },
      create: { ...category, sortOrder: index },
    });
  }
  console.log(`Seeded ${categories.length} categories`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
