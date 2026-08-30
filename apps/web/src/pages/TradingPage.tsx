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
