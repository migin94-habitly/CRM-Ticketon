import { describe, it, expect, vi } from 'vitest';
import {
  formatCurrency,
  formatDuration,
  formatDate,
  initials,
  priorityColor,
  statusColor,
  timeAgo,
} from './format';

// ── formatCurrency ────────────────────────────────────────────────────────────
describe('formatCurrency', () => {
  it('formats KZT by default', () => {
    const result = formatCurrency(150000);
    expect(result).toContain('150');
    expect(result).toContain('000');
  });

  it('formats zero correctly', () => {
    const result = formatCurrency(0);
    expect(result).toMatch(/0/);
  });

  it('formats USD currency', () => {
    const result = formatCurrency(1000, 'USD');
    expect(result).toContain('1');
    expect(result).toContain('000');
  });

  it('formats negative value', () => {
    const result = formatCurrency(-500);
    expect(result).toMatch(/-|−/); // minus sign
  });
});

// ── formatDuration ────────────────────────────────────────────────────────────
describe('formatDuration', () => {
  it('shows seconds for values under 60', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(59)).toBe('59s');
  });

  it('shows minutes for values 60–3599', () => {
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(90)).toBe('1m');
    expect(formatDuration(3599)).toBe('59m');
  });

  it('shows hours only when no remainder minutes', () => {
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(7200)).toBe('2h');
  });

  it('shows hours and minutes when remainder exists', () => {
    expect(formatDuration(3660)).toBe('1h 1m');
    expect(formatDuration(5400)).toBe('1h 30m');
  });
});

// ── formatDate ────────────────────────────────────────────────────────────────
describe('formatDate', () => {
  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatDate('2024-06-15T00:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes the year', () => {
    const result = formatDate('2024-01-01T00:00:00.000Z');
    expect(result).toContain('2024');
  });
});

// ── initials ──────────────────────────────────────────────────────────────────
describe('initials', () => {
  it('returns uppercase first letters', () => {
    expect(initials('ivan', 'petrov')).toBe('IP');
  });

  it('handles already uppercase input', () => {
    expect(initials('Anna', 'Smirnova')).toBe('AS');
  });

  it('handles empty strings gracefully', () => {
    const result = initials('', '');
    expect(result).toBe('');
  });

  it('handles single character names', () => {
    expect(initials('A', 'B')).toBe('AB');
  });
});

// ── priorityColor ─────────────────────────────────────────────────────────────
describe('priorityColor', () => {
  it('returns red classes for high priority', () => {
    const cls = priorityColor('high');
    expect(cls).toContain('red');
  });

  it('returns yellow classes for medium priority', () => {
    const cls = priorityColor('medium');
    expect(cls).toContain('yellow');
  });

  it('returns slate/default classes for low priority', () => {
    const cls = priorityColor('low');
    expect(cls).toContain('slate');
  });

  it('returns default for unknown priority', () => {
    const cls = priorityColor('unknown');
    expect(cls).toContain('slate');
  });
});

// ── statusColor ───────────────────────────────────────────────────────────────
describe('statusColor', () => {
  it('returns blue for new status', () => {
    expect(statusColor('new')).toContain('blue');
  });

  it('returns green for active status', () => {
    expect(statusColor('active')).toContain('green');
  });

  it('returns slate for inactive status', () => {
    expect(statusColor('inactive')).toContain('slate');
  });

  it('returns red for lost status', () => {
    expect(statusColor('lost')).toContain('red');
  });

  it('returns default for unknown status', () => {
    expect(statusColor('other')).toContain('slate');
  });
});

// ── timeAgo ───────────────────────────────────────────────────────────────────
describe('timeAgo', () => {
  it('returns "just now" for very recent times', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe('just now');
  });

  it('returns minutes ago for times within the hour', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinutesAgo)).toBe('5m ago');
  });

  it('returns hours ago for times within the day', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeHoursAgo)).toBe('3h ago');
  });

  it('returns days ago for recent days', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoDaysAgo)).toBe('2d ago');
  });

  it('returns formatted date for times older than a week', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const result = timeAgo(twoWeeksAgo);
    // Should fall back to formatDate — not a "ago" string
    expect(result).not.toContain('ago');
    expect(result.length).toBeGreaterThan(0);
  });
});
