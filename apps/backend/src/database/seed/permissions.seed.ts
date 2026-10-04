import { ulid } from 'ulid';
import { PERMISSIONS } from '@supermarket/shared';
import type pg from 'pg';

export async function seedPermissions(client: pg.PoolClient): Promise<Map<string, string>> {
  console.log('[Seed] Seeding permissions...');
  const permissionIdMap = new Map<string, string>(); // code -> id

  for (const [key, code] of Object.entries(PERMISSIONS)) {
    const parts = code.split('.');
    const module = parts[0] || 'general';
    const name = parts[1] ? parts[1].replace(/_/g, ' ') : code;

    // Check if permission already exists
    const existing = await client.query('SELECT id FROM permissions WHERE code = $1', [code]);
    if (existing.rows.length > 0) {
      permissionIdMap.set(code, existing.rows[0].id);
    } else {
      const id = ulid();
      await client.query(
        'INSERT INTO permissions (id, code, name, description, module) VALUES ($1, $2, $3, $4, $5)',
        [id, code, name, `Permission to ${name} for ${module}`, module],
      );
      permissionIdMap.set(code, id);
    }
  }

  console.log(`[Seed] Seeded ${permissionIdMap.size} permissions.`);
  return permissionIdMap;
}
