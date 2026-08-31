import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { TableRowActions } from '../components/ui/TableRowActions.tsx';
import { useListQueryParams, useListSearch } from '../hooks/useListQueryParams.ts';
import { useMutationReload } from '../hooks/useMutationReload.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiDelete, apiPatch, apiPost } from '../lib/api.ts';
import '../components/ui/ui.css';

interface ExpertiseItem {
  readonly id: string;
  readonly pemeriksaan: string | null;
  readonly klinis: string | null;
  readonly namaPenyakit: string | null;
  readonly fotoDataUrl: string | null;
  readonly kesan: string | null;
}

const emptyForm = {
  pemeriksaan: '',
  klinis: '',
  namaPenyakit: '',
  fotoDataUrl: '',
  kesan: '',
};

/** Katalog referensi Expertise (per jenis pemeriksaan/penyakit) — bukan data
 * per pasien. Tersimpan di database sendiri (bukan localStorage) supaya bisa
 * dibuka dari komputer manapun yang login ke aplikasi ini. */
export function ExpertisePage() {
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({}, search);
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<ExpertiseItem>('/api/expertise', queryParams);
  const reload = useMutationReload(reloadList);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ExpertiseItem | null>(null);
  const [deleting, setDeleting] = useState<ExpertiseItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setCreateOpen(true);
  }

  function openEdit(item: ExpertiseItem) {
    setForm({
      pemeriksaan: item.pemeriksaan ?? '',
      klinis: item.klinis ?? '',
      namaPenyakit: item.namaPenyakit ?? '',
      fotoDataUrl: item.fotoDataUrl ?? '',
      kesan: item.kesan ?? '',
    });
    setError(null);
    setEditing(item);
  }

  function closeModal() {
    setCreateOpen(false);
    setEditing(null);
  }

  function handleFotoFileChange(e: ChangeEvent<HTMLInputElement>) {
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        pemeriksaan: form.pemeriksaan.trim() || undefined,
        klinis: form.klinis.trim() || undefined,
        namaPenyakit: form.namaPenyakit.trim() || undefined,
        fotoDataUrl: form.fotoDataUrl || undefined,
        kesan: form.kesan.trim() || undefined,
      };
      if (editing) {
        await apiPatch(`/api/expertise/${editing.id}`, body);
      } else {
        await apiPost('/api/expertise', body);
      }
      closeModal();
      await reload({ resetPage: !editing });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan Expertise');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiDelete(`/api/expertise/${deleting.id}`);
      setDeleting(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus Expertise');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ListPageShell
        title="Expertise"
        subtitle="Katalog referensi hasil bacaan Expertise per jenis pemeriksaan/penyakit."
        metrics={[
          { label: 'Total Data', value: String(pagination.total), tone: 'blue', iconKind: 'document' },
        ]}
        searchPlaceholder="Cari pemeriksaan, nama penyakit, klinis, kesan..."
        searchValue={search}
        onSearchChange={setSearch}
        onRefresh={() => void reload()}
        error={error}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        action={
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            + Tambah Expertise
          </button>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Foto</th>
              <th>Nama Penyakit</th>
              <th>Pemeriksaan</th>
              <th>Kesan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  Belum ada data Expertise.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id}>
                  <td>{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                  <td>
                    {item.fotoDataUrl ? (
                      <img
                        src={item.fotoDataUrl}
                        alt={item.namaPenyakit || 'Foto Expertise'}
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <strong>{item.namaPenyakit || '-'}</strong>
                  </td>
                  <td>{item.pemeriksaan || '-'}</td>
                  <td
                    style={{
                      maxWidth: 260,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={item.kesan ?? ''}
                  >
                    {item.kesan || '-'}
                  </td>
                  <td>
                    <TableRowActions
                      onEdit={() => openEdit(item)}
                      onDelete={() => setDeleting(item)}
                      editLabel="Ubah data Expertise"
                      deleteLabel="Hapus data Expertise"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ListPageShell>

      {(createOpen || editing) && (
        <Modal
          open={true}
          title={editing ? 'Ubah Expertise' : 'Tambah Expertise'}
          onClose={closeModal}
        >
          <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
            <div className="form-field">
              <label htmlFor="expertise-nama-penyakit">Nama Penyakit</label>
              <input
                id="expertise-nama-penyakit"
                type="text"
                value={form.namaPenyakit}
                onChange={(e) => setForm((f) => ({ ...f, namaPenyakit: e.target.value }))}
                placeholder="Nama penyakit..."
              />
            </div>
            <div className="form-field">
              <label htmlFor="expertise-pemeriksaan">Pemeriksaan</label>
              <input
                id="expertise-pemeriksaan"
                type="text"
                value={form.pemeriksaan}
                onChange={(e) => setForm((f) => ({ ...f, pemeriksaan: e.target.value }))}
                placeholder="Jenis pemeriksaan..."
              />
            </div>
            <div className="form-field" style={{ gridColumn: '2 / 3' }}>
              <label htmlFor="expertise-klinis">Klinis</label>
              <textarea
                id="expertise-klinis"
                rows={3}
                value={form.klinis}
                onChange={(e) => setForm((f) => ({ ...f, klinis: e.target.value }))}
                placeholder="Catatan klinis..."
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="expertise-kesan">Kesan</label>
              <textarea
                id="expertise-kesan"
                rows={3}
                value={form.kesan}
                onChange={(e) => setForm((f) => ({ ...f, kesan: e.target.value }))}
                placeholder="Kesan hasil bacaan..."
              />
            </div>
            <div className="form-field form-field--full" style={{ textAlign: 'center' }}>
              <label
                htmlFor="expertise-foto"
                style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}
              >
                Foto
              </label>
              {!form.fotoDataUrl ? (
                <label
                  htmlFor="expertise-foto"
                  className="aifoto-upload aifoto-photo-box"
                  style={{ cursor: 'pointer', height: 180, width: 180, margin: '0.4rem auto 0' }}
                >
                  <span className="aifoto-upload__icon">📤</span>
                  <p className="aifoto-upload__hint">Klik untuk unggah</p>
                </label>
              ) : (
                <div
                  className="aifoto-photo-box aifoto-photo-box--filled"
                  style={{ height: 180, width: 180, margin: '0.4rem auto 0' }}
                >
                  <img src={form.fotoDataUrl} alt="Preview foto Expertise" />
                </div>
              )}
              <input
                id="expertise-foto"
                type="file"
                accept="image/*"
                onChange={handleFotoFileChange}
                style={form.fotoDataUrl ? { display: 'block', margin: '0.4rem auto 0' } : { display: 'none' }}
              />
            </div>
            <ModalFormFooter
              onCancel={closeModal}
              submitLabel={editing ? 'Simpan Perubahan' : 'Simpan'}
              loading={submitting}
            />
          </form>
        </Modal>
      )}

      <ConfirmModal
        open={deleting !== null}
        title="Hapus Expertise"
        message={`Yakin hapus data Expertise "${deleting?.namaPenyakit ?? ''}"?`}
        loading={submitting}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </>
  );
}
