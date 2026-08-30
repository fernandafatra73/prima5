export interface BinancePaxgPrice {
  readonly price: number;
  readonly updatedAt: string;
}

interface BinanceTickerResponse {
  readonly symbol?: string;
  readonly price?: string;
}

/** Ambil harga futures PAXGUSDT (emas tokenized) dari Binance — dipakai untuk
 * kartu harga live "Binance" di halaman Trading XAU/USD. Endpoint publik,
 * tanpa API key. Binance memblokir sebagian IP datacenter/region tertentu,
 * jadi pemanggil wajib menangani kegagalan fetch ini dengan lembut. */
export async function fetchBinancePaxgPrice(): Promise<BinancePaxgPrice> {
  const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/price?symbol=PAXGUSDT', {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Binance API merespons status ${res.status}`);
  }
  const data = (await res.json()) as BinanceTickerResponse;
  const price = data.price ? Number(data.price) : NaN;
  if (!Number.isFinite(price)) {
    throw new Error('Binance API tidak mengembalikan harga PAXGUSDT');
  }
  return { price, updatedAt: new Date().toISOString() };
}
