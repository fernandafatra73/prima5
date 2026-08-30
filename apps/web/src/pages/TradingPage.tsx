import { useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';

interface JadwalItem {
  readonly id: string;
  readonly tanggal: string;
  readonly namaEvent: string;
  readonly keterangan: string | null;
}

interface AnalisaItem {
  readonly id: string;
  readonly tanggal: string;
  readonly analisa: string;
  readonly support: string | null;
  readonly resistance: string | null;
}

const TIMEFRAMES = [
  { id: '15', label: '15 Menit' },
  { id: '30', label: '30 Menit' },
  { id: '60', label: '1 Jam' },
  { id: 'D', label: '1 Hari' },
  { id: 'W', label: '1 Minggu' },
] as const;

const TEHNIK_TIMELINE = [
  {
    waktu: '06:00–14:00',
    poin: ['Lihat arah besar dari H1/H4', 'Tandai support & resistance'],
  },
  {
    waktu: '14:00–19:00',
    poin: ['Lihat apakah London mengubah struktur', 'Jangan buru-buru mengikuti candle pertama'],
  },
  {
    waktu: '19:00–23:00',
    poin: ['Periode utama', 'Perhatikan reaksi harga terhadap level yang sudah ditandai'],
  },
  {
    waktu: '±15–30 menit sebelum berita besar',
    poin: ['Tandai kalender', 'Waspadai spread/volatilitas'],
  },
  {
    waktu: 'Setelah berita',
    poin: ['Jangan langsung menyimpulkan dari satu candle', 'Tunggu struktur baru terbentuk'],
  },
] as const;

const TEHNIK_RILIS_MINGGUAN = [
  { hari: 'Selasa 21:00', label: 'JOLTS + ISM', penting: false },
  { hari: 'Kamis 21:00', label: 'ISM Services', penting: false },
  { hari: 'Jumat 19:30', label: 'NFP 🚨', penting: true },
] as const;

const BLUE = '#1d4ed8';
const YELLOW = '#eab308';
const GREEN = '#16a34a';

function formatTanggalDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** Sama seperti formatTanggalDisplay, tapi termasuk jam — dipakai khusus
 * untuk jurnal Analisa & Level (yang tanggalnya bisa diisi manual sampai ke
 * jam), bukan untuk Jadwal Trading yang cuma tanggal tanpa jam. */
function formatTanggalJamDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const tanggal = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `${tanggal}, ${jam} WIB`;
  } catch {
    return dateStr;
  }
}

/** Format Date lokal jadi string yang dipahami <input type="datetime-local">
 * (YYYY-MM-DDTHH:mm) — pakai komponen tanggal/jam lokal, bukan toISOString
 * yang berbasis UTC dan bisa geser tanggalnya. */
function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface PivotResult {
  readonly pivot: number;
  readonly r1: number;
  readonly r2: number;
  readonly r3: number;
  readonly s1: number;
  readonly s2: number;
  readonly s3: number;
  readonly signal: 'BELI' | 'JUAL' | 'NETRAL';
  readonly alasan: string;
}

/** Kalkulator Pivot Point standar (High/Low/Close) — dipakai untuk
 * menghasilkan level support/resistance & sinyal beli/jual sederhana
 * berdasarkan posisi harga saat ini terhadap pivot & level R1/S1.
 * Bukan rekomendasi finansial — hanya bantu baca level teknikal umum. */
function computePivot(high: number, low: number, close: number, current: number): PivotResult {
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);
  const r3 = high + 2 * (pivot - low);
  const s3 = low - 2 * (high - pivot);

  let signal: PivotResult['signal'] = 'NETRAL';
  let alasan = 'Harga berada di sekitar pivot, belum ada bias arah yang jelas.';
  if (current >= r1) {
    signal = 'JUAL';
    alasan = 'Harga sudah menyentuh/melewati resistance R1 — rawan koreksi turun.';
  } else if (current <= s1) {
    signal = 'BELI';
    alasan = 'Harga sudah menyentuh/melewati support S1 — berpotensi pantul naik.';
  } else if (current > pivot) {
    signal = 'BELI';
    alasan = 'Harga di atas pivot — bias jangka pendek cenderung bullish (naik).';
  } else if (current < pivot) {
    signal = 'JUAL';
    alasan = 'Harga di bawah pivot — bias jangka pendek cenderung bearish (turun).';
  }

  return { pivot, r1, r2, r3, s1, s2, s3, signal, alasan };
}

