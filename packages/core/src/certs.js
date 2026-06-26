// إصدار شهادات TLS للعملاء الجدد: الحاوية لا تملك صلاحيات المضيف لتشغيل
// certbot/nginx، فتكتب اسم المضيف في «طابور» (ملف على حجم مشترك)، وسكربت
// على المضيف (deploy/cert-worker.sh) يقرأه ويُصدر الشهادة ويُفرغ الطابور.
// أفضل جهد: إن لم يُضبط CERT_QUEUE_FILE أو فشلت الكتابة، يُتجاهل بصمت.
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { tenancyConfig } from './config.js';

export async function enqueueCertForSlug(slug) {
  const file = process.env.CERT_QUEUE_FILE;
  if (!file) return false;
  const root = tenancyConfig.rootDomain;
  if (!root || root === 'localhost') return false;   // لا شهادة محلياً
  const host = `${slug}.${root}`;
  try {
    await mkdir(dirname(file), { recursive: true });
    await appendFile(file, `${host}\n`, 'utf8');
    return host;
  } catch {
    return false;
  }
}
