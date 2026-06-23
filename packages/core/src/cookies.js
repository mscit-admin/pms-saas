// سياق كوكي مستقلّ عن إطار العمل (بديل next/headers).
//
// تشغيلياً: خدمة الـ API (Express) تُغلِّف كل طلب داخل cookieContext.run({...})
// مزوّدةً بكوكيات الطلب وقائمة لجمع الكوكيات المراد ضبطها في الردّ.
// خارج سياق طلب (سكربتات Node / العامل) تكون القيم فارغة بأمان.

import { AsyncLocalStorage } from 'node:async_hooks';

export const cookieContext = new AsyncLocalStorage();

// قراءة قيمة كوكي من الطلب الحالي (أو undefined)
export function getRequestCookie(name) {
  const store = cookieContext.getStore();
  return store?.reqCookies?.[name];
}

// تسجيل كوكي ليُضاف إلى ردّ الطلب الحالي
export function queueResponseCookie(name, value, options = {}) {
  const store = cookieContext.getStore();
  if (store?.setCookies) store.setCookies.push({ name, value, options });
}
