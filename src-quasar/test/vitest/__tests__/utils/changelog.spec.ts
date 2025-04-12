import { describe, it, expect } from 'vitest';
import { tokenizeChangelogLine } from 'src/utils/changelog';

/**
 * The tokenizer should:
 * - pick up the category before " -"
 * - pick up ALL-CAPS keywords like FX and C-1
 * - preserve the remaining text as plain tokens and keep ordering
 */
describe('tokenizeChangelogLine', () => {
  it('extracts category, uppercase keywords and plain text in order', () => {
    const line = 'MIDI ROUTER - Added FX and C-1 mapping';
    const tokens = tokenizeChangelogLine(line);

    // Contains category token at the start
    const category = tokens.find(t => t.type === 'category');
    expect(category?.value).toBe('MIDI ROUTER');
    expect(category?.start).toBe(0);

    // Contains uppercase keyword tokens
    const fx = tokens.find(t => t.type === 'keyword' && t.value === 'FX');
    const c1 = tokens.find(t => t.type === 'keyword' && t.value === 'C-1');
    expect(fx).toBeTruthy();
    expect(c1).toBeTruthy();

    // Contains some plain text segments
    const plains = tokens.filter(t => t.type === 'plain');
    expect(plains.length).toBeGreaterThan(0);

    // Tokens are sorted by position (defensively handle unchecked indexed access)
    const first = tokens.at(0);
    if (first) {
      let prevStart = first.start;
      for (let i = 1; i < tokens.length; i++) {
        const curr = tokens[i];
        if (!curr) continue;
        expect(curr.start).toBeGreaterThanOrEqual(prevStart);
        prevStart = curr.start;
      }
    }
  });
});

