const TRANSLATED_URL = 'https://bloomberg-com.translate.goog/?_x_tr_sl=en&_x_tr_tl=id&_x_tr_hl=id&_x_tr_pto=wapp';

/** Bloomberg.com ditampilkan lewat proxy terjemahan Google (translate.goog)
 * supaya kontennya otomatis dalam Bahasa Indonesia. Beberapa halaman bisa
 * menolak ditampilkan di dalam iframe — kalau kosong, pakai tombol "Buka
 * di Tab Baru" di bawah. */
export function BloombergPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: '0 0 0.2rem' }}>Bloomberg (Bahasa Indonesia)</h2>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Diterjemahkan otomatis oleh Google Translate. Jika tampilan di bawah kosong, situs menolak
            ditampilkan di dalam halaman ini — klik tombol di kanan untuk buka di tab baru.
          </p>
        </div>
        <a
          href={TRANSLATED_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--primary btn--sm"
          style={{ whiteSpace: 'nowrap' }}
        >
          🔗 Buka di Tab Baru
        </a>
      </div>
      <div
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
          height: 'calc(100vh - 220px)',
          minHeight: 480,
        }}
      >
        <iframe
          title="Bloomberg (Terjemahan Bahasa Indonesia)"
          src={TRANSLATED_URL}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
}
