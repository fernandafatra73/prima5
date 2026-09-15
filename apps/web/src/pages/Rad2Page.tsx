import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { CetakALModal } from '../components/CetakALModal.tsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { TableRowActions } from '../components/ui/TableRowActions.tsx';
import { useListQueryParams, useListSearch } from '../hooks/useListQueryParams.ts';
import { useMutationReload } from '../hooks/useMutationReload.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiDelete, apiGet, apiPatch } from '../lib/api.ts';
import { formatDateShort, formatRupiah, formatUmurDetail } from '../lib/format.ts';
import type { PaginatedResponse } from '../lib/pagination.ts';
import { printPasienReport } from '../lib/pasienPrint.ts';
import { formatKlinisDisplay, parseKlinisData, serializeKlinisData } from '../lib/penunjang.ts';
import { computeRad2RowNumber, parseRad2Nominal, sumRad2Totals } from '../lib/rad2.ts';
import '../components/ui/ui.css';

interface Rad2Row {
  readonly id: string;
  readonly regCode: string;
  readonly nama: string;
  readonly tanggalLahir: string;
  readonly alamat: string | null;
  readonly klinis: string | null;
  readonly kesan: string | null;
  readonly pengirim: { readonly id: string; readonly nama: string };
  readonly radiolog: { readonly id: string; readonly nama: string } | null;
  readonly pemeriksaan: readonly { readonly nama: string; readonly harga: string }[];
  readonly totalHarga: string;
  readonly sharingAmount: string;
  readonly totalSharing: string;
  readonly createdAt: string;
}

interface Radiolog {
  readonly id: string;
  readonly nama: string;
}

interface EditFormState {
  readonly id: string;
  readonly nama: string;
  readonly alamat: string;
  readonly klinisText: string;
  readonly kesan: string;
  readonly radiologId: string;
  readonly harga: string;
  readonly sharing: string;
  /** Rad/Lab tambahan disimpan di kolom klinis yang sama; dibawa apa adanya supaya tidak hilang saat klinis diubah. */
  readonly radTambahan: readonly string[];
  readonly labTambahan: readonly string[];
}

type CetakALMode = 'amplop' | 'label';

const moneyCellStyle: CSSProperties = { textAlign: 'right', whiteSpace: 'nowrap' };
const longTextCellStyle: CSSProperties = { minWidth: '110px', maxWidth: '220px', whiteSpace: 'pre-wrap' };
const smallBtnStyle: CSSProperties = { border: '1px solid var(--color-border)', whiteSpace: 'nowrap' };

function toEditForm(row: Rad2Row): EditFormState {
  const klinis = parseKlinisData(row.klinis);
  return {
    id: row.id,
    nama: row.nama,
    alamat: row.alamat ?? '',
    klinisText: klinis.text,
    kesan: row.kesan ?? '',
    radiologId: row.radiolog?.id ?? '',
    harga: String(Math.round(Number(row.totalHarga) || 0)),
    sharing: String(Math.round(Number(row.sharingAmount) || 0)),
    radTambahan: klinis.radTambahan,
    labTambahan: klinis.labTambahan,
  };
}

/** Daftar pasien radiologi ringkas (Rad2) dengan kolom harga & sharing,
 * memakai data dan endpoint yang sama dengan halaman Registrasi Radiologi. */
