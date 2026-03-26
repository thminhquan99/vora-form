export function unflattenDotNotation(
  flat: Record<string, unknown>,
  options: { compact?: boolean } = { compact: true }
): Record<string, unknown> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let current = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        current[part] = value;
      } else {
        const nextPart = parts[i + 1];
        // If the next part is a number, we create an array
        // (unless it's an empty string or spaces which parse as 0, but keys shouldn't have empty segments usually)
        // A strictly safer check is regex /^\d+$/
        const nextIsArrayIndex = /^\d+$/.test(nextPart);

        if (current[part] === undefined) {
          current[part] = nextIsArrayIndex ? [] : {};
        }

        current = current[part];
      }
    }
  }

  function compactArrays(obj: Record<string, any>): void {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (Array.isArray(val)) {
        // Remove undefined slots from sparse arrays
        obj[key] = val.filter((v: unknown) => v !== undefined);
        // Recurse into each item
        for (const item of obj[key]) {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            compactArrays(item);
          }
        }
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        compactArrays(val);
      }
    }
  }

  if (options.compact !== false) {
    compactArrays(result);
  }
  return result;
}
