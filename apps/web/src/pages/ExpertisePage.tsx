import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { TableRowActions } from '../components/ui/TableRowActions.tsx';
import '../components/ui/ui.css';

interface ExpertiseItem {
  readonly id: string;
  readonly nama: string;
  readonly umur: string;
  readonly alamat: string;
  readonly tanggal: string;
  readonly pemeriksaan: string;
  readonly klinis: string;
  readonly kesan: string;
}

const STORAGE_KEY = 'expertise_items_v1';

const emptyForm = {
  nama: '',
  umur: '',
  alamat: '',
  tanggal: new Date().toISOString().split('T')[0]!,
  pemeriksaan: '',
  klinis: '',
  kesan: '',
};

function loadItems(): readonly ExpertiseItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ExpertiseItem[]) : [];
  } catch {
    return [];
  }
}

function saveItems(items: readonly ExpertiseItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function formatTanggalDisplay(dateStr: string): string {
  if (!dateStr) return '-';
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

/** Data Expertise disimpan sepenuhnya di localStorage browser — bukan data
 * pasien/pemeriksaan sungguhan, tidak terhubung ke API/database manapun. */
export function ExpertisePage() {
  const [items, setItems] = useState<readonly ExpertiseItem[]>([]);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ExpertiseItem | null>(null);
  const [deleting, setDeleting] = useState<ExpertiseItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setItems(loadItems());
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.nama, item.alamat, item.pemeriksaan, item.klinis, item.kesan].some((field) =>
        field.toLowerCase().includes(q),
      ),
    );
  }, [items, search]);

  function openCreate() {
    setForm(emptyForm);
    setCreateOpen(true);
  }

  function openEdit(item: ExpertiseItem) {
    setForm({
      nama: item.nama,
      umur: item.umur,
      alamat: item.alamat,
      tanggal: item.tanggal,
      pemeriksaan: item.pemeriksaan,
      klinis: item.klinis,
      kesan: item.kesan,
    });
    setEditing(item);
  }

  function closeModal() {
    setCreateOpen(false);
    setEditing(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nama.trim()) return;

    const next = editing
      ? items.map((item) =>
          item.id === editing.id
            ? {
                ...item,
                nama: form.nama.trim(),
                umur: form.umur.trim(),
                alamat: form.alamat.trim(),
                tanggal: form.tanggal,
                pemeriksaan: form.pemeriksaan.trim(),
                klinis: form.klinis.trim(),
                kesan: form.kesan.trim(),
              }
            : item,
        )
      : [
          ...items,
          {
            id: crypto.randomUUID(),
            nama: form.nama.trim(),
            umur: form.umur.trim(),
            alamat: form.alamat.trim(),
            tanggal: form.tanggal,
            pemeriksaan: form.pemeriksaan.trim(),
            klinis: form.klinis.trim(),
            kesan: form.kesan.trim(),
          },
        ];

    setItems(next);
    saveItems(next);
    closeModal();
  }

  function handleDeleteConfirm() {
    if (!deleting) return;
    const next = items.filter((item) => item.id !== deleting.id);
    setItems(next);
    saveItems(next);
    setDeleting(null);
  }

  return (
    <>
      <ListPageShell
        title="Expertise"
        subtitle="Catatan hasil bacaan Expertise — data lokal di perangkat ini, tidak terhubung ke database manapun."
        metrics={[
          { label: 'Total Data', value: String(items.length), tone: 'blue', iconKind: 'document' },
        ]}
        searchPlaceholder="Cari nama, alamat, pemeriksaan, klinis, kesan..."
        searchValue={search}
        onSearchChange={setSearch}
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
              <th>Nama</th>
              <th>Umur</th>
              <th>Tanggal</th>
              <th>Pemeriksaan</th>
              <th>Kesan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  Belum ada data Expertise.
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>{item.nama}</strong>
                  </td>
                  <td>{item.umur || '-'}</td>
                  <td>{formatTanggalDisplay(item.tanggal)}</td>
                  <td>{item.pemeriksaan || '-'}</td>
                  <td
                    style={{
                      maxWidth: 260,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={item.kesan}
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
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-field form-field--full">
              <label htmlFor="expertise-nama">Nama *</label>
              <input
                id="expertise-nama"
                type="text"
                required
                value={form.nama}
                onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                placeholder="Nama pasien..."
              />
            </div>
            <div className="form-field">
              <label htmlFor="expertise-umur">Umur</label>
              <input
                id="expertise-umur"
                type="text"
                value={form.umur}
                onChange={(e) => setForm((f) => ({ ...f, umur: e.target.value }))}
                placeholder="Contoh: 35 tahun"
              />
            </div>
            <div className="form-field">
              <label htmlFor="expertise-tanggal">Tanggal</label>
              <input
                id="expertise-tanggal"
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="expertise-alamat">Alamat</label>
              <input
                id="expertise-alamat"
                type="text"
                value={form.alamat}
                onChange={(e) => setForm((f) => ({ ...f, alamat: e.target.value }))}
                placeholder="Alamat pasien..."
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="expertise-pemeriksaan">Pemeriksaan</label>
              <input
                id="expertise-pemeriksaan"
                type="text"
                value={form.pemeriksaan}
                onChange={(e) => setForm((f) => ({ ...f, pemeriksaan: e.target.value }))}
                placeholder="Jenis pemeriksaan..."
              />
            </div>
            <div className="form-field form-field--full">
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
            <ModalFormFooter
              onCancel={closeModal}
              submitLabel={editing ? 'Simpan Perubahan' : 'Simpan'}
            />
          </form>
        </Modal>
      )}

      <ConfirmModal
        open={deleting !== null}
        title="Hapus Expertise"
        message={`Yakin hapus data Expertise "${deleting?.nama ?? ''}"?`}
        onClose={() => setDeleting(null)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
