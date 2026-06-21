// تحويل صيغة Atlassian (ADF) لنص عادي لعرض التعليقات.
export function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(adfToText).join('');
  let out = '';
  if (node.type === 'text') out += node.text || '';
  if (node.type === 'hardBreak') out += '\n';
  if (node.type === 'mention') out += node.attrs?.text || '';
  if (node.type === 'emoji') out += node.attrs?.shortName || '';
  if (node.content) out += adfToText(node.content);
  if (['paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock'].includes(node.type)) out += '\n';
  return out;
}
