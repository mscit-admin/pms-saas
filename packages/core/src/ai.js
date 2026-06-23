import { getAiSettings } from './ai-settings.js';

// عميل ذكاء اصطناعي محايد للمزوّد: Anthropic (Claude) أو متوافق مع OpenAI.
export async function aiComplete({ system, user, maxTokens = 600 }) {
  const s = await getAiSettings();
  if (!s.enabled) throw new Error('ميزة الذكاء غير مفعّلة من الإعدادات');
  if (!s.apiKey) throw new Error('مفتاح الذكاء غير مضبوط');
  return s.provider === 'openai' ? openaiCall(s, system, user, maxTokens) : anthropicCall(s, system, user, maxTokens);
}

async function anthropicCall(s, system, user, maxTokens) {
  const res = await fetch(`${s.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': s.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: s.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) {
    const tx = await res.text().catch(() => '');
    throw new Error(`فشل طلب الذكاء ${res.status}: ${tx.slice(0, 300)}`);
  }
  const j = await res.json();
  return (j.content || []).map((b) => b.text || '').join('').trim();
}

async function openaiCall(s, system, user, maxTokens) {
  const res = await fetch(`${s.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${s.apiKey}` },
    body: JSON.stringify({ model: s.model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  if (!res.ok) {
    const tx = await res.text().catch(() => '');
    throw new Error(`فشل طلب الذكاء ${res.status}: ${tx.slice(0, 300)}`);
  }
  const j = await res.json();
  return (j.choices?.[0]?.message?.content || '').trim();
}
