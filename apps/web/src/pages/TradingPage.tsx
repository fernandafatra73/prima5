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
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
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
