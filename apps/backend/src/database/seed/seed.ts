import { getPgPool, closePgConnection } from '../connection.js';
import { seedPermissions } from './permissions.seed.js';
import { seedRoles } from './roles.seed.js';
import { seedDemoData } from './demo-data.seed.js';

export async function runSeed(): Promise<void> {
  const pool = getPgPool();
  const client = await pool.connect();

  try {
    console.log('[Seed] Starting database seeding...');
    await client.query('BEGIN');

    // 1. Seed Permissions
    const permissionIdMap = await seedPermissions(client);

    // 2. Seed System Roles and Role-Permission mappings
    const roleIdMap = await seedRoles(client, permissionIdMap);

    // 3. Seed Demo Tenant (Company, Branch, POS, Admin, Cashier, Products, Inventory)
    await seedDemoData(client, roleIdMap);

    await client.query('COMMIT');
    console.log('[Seed] Database seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed] Database seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// When run directly as a script via `tsx src/database/seed/seed.ts`
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .then(async () => {
      await closePgConnection();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed] Fatal error:', err);
      await closePgConnection();
      process.exit(1);
    });
}
