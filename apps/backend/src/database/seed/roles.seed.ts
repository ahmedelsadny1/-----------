import { ulid } from 'ulid';
import { SYSTEM_ROLES, ROLE_DEFAULT_PERMISSIONS, type SystemRole } from '@supermarket/shared';
import type pg from 'pg';

export async function seedRoles(
  client: pg.PoolClient,
  permissionIdMap: Map<string, string>,
): Promise<Map<string, string>> {
  console.log('[Seed] Seeding system roles and role-permission mappings...');
  const roleIdMap = new Map<string, string>(); // roleName -> id

  for (const [key, roleName] of Object.entries(SYSTEM_ROLES)) {
    const existing = await client.query('SELECT id FROM roles WHERE name = $1 AND is_system = TRUE', [
      roleName,
    ]);

    let roleId: string;
    if (existing.rows.length > 0) {
      roleId = existing.rows[0].id;
    } else {
      roleId = ulid();
      await client.query(
        'INSERT INTO roles (id, name, description, is_system, is_active) VALUES ($1, $2, $3, TRUE, TRUE)',
        [roleId, roleName, `System default role for ${roleName}`],
      );
    }
    roleIdMap.set(roleName, roleId);

    // Map default permissions
    const permissionsForRole = ROLE_DEFAULT_PERMISSIONS[roleName as SystemRole] || [];
    for (const permCode of permissionsForRole) {
      const permId = permissionIdMap.get(permCode);
      if (permId) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [roleId, permId],
        );
      }
    }
  }

  console.log(`[Seed] Seeded ${roleIdMap.size} system roles with permissions.`);
  return roleIdMap;
}