function chartSrc(interval: string): string {
  const config = {
    autosize: true,
    symbol: 'OANDA:XAUUSD',
    interval,
    timezone: 'Asia/Jakarta',
    theme: 'light',
    style: '1',
    locale: 'id',
    toolbar_bg: '#f8fafc',
    withdateranges: true,
    hide_side_toolbar: false,
  };
  return `https://s.tradingview.com/embed-widget/advanced-chart/?locale=id#${encodeURIComponent(JSON.stringify(config))}`;
}

/** Kalender ekonomi live (TradingView) — sumber jadwal FOMC/NFP/dll yang
 * update sendiri, dipasangkan dengan simbol XAUUSD supaya jadwal yang
 * relevan untuk emas ikut ditandai penting. */
function economicCalendarSrc(): string {
  const config = {
    colorTheme: 'light',
    isTransparent: false,
    width: '100%',
    height: '460',
    locale: 'id',
    importanceFilter: '-1,0,1',
    currencyFilter: 'USD',
  };
  return `https://s.tradingview.com/embed-widget/events/?locale=id#${encodeURIComponent(JSON.stringify(config))}`;
}

const cardStyle: React.CSSProperties = {
  border: `1px solid ${BLUE}`,
  borderRadius: 'var(--radius-card)',
  background: '#ffffff',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden',
  marginBottom: '1.25rem',
};

const cardTitlebarStyle: React.CSSProperties = {
  padding: '0.6rem 1rem',
  background: `linear-gradient(90deg, ${BLUE}, #3b82f6)`,
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.9rem',
};

const cardBodyStyle: React.CSSProperties = { padding: '1rem' };

/** Halaman Trading XAU/USD — grafik live (TradingView), jurnal analisa &
 * level support/resistance sebelum beli, dan kalender event tahunan. */
