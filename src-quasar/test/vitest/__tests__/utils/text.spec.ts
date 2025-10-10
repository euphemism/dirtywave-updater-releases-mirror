import { describe, it, expect } from 'vitest';
import { formatDuration } from 'src/utils/text';

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(7_000)).toBe('07s');
  });
  it('formats minutes and seconds', () => {
    expect(formatDuration(65_000)).toBe('01m 05s');
  });
  it('formats hours, minutes and seconds', () => {
    expect(formatDuration(3 * 3_600_000 + 2 * 60_000 + 9_000)).toBe('03h 02m 09s');
  });
  it('formats days, hours, minutes and seconds', () => {
    expect(formatDuration(2 * 24 * 3_600_000 + 1 * 3_600_000 + 2 * 60_000 + 9_000)).toBe('2d 01h 02m 09s');
  });
});

