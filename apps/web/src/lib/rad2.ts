import type { PaginationMeta } from './pagination.ts';

export interface Rad2TotalsSource {
  readonly totalHarga: string;
  readonly totalSharing: string;
}

export interface Rad2Totals {
  readonly totalHarga: number;
  readonly totalSharing: number;
}

/** Nomor urut baris yang berlanjut antar halaman (halaman 2 dimulai dari limit + 1). */
export function computeRad2RowNumber(pagination: Pick<PaginationMeta, 'page' | 'limit'>, index: number): number {
  const page = Math.max(1, Math.trunc(pagination.page));
  const limit = Math.max(1, Math.trunc(pagination.limit));
  return (page - 1) * limit + index + 1;
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Jumlah harga dan total sharing untuk baris yang sedang tampil; nilai tak valid dihitung 0. */
export function sumRad2Totals(items: readonly Rad2TotalsSource[]): Rad2Totals {
  return items.reduce<Rad2Totals>(
    (acc, item) => ({
      totalHarga: acc.totalHarga + toNumber(item.totalHarga),
      totalSharing: acc.totalSharing + toNumber(item.totalSharing),
    }),
    { totalHarga: 0, totalSharing: 0 },
  );
}

/** Mengubah input nominal (harga/sharing) menjadi bilangan bulat ≥ 0, atau null bila tidak valid. */
export function parseRad2Nominal(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) ? n : null;
}
