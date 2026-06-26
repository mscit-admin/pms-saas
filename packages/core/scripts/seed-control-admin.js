#!/usr/bin/env node
// بذر/تحديث حساب مشرف أعلى في قاعدة التحكّم.
// التشغيل: npm run seed:control -- --user root --pass 'StrongPass'
// أو عبر البيئة: CONTROL_ADMIN_USER / CONTROL_ADMIN_PASSWORD
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const username = arg('user') || process.env.CONTROL_ADMIN_USER;
const password = arg('pass') || process.env.CONTROL_ADMIN_PASSWORD;

if (!username || !password) {
  console.error('✗ يلزم --user و --pass (أو CONTROL_ADMIN_USER/PASSWORD).');
  process.exit(1);
}

const { ensureControlSchema } = await import('../src/bootstrap.js');
const { seedControlAdmin } = await import('../src/control-auth.js');

try {
  await ensureControlSchema();
  await seedControlAdmin({ username, password });
  console.log(`✓ مشرف أعلى جاهز: ${username}`);
  process.exit(0);
} catch (err) {
  console.error('✗ فشل بذر المشرف:', err.message);
  process.exit(1);
}
