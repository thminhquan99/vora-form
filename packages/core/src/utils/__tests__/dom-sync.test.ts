// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { serializeHtmlToTemplate } from '../dom-sync';

describe('serializeHtmlToTemplate', () => {
  beforeAll(() => {
    // Basic JSDOM setup for DOMParser if needed, 
    // but Vitest/Jest usually provide this in jsdom environment.
  });

  it('converts a simple vora-pill span to template syntax', () => {
    const html = '<span class="vora-pill" data-value="v1">@Var1</span>';
    expect(serializeHtmlToTemplate(html)).toBe('{{v1}}');
  });

  it('preserves plain text around pills', () => {
    const html = 'Hello <span class="vora-pill" data-value="user">@User</span>, how are you?';
    expect(serializeHtmlToTemplate(html)).toBe('Hello {{user}}, how are you?');
  });

  it('handles attribute reordering robustly', () => {
    // DOMParser should handle this regardless of string order
    const html = '<span data-value="v2" class="vora-pill">@Var2</span>';
    expect(serializeHtmlToTemplate(html)).toBe('{{v2}}');
  });

  it('converts <br> to newlines', () => {
    const html = 'Line 1<br>Line 2';
    expect(serializeHtmlToTemplate(html)).toBe('Line 1\nLine 2');
  });

  it('normalizes &nbsp; to spaces', () => {
    const html = 'Text&nbsp;with&nbsp;spaces';
    expect(serializeHtmlToTemplate(html)).toBe('Text with spaces');
  });

  it('handles nested block elements correctly', () => {
    const html = '<div>Line 1</div><div>Line 2</div>';
    // standard contenteditable behavior often wraps lines in divs
    expect(serializeHtmlToTemplate(html)).toBe('Line 1\nLine 2');
  });

  it('ignores other random HTML tags', () => {
    const html = '<b>Bold</b> <i>Italic</i> <script>alert(1)</script>';
    expect(serializeHtmlToTemplate(html)).toBe('Bold Italic alert(1)');
  });

  it('handles malicious data-value with template injection attempt', () => {
    // Attack: data-value="v1}} <script>alert(1)</script> {{v2"
    const html = '<span class="vora-pill" data-value="v1}} alert(1) {{v2">@Label</span>';
    const result = serializeHtmlToTemplate(html);
    
    // Should strip the '}}' from the value
    expect(result).toBe('{{v1 alert(1) {{v2}}');
  });
});

import { sanitizeText } from '../dom-sync';

describe('sanitizeText', () => {
  it('strips all HTML tags and returns clean text', () => {
    const html = '<b>Bold</b> <i>Italic</i> <script>alert(1)</script>';
    expect(sanitizeText(html)).toBe('Bold Italic alert(1)');
  });

  it('handles empty input', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('preserves text content of nested elements', () => {
    const html = '<div>Outer <span>Inner</span></div>';
    expect(sanitizeText(html)).toBe('Outer Inner');
  });
});
