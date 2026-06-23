// جسر بين Express وبين معالجات Next المنقولة (التي تتعامل مع Web Request/Response).
// لكل طلب:
//   1) نبني Web Request من طلب Express (الترويسة/الجسم/المسار الكامل).
//   2) ننفّذ المعالج داخل سياق كوكي (cookieContext) كي تعمل المصادقة.
//   3) نحوّل Web Response الناتج إلى ردّ Express، مضيفين أي كوكيات مطلوبة.
import { cookieContext } from '@pms/core/cookies';

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function serializeCookie(name, value, opts = {}) {
  let s = `${name}=${encodeURIComponent(value)}`;
  s += `; Path=${opts.path || '/'}`;
  if (opts.httpOnly) s += '; HttpOnly';
  if (opts.sameSite) s += `; SameSite=${opts.sameSite[0].toUpperCase()}${opts.sameSite.slice(1)}`;
  if (opts.secure) s += '; Secure';
  if (opts.maxAge != null) {
    s += `; Max-Age=${opts.maxAge}`;
    const expires = new Date(Date.now() + opts.maxAge * 1000).toUTCString();
    s += `; Expires=${expires}`;
  }
  return s;
}

function buildRequest(req) {
  const host = req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const url = `${proto}://${host}${req.originalUrl}`;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    headers.set(k, Array.isArray(v) ? v.join(', ') : String(v));
  }

  const init = { method: req.method, headers };
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
    && Buffer.isBuffer(req.body) && req.body.length > 0;
  if (hasBody) {
    init.body = req.body;
    init.duplex = 'half';
  }
  return new Request(url, init);
}

async function writeResponse(webRes, res, setCookies) {
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return; // نتولّاها أدناه
    res.setHeader(key, value);
  });
  for (const c of setCookies) {
    res.append('Set-Cookie', serializeCookie(c.name, c.value, c.options));
  }
  const buf = Buffer.from(await webRes.arrayBuffer());
  res.end(buf);
}

// يحوّل معالج Next (req, { params }) إلى middleware من Express
export function toExpress(handlerFn) {
  return async (req, res, next) => {
    try {
      const request = buildRequest(req);
      const ctx = { reqCookies: parseCookies(req.headers.cookie), setCookies: [] };
      const webRes = await cookieContext.run(ctx, () => handlerFn(request, { params: req.params }));
      if (!webRes || typeof webRes.arrayBuffer !== 'function') {
        res.status(500).json({ ok: false, error: 'المعالج لم يُعِد ردّاً صالحاً' });
        return;
      }
      await writeResponse(webRes, res, ctx.setCookies);
    } catch (err) {
      next(err);
    }
  };
}
