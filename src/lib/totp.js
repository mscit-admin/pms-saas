import { generateSecret as otpSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';

// التحقق الثنائي عبر TOTP (تطبيق مصادقة مثل Google Authenticator).
// otplib v13 — واجهة دالّية. tolerance: 1 يسمح بانزياح خطوة لمراعاة فروق الساعة.

const ISSUER = 'Jira Monitor';

export function generateSecret() {
  return otpSecret();
}

export function verifyToken(token, secret) {
  if (!token || !secret) return false;
  try {
    const res = verifySync({ token: String(token).trim(), secret, strategy: 'totp', tolerance: 1 });
    return !!res?.valid;
  } catch {
    return false;
  }
}

// رابط otpauth:// + صورة QR (data URL) لعرضها في الواجهة عند التهيئة
export async function buildEnrollment(username, secret) {
  const otpauth = generateURI({ strategy: 'totp', issuer: ISSUER, label: username, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauth);
  return { otpauth, qrDataUrl, secret };
}
