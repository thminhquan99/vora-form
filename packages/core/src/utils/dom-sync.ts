/**
 * @module dom-sync
 * @description
 * Robust HTML to Template string sterilization utility.
 *
 * Replaces fragile Regex-based parsing with DOM tree walking to ensure
 * data integrity regardless of attribute ordering or browser-specific
 * HTML serialization differences.
 */

// Module-level DOMParser singleton to avoid expensive re-instantiation
let _parser: DOMParser | null = null;
function getParser(): DOMParser {
  if (!_parser) _parser = new DOMParser();
  return _parser;
}

/**
 * Extracts template data from a contenteditable HTML string.
 * Example: `<span class="vora-pill" data-value="v1">@Var</span>` -> `{{v1}}`
 *
 * @param html - The raw HTML from contenteditable
 * @returns A serialized template string
 */
export function serializeHtmlToTemplate(html: string): string {
  if (typeof window === 'undefined') return '';

  const parser = getParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  let result = '';

  /**
   * Recursive walker to preserve order and structure.
   */
  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || '';
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;

      // Handle Vora Pills
      if (el.classList.contains('vora-pill')) {
        const value = el.getAttribute('data-value');
        if (value) {
          // ── FIX: Harden against template injection ────────────────────────
          // If the value contains '}}', it could terminate the template tag 
          // prematurely or cause parsing issues. Strip it for safety.
          const cleanValue = value.replace(/\}\}/g, '');
          result += `{{${cleanValue}}}`;
          return; // Don't walk children of the pill (like @Label)
        }
      }

      // Handle Line Breaks
      if (el.tagName === 'BR') {
        result += '\n';
        return;
      }

      // Handle Divs/Paragraphs (often used as line wrappers in contenteditable)
      const isBlock = ['DIV', 'P'].includes(el.tagName);
      
      // If result is not empty and we are starting a block, add newline
      if (isBlock && result.length > 0 && !result.endsWith('\n')) {
        result += '\n';
      }

      // Recurse into children
      const children = Array.from(el.childNodes);
      
      // FIX: Robust newline normalization for Chrome/Safari contenteditable
      // browsers often wrap newlines in <div><br></div> or <div><span><br></span></div>.
      // If a block element contains ONLY a <br>, we treat it as a single newline.
      const isBrOnlyBlock = isBlock && children.length === 1 && (children[0] as HTMLElement).tagName === 'BR';
      
      if (isBrOnlyBlock) {
        result += '\n';
        return;
      }

      for (const child of children) {
        walk(child);
      }
    }
  }

  for (const child of Array.from(body.childNodes)) {
    walk(child);
  }

  // Normalize whitespaces: &nbsp; (\u00A0) -> ' '
  return result.replace(/\u00A0/g, ' ');
}

/**
 * Sanitizes raw text for use in spreadsheet cells.
 * Strips all HTML tags and returns clean text.
 */
export function sanitizeText(html: string): string {
  if (typeof window === 'undefined') return html;
  
  const parser = getParser();
  const doc = parser.parseFromString(html, 'text/html');
  return (doc.body.textContent || doc.body.innerText || '').trim();
}
