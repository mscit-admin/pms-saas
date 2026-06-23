import { getAllSettings, setSetting } from './settings.js';

// إعدادات وحدة الذكاء الاصطناعي — قابلة للضبط من الإدارة (أي مزوّد + مفتاحه).
export async function getAiSettings() {
  const s = await getAllSettings();
  const provider = s.ai_provider || 'anthropic';
  const defBase = provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.anthropic.com';
  const defModel = provider === 'openai' ? 'gpt-4o-mini' : 'claude-opus-4-8';
  return {
    enabled: s.ai_enabled === '1' || s.ai_enabled === 1,
    provider,
    baseUrl: s.ai_base_url || defBase,
    apiKey: s.ai_api_key || process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY || '',
    model: s.ai_model || defModel,
  };
}

export async function saveAiSettings(i) {
  if (i.enabled !== undefined) await setSetting('ai_enabled', i.enabled ? 1 : 0);
  if (i.provider !== undefined) await setSetting('ai_provider', i.provider);
  if (i.baseUrl !== undefined) await setSetting('ai_base_url', String(i.baseUrl).replace(/\/+$/, ''));
  if (i.model !== undefined) await setSetting('ai_model', i.model);
  // المفتاح يُحدَّث فقط عند إرسال قيمة جديدة
  if (i.apiKey !== undefined && String(i.apiKey).trim() !== '') await setSetting('ai_api_key', i.apiKey);
}
