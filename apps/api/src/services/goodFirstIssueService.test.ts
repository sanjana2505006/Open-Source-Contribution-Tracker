import { describe, it, expect } from 'vitest';

// Agar languageQualifier function export nahi hai toh direct test ke liye mock ya re-declare kar sakte ho, 
// ya fir service ke methods ko test kar sakte ho. Yahan hum languageQualifier ke logic ko test kar rahe hain:
function languageQualifier(language: string): string {
  if (/\s+/.test(language)) {
    return `language:"${language.replace(/"/g, '')}"`;
  }
  return `language:${language}`;
}

describe('GoodFirstIssueService - languageQualifier', () => {
  it('should format languages without spaces correctly (e.g., C++)', () => {
    expect(languageQualifier('C++')).toBe('language:C++');
  });

  it('should format languages without spaces correctly (e.g., TypeScript)', () => {
    expect(languageQualifier('TypeScript')).toBe('language:TypeScript');
  });

  it('should wrap languages with spaces in quotes (e.g., Jupyter Notebook)', () => {
    expect(languageQualifier('Jupyter Notebook')).toBe('language:"Jupyter Notebook"');
  });

  it('should handle languages with multiple spaces correctly', () => {
    expect(languageQualifier('Visual Basic')).toBe('language:"Visual Basic"');
  });

  it('should handle special casing/symbols properly', () => {
    expect(languageQualifier('C#')).toBe('language:C#');
  });
});