// موجّه قائم على نظام الملفات — يكتشف كل ملفات app/api/**/route.js ويُسجّلها
// تلقائياً في Express، بنفس اصطلاح Next:
//   app/api/tickets/[key]/route.js  →  /api/tickets/:key
// فيُهاجَر مسارات الـ API كاملةً دون تعداد يدويّ.
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { toExpress } from './adapter.js';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name === 'route.js') acc.push(full);
  }
  return acc;
}

// app/api/companies/[id] → /api/companies/:id
function toUrlPath(apiDir, file) {
  const rel = relative(apiDir, file).replace(/route\.js$/, '');
  const segs = rel.split(sep).filter(Boolean)
    .map((s) => s.replace(/^\[(\.\.\.)?(.+)\]$/, ':$2'));
  return `/api/${segs.join('/')}`.replace(/\/+$/, '') || '/api';
}

// المسارات الثابتة قبل المتغيّرة (كي يفوز /companies/assign على /companies/:id)
function sortKey(p) {
  return p.split('/').map((s) => (s.startsWith(':') ? '￿' : s)).join('/');
}

export async function registerRoutes(app, apiDir) {
  const files = walk(apiDir);
  const routes = files
    .map((file) => ({ file, urlPath: toUrlPath(apiDir, file) }))
    .sort((a, b) => sortKey(a.urlPath).localeCompare(sortKey(b.urlPath)));

  const registered = [];
  for (const { file, urlPath } of routes) {
    const mod = await import(pathToFileURL(file).href);
    for (const method of METHODS) {
      const fn = mod[method];
      if (typeof fn === 'function') {
        app[method.toLowerCase()](urlPath, toExpress(fn));
        registered.push(`${method} ${urlPath}`);
      }
    }
  }
  return registered;
}
