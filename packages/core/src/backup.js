// نسخ احتياطي لقاعدة بيانات مستأجر: نشغّل mysqldump *داخل* حاوية قاعدة البيانات
// عبر Docker exec (المقبس مركّب أصلاً لموارد المنصّة)، فنستخدم أداة MySQL الصحيحة
// ونتفادى مشاكل مصادقة عميل خارجي. الناتج يُعاد مضغوطاً (gzip).
import http from 'node:http';
import zlib from 'node:zlib';
import { mkdir, writeFile, readdir, unlink, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { dbConfig } from './config.js';
import { listActiveOrgs } from './tenancy.js';

const SOCK = process.env.DOCKER_SOCKET || '/var/run/docker.sock';

function sockRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      socketPath: SOCK, method, path, timeout: 120000,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('docker socket timeout')));
    if (data) req.write(data);
    req.end();
  });
}

async function sockJson(method, path, body) {
  const { status, buffer } = await sockRequest(method, path, body);
  const json = buffer.length ? JSON.parse(buffer.toString()) : {};
  if (status >= 400) throw new Error(json.message || `docker ${status}`);
  return json;
}

// فكّ التغليف متعدّد القنوات لتدفّق exec (إطارات: نوع + حجم + حمولة).
function demux(buf) {
  const out = []; const errs = [];
  let o = 0;
  while (o + 8 <= buf.length) {
    const type = buf[o];
    const size = buf.readUInt32BE(o + 4);
    const payload = buf.subarray(o + 8, o + 8 + size);
    (type === 2 ? errs : out).push(payload);
    o += 8 + size;
  }
  return { stdout: Buffer.concat(out), stderr: Buffer.concat(errs).toString() };
}

// اختيار دقيق لحاوية قاعدة بيانات المنصّة (المضيف قد يشغّل حاويات أخرى).
async function findDbContainerId() {
  const list = await sockJson('GET', '/containers/json');
  const byName = (sub) => list.find((x) => (x.Names || []).some((n) => n.includes(sub)));
  const want = process.env.DB_CONTAINER; // تجاوز اختياري (اسم أو معرّف)
  let c = null;
  if (want) c = byName(want) || list.find((x) => x.Id.startsWith(want));
  // اسم حاوية compose القياسي: <project>-db-1 (المشروع pms-saas)
  c = c || byName('pms-saas-db');
  // احتياط عبر وسوم compose: الخدمة db ضمن مشروع يحوي "pms"
  c = c || list.find((x) => x.Labels?.['com.docker.compose.service'] === 'db'
    && /pms/i.test(x.Labels?.['com.docker.compose.project'] || ''));
  return c?.Id || null;
}

// يرجع Buffer مضغوط (gzip) يحوي تفريغ SQL كامل لقاعدة المستأجر.
export async function dumpTenantDatabase(org) {
  if (!/^[a-z0-9_]+$/.test(org.dbName)) throw new Error('اسم قاعدة غير آمن');
  const dbId = await findDbContainerId();
  if (!dbId) throw new Error('حاوية قاعدة البيانات غير متاحة (تأكّد من تركيب docker.sock).');

  // نشغّل عبر sh مع مسار صريح (exec المباشر قد لا يضمّ /usr/bin)، ومع بديل
  // mariadb-dump إن لم يوجد mysqldump. اسم القاعدة مُتحقَّق منه ([a-z0-9_]).
  const args = `-uroot --single-transaction --quick --routines --events --default-character-set=utf8mb4 --no-tablespaces ${org.dbName}`;
  const script = `export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"; `
    + `if command -v mysqldump >/dev/null 2>&1; then exec mysqldump ${args}; `
    + `else exec mariadb-dump ${args}; fi`;
  const exec = await sockJson('POST', `/containers/${dbId}/exec`, {
    AttachStdout: true, AttachStderr: true, Tty: false,
    Env: [`MYSQL_PWD=${dbConfig.password}`], Cmd: ['sh', '-c', script],
  });
  const { buffer } = await sockRequest('POST', `/exec/${exec.Id}/start`, { Detach: false, Tty: false });
  const { stdout, stderr } = demux(buffer);
  const insp = await sockJson('GET', `/exec/${exec.Id}/json`);
  if (insp.ExitCode) throw new Error(stderr.trim() || `mysqldump exited ${insp.ExitCode}`);
  if (!stdout.length) throw new Error(stderr.trim() || 'تفريغ فارغ');
  return zlib.gzipSync(stdout);
}

// ============ النسخ الاحتياطي إلى التخزين (للجدولة التلقائية) ============
const SAFE = /^[a-z0-9_-]+$/;
const SAFE_FILE = /^[a-zA-Z0-9._-]+\.sql\.gz$/;

// نسخ قاعدة مستأجر إلى ملف داخل <dir>/<slug>/.
export async function backupTenantToDir(org, dir) {
  const gz = await dumpTenantDatabase(org);
  const tdir = join(dir, org.slug);
  await mkdir(tdir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = `${org.dbName}-${stamp}.sql.gz`;
  await writeFile(join(tdir, file), gz);
  return { file, size: gz.length };
}

// حذف النسخ الزائدة عن حدّ الاحتفاظ (الأقدم أولاً — الاسم يحوي طابعاً زمنياً مرتّباً).
export async function applyRetention(dir, slug, keep) {
  const tdir = join(dir, slug);
  let files;
  try { files = await readdir(tdir); } catch { return; }
  files = files.filter((f) => SAFE_FILE.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) {
    await unlink(join(tdir, f)).catch(() => {});
  }
}

// نسخ كل المستأجرين النشطين إلى التخزين مع تطبيق الاحتفاظ.
export async function backupAllTenants({ dir, retention = 8, log = () => {} }) {
  const orgs = await listActiveOrgs();
  const results = [];
  for (const org of orgs) {
    try {
      const r = await backupTenantToDir(org, dir);
      await applyRetention(dir, org.slug, retention);
      results.push({ slug: org.slug, ok: true, ...r });
      log(`✓ نسخة ${org.slug} (${r.size} bytes)`);
    } catch (e) {
      results.push({ slug: org.slug, ok: false, error: e.message });
      log(`✗ نسخة ${org.slug}: ${e.message}`);
    }
  }
  return results;
}

// سرد النسخ المخزّنة (لكل العملاء) — الأحدث أولاً.
export async function listStoredBackups(dir) {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const d of entries) {
    if (!d.isDirectory() || !SAFE.test(d.name)) continue;
    const tdir = join(dir, d.name);
    let files;
    try { files = await readdir(tdir); } catch { continue; }
    for (const f of files.filter((x) => SAFE_FILE.test(x))) {
      try { const s = await stat(join(tdir, f)); out.push({ slug: d.name, file: f, size: s.size, mtime: s.mtimeMs }); }
      catch { /* تخطّي */ }
    }
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out;
}

// مسار ملف نسخة مع تحقّق صارم (يمنع اجتياز المسار).
export function backupFilePath(dir, slug, file) {
  if (!SAFE.test(slug) || !SAFE_FILE.test(file)) return null;
  return join(dir, slug, file);
}
