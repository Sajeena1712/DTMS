import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting DTMS data seeding...');

  // Create Admin user (password: Admin@123)
  const adminHash = '$2a$10$9iHnpalvItLttJeCCm8t1uBs03aUrSuwzX3KI6aAsVMbRJqdo4KD6';
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dtms.com' },
    update: {
      password: adminHash,
      name: 'Admin User',
      role: 'ADMIN',
      emailVerified: true,
    },
    create: {
      email: 'admin@dtms.com',
      password: adminHash,
      name: 'Admin User',
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  console.log(`Admin user: ${admin.id}`);

  // Create demo user (password: user123)
const userHash = '$2a$10$qv.91gKIEiFDM3UUdm9GhujeJEAq043tZkSrQOrmYxVdCQv2uZ2nK';
  const demoUser = await prisma.user.upsert({
    where: { email: 'user@dtms.com' },
    update: {
      password: userHash,
      name: 'Demo User',
      role: 'USER',
      emailVerified: true,
    },
    create: {
      email: 'user@dtms.com',
      password: userHash,
      name: 'Demo User',
      role: 'USER',
      emailVerified: true,
    },
  });
  console.log(`Demo user: ${demoUser.id}`);

  // Clear existing tasks/applications
  await prisma.task.deleteMany();
  await prisma.application.deleteMany();
  console.log('Cleared existing data');

  // Seed Tasks (mixed status/priority)
  const tasks = await Promise.all([
    prisma.task.create({ data: { title: 'Complete DTMS Dashboard', description: 'Build responsive admin dashboard', status: 'PENDING', priority: 'HIGH', userId: admin.id } }),
    prisma.task.create({ data: { title: 'Setup Prisma MongoDB', description: 'Configure schema and seed data', status: 'COMPLETED', priority: 'HIGH', userId: admin.id } }),
    prisma.task.create({ data: { title: 'API Integration', description: 'Connect React contexts to Express routes', status: 'IN_PROGRESS', priority: 'MEDIUM', userId: demoUser.id } }),
    prisma.task.create({ data: { title: 'Job Application Tracker', description: 'CRUD for applications', status: 'PENDING', priority: 'MEDIUM', userId: demoUser.id } }),
    prisma.task.create({ data: { title: 'Auth System', description: 'JWT login/register with role guards', status: 'COMPLETED', priority: 'HIGH', userId: admin.id } }),
    prisma.task.create({ data: { title: 'Task Assignment Flow', description: 'Admin assigns tasks to users', status: 'PENDING', priority: 'LOW', userId: admin.id } }),
  ]);
  console.log(`Seeded ${tasks.length} tasks`);

  // Seed Applications
  await Promise.all([
    prisma.application.create({ data: { userId: demoUser.id, company: 'TechCorp', role: 'Frontend Dev', salary: '$80k', location: 'Remote', status: 'APPLIED', date: new Date() } }),
    prisma.application.create({ data: { userId: demoUser.id, company: 'StartupAI', role: 'Fullstack', salary: '$120k', location: 'NYC', status: 'INTERVIEW', date: new Date() } }),
    prisma.application.create({ data: { userId: demoUser.id, company: 'DevOps Inc', role: 'Senior Engineer', salary: '$140k', location: 'SF', status: 'SELECTED', date: new Date() } }),
    prisma.application.create({ data: { userId: demoUser.id, company: 'BetaSoft', role: 'React Developer', salary: '$70k', location: 'Remote', status: 'REJECTED', date: new Date() } }),
  ]);
  console.log('Seeded 4 applications');

  console.log('✅ Seeding complete! Demo logins: admin@dtms.com/Admin@123, user@dtms.com/user123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

