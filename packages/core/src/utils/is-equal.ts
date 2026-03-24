/**
 * Recursively asserts deep equality between two values.
 * Strictly escapes complex DOM objects and Binary streams to prevent cyclical crashes.
 */
export function isDeepEqual(a: any, b: any, depth = 0): boolean {
  // Fast path: Exact same reference
  if (a === b) return true;

  // Type mismatch or Falsy differences
  if (a === null || b === null || a === undefined || b === undefined) return a === b;
  if (typeof a !== typeof b) return false;

  // Depth Limit (prevents adversarial cyclic memory blowouts)
  if (depth > 10) return false;

  // Date Check
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // 🔴 CRITICAL DOM & BINARY BAILOUTS
  // Heavy DOM instances or Binary streams map to cyclical references.
  // We strictly rely on the fast path (a === b) above. If they are different references,
  // we refuse to traverse them and immediately return false.
  if (
    typeof window !== 'undefined' &&
    (
      a instanceof File ||
      b instanceof File ||
      a instanceof FileList ||
      b instanceof FileList ||
      a instanceof Blob ||
      b instanceof Blob ||
      a instanceof HTMLElement ||
      b instanceof HTMLElement ||
      (typeof MediaStream !== 'undefined' && (a instanceof MediaStream || b instanceof MediaStream))
    )
  ) {
    return false; // They failed the a === b check upfront
  }

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i], depth + 1)) return false;
    }
    return true;
  }

  // Plain Objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!isDeepEqual(a[key], b[key], depth + 1)) return false;
    }
    return true;
  }

  return false;
}