export function Rad2Page() {
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({ modul: 'RADIOLOGI' }, search);
  const { items, pagination, setPage, loading, error, reload: reloadList, setError } =
    usePaginatedList<Rad2Row>('/api/pasien', queryParams);
  const reload = useMutationReload(reloadList);

  const [radiologList, setRadiologList] = useState<Radiolog[]>([]);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Rad2Row | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [cetakAL, setCetakAL] = useState<{ readonly row: Rad2Row; readonly mode: CetakALMode } | null>(null);

  useEffect(() => {
    apiGet<PaginatedResponse<Radiolog>>('/api/radiolog?page=1&limit=200')
      .then((res) => setRadiologList(res.items))
      .catch(() => setRadiologList([]));
  }, []);

  const totals = sumRad2Totals(items);

  async function handlePrint(id: string) {
    setPrintingId(id);
    setError(null);
    try {
      await printPasienReport(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuat PDF');
    } finally {
      setPrintingId(null);
    }
  }

  function updateEditForm(patch: Partial<Omit<EditFormState, 'id'>>) {
    setEditForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editForm) return;
    const harga = parseRad2Nominal(editForm.harga);
    const sharing = parseRad2Nominal(editForm.sharing);
    if (harga === null || sharing === null) {
      setEditError('Harga dan sharing harus berupa angka bulat ≥ 0');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await apiPatch(`/api/pasien/${editForm.id}`, {
        nama: editForm.nama,
        alamat: editForm.alamat,
        klinis: serializeKlinisData(editForm.klinisText, [...editForm.radTambahan], [...editForm.labTambahan]),
        kesan: editForm.kesan,
        radiologId: editForm.radiologId || null,
        harga,
        sharingAmount: sharing,
      });
      setEditForm(null);
      await reload();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan');
    } finally {
      setEditSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError(null);
    try {
      await apiDelete(`/api/pasien/${deleteTarget.id}`);
      setDeleteTarget(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <ListPageShell
        title="Rad2"
        subtitle="Data pasien radiologi beserta harga dan sharing"
        searchPlaceholder="Cari nama / no registrasi…"
        searchValue={search}
        onSearchChange={setSearch}
        onRefresh={() => void reload()}
        error={error}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Umur</th>
                <th>Alamat</th>
                <th>Tanggal</th>
                <th>Pemeriksaan</th>
                <th>Pengirim</th>
                <th>Klinis</th>
                <th>Kesan</th>
                <th>Radiolog</th>
                <th>Aksi</th>
                <th style={moneyCellStyle}>Harga</th>
                <th style={moneyCellStyle}>Sharing</th>
                <th style={moneyCellStyle}>Total Sharing</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={14}>Belum ada pasien.</td>
                </tr>
              ) : (
                items.map((p, index) => (
                  <tr key={p.id}>
                    <td>{computeRad2RowNumber(pagination, index)}</td>
                    <td>{p.nama}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatUmurDetail(p.tanggalLahir)}</td>
                    <td>{p.alamat || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDateShort(p.createdAt)}</td>
                    <td>{p.pemeriksaan.map((x) => x.nama).join(', ') || '—'}</td>
                    <td>{p.pengirim.nama}</td>
                    <td style={longTextCellStyle}>{formatKlinisDisplay(p.klinis) || '—'}</td>
                    <td style={longTextCellStyle}>{p.kesan || '—'}</td>
                    <td>{p.radiolog?.nama ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
                        <TableRowActions
                          onPrint={() => void handlePrint(p.id)}
                          onEdit={() => {
                            setEditError(null);
                            setEditForm(toEditForm(p));
                          }}
                          onDelete={() => setDeleteTarget(p)}
                          printLabel={printingId === p.id ? 'Membuat PDF…' : 'Cetak hasil radiologi'}
                        />
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button
                            type="button"
                            className="btn btn--xs btn--ghost"
                            style={smallBtnStyle}
                            onClick={() => setCetakAL({ row: p, mode: 'amplop' })}
                            title="Cetak Amplop"
                          >
                            ✉ Amplop
                          </button>
                          <button
                            type="button"
                            className="btn btn--xs btn--ghost"
                            style={smallBtnStyle}
                            onClick={() => setCetakAL({ row: p, mode: 'label' })}
                            title="Cetak Label"
                          >
                            🏷 Label
                          </button>
                        </div>
                      </div>
                    </td>
                    <td style={moneyCellStyle}>{formatRupiah(p.totalHarga)}</td>
                    <td style={moneyCellStyle}>{formatRupiah(p.sharingAmount)}</td>
                    <td style={moneyCellStyle}>{formatRupiah(p.totalSharing)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 700 }}>
                  <td colSpan={11} style={{ textAlign: 'right' }}>
                    Total halaman ini
                  </td>
                  <td style={moneyCellStyle}>{formatRupiah(totals.totalHarga)}</td>
                  <td />
                  <td style={moneyCellStyle}>{formatRupiah(totals.totalSharing)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </ListPageShell>

      <Modal open={editForm !== null} title="Edit Rad2" onClose={() => setEditForm(null)} size="lg">
        {editForm && (
          <form onSubmit={(e) => void submitEdit(e)} className="form-grid">
            {editError && <div className="alert alert--error form-grid--full">{editError}</div>}
            <div className="form-field">
              <label htmlFor="rad2-nama">Nama *</label>
              <input
                id="rad2-nama"
                required
                value={editForm.nama}
                onChange={(e) => updateEditForm({ nama: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label htmlFor="rad2-alamat">Alamat</label>
              <input
                id="rad2-alamat"
                value={editForm.alamat}
                onChange={(e) => updateEditForm({ alamat: e.target.value })}
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="rad2-klinis">Klinis</label>
              <textarea
                id="rad2-klinis"
                rows={2}
                value={editForm.klinisText}
                onChange={(e) => updateEditForm({ klinisText: e.target.value })}
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="rad2-kesan">Kesan</label>
              <textarea
                id="rad2-kesan"
                rows={5}
                value={editForm.kesan}
                onChange={(e) => updateEditForm({ kesan: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label htmlFor="rad2-radiolog">Radiolog</label>
              <select
                id="rad2-radiolog"
                value={editForm.radiologId}
                onChange={(e) => updateEditForm({ radiologId: e.target.value })}
              >
                <option value="">— Tidak ada —</option>
                {radiologList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nama}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="rad2-harga">Harga (Rp) *</label>
              <input
                id="rad2-harga"
                inputMode="numeric"
                required
                value={editForm.harga}
                onChange={(e) => updateEditForm({ harga: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label htmlFor="rad2-sharing">Sharing (Rp) *</label>
              <input
                id="rad2-sharing"
                inputMode="numeric"
                required
                value={editForm.sharing}
                onChange={(e) => updateEditForm({ sharing: e.target.value })}
              />
            </div>
            <ModalFormFooter onCancel={() => setEditForm(null)} submitLabel="Simpan" loading={editSaving} />
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus pasien"
        message={deleteTarget ? `Hapus data pasien "${deleteTarget.nama}"?` : ''}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />

      {/* key memaksa mount ulang: CetakALModal hanya membaca initialMode saat mount. */}
      <CetakALModal
        key={cetakAL ? `${cetakAL.row.id}-${cetakAL.mode}` : 'closed'}
        open={cetakAL !== null}
        initialMode={cetakAL?.mode ?? 'amplop'}
        pasien={cetakAL?.row ?? null}
        onClose={() => setCetakAL(null)}
      />
    </>
  );
}
