import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { TableRowActions } from '../components/ui/TableRowActions.tsx';
import { useListQueryParams, useListSearch } from '../hooks/useListQueryParams.ts';
import { useMutationReload } from '../hooks/useMutationReload.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';
import { UsgReportDocument, type UsgReportData } from '../pdf/UsgReportDocument.tsx';
import { loadLogoDataUrl } from '../pdf/loadLogoDataUrl.ts';
import { pdf } from '@react-pdf/renderer';
import '../components/ui/ui.css';

interface UsgItem {
  readonly id: string;
  readonly namaPasien: string;
  readonly regCode: string | null;
  readonly jenisPemeriksaan: string | null;
  readonly tanggal: string;
  readonly fotoDataUrl: string;
  readonly analisa: string | null;
  readonly kesan: string | null;
  readonly radiologNama: string | null;
}

interface RadiologOption {
  readonly id: string;
  readonly nama: string;
}

interface PendaftaranOption {
  readonly id: string;
  readonly noRegistrasi: string;
  readonly namaPasien: string;
}

interface KopSuratData {
  readonly namaKlinik: string;
  readonly alamat: string;
  readonly telepon: string;
  readonly logoDataUrl: string | null;
}

function formatTanggalDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

const emptyForm = {
  namaPasien: '',
  regCode: '',
  jenisPemeriksaan: '',
  tanggal: new Date().toISOString().split('T')[0]!,
  fotoDataUrl: '',
  analisa: '',
  kesan: '',
  radiologNama: '',
};

