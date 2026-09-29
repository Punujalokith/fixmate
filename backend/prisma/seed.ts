// Fills the database with demo data. Safe to run many times (it skips what already exists).
// Run: npm run db:seed
//
// Demo logins (development only — change or remove before going live):
//   Admin     admin@fixmate.lk      Admin@12345
//   Customer  customer@fixmate.lk   Customer@123
//   Provider  provider@fixmate.lk   Provider@123   (Perera Plumbing, Colombo)
//   Other providers: <first-name>@fixmate.lk with password Provider@123
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient, type PriceType } from '../src/generated/prisma/client.js';

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

type ServiceSeed = { title: string; description: string; priceType: PriceType; price: number; durationMinutes: number };
type ProviderSeed = {
  email: string;
  fullName: string;
  phone: string;
  category: string;
  business: { name: string; description: string; city: string; district: string; addressLine: string; latitude: number; longitude: number; isVerified: boolean };
  services: ServiceSeed[];
};

const providers: ProviderSeed[] = [
  {
    email: 'provider@fixmate.lk', fullName: 'Nuwan Perera', phone: '+94771000001', category: 'plumbing',
    business: { name: 'Perera Plumbing Services', description: '15 years fixing leaks, blocked drains and bathroom fittings across Colombo. Same-day visits.', city: 'Colombo', district: 'Colombo', addressLine: '45 Galle Road, Colombo 03', latitude: 6.9022, longitude: 79.8531, isVerified: true },
    services: [
      { title: 'Leak detection & repair', description: 'Find and fix leaking taps, pipes and joints.', priceType: 'FIXED', price: 3500, durationMinutes: 60 },
      { title: 'Blocked drain clearing', description: 'Kitchen sink, bathroom and floor drains.', priceType: 'FIXED', price: 4500, durationMinutes: 90 },
      { title: 'Bathroom fitting installation', description: 'Taps, showers, toilets and washbasins.', priceType: 'HOURLY', price: 2500, durationMinutes: 120 },
    ],
  },
  {
    email: 'kasun@fixmate.lk', fullName: 'Kasun Jayasinghe', phone: '+94771000002', category: 'electrical',
    business: { name: 'Bright Spark Electricals', description: 'Licensed electricians for wiring, breakers, lights and ceiling fans.', city: 'Colombo', district: 'Colombo', addressLine: '12 Duplication Road, Colombo 04', latitude: 6.8905, longitude: 79.8566, isVerified: true },
    services: [
      { title: 'Breaker tripping diagnosis', description: 'Find the fault and make the circuit safe.', priceType: 'INSPECTION', price: 2000, durationMinutes: 60 },
      { title: 'Ceiling fan installation', description: 'Install or replace a ceiling fan with regulator.', priceType: 'FIXED', price: 3000, durationMinutes: 60 },
      { title: 'House rewiring (per room)', description: 'Safe modern wiring with new sockets and switches.', priceType: 'FIXED', price: 18000, durationMinutes: 480 },
    ],
  },
  {
    email: 'dilshan@fixmate.lk', fullName: 'Dilshan Fernando', phone: '+94771000003', category: 'ac-repair',
    business: { name: 'CoolAir AC Solutions', description: 'All brands of split and inverter ACs. Service, gas refill and repairs.', city: 'Negombo', district: 'Gampaha', addressLine: '88 Main Street, Negombo', latitude: 7.2083, longitude: 79.8358, isVerified: true },
    services: [
      { title: 'AC full service', description: 'Indoor and outdoor unit cleaning, filter wash, performance check.', priceType: 'FIXED', price: 5500, durationMinutes: 90 },
      { title: 'AC gas refill (R32/R410)', description: 'Leak test and gas top-up.', priceType: 'FIXED', price: 9500, durationMinutes: 90 },
      { title: 'AC not cooling – inspection', description: 'Diagnose the problem; repair quoted on site.', priceType: 'INSPECTION', price: 2500, durationMinutes: 60 },
    ],
  },
  {
    email: 'ruwan@fixmate.lk', fullName: 'Ruwan Wickramasinghe', phone: '+94771000004', category: 'appliance-repair',
    business: { name: 'HomeFix Appliance Care', description: 'Washing machines, fridges, microwaves and rice cookers repaired at your home.', city: 'Kandy', district: 'Kandy', addressLine: '5 Peradeniya Road, Kandy', latitude: 7.2906, longitude: 80.6337, isVerified: false },
    services: [
      { title: 'Washing machine repair', description: 'Noise, not spinning, not draining, door lock issues.', priceType: 'INSPECTION', price: 2500, durationMinutes: 90 },
      { title: 'Refrigerator repair', description: 'Not cooling, ice build-up, strange noises.', priceType: 'INSPECTION', price: 3000, durationMinutes: 90 },
    ],
  },
  {
    email: 'sanduni@fixmate.lk', fullName: 'Sanduni Silva', phone: '+94771000005', category: 'cleaning',
    business: { name: 'Sparkle Home Cleaning', description: 'Trained, background-checked cleaning teams with eco-friendly products.', city: 'Colombo', district: 'Colombo', addressLine: '210 Havelock Road, Colombo 05', latitude: 6.8826, longitude: 79.8687, isVerified: true },
    services: [
      { title: 'Deep home cleaning (2-3 bedrooms)', description: 'Kitchen, bathrooms, floors, windows and dusting.', priceType: 'FIXED', price: 12000, durationMinutes: 300 },
      { title: 'Sofa & carpet shampoo', description: 'Steam cleaning for sofas and carpets.', priceType: 'FIXED', price: 6500, durationMinutes: 120 },
    ],
  },
  {
    email: 'chaminda@fixmate.lk', fullName: 'Chaminda Rathnayake', phone: '+94771000006', category: 'carpentry',
    business: { name: 'WoodCraft Carpentry', description: 'Door and window repairs, custom cupboards and furniture fixing.', city: 'Galle', district: 'Galle', addressLine: '3 Wakwella Road, Galle', latitude: 6.0535, longitude: 80.221, isVerified: false },
    services: [
      { title: 'Door & lock repair', description: 'Sticking doors, broken hinges and lock replacement.', priceType: 'FIXED', price: 3500, durationMinutes: 60 },
      { title: 'Furniture repair', description: 'Chairs, tables, beds and cupboards.', priceType: 'HOURLY', price: 2000, durationMinutes: 120 },
    ],
  },
  {
    email: 'tharindu@fixmate.lk', fullName: 'Tharindu Bandara', phone: '+94771000007', category: 'painting',
    business: { name: 'ColourPro Painters', description: 'Interior and exterior painting with damp-proof treatment.', city: 'Kandy', district: 'Kandy', addressLine: '77 Katugastota Road, Kandy', latitude: 7.3057, longitude: 80.6331, isVerified: true },
    services: [
      { title: 'Room painting (up to 150 sq ft)', description: 'Two coats, walls and ceiling, materials included.', priceType: 'FIXED', price: 22000, durationMinutes: 480 },
      { title: 'Damp wall treatment', description: 'Inspection and waterproofing for damp or peeling walls.', priceType: 'INSPECTION', price: 3000, durationMinutes: 60 },
    ],
  },
  {
    email: 'ishara@fixmate.lk', fullName: 'Ishara Gunawardena', phone: '+94771000008', category: 'pest-control',
    business: { name: 'SafeGuard Pest Control', description: 'Termite, cockroach, rodent and mosquito treatment, safe for children and pets.', city: 'Colombo', district: 'Colombo', addressLine: '19 Nawala Road, Rajagiriya', latitude: 6.9063, longitude: 79.8962, isVerified: true },
    services: [
      { title: 'Termite treatment', description: 'Soil and wood treatment with 1-year warranty.', priceType: 'INSPECTION', price: 3500, durationMinutes: 120 },
      { title: 'Cockroach & ant control', description: 'Gel and spray treatment for the whole house.', priceType: 'FIXED', price: 7500, durationMinutes: 90 },
    ],
  },
];

