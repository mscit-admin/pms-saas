import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { updateRole, deleteRole } from '@/lib/users';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req, { params }) => {
  await requirePermission('manage_roles');
  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  await updateRole(id, { name: body.name, description: body.description, permissions: body.permissions });
  return ok({ id });
});

export const DELETE = handler(async (req, { params }) => {
  await requirePermission('manage_roles');
  await deleteRole(Number(params.id));
  return ok({ id: Number(params.id) });
});