export function UsgPage() {
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({}, search);
  const {
    items,
    pagination,
    setPage,
    loading,
    error,
    setError,
    reload: reloadList,
  } = usePaginatedList<UsgItem>('/api/usg', queryParams);
  const reload = useMutationReload(reloadList);

  const [editing, setEditing] = useState<UsgItem | null>(null);
  const [deleting, setDeleting] = useState<UsgItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFilename, setPreviewFilename] = useState('usg.pdf');

  const [radiologOptions, setRadiologOptions] = useState<RadiologOption[]>([]);
  const [pendaftaranOptions, setPendaftaranOptions] = useState<PendaftaranOption[]>([]);
  const [kopSurat, setKopSurat] = useState<KopSuratData | null>(null);
  const [logoFallback, setLogoFallback] = useState('');

  const loadRadiologOptions = useCallback(async () => {
    try {
      const res = await apiGet<{ items: RadiologOption[] }>('/api/radiolog?limit=200');
      setRadiologOptions(res.items);
    } catch {
      setRadiologOptions([]);
    }
  }, []);

  const loadPendaftaranOptions = useCallback(async () => {
    try {
      const res = await apiGet<{ items: PendaftaranOption[] }>('/api/pendaftaran-umum?limit=200');
      setPendaftaranOptions(res.items);
    } catch {
      setPendaftaranOptions([]);
    }
  }, []);

  const loadKopSurat = useCallback(async () => {
    try {
      const [res, logo] = await Promise.all([
        apiGet<{ item: KopSuratData }>('/api/kop-surat'),
        loadLogoDataUrl().catch(() => ''),
      ]);
      setKopSurat(res.item);
      setLogoFallback(logo);
    } catch {
      setKopSurat(null);
    }
  }, []);

  useEffect(() => {
    void loadRadiologOptions();
    void loadPendaftaranOptions();
    void loadKopSurat();
  }, [loadRadiologOptions, loadPendaftaranOptions, loadKopSurat]);

  function resetForm() {
    setForm(emptyForm);
    setError(null);
    setEditing(null);
  }

  function openEdit(item: UsgItem) {
    setForm({
      namaPasien: item.namaPasien,
      regCode: item.regCode ?? '',
      jenisPemeriksaan: item.jenisPemeriksaan ?? '',
      tanggal: item.tanggal.split('T')[0]!,
      fotoDataUrl: item.fotoDataUrl,
      analisa: item.analisa ?? '',
      kesan: item.kesan ?? '',
      radiologNama: item.radiologNama ?? '',
    });
    setError(null);
    setEditing(item);
  }

  function handleFotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((f) => ({ ...f, fotoDataUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fotoDataUrl) {
      setError('Foto USG wajib diunggah');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        namaPasien: form.namaPasien,
        regCode: form.regCode || undefined,
        jenisPemeriksaan: form.jenisPemeriksaan || undefined,
        tanggal: form.tanggal,
        fotoDataUrl: form.fotoDataUrl,
        analisa: form.analisa || undefined,
        kesan: form.kesan || undefined,
        radiologNama: form.radiologNama || undefined,
      };
      const wasEditing = editing !== null;
      if (editing) {
        await apiPatch(`/api/usg/${editing.id}`, body);
      } else {
        await apiPost('/api/usg', body);
      }
      resetForm();
      await reload({ resetPage: !wasEditing });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data USG');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiDelete(`/api/usg/${deleting.id}`);
      setDeleting(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus data USG');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePrint(item: UsgItem) {
    setPrintingId(item.id);
    try {
      const [logoRes, kopSurat] = await Promise.all([
        loadLogoDataUrl().catch(() => ''),
        apiGet<{ item: KopSuratData }>('/api/kop-surat').catch(() => null),
      ]);
      const data: UsgReportData = {
        logoSrc: kopSurat?.item.logoDataUrl || logoRes,
        namaKlinik: kopSurat?.item.namaKlinik || 'KLINIK PRIMA HUSADA',
        alamatKlinik: kopSurat?.item.alamat || '',
        teleponKlinik: kopSurat?.item.telepon || '',
        namaPasien: item.namaPasien,
        regCode: item.regCode || '',
        jenisPemeriksaan: item.jenisPemeriksaan || '',
        tanggalLabel: formatTanggalDisplay(item.tanggal),
        fotoDataUrl: item.fotoDataUrl,
        analisa: item.analisa || '',
        kesan: item.kesan || '',
        radiologNama: item.radiologNama || '',
        tanggalCetak: new Date().toLocaleDateString('id-ID', {
          day: '2-digit', month: 'long', year: 'numeric',
        }),
      };
      const blob = await pdf(<UsgReportDocument data={data} />).toBlob();
      setPreviewBlob(blob);
      setPreviewFilename(`USG_${item.namaPasien}.pdf`);
    } finally {
      setPrintingId(null);
    }
  }

  return (
    <>
      <div className="aifoto-frame" style={{ marginBottom: '1.25rem' }}>
        <div className="aifoto-frame__titlebar">
          {editing ? `✏️ Ubah Data USG — ${editing.namaPasien}` : '📝 Tambah Data USG'}
        </div>
        <div className="aifoto-frame__body">
          <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
            <div className="form-field form-grid--full" style={{ gap: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  textAlign: 'center',
                  paddingBottom: '0.6rem',
                  marginBottom: '0.9rem',
                  borderBottom: '2px solid #2b4c9b',
                }}
              >
                {(kopSurat?.logoDataUrl || logoFallback) && (
                  <img
                    src={kopSurat?.logoDataUrl || logoFallback}
                    alt="Logo klinik"
                    style={{ width: 40, height: 40, objectFit: 'contain' }}
                  />
                )}
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, color: '#2b4c9b', fontSize: '1rem', lineHeight: 1.2 }}>
                    {kopSurat?.namaKlinik || 'KLINIK PRIMA HUSADA'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#334155' }}>
                    {kopSurat?.alamat}
                    {kopSurat?.telepon ? ` Telp. ${kopSurat.telepon}` : ''}
                  </div>
                  <div style={{ marginTop: '0.25rem', fontWeight: 700, color: '#2b4c9b', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                    Hasil Pemeriksaan USG
                  </div>
                </div>
              </div>
              <div className="aifoto-layout">
                <div className="aifoto-frame">
                  <div className="aifoto-frame__titlebar">🩻 Foto USG</div>
                  <div className="aifoto-frame__body">
                    <label htmlFor="usg-foto" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                      Foto *
                    </label>
                    {!form.fotoDataUrl ? (
                      <label htmlFor="usg-foto" className="aifoto-upload aifoto-photo-box" style={{ cursor: 'pointer' }}>
                        <span className="aifoto-upload__icon">📤</span>
                        <strong>Klik untuk unggah foto USG</strong>
                        <p className="aifoto-upload__hint">JPEG, PNG, GIF, atau WEBP</p>
                      </label>
                    ) : (
                      <div className="aifoto-photo-box aifoto-photo-box--filled">
                        <img src={form.fotoDataUrl} alt="Preview foto USG" />
                      </div>
                    )}
                    <input
                      id="usg-foto"
                      type="file"
                      accept="image/*"
                      onChange={handleFotoFileChange}
                      style={form.fotoDataUrl ? {} : { display: 'none' }}
                    />
                  </div>
                </div>

                <div className="aifoto-frame">
                  <div className="aifoto-frame__titlebar">📋 Data Pemeriksaan</div>
                  <div className="aifoto-frame__body">
                    <div className="form-field">
                      <label htmlFor="usg-pendaftaran">Ambil dari Pendaftaran (Opsional)</label>
                      <select
                        id="usg-pendaftaran"
                        value=""
                        onChange={(e) => {
                          const selected = pendaftaranOptions.find((p) => p.id === e.target.value);
                          if (selected) {
                            setForm((f) => ({
                              ...f,
                              namaPasien: selected.namaPasien,
                              regCode: selected.noRegistrasi,
                            }));
                          }
                        }}
                      >
                        <option value="">-- Pilih Pasien / Ketik Manual di Bawah --</option>
                        {pendaftaranOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.namaPasien} ({p.noRegistrasi})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label htmlFor="usg-nama">Nama Pasien *</label>
                      <input
                        id="usg-nama"
                        required
                        value={form.namaPasien}
                        onChange={(e) => setForm((f) => ({ ...f, namaPasien: e.target.value }))}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="usg-regcode">No. Reg</label>
                      <input
                        id="usg-regcode"
                        value={form.regCode}
                        onChange={(e) => setForm((f) => ({ ...f, regCode: e.target.value }))}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="usg-jenis">Jenis Pemeriksaan</label>
                      <input
                        id="usg-jenis"
                        value={form.jenisPemeriksaan}
                        onChange={(e) => setForm((f) => ({ ...f, jenisPemeriksaan: e.target.value }))}
                        placeholder="Contoh: USG Abdomen"
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="usg-tanggal">Tanggal *</label>
                      <input
                        id="usg-tanggal"
                        type="date"
                        required
                        value={form.tanggal}
                        onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="usg-radiolog">Nama Radiolog/Dokter</label>
                      <select
                        id="usg-radiolog"
                        value={form.radiologNama}
                        onChange={(e) => setForm((f) => ({ ...f, radiologNama: e.target.value }))}
                      >
                        <option value="">-- Pilih Radiolog --</option>
                        {form.radiologNama && !radiologOptions.some((r) => r.nama === form.radiologNama) && (
                          <option value={form.radiologNama}>{form.radiologNama}</option>
                        )}
                        {radiologOptions.map((r) => (
                          <option key={r.id} value={r.nama}>
                            {r.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label htmlFor="usg-analisa" style={{ color: '#2b4c9b', fontWeight: 700 }}>
                        Analisa:
                      </label>
                      <textarea
                        id="usg-analisa"
                        rows={4}
                        value={form.analisa}
                        onChange={(e) => setForm((f) => ({ ...f, analisa: e.target.value }))}
                        placeholder="Diisi manual oleh radiolog"
                        style={{ border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="usg-kesan" style={{ color: '#2b4c9b', fontWeight: 700 }}>
                        Kesan:
                      </label>
                      <textarea
                        id="usg-kesan"
                        rows={3}
                        value={form.kesan}
                        onChange={(e) => setForm((f) => ({ ...f, kesan: e.target.value }))}
                        placeholder="Diisi manual oleh radiolog"
                        style={{ border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <ModalFormFooter
              onCancel={resetForm}
              submitLabel={editing ? 'Simpan Perubahan' : 'Simpan'}
              loading={submitting}
            />
          </form>
        </div>
      </div>

      <ListPageShell
        title="USG"
        subtitle="Arsip pemeriksaan USG pasien beserta analisa & kesan yang diisi manual oleh radiolog/dokter"
        metrics={[
          { label: 'Total Data', value: String(pagination.total), tone: 'blue', iconKind: 'clipboard' },
        ]}
        searchPlaceholder="Cari nama pasien..."
        searchValue={search}
        onSearchChange={setSearch}
        onRefresh={() => void reload()}
        error={error}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Tanggal</th>
                <th>Nama Pasien</th>
                <th>Pemeriksaan</th>
                <th>Kesan</th>
                <th>Radiolog</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem' }}>
                    Belum ada data USG.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <img
                        src={item.fotoDataUrl}
                        alt={`Foto USG ${item.namaPasien}`}
                        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                      />
                    </td>
                    <td>{formatTanggalDisplay(item.tanggal)}</td>
                    <td style={{ fontWeight: 600 }}>
                      {item.namaPasien}
                      {item.regCode && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{item.regCode}</div>
                      )}
                    </td>
                    <td>{item.jenisPemeriksaan || '—'}</td>
                    <td style={{ maxWidth: '220px', whiteSpace: 'normal' }}>{item.kesan || '—'}</td>
                    <td>{item.radiologNama || '—'}</td>
                    <td>
                      <TableRowActions
                        onEdit={() => openEdit(item)}
                        onDelete={() => setDeleting(item)}
                        onPrint={() => void handlePrint(item)}
                        editLabel="Ubah data USG"
                        deleteLabel="Hapus data USG"
                        printLabel={printingId === item.id ? 'Membuat PDF...' : 'Cetak hasil USG'}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ListPageShell>

      <ConfirmModal
        open={deleting !== null}
        title="Hapus Data USG"
        message={`Yakin hapus data USG "${deleting?.namaPasien ?? ''}"?`}
        loading={submitting}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDeleteConfirm()}
      />

      <UsgPdfPreviewModal
        open={previewBlob !== null}
        blob={previewBlob}
        filename={previewFilename}
        onClose={() => setPreviewBlob(null)}
      />
    </>
  );
}

interface UsgPdfPreviewModalProps {
  readonly open: boolean;
  readonly blob: Blob | null;
  readonly filename: string;
  readonly onClose: () => void;
}

function UsgPdfPreviewModal({ open, blob, filename, onClose }: UsgPdfPreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  function handlePrint() {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  }

  function handleDownload() {
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <Modal open={open} title="Pratinjau Hasil USG" onClose={onClose} size="xl">
      <div className="pdf-preview__toolbar">
        <button type="button" className="btn btn--primary btn--sm" onClick={handlePrint}>
          Cetak
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={handleDownload}>
          Unduh PDF
        </button>
      </div>
      {url ? (
        <iframe ref={iframeRef} title="Pratinjau PDF USG" className="pdf-preview__frame" src={url} />
      ) : (
        <p className="loading-text">Menyiapkan PDF…</p>
      )}
    </Modal>
  );
}
