export interface XauDailyPoint {
  readonly date: string;
  readonly high: number;
  readonly low: number;
  readonly close: number;
}

interface XausHistoryResponse {
  readonly points?: readonly { d: string; h: number; l: number; c: number }[];
}

/** Ambil titik harga harian XAU/USD (High/Low/Close) paling baru dari
 * XAUS.com — API gratis, tanpa API key, dipakai sebagai basis Pivot Point
 * harian pada jurnal "Analisa & Level Sebelum Beli XAU". */
export async function fetchLatestXauDailyPoint(): Promise<XauDailyPoint | null> {
  const res = await fetch('https://xaus.com/api/v1/history', {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`XAUS API merespons status ${res.status}`);
  }
  const data = (await res.json()) as XausHistoryResponse;
  const last = data.points?.at(-1);
  if (!last) return null;
  return { date: last.d, high: last.h, low: last.l, close: last.c };
}
