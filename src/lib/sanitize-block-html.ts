/**
 * Sanitize HTML from our block rich text editor for safe display.
 * Strips script, iframe, and event handlers; allows only editor-output tags.
 */
const ALLOWED_TAGS = new Set([
  'p', 'div', 'strong', 'em', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'span', 'br', 'a',
]);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  span: new Set(['style']), // for color
};

/** Strip script/iframe and on* attributes when DOM is not available (e.g. SSR). */
function stripDangerousBasic(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\s+on\w+=["'][^"']*["']/gi, '');
}

export function sanitizeBlockHtml(html: string): string {
  if (!html) return html;
  if (typeof document === 'undefined') return stripDangerousBasic(html);
  const div = document.createElement('div');
  div.innerHTML = html;

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').replace(/</g, '&lt;');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return el.textContent || '';
    if (tag === 'br') return '<br>';
    const attrs = ALLOWED_ATTRS[tag];
    let out = '<' + tag;
    if (attrs && el.attributes) {
      for (let i = 0; i < el.attributes.length; i++) {
        const a = el.attributes[i];
        if (attrs.has(a.name.toLowerCase())) {
          const v = a.value.replace(/"/g, '&quot;').replace(/</g, '&lt;');
          out += ` ${a.name}="${v}"`;
        }
      }
    }
    out += '>';
    for (let i = 0; i < el.childNodes.length; i++) out += walk(el.childNodes[i]);
    return out + '</' + tag + '>';
  }

  let result = '';
  for (let i = 0; i < div.childNodes.length; i++) result += walk(div.childNodes[i]);
  return result;
}