export function TradingPage() {
  const [interval, setInterval_] = useState<string>('60');

  const [jadwal, setJadwal] = useState<JadwalItem[]>([]);
  const [jadwalTanggal, setJadwalTanggal] = useState(new Date().toISOString().split('T')[0]!);
  const [jadwalNama, setJadwalNama] = useState('');
  const [jadwalKeterangan, setJadwalKeterangan] = useState('');
  const [jadwalSubmitting, setJadwalSubmitting] = useState(false);

  const [analisaList, setAnalisaList] = useState<AnalisaItem[]>([]);
  const [analisaText, setAnalisaText] = useState('');
  const [support, setSupport] = useState('');
  const [resistance, setResistance] = useState('');
  const [analisaTanggalJam, setAnalisaTanggalJam] = useState(() => toDatetimeLocalValue(new Date()));
  const [analisaSubmitting, setAnalisaSubmitting] = useState(false);

  const [editingAnalisaId, setEditingAnalisaId] = useState<string | null>(null);
  const [editAnalisaText, setEditAnalisaText] = useState('');
  const [editSupport, setEditSupport] = useState('');
  const [editResistance, setEditResistance] = useState('');
  const [editTanggalJam, setEditTanggalJam] = useState('');
  const [editAnalisaSaving, setEditAnalisaSaving] = useState(false);

  const [showKalkulator, setShowKalkulator] = useState(false);
  const [highInput, setHighInput] = useState('');
  const [lowInput, setLowInput] = useState('');
  const [closeInput, setCloseInput] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [pivotResult, setPivotResult] = useState<PivotResult | null>(null);
  const [kalkulatorError, setKalkulatorError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [hargaXau, setHargaXau] = useState<{ price: number; updatedAt: string } | null>(null);

  async function loadJadwal() {
    try {
      const res = await apiGet<{ items: JadwalItem[] }>('/api/trading-jadwal?limit=200');
      setJadwal(res.items);
    } catch {
      setJadwal([]);
    }
  }

  async function loadAnalisa() {
    try {
      const res = await apiGet<{ items: AnalisaItem[] }>('/api/trading-analisa?limit=50');
      setAnalisaList(res.items);
    } catch {
      setAnalisaList([]);
    }
  }

  async function loadHargaXau() {
    try {
      const res = await apiGet<{ price: number; updatedAt: string }>('/api/trading-harga-xau');
      setHargaXau(res);
    } catch {
      // Kartu harga live cuma pemanis di atas grafik — kalau gagal, biarkan
      // kosong saja, jangan ganggu bagian lain halaman.
    }
  }

  useEffect(() => {
    void loadJadwal();
    void loadAnalisa();
    void loadHargaXau();
    const timer = setInterval(() => void loadHargaXau(), 30_000);
    return () => clearInterval(timer);
  }, []);

  async function handleJadwalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jadwalNama.trim()) return;
    setJadwalSubmitting(true);
    setError(null);
    try {
      await apiPost('/api/trading-jadwal', {
        tanggal: jadwalTanggal,
        namaEvent: jadwalNama.trim(),
        keterangan: jadwalKeterangan.trim() || undefined,
      });
      setJadwalNama('');
      setJadwalKeterangan('');
      await loadJadwal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan jadwal');
    } finally {
      setJadwalSubmitting(false);
    }
  }

  async function handleJadwalDelete(id: string) {
    await apiDelete(`/api/trading-jadwal/${id}`);
    await loadJadwal();
  }

  async function handleAnalisaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!analisaText.trim()) return;
    setAnalisaSubmitting(true);
    setError(null);
    try {
      const tanggalIso = analisaTanggalJam ? new Date(analisaTanggalJam).toISOString() : undefined;
      await apiPost('/api/trading-analisa', {
        analisa: analisaText.trim(),
        support: support.trim() || undefined,
        resistance: resistance.trim() || undefined,
        tanggal: tanggalIso,
      });
      setAnalisaText('');
      setSupport('');
      setResistance('');
      setAnalisaTanggalJam(toDatetimeLocalValue(new Date()));
      await loadAnalisa();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan analisa');
    } finally {
      setAnalisaSubmitting(false);
    }
  }

  async function handleAnalisaDelete(id: string) {
    await apiDelete(`/api/trading-analisa/${id}`);
    await loadAnalisa();
  }

  function openEditAnalisa(item: AnalisaItem) {
    setEditingAnalisaId(item.id);
    setEditAnalisaText(item.analisa);
    setEditSupport(item.support ?? '');
    setEditResistance(item.resistance ?? '');
    const parsed = new Date(item.tanggal);
    setEditTanggalJam(isNaN(parsed.getTime()) ? '' : toDatetimeLocalValue(parsed));
  }

  function cancelEditAnalisa() {
    setEditingAnalisaId(null);
  }

  async function handleAnalisaEditSave(id: string) {
    setEditAnalisaSaving(true);
    try {
      await apiPatch(`/api/trading-analisa/${id}`, {
        analisa: editAnalisaText.trim(),
        support: editSupport.trim() || undefined,
        resistance: editResistance.trim() || undefined,
        tanggal: editTanggalJam ? new Date(editTanggalJam).toISOString() : undefined,
      });
      setEditingAnalisaId(null);
      await loadAnalisa();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan analisa');
    } finally {
      setEditAnalisaSaving(false);
    }
  }

  function handleHitungAnalisa(e: React.FormEvent) {
    e.preventDefault();
    const h = Number(highInput);
    const l = Number(lowInput);
    const c = Number(closeInput);
    const cur = Number(currentInput);
    if (!highInput || !lowInput || !closeInput || !currentInput || [h, l, c, cur].some((n) => isNaN(n))) {
      setKalkulatorError('Isi High, Low, Close, dan Harga Saat Ini dengan angka yang valid.');
      setPivotResult(null);
      return;
    }
    if (l > h) {
      setKalkulatorError('Low tidak boleh lebih besar dari High.');
      setPivotResult(null);
      return;
    }
    setKalkulatorError(null);
    setPivotResult(computePivot(h, l, c, cur));
  }

  function handleGunakanUntukJurnal() {
    if (!pivotResult) return;
    const { s1, s2, s3, r1, r2, r3, pivot, signal, alasan } = pivotResult;
    const ringkas =
      `Sinyal: ${signal} — ${alasan} ` +
      `(H=${highInput}, L=${lowInput}, C=${closeInput}, Harga saat ini=${currentInput}, Pivot=${pivot.toFixed(2)}) ` +
      `Rencana: BELI di area Support (S1 ${s1.toFixed(2)}, S2 ${s2.toFixed(2)}, S3 ${s3.toFixed(2)}); ` +
      `JUAL di area Resistance (R1 ${r1.toFixed(2)}, R2 ${r2.toFixed(2)}, R3 ${r3.toFixed(2)}).`;
    setAnalisaText(ringkas);
    setSupport(`S1 ${s1.toFixed(2)} · S2 ${s2.toFixed(2)} · S3 ${s3.toFixed(2)}`);
    setResistance(`R1 ${r1.toFixed(2)} · R2 ${r2.toFixed(2)} · R3 ${r3.toFixed(2)}`);
    document.getElementById('tr-analisa')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          borderRadius: 'var(--radius-card)',
          background: `linear-gradient(120deg, ${BLUE}, #3b82f6 55%, ${YELLOW})`,
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(29, 78, 216, 0.28)',
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.18)', fontSize: '1.6rem',
          }}
        >
          🪙
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Trading XAU/USD</h2>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)' }}>
            Harga XAU dari Exness, TradingView,{' '}
            <a
              href="https://www.binance.bh/en/futures/PAXGUSDT"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#ffffff', textDecoration: 'underline' }}
            >
              Binance
            </a>{' '}
            — update setiap saat.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={cardStyle}>
        <div style={cardTitlebarStyle}>📈 Grafik XAU/USD</div>
        <div style={cardBodyStyle}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setInterval_(tf.id)}
                style={{
                  padding: '0.35rem 0.9rem',
                  borderRadius: '999px',
                  border: `1px solid ${interval === tf.id ? YELLOW : 'var(--color-border)'}`,
                  background: interval === tf.id ? YELLOW : 'transparent',
                  color: interval === tf.id ? '#1a1a1a' : 'var(--color-text)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {tf.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                document.getElementById('tr-jadwal-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: '999px',
                border: `1px solid ${YELLOW}`,
                background: 'transparent',
                color: 'var(--color-text)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              📅 Jadwal Trading
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById('tr-tehnik-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: '999px',
                border: `1px solid ${YELLOW}`,
                background: 'transparent',
                color: 'var(--color-text)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              🎯 Tehnik Trading
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById('tr-beli-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: '999px',
                border: `1px solid ${GREEN}`,
                background: 'transparent',
                color: 'var(--color-text)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              🛒 Beli
            </button>
            {hargaXau && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '999px',
                  background: 'rgba(15, 23, 42, 0.88)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                }}
                title={`Update ${formatTanggalJamDisplay(hargaXau.updatedAt)}`}
              >
                <span style={{ fontWeight: 700, color: YELLOW }}>🪙 XAU/USD</span>
                <span style={{ fontWeight: 800 }}>
                  ${hargaXau.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowKalkulator((v) => !v)}
              style={{
                marginLeft: 'auto',
                padding: '0.35rem 0.9rem',
                borderRadius: '999px',
                border: `1px solid ${BLUE}`,
                background: BLUE,
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              🔍 {showKalkulator ? 'Tutup Analisa' : 'Analisa Grafik (Beli/Jual)'}
            </button>
          </div>
          <div
            style={{
              position: 'relative',
              height: 480,
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <iframe
              key={interval}
              title="Grafik XAU/USD"
              src={chartSrc(interval)}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
            {analisaList.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  maxWidth: 230,
                  padding: '0.6rem 0.7rem',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.88)',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  lineHeight: 1.5,
                  pointerEvents: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '0.3rem', color: YELLOW }}>
                  📊 Analisa Terakhir — {formatTanggalJamDisplay(analisaList[0]!.tanggal)}
                </div>
                {analisaList[0]!.support && (
                  <div style={{ color: '#86efac' }}>Support: {analisaList[0]!.support}</div>
                )}
                {analisaList[0]!.resistance && (
                  <div style={{ color: '#fca5a5' }}>Resistance: {analisaList[0]!.resistance}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showKalkulator && (
        <div style={cardStyle}>
          <div style={cardTitlebarStyle}>🔍 Analisa Grafik — Sinyal Beli/Jual &amp; Support/Resistance</div>
          <div style={cardBodyStyle}>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Lihat nilai High, Low, Close (dari periode di grafik atas) dan harga saat ini, lalu masukkan di
              bawah. Sinyal dihitung dengan rumus Pivot Point standar — bukan rekomendasi finansial, hanya
              bantuan baca level teknikal.
            </p>
            <form onSubmit={handleHitungAnalisa} className="form-grid">
              <div className="form-field">
                <label htmlFor="tr-high" style={{ color: BLUE, fontWeight: 700 }}>High</label>
                <input
                  id="tr-high"
                  value={highInput}
                  onChange={(e) => setHighInput(e.target.value)}
                  placeholder="Contoh: 2405.30"
                  style={{ borderLeft: `3px solid ${YELLOW}` }}
                />
              </div>
              <div className="form-field">
                <label htmlFor="tr-low" style={{ color: BLUE, fontWeight: 700 }}>Low</label>
                <input
                  id="tr-low"
                  value={lowInput}
                  onChange={(e) => setLowInput(e.target.value)}
                  placeholder="Contoh: 2385.10"
                  style={{ borderLeft: `3px solid ${YELLOW}` }}
                />
              </div>
              <div className="form-field">
                <label htmlFor="tr-close" style={{ color: BLUE, fontWeight: 700 }}>Close</label>
                <input
                  id="tr-close"
                  value={closeInput}
                  onChange={(e) => setCloseInput(e.target.value)}
                  placeholder="Contoh: 2398.00"
                  style={{ borderLeft: `3px solid ${YELLOW}` }}
                />
              </div>
              <div className="form-field">
                <label htmlFor="tr-current" style={{ color: BLUE, fontWeight: 700 }}>Harga Saat Ini</label>
                <input
                  id="tr-current"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="Contoh: 2401.50"
                  style={{ borderLeft: `3px solid ${YELLOW}` }}
                />
              </div>
              <div className="form-grid--full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn--primary">
                  Hitung Analisa
                </button>
              </div>
            </form>

            {kalkulatorError && (
              <div className="alert alert--error" style={{ marginTop: '0.75rem' }}>
                {kalkulatorError}
              </div>
            )}

            {pivotResult && (
              <div style={{ marginTop: '1rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.9rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '0.85rem',
                    background:
                      pivotResult.signal === 'BELI' ? '#dcfce7' : pivotResult.signal === 'JUAL' ? '#fee2e2' : '#f1f5f9',
                    border: `1px solid ${
                      pivotResult.signal === 'BELI' ? '#16a34a' : pivotResult.signal === 'JUAL' ? '#dc2626' : '#94a3b8'
                    }`,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      color:
                        pivotResult.signal === 'BELI' ? '#16a34a' : pivotResult.signal === 'JUAL' ? '#dc2626' : '#475569',
                    }}
                  >
                    {pivotResult.signal === 'BELI' ? '📈 BELI' : pivotResult.signal === 'JUAL' ? '📉 JUAL' : '➖ NETRAL'}
                  </span>
                  <span style={{ fontSize: '0.85rem' }}>{pivotResult.alasan}</span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: '0.6rem',
                    marginBottom: '0.85rem',
                  }}
                >
                  {[
                    { label: 'Resistance 3', value: pivotResult.r3, tone: '#dc2626' },
                    { label: 'Resistance 2', value: pivotResult.r2, tone: '#dc2626' },
                    { label: 'Resistance 1', value: pivotResult.r1, tone: '#dc2626' },
                    { label: 'Pivot', value: pivotResult.pivot, tone: BLUE },
                    { label: 'Support 1', value: pivotResult.s1, tone: '#16a34a' },
                    { label: 'Support 2', value: pivotResult.s2, tone: '#16a34a' },
                    { label: 'Support 3', value: pivotResult.s3, tone: '#16a34a' },
                  ].map((row) => (
                    <div
                      key={row.label}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{row.label}</div>
                      <div style={{ fontWeight: 700, color: row.tone }}>{row.value.toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <button type="button" className="btn btn--sm btn--primary" onClick={handleGunakanUntukJurnal}>
                  💾 Gunakan untuk Jurnal Analisa
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div id="tr-beli-section" style={cardStyle}>
        <div style={cardTitlebarStyle}>📝 Analisa &amp; Level Sebelum Beli XAU</div>
        <div style={cardBodyStyle}>
          <form onSubmit={(e) => void handleAnalisaSubmit(e)} className="form-grid">
            <div className="form-field form-field--full">
              <label htmlFor="tr-analisa" style={{ color: BLUE, fontWeight: 700 }}>Analisa</label>
              <textarea
                id="tr-analisa"
                rows={3}
                value={analisaText}
                onChange={(e) => setAnalisaText(e.target.value)}
                placeholder="Contoh: Harga mendekati support kuat, momentum RSI oversold, rencana entry buy..."
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="tr-tanggal-jam" style={{ color: BLUE, fontWeight: 700 }}>Tanggal &amp; Jam</label>
              <input
                id="tr-tanggal-jam"
                type="datetime-local"
                value={analisaTanggalJam}
                onChange={(e) => setAnalisaTanggalJam(e.target.value)}
                style={{ borderLeft: `3px solid ${YELLOW}` }}
              />
            </div>
            <div className="form-field">
              <label htmlFor="tr-support" style={{ color: BLUE, fontWeight: 700 }}>Support</label>
              <input
                id="tr-support"
                value={support}
                onChange={(e) => setSupport(e.target.value)}
                placeholder="Contoh: 2380.50"
                style={{ borderLeft: `3px solid ${YELLOW}` }}
              />
            </div>
            <div className="form-field">
              <label htmlFor="tr-resistance" style={{ color: BLUE, fontWeight: 700 }}>Resistance</label>
              <input
                id="tr-resistance"
                value={resistance}
                onChange={(e) => setResistance(e.target.value)}
                placeholder="Contoh: 2410.00"
                style={{ borderLeft: `3px solid ${YELLOW}` }}
              />
            </div>
            <div className="form-grid--full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn--primary" disabled={analisaSubmitting}>
                {analisaSubmitting ? 'Menyimpan…' : '+ Simpan Analisa'}
              </button>
            </div>
          </form>

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {analisaList.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Belum ada catatan analisa.</p>
            ) : (
              analisaList.map((item) => {
                const isEditing = editingAnalisaId === item.id;
                return (
                <div
                  key={item.id}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid var(--color-border)',
                    borderLeft: `4px solid ${YELLOW}`,
                    borderRadius: '6px',
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <strong style={{ fontSize: '0.78rem', color: BLUE }}>{formatTanggalJamDisplay(item.tanggal)}</strong>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="btn btn--xs btn--primary"
                            onClick={() => void handleAnalisaEditSave(item.id)}
                            disabled={editAnalisaSaving}
                          >
                            {editAnalisaSaving ? 'Menyimpan…' : '💾 Simpan'}
                          </button>
                          <button
                            type="button"
                            className="btn btn--xs btn--ghost"
                            onClick={cancelEditAnalisa}
                            disabled={editAnalisaSaving}
                          >
                            Batal
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn--xs btn--ghost"
                            onClick={() => openEditAnalisa(item)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn--xs btn--ghost"
                            onClick={() => void handleAnalisaDelete(item.id)}
                            style={{ color: '#dc2626' }}
                          >
                            Hapus
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input
                        type="datetime-local"
                        value={editTanggalJam}
                        onChange={(e) => setEditTanggalJam(e.target.value)}
                        style={{ borderLeft: `3px solid ${YELLOW}` }}
                      />
                      <textarea
                        rows={3}
                        value={editAnalisaText}
                        onChange={(e) => setEditAnalisaText(e.target.value)}
                        style={{ fontSize: '0.85rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          value={editSupport}
                          onChange={(e) => setEditSupport(e.target.value)}
                          placeholder="Support"
                          style={{ flex: 1, borderLeft: '3px solid #16a34a' }}
                        />
                        <input
                          value={editResistance}
                          onChange={(e) => setEditResistance(e.target.value)}
                          placeholder="Resistance"
                          style={{ flex: 1, borderLeft: '3px solid #dc2626' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>{item.analisa}</p>
                      <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <div
                          style={{
                            border: '1px solid #86efac',
                            borderRadius: '6px',
                            background: '#f0fdf4',
                            padding: '0.3rem 0.6rem',
                          }}
                        >
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#16a34a' }}>SUPPORT</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#15803d' }}>
                            {item.support || '—'}
                          </div>
                        </div>
                        <div
                          style={{
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            background: '#fef2f2',
                            padding: '0.3rem 0.6rem',
                          }}
                        >
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#dc2626' }}>RESISTANCE</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#b91c1c' }}>
                            {item.resistance || '—'}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div id="tr-jadwal-section" style={cardStyle}>
        <div style={cardTitlebarStyle}>📅 Jadwal Tahunan (Event Ekonomi)</div>
        <div style={cardBodyStyle}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: BLUE }}>
            🔴 Kalender Live (konek TradingView, update otomatis)
          </p>
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '1.25rem',
              borderLeft: `4px solid ${YELLOW}`,
            }}
          >
            <iframe
              title="Kalender Ekonomi Live"
              src={economicCalendarSrc()}
              style={{ width: '100%', height: 460, border: 'none', display: 'block' }}
            />
          </div>

          <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: BLUE }}>📝 Catatan Jadwal Saya (manual)</p>
          <form onSubmit={(e) => void handleJadwalSubmit(e)} className="form-grid">
            <div className="form-field">
              <label htmlFor="tr-jadwal-tanggal" style={{ color: BLUE, fontWeight: 700 }}>Tanggal</label>
              <input
                id="tr-jadwal-tanggal"
                type="date"
                value={jadwalTanggal}
                onChange={(e) => setJadwalTanggal(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="tr-jadwal-nama" style={{ color: BLUE, fontWeight: 700 }}>Nama Event</label>
              <input
                id="tr-jadwal-nama"
                value={jadwalNama}
                onChange={(e) => setJadwalNama(e.target.value)}
                placeholder="Contoh: FOMC Meeting, Rilis NFP"
                required
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="tr-jadwal-ket" style={{ color: BLUE, fontWeight: 700 }}>Keterangan (Opsional)</label>
              <input
                id="tr-jadwal-ket"
                value={jadwalKeterangan}
                onChange={(e) => setJadwalKeterangan(e.target.value)}
                placeholder="Catatan tambahan..."
              />
            </div>
            <div className="form-grid--full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn--primary" disabled={jadwalSubmitting}>
                {jadwalSubmitting ? 'Menyimpan…' : '+ Tambah Jadwal'}
              </button>
            </div>
          </form>

          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Event</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {jadwal.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem' }}>
                      Belum ada jadwal event.
                    </td>
                  </tr>
                ) : (
                  jadwal.map((item) => (
                    <tr key={item.id}>
                      <td>{formatTanggalDisplay(item.tanggal)}</td>
                      <td style={{ fontWeight: 600 }}>{item.namaEvent}</td>
                      <td>{item.keterangan || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--xs btn--ghost"
                          onClick={() => void handleJadwalDelete(item.id)}
                          style={{ color: '#dc2626' }}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="tr-tehnik-section" style={cardStyle}>
        <div style={cardTitlebarStyle}>🎯 Tehnik Trading</div>
        <div style={cardBodyStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {TEHNIK_TIMELINE.map((step) => (
              <div
                key={step.waktu}
                style={{
                  display: 'flex',
                  gap: '0.9rem',
                  padding: '0.75rem 0.9rem',
                  border: '1px solid var(--color-border)',
                  borderLeft: `4px solid ${YELLOW}`,
                  borderRadius: '6px',
                  background: '#f8fafc',
                }}
              >
                <div style={{ flex: '0 0 200px', fontWeight: 800, color: BLUE, fontSize: '0.85rem' }}>
                  ⏰ {step.waktu}
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem' }}>
                  {step.poin.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: BLUE }}>🗓️ Rilis Data Mingguan Penting</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {TEHNIK_RILIS_MINGGUAN.map((rilis) => (
              <div
                key={rilis.hari}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.6rem 0.9rem',
                  borderRadius: '6px',
                  border: `1px solid ${rilis.penting ? '#dc2626' : 'var(--color-border)'}`,
                  background: rilis.penting ? '#fee2e2' : '#ffffff',
                }}
              >
                <span style={{ fontWeight: 700, color: BLUE }}>{rilis.hari}</span>
                <span style={{ fontWeight: rilis.penting ? 800 : 600, color: rilis.penting ? '#dc2626' : 'var(--color-text)' }}>
                  {rilis.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
