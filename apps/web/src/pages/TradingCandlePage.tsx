import type { JSX } from 'react';

const BLUE = '#1d4ed8';
const GREEN = '#16a34a';
const RED = '#dc2626';
const YELLOW = '#eab308';

interface CandlePattern {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly confirmation: string;
}

const CANDLE_PATTERNS: readonly CandlePattern[] = [
  {
    id: 'bullish-engulfing',
    title: '1. Bullish Engulfing',
    description: 'Candle hijau besar menutup penuh seluruh badan candle merah sebelumnya.',
    confirmation: 'Candle berikutnya menembus high candle hijau (Bullish Engulfing).',
  },
  {
    id: 'hammer',
    title: '2. Hammer / Pin Bar',
    description: 'Badan kecil di atas, ekor bawah panjang. Menandakan buyer menolak harga lebih rendah.',
    confirmation: 'Candle berikutnya menembus high hammer.',
  },
  {
    id: 'morning-star',
    title: '3. Morning Star',
    description:
      'Pola 3 candle: merah besar, doji/kecil di bawah, lalu hijau kuat yang naik minimal 1/2 dari candle merah pertama.',
    confirmation: 'Candle ke-3 menembus high candle ke-2 atau menutup > 50% dari candle ke-1.',
  },
];

function CandleShape({ x, top, bottom, wickTop, wickBottom, color }: {
  readonly x: number;
  readonly top: number;
  readonly bottom: number;
  readonly wickTop: number;
  readonly wickBottom: number;
  readonly color: string;
}) {
  return (
    <g>
      <line x1={x} y1={wickTop} x2={x} y2={wickBottom} stroke={color} strokeWidth={2} />
      <rect x={x - 9} y={top} width={18} height={Math.max(bottom - top, 4)} fill={color} rx={2} />
    </g>
  );
}

function ReversalArrow({ x, y }: { readonly x: number; readonly y: number }) {
  return (
    <g stroke={GREEN} fill={GREEN}>
      <line x1={x} y1={y} x2={x} y2={y - 28} strokeWidth={3} />
      <polygon points={`${x - 6},${y - 24} ${x + 6},${y - 24} ${x},${y - 34}`} />
    </g>
  );
}

function BullishEngulfingDiagram() {
  return (
    <svg viewBox="0 0 160 120" width="100%" height={120}>
      <CandleShape x={55} top={45} bottom={68} wickTop={40} wickBottom={73} color={RED} />
      <CandleShape x={95} top={25} bottom={90} wickTop={20} wickBottom={95} color={GREEN} />
      <ReversalArrow x={130} y={95} />
    </svg>
  );
}

function HammerDiagram() {
  return (
    <svg viewBox="0 0 160 120" width="100%" height={120}>
      <CandleShape x={70} top={30} bottom={46} wickTop={25} wickBottom={95} color={GREEN} />
      <ReversalArrow x={125} y={95} />
    </svg>
  );
}

function MorningStarDiagram() {
  return (
    <svg viewBox="0 0 160 120" width="100%" height={120}>
      <CandleShape x={30} top={20} bottom={68} wickTop={15} wickBottom={72} color={RED} />
      <CandleShape x={70} top={70} bottom={76} wickTop={64} wickBottom={82} color="#94a3b8" />
      <CandleShape x={110} top={28} bottom={72} wickTop={22} wickBottom={76} color={GREEN} />
      <ReversalArrow x={140} y={95} />
    </svg>
  );
}

const DIAGRAMS: Readonly<Record<string, () => JSX.Element>> = {
  'bullish-engulfing': BullishEngulfingDiagram,
  hammer: HammerDiagram,
  'morning-star': MorningStarDiagram,
};

const cardStyle: React.CSSProperties = {
  border: `1px solid ${BLUE}`,
  borderRadius: 'var(--radius-card)',
  background: '#0f172a',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden',
};

const cardTitlebarStyle: React.CSSProperties = {
  padding: '0.75rem 1.25rem',
  background: `linear-gradient(90deg, ${BLUE}, #3b82f6)`,
  color: '#ffffff',
  fontWeight: 800,
  fontSize: '1rem',
  textAlign: 'center',
};

const columnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.65rem',
  padding: '1rem',
  borderRight: '1px solid rgba(148, 163, 184, 0.2)',
};

/** Halaman Trading Candle — panduan pola candlestick bullish reversal. */
export function TradingCandlePage() {
  return (
    <div>
      <h2 style={{ margin: '0 0 0.35rem' }}>🕯️ Trading Candle</h2>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--color-text-muted)' }}>
        Panduan membaca pola candlestick untuk analisa XAU/USD.
      </p>

      <div style={cardStyle}>
        <div style={cardTitlebarStyle}>CONTOH POLA CANDLESTICK BULLISH REVERSAL</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {CANDLE_PATTERNS.map((pattern, index) => {
            const Diagram = DIAGRAMS[pattern.id];
            return (
              <div
                key={pattern.id}
                style={{
                  ...columnStyle,
                  borderRight: index === CANDLE_PATTERNS.length - 1 ? 'none' : columnStyle.borderRight,
                }}
              >
                <div style={{ color: YELLOW, fontWeight: 800, fontSize: '0.85rem' }}>{pattern.title}</div>
                <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.78rem', lineHeight: 1.5 }}>
                  {pattern.description}
                </p>
                {Diagram && <Diagram />}
                <div
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(22, 163, 74, 0.15)',
                    border: `1px solid ${GREEN}`,
                  }}
                >
                  <div style={{ color: GREEN, fontWeight: 700, fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                    KONFIRMASI BUY
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '0.75rem', lineHeight: 1.4 }}>{pattern.confirmation}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            color: '#facc15',
            fontSize: '0.75rem',
          }}
        >
          💡 CATATAN PENTING: Gunakan pola ini di area support / demand zone untuk hasil lebih akurat. Selalu tunggu
          konfirmasi candle berikutnya sebelum entry.
        </div>
      </div>
    </div>
  );
}
