import { useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost } from '../lib/api.ts';

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

const BLUE = '#1d4ed8';
const YELLOW = '#eab308';

function formatTanggalDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
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
  const [analisaSubmitting, setAnalisaSubmitting] = useState(false);

  const [showKalkulator, setShowKalkulator] = useState(false);
  const [highInput, setHighInput] = useState('');
  const [lowInput, setLowInput] = useState('');
  const [closeInput, setCloseInput] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [pivotResult, setPivotResult] = useState<PivotResult | null>(null);
  const [kalkulatorError, setKalkulatorError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void loadJadwal();
    void loadAnalisa();
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
      await apiPost('/api/trading-analisa', {
        analisa: analisaText.trim(),
        support: support.trim() || undefined,
        resistance: resistance.trim() || undefined,
      });
      setAnalisaText('');
      setSupport('');
      setResistance('');
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
    const ringkas =
      `Sinyal: ${pivotResult.signal} — ${pivotResult.alasan} ` +
      `(H=${highInput}, L=${lowInput}, C=${closeInput}, Harga saat ini=${currentInput}, Pivot=${pivotResult.pivot.toFixed(2)})`;
    setAnalisaText(ringkas);
    setSupport(pivotResult.s1.toFixed(2));
    setResistance(pivotResult.r1.toFixed(2));
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
            Grafik live, jurnal analisa &amp; level support/resistance, jadwal event tahunan.
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
          <div style={{ height: 480, border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
            <iframe
              key={interval}
              title="Grafik XAU/USD"
              src={chartSrc(interval)}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
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

      <div style={cardStyle}>
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
              analisaList.map((item) => (
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
                    <strong style={{ fontSize: '0.78rem', color: BLUE }}>{formatTanggalDisplay(item.tanggal)}</strong>
                    <button
                      type="button"
                      className="btn btn--xs btn--ghost"
                      onClick={() => void handleAnalisaDelete(item.id)}
                      style={{ color: '#dc2626' }}
                    >
                      Hapus
                    </button>
                  </div>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem' }}>{item.analisa}</p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
                    <span>Support: <strong>{item.support || '—'}</strong></span>
                    <span>Resistance: <strong>{item.resistance || '—'}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={cardTitlebarStyle}>📅 Jadwal Tahunan (Event Ekonomi)</div>
        <div style={cardBodyStyle}>
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
    </div>
  );
}
