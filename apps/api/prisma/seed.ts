import bcrypt from 'bcryptjs';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123', 12);

  const organization = await prisma.organization.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000001'
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Geora Demo Co',
      industry: 'Field Services'
    }
  });

  const manager = await prisma.user.upsert({
    where: {
      email: 'manager@geora.test'
    },
    update: {},
    create: {
      name: 'Demo Manager',
      email: 'manager@geora.test',
      passwordHash,
      role: 'MANAGER',
      organizationId: organization.id
    }
  });

  const employee = await prisma.user.upsert({
    where: {
      email: 'employee@geora.test'
    },
    update: {},
    create: {
      name: 'Demo Employee',
      email: 'employee@geora.test',
      passwordHash,
      role: 'EMPLOYEE',
      organizationId: organization.id
    }
  });

  await prisma.task.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000101'
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      title: 'Inspect storefront signage',
      description: 'Visit the assigned location, inspect sign placement, and capture proof from the storefront.',
      priority: 'HIGH',
      assignedToId: employee.id,
      assignedById: manager.id,
      organizationId: organization.id
    }
  });

  console.log('Seed complete');
  console.log('Manager: manager@geora.test / Password123');
  console.log('Employee: employee@geora.test / Password123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

