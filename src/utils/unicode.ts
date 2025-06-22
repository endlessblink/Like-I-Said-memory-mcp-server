export function sanitizeUnicode(str: string): string {
  if (!str || typeof str !== 'string') return str;
  
  // Remove unpaired surrogates (high surrogate without low, or low without high)
  return str.replace(
    /([\uD800-\uDBFF])([^\uDC00-\uDFFF]|$)|([^\uD800-\uDBFF]|^)([\uDC00-\uDFFF])/g,
    (match, highSurrogate, afterHigh, beforeLow, lowSurrogate) => {
      // Keep the valid characters, remove the unpaired surrogates
      return (afterHigh || '') + (beforeLow || '');
    }
  );
}

// Backward compatibility alias
export const fixUnpairedSurrogates = sanitizeUnicode;

export function validateSurrogates(str: string): boolean {
  // Check for unpaired surrogates
  const unpairedSurrogates = /([\uD800-\uDBFF])([^\uDC00-\uDFFF]|$)|([^\uD800-\uDBFF]|^)([\uDC00-\uDFFF])/;
  return !unpairedSurrogates.test(str);
}

// Utility to safely slice strings without breaking Unicode characters
export function unicodeSafeSlice(str: string, start: number, end?: number): string {
  if (!str) return str;
  
  // Convert to array to handle surrogate pairs properly
  const chars = Array.from(str);
  return chars.slice(start, end).join('');
}

// Utility to get the real length of a string (counting Unicode characters, not code units)
export function unicodeLength(str: string): number {
  return Array.from(str).length;
}

export function safeStringify(obj: any, pretty: boolean = false): string | null {
  try {
    // Sanitize string values during stringification
    const replacer = (key: string, value: any): any => {
      if (typeof value === 'string') {
        return sanitizeUnicode(value);
      }
      return value;
    };
    
    // Use native JSON.stringify with UTF-8 support (ensure_ascii=false equivalent)
    return JSON.stringify(obj, replacer, pretty ? 2 : undefined);
  } catch (e) {
    console.error('Serialization error:', e);
    return null;
  }
}

// Safe JSON parse with Unicode validation
export function safeParse(jsonString: string): any | null {
  try {
    // First sanitize the string to remove unpaired surrogates
    const sanitized = sanitizeUnicode(jsonString);
    return JSON.parse(sanitized);
  } catch (e) {
    console.error('Parse error:', e);
    return null;
  }
}

// Validate string for proper Unicode encoding
export function isValidUnicode(str: string): boolean {
  return sanitizeUnicode(str) === str;
}