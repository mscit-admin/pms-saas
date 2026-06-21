// بناء مستند ADF من نص + إشارات (@) — يحوّل «@الاسم» لعقدة mention تُشعِر الشخص.
export function textToAdf(text, mentions = []) {
  const lines = String(text == null ? '' : text).split('\n');
  const content = lines.map((line) => {
    const nodes = lineToNodes(line, mentions);
    return nodes.length ? { type: 'paragraph', content: nodes } : { type: 'paragraph' };
  });
  return { type: 'doc', version: 1, content };
}

function lineToNodes(line, mentions) {
  if (!mentions || mentions.length === 0) return line ? [{ type: 'text', text: line }] : [];
  const nodes = [];
  let rest = line;
  while (rest.length) {
    let bestIdx = -1;
    let best = null;
    for (const m of mentions) {
      const tok = `@${m.display}`;
      const idx = rest.indexOf(tok);
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) { bestIdx = idx; best = { m, tok }; }
    }
    if (bestIdx === -1) { nodes.push({ type: 'text', text: rest }); break; }
    if (bestIdx > 0) nodes.push({ type: 'text', text: rest.slice(0, bestIdx) });
    nodes.push({ type: 'mention', attrs: { id: best.m.accountId, text: `@${best.m.display}` } });
    rest = rest.slice(bestIdx + best.tok.length);
  }
  return nodes.filter((n) => n.type !== 'text' || n.text !== '');
}

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
