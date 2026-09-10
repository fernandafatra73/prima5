import { useMemo, useState } from 'react';
import { buildProV5Url } from '../lib/proV5.ts';

interface FeatureGroup {
  readonly title: string;
  readonly items: readonly string[];
}

const FEATURE_GROUPS: readonly FeatureGroup[] = [
  {
    title: 'Modul pemeriksaan',
    items: [
      '🫁 Thorax — Chest PA, Chest AP, Lateral',
      '🦴 Ekstremitas atas — Hand, Finger, Wrist, Forearm, Elbow, Humerus, Shoulder, Clavicle',
      '🦶 Ekstremitas bawah — Foot, Toe, Ankle, Tibia/Fibula, Knee, Femur, Hip',
      '🦴 Spine — Cervical, Thoracic, Lumbal, Lumbosacral, Sacrum/Coccyx',
      '🩻 Lainnya — Pelvis, Skull, Facial bone, Sinus, Abdomen, KUB',
    ],
  },
  {
    title: 'Viewer radiologi',
    items: [
      '🎨 Viewer berwarna & 🌈 pseudocolor',
      '🔍 Zoom & geser',
      '☀️ Brightness · ◐ Contrast · 🔎 Sharpness',
      '🔄 Rotate, flip & invert',
      '📐 ROI & pengukuran (mm bila ada PixelSpacing)',
    ],
  },
  {
    title: 'DICOM & PACS',
    items: [
      '📁 Membuka file DICOM .dcm & 🧾 metadata dasar',
      '🎚️ Window Center / Window Width',
      '🎞️ Multi-frame / slice dasar',
      '⚙️ Koneksi PACS/DICOMweb — 🏥 siap Orthanc',
    ],
  },
  {
    title: 'AI & laporan',
    items: [
      '🤖 Loader model AI ONNX per modul',
      '📊 Confidence score & 🔥 heatmap/attention map',
      '✅ Checklist berbeda sesuai pemeriksaan',
      '📝 Findings · 📋 Impression · 💡 Recommendation',
      '📄 Export laporan · 📋 Worklist · 🗄️ SQLite lokal',
    ],
  },
];

const cardStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  background: 'var(--color-bg-surface)',
  boxShadow: 'var(--shadow-card)',
};

/** Pro-V5 memuat aplikasi Radiologi Reader (Streamlit, proses terpisah dari
 * API LabPrima) di dalam jendela LabPrima. Aplikasi harus sudah berjalan di
 * komputer server — lewat `jalankan.bat` di folder aplikasinya. */
export function ProV5Page() {
  const appUrl = useMemo(() => buildProV5Url(window.location), []);
  const [reloadKey, setReloadKey] = useState(0);
  const [showFeatures, setShowFeatures] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 0.35rem' }}>Pro-V5 — Radiologi Reader</h2>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            Worklist, viewer DICOM, checklist, AI screening &amp; laporan radiologi. Alat bantu baca — bukan alat
            diagnosis otomatis.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn--secondary"
            aria-expanded={showFeatures}
            onClick={() => setShowFeatures((visible) => !visible)}
          >
            {showFeatures ? 'Sembunyikan fitur' : '📋 Daftar fitur'}
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => setReloadKey((key) => key + 1)}>
            🔄 Muat ulang
          </button>
          <a className="btn btn--primary" href={appUrl} target="_blank" rel="noopener noreferrer">
            ↗ Buka di tab baru
          </a>
        </div>
      </div>

      {showFeatures && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
          {FEATURE_GROUPS.map((group) => (
            <section key={group.title} style={cardStyle}>
              <h3 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem' }}>{group.title}</h3>
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        Alamat aplikasi: <code>{appUrl}</code> — bila tampilan di bawah gagal dimuat, jalankan <code>jalankan.bat</code>{' '}
        di folder <code>radiologi_reader_prototype</code> pada komputer server, lalu klik Muat ulang.
      </p>

      <iframe
        key={reloadKey}
        title="Pro-V5 Radiologi Reader"
        src={appUrl}
        allow="clipboard-write"
        style={{
          width: '100%',
          height: 'calc(100vh - 260px)',
          minHeight: '560px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          background: 'var(--color-bg-surface)',
        }}
      />
    </div>
  );
}
