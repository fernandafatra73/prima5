import { describe, expect, test } from 'vitest';
import { computeRad2RowNumber, parseRad2Nominal, sumRad2Totals } from '../../apps/web/src/lib/rad2.ts';

describe('computeRad2RowNumber', () => {
  test('numbers rows continuously across pages', () => {
    expect(computeRad2RowNumber({ page: 1, limit: 20 }, 0)).toBe(1);
    expect(computeRad2RowNumber({ page: 2, limit: 20 }, 0)).toBe(21);
    expect(computeRad2RowNumber({ page: 3, limit: 20 }, 4)).toBe(45);
  });

  test('treats invalid page/limit as 1', () => {
    expect(computeRad2RowNumber({ page: 0, limit: 0 }, 2)).toBe(3);
  });
});

describe('sumRad2Totals', () => {
  test('sums harga and total sharing', () => {
    expect(
      sumRad2Totals([
        { totalHarga: '150000', totalSharing: '50000' },
        { totalHarga: '200000.00', totalSharing: '25000' },
      ]),
    ).toEqual({ totalHarga: 350000, totalSharing: 75000 });
  });

  test('returns zeros for no rows and ignores invalid values', () => {
    expect(sumRad2Totals([])).toEqual({ totalHarga: 0, totalSharing: 0 });
    expect(sumRad2Totals([{ totalHarga: 'abc', totalSharing: '10' }])).toEqual({ totalHarga: 0, totalSharing: 10 });
  });
});

describe('parseRad2Nominal', () => {
  test('accepts non-negative integers', () => {
    expect(parseRad2Nominal('0')).toBe(0);
    expect(parseRad2Nominal(' 50000 ')).toBe(50000);
  });

  test('rejects empty, negative, decimal, and non-numeric input', () => {
    expect(parseRad2Nominal('')).toBeNull();
    expect(parseRad2Nominal('-1')).toBeNull();
    expect(parseRad2Nominal('1.5')).toBeNull();
    expect(parseRad2Nominal('abc')).toBeNull();
    expect(parseRad2Nominal('99999999999999999999')).toBeNull();
  });
});
