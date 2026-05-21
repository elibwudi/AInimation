import { jsonrepair } from 'jsonrepair';
import { createLogger } from '@/lib/logger';
const log = createLogger('Generation');

export function parseJsonResponse<T>(response: string): T | null {
  // Strategy 1: Try to extract JSON from markdown code blocks (may have multiple)
  const codeBlockMatches = response.matchAll(/```(?:json)?\s*([\s\S]*?)```/g);
  for (const match of codeBlockMatches) {
    const extracted = match[1].trim();
    if (extracted.startsWith('{') || extracted.startsWith('[')) {
      const result = tryParseJson<T>(extracted);
      if (result !== null) {
        log.debug('Successfully parsed JSON from code block');
        return result;
      }
    }
  }

  // Strategy 2: Try to find JSON structure directly in response (no code block)
  const jsonStartArray = response.indexOf('[');
  const jsonStartObject = response.indexOf('{');

  if (jsonStartArray !== -1 || jsonStartObject !== -1) {
    const startIndex =
      jsonStartArray === -1
        ? jsonStartObject
        : jsonStartObject === -1
          ? jsonStartArray
          : Math.min(jsonStartArray, jsonStartObject);

    let depth = 0;
    let endIndex = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = startIndex; i < response.length; i++) {
      const char = response[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '[' || char === '{') depth++;
        else if (char === ']' || char === '}') {
          depth--;
          if (depth === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    if (endIndex !== -1) {
      const jsonStr = response.substring(startIndex, endIndex + 1);
      const result = tryParseJson<T>(jsonStr);
      if (result !== null) {
        log.debug('Successfully parsed JSON from response body');
        return result;
      }
    }
  }

  // Strategy 3: Last resort - try the whole response
  const result = tryParseJson<T>(response.trim());
  if (result !== null) {
    log.debug('Successfully parsed raw response as JSON');
    return result;
  }

  log.error('Failed to parse JSON from response');
  log.error('Raw response (first 500 chars):', response.substring(0, 500));

  return null;
}

export function tryParseJson<T>(jsonStr: string): T | null {
  try {
    return JSON.parse(jsonStr) as T;
  } catch {}

  try {
    let fixed = jsonStr.replace(/"([^"]*?)"/g, (_match, content) => {
      const fixedContent = content.replace(/\\([a-zA-Z])/g, '\\\\$1');
      return `"${fixedContent}"`;
    });
    fixed = fixed.replace(/\\([^"\\/bfnrtu\n\r])/g, (match, char) => {
      if (/[a-zA-Z]/.test(char)) return '\\\\' + char;
      return match;
    });

    const trimmed = fixed.trim();
    if (trimmed.startsWith('[') && !trimmed.endsWith(']')) {
      const lastCompleteObj = fixed.lastIndexOf('}');
      if (lastCompleteObj > 0) fixed = fixed.substring(0, lastCompleteObj + 1) + ']';
    } else if (trimmed.startsWith('{') && !trimmed.endsWith('}')) {
      const openBraces = (fixed.match(/{/g) || []).length;
      const closeBraces = (fixed.match(/}/g) || []).length;
      if (openBraces > closeBraces) fixed += '}'.repeat(openBraces - closeBraces);
    }
    return JSON.parse(fixed) as T;
  } catch {}

  try {
    const repaired = jsonrepair(jsonStr);
    return JSON.parse(repaired) as T;
  } catch {}

  try {
    let fixed = jsonStr.replace(/[\x00-\x1F\x7F]/g, (char) => {
      switch (char) {
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '\t': return '\\t';
        default: return '';
      }
    });
    return JSON.parse(fixed) as T;
  } catch {
    return null;
  }
}
