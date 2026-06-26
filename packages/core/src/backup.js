// نسخ احتياطي لقاعدة بيانات مستأجر: نشغّل mysqldump *داخل* حاوية قاعدة البيانات
// عبر Docker exec (المقبس مركّب أصلاً لموارد المنصّة)، فنستخدم أداة MySQL الصحيحة
// ونتفادى مشاكل مصادقة عميل خارجي. الناتج يُعاد مضغوطاً (gzip).
import http from 'node:http';
import zlib from 'node:zlib';
import { dbConfig } from './config.js';

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

async function findDbContainerId() {
  const list = await sockJson('GET', '/containers/json');
  const c = list.find((x) => {
    const n = (x.Names[0] || '');
    return n.includes('pms-saas-db') || /(^|[-/])db([-_]|$)/.test(n);
  });
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
