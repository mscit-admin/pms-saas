// موارد المنصّة (مشتركة بين كل العملاء): إحصاءات حاويات Docker + أداء خادم MySQL.
// Docker عبر مقبس يونكس (اختياري — يتطلّب تركيب /var/run/docker.sock في الحاوية).
import http from 'node:http';
import { getControlPool } from './control-db.js';

const SOCK = process.env.DOCKER_SOCKET || '/var/run/docker.sock';

function dockerGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ socketPath: SOCK, path, method: 'GET', timeout: 4000 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.end();
  });
}

function cpuPercent(s) {
  try {
    const cpuDelta = s.cpu_stats.cpu_usage.total_usage - s.precpu_stats.cpu_usage.total_usage;
    const sysDelta = s.cpu_stats.system_cpu_usage - s.precpu_stats.system_cpu_usage;
    const cpus = s.cpu_stats.online_cpus || (s.cpu_stats.cpu_usage.percpu_usage || []).length || 1;
    if (sysDelta > 0 && cpuDelta > 0) return (cpuDelta / sysDelta) * cpus * 100;
  } catch { /* ignore */ }
  return 0;
}

// موارد Docker الرئيسية: ملخّص المضيف (أنوية/ذاكرة/قرص/حاويات) + لكل حاوية.
// available=false إن لم يتوفّر المقبس.
export async function dockerStats() {
  let containers; let info;
  try { [containers, info] = await Promise.all([dockerGet('/containers/json'), dockerGet('/info')]); }
  catch { return { available: false }; }

  let df = null;
  try { df = await dockerGet('/system/df'); } catch { /* اختياري */ }

  const ours = containers.filter((c) => {
    const n = (c.Names[0] || '');
    return n.includes('pms-saas') || /(^|[-/])(db|api|worker|web|bootstrap)([-_]|$)/.test(n);
  });
  const out = [];
  for (const c of ours) {
    try {
      const s = await dockerGet(`/containers/${c.Id}/stats?stream=false`);
      const cache = s.memory_stats.stats?.cache || s.memory_stats.stats?.inactive_file || 0;
      const mem = (s.memory_stats.usage || 0) - cache;
      out.push({
        name: (c.Names[0] || '').replace(/^\//, ''),
        state: c.State,
        cpu: cpuPercent(s),
        mem,
        memLimit: s.memory_stats.limit || 0,
      });
    } catch { /* تخطّي حاوية */ }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));

  const totalCpu = out.reduce((a, c) => a + c.cpu, 0);
  const totalMem = out.reduce((a, c) => a + c.mem, 0);

  let disk = null;
  if (df) {
    const vol = (df.Volumes || []).reduce((a, x) => a + (x.UsageData?.Size > 0 ? x.UsageData.Size : 0), 0);
    const cont = (df.Containers || []).reduce((a, x) => a + (x.SizeRw || 0), 0);
    disk = (df.LayersSize || 0) + vol + cont;
  }

  const host = {
    cpus: info.NCPU || 0,
    memTotal: info.MemTotal || 0,
    containers: info.Containers || 0,
    running: info.ContainersRunning || 0,
    images: info.Images || 0,
    version: info.ServerVersion || '',
    os: info.OperatingSystem || '',
    disk,
  };

  return { available: true, host, containers: out, totalCpu, totalMem };
}

// أداء خادم MySQL (لكل القواعد — خادم واحد): اتصالات، QPS، buffer pool، استعلامات بطيئة.
export async function mysqlServerStats() {
  const [statusRows] = await getControlPool().query('SHOW GLOBAL STATUS');
  const st = {};
  for (const r of statusRows) st[r.Variable_name] = r.Value;
  const num = (k) => Number(st[k] || 0);
  const uptime = num('Uptime') || 1;
  const bpTotal = num('Innodb_buffer_pool_pages_total') || 1;
  const bpFree = num('Innodb_buffer_pool_pages_free');
  return {
    threadsConnected: num('Threads_connected'),
    threadsRunning: num('Threads_running'),
    qps: num('Queries') / uptime,
    uptime,
    slowQueries: num('Slow_queries'),
    bufferPoolUsedPct: ((bpTotal - bpFree) / bpTotal) * 100,
  };
}
