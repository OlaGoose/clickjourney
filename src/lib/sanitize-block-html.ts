/**
 * Sanitize HTML from our block rich text editor for safe display.
 * Strips script, iframe, and event handlers; allows only editor-output tags.
 */
const ALLOWED_TAGS = new Set([
  'p', 'div', 'strong', 'em', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'span', 'br', 'a', 'img',
]);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  span: new Set(['style']), // for color
  p: new Set(['style']), // for text-align from editor
  div: new Set(['style']),
  h1: new Set(['style']),
  h2: new Set(['style']),
  h3: new Set(['style']),
  h4: new Set(['style']),
  h5: new Set(['style']),
  h6: new Set(['style']),
  img: new Set(['src', 'alt']),
};

function isSafeImgSrc(src: string): boolean {
  const s = src.trim();
  return s.startsWith('data:image/') || s.startsWith('https://');
}

/** Allow only text-align and color in style to prevent XSS while preserving editor formatting. */
function sanitizeStyle(style: string): string {
  if (!style || typeof style !== 'string') return '';
  const allowed: string[] = [];
  const parts = style.split(';').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const [prop, ...valueParts] = part.split(':').map((s) => s.trim());
    const value = valueParts.join(':').trim().toLowerCase();
    if (!prop || !value) continue;
    const propLower = prop.toLowerCase();
    if (propLower === 'text-align' && /^(left|right|center|justify)$/.test(value)) {
      allowed.push(`text-align: ${value}`);
    } else if (propLower === 'color' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
      allowed.push(`color: ${value}`);
    }
  }
  return allowed.join('; ');
}

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
    if (tag === 'img') {
      const src = el.getAttribute('src');
      if (!src || !isSafeImgSrc(src)) return '';
      const alt = (el.getAttribute('alt') || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      const safeSrc = src.replace(/"/g, '&quot;').replace(/</g, '&lt;');
      return `<img src="${safeSrc}" alt="${alt}">`;
    }
    const attrs = ALLOWED_ATTRS[tag];
    let out = '<' + tag;
    if (attrs && el.attributes) {
      for (let i = 0; i < el.attributes.length; i++) {
        const a = el.attributes[i];
        if (attrs.has(a.name.toLowerCase())) {
          const v =
            a.name.toLowerCase() === 'style'
              ? sanitizeStyle(a.value)
              : a.value.replace(/"/g, '&quot;').replace(/</g, '&lt;');
          if (v) out += ` ${a.name}="${v.replace(/"/g, '&quot;')}"`;
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