// Mon–Sat 8:00–18:00
const WEEKDAY_HOURS = [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, startMinute: 8 * 60, endMinute: 18 * 60 }));

const reviewComments = [
  { rating: 5, comment: 'Arrived on time and fixed everything quickly. Highly recommend!' },
  { rating: 5, comment: 'Very professional and explained the problem clearly.' },
  { rating: 4, comment: 'Good work, slightly late but called ahead to let me know.' },
  { rating: 5, comment: 'Clean work and fair price. Will book again.' },
];

async function upsertUser(email: string, password: string, data: { fullName: string; phone?: string; role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({ data: { email, passwordHash: await bcrypt.hash(password, 10), ...data } });
}

async function main() {
  // Categories
  for (const [index, category] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { ...category, sortOrder: index },
      create: { ...category, sortOrder: index },
    });
  }
  const categoryBySlug = new Map((await prisma.category.findMany()).map((c) => [c.slug, c]));

  // People
  await upsertUser('admin@fixmate.lk', process.env['SEED_ADMIN_PASSWORD'] || 'Admin@12345', { fullName: 'FixMate Admin', role: 'ADMIN' });
  const customer = await upsertUser('customer@fixmate.lk', 'Customer@123', { fullName: 'Amaya Wijesinghe', phone: '+94770000001', role: 'CUSTOMER' });
  if ((await prisma.address.count({ where: { userId: customer.id } })) === 0) {
    await prisma.address.create({
      data: { userId: customer.id, label: 'Home', line1: '27 Flower Road', line2: 'Colombo 07', city: 'Colombo', district: 'Colombo', latitude: 6.9108, longitude: 79.8612, isDefault: true },
    });
  }

  // Providers, businesses, services, working hours
  const createdServices: { id: string; businessId: string; title: string; priceType: PriceType; price: number }[] = [];
  for (const p of providers) {
    const owner = await upsertUser(p.email, 'Provider@123', { fullName: p.fullName, phone: p.phone, role: 'PROVIDER' });
    const business =
      (await prisma.business.findUnique({ where: { ownerId: owner.id } })) ??
      (await prisma.business.create({ data: { ...p.business, ownerId: owner.id, phone: p.phone } }));
    if ((await prisma.availabilitySlot.count({ where: { businessId: business.id } })) === 0) {
      await prisma.availabilitySlot.createMany({ data: WEEKDAY_HOURS.map((s) => ({ ...s, businessId: business.id })) });
    }
    for (const s of p.services) {
      const service =
        (await prisma.service.findFirst({ where: { businessId: business.id, title: s.title } })) ??
        (await prisma.service.create({ data: { ...s, businessId: business.id, categoryId: categoryBySlug.get(p.category)!.id } }));
      createdServices.push({ id: service.id, businessId: business.id, title: service.title, priceType: service.priceType, price: Number(service.price) });
    }
  }

  // Past completed jobs with reviews, so ratings and dashboards have data
  if ((await prisma.booking.count({ where: { customerId: customer.id } })) === 0) {
    const firstServicePerBusiness = [...new Map(createdServices.map((s) => [s.businessId, s])).values()];
    for (const [i, service] of firstServicePerBusiness.entries()) {
      const review = reviewComments[i % reviewComments.length];
      const scheduledAt = new Date(Date.now() - (i + 3) * 24 * 60 * 60 * 1000);
      scheduledAt.setUTCHours(4, 30, 0, 0); // 10:00 Sri Lanka time
      const completedAt = new Date(scheduledAt.getTime() + 2 * 60 * 60 * 1000);
      await prisma.booking.create({
        data: {
          code: `FM-DEMO${String(i + 1).padStart(2, '0')}`,
          customerId: customer.id,
          businessId: service.businessId,
          serviceId: service.id,
          status: 'COMPLETED',
          scheduledAt,
          serviceTitle: service.title,
          priceType: service.priceType,
          price: service.price,
          addressLine: '27 Flower Road, Colombo 07',
          city: 'Colombo',
          acceptedAt: new Date(scheduledAt.getTime() - 20 * 60 * 60 * 1000),
          startedAt: scheduledAt,
          completedAt,
          createdAt: new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000),
          statusHistory: {
            create: [
              { fromStatus: null, toStatus: 'PENDING', changedById: customer.id },
              { fromStatus: 'PENDING', toStatus: 'ACCEPTED' },
              { fromStatus: 'ACCEPTED', toStatus: 'IN_PROGRESS' },
              { fromStatus: 'IN_PROGRESS', toStatus: 'COMPLETED' },
            ],
          },
          payment: { create: { amount: service.price, method: 'CASH', status: 'PAID', paidAt: completedAt } },
          review: { create: { customerId: customer.id, businessId: service.businessId, rating: review.rating, comment: review.comment } },
        },
      });
    }

    // Update each business's rating and job count from the data we just added
    for (const businessId of new Set(createdServices.map((s) => s.businessId))) {
      const stats = await prisma.review.aggregate({ where: { businessId, isHidden: false }, _avg: { rating: true }, _count: { _all: true } });
      const jobs = await prisma.booking.count({ where: { businessId, status: 'COMPLETED' } });
      await prisma.business.update({
        where: { id: businessId },
        data: { ratingAvg: Math.round((stats._avg.rating ?? 0) * 10) / 10, ratingCount: stats._count._all, completedJobs: jobs },
      });
    }
  }

  console.log(`Seeded ${categories.length} categories, ${providers.length} providers, ${createdServices.length} services`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
