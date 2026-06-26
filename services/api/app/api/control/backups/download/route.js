import { readFile } from 'node:fs/promises';
import { handler, fail } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { getBackupConfig } from '@/lib/backup-config';
import { backupFilePath } from '@/lib/backup';

export const dynamic = 'force-dynamic';

// تنزيل ملف نسخة مخزّن: /api/control/backups/download?slug=acme&file=...
export const GET = handler(async (req) => {
  await requireControlPermission('manage_tenants');
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') || '';
  const file = url.searchParams.get('file') || '';
  const cfg = await getBackupConfig();
  const path = backupFilePath(cfg.dir, slug, file);
  if (!path) return fail('طلب غير صالح', 400);
  let buf;
  try { buf = await readFile(path); } catch { return fail('الملف غير موجود', 404); }
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${file}"`,
      'Content-Length': String(buf.length),
      'Cache-Control': 'no-store',
    },
  });
});
