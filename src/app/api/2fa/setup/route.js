import { handler, ok } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { generateSecret, buildEnrollment } from '@/lib/totp';

export const dynamic = 'force-dynamic';

// بدء تهيئة 2FA: ولّد سرّاً، احفظه (غير مفعّل بعد)، وأعد QR + الرابط لعرضه.
export const POST = handler(async () => {
  const user = await requireUser();
  const secret = generateSecret();
  await query('UPDATE users SET totp_secret = :s, totp_enabled = 0 WHERE id = :id', {
    s: secret,
    id: user.id,
  });
  const enrollment = await buildEnrollment(user.username, secret);
  return ok({ qrDataUrl: enrollment.qrDataUrl, otpauth: enrollment.otpauth, secret });
});
