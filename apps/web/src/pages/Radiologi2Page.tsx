import { useState } from 'react';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import {
  RadiologWorklistContextMenu,
  type RadiologWorklistMenuAction,
} from '../components/ui/RadiologWorklistContextMenu.tsx';
import { useListQueryParams, useListSearch } from '../hooks/useListQueryParams.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import '../components/ui/ui.css';

interface WorklistItem {
  readonly id: string;
  readonly regCode: string;
  readonly nama: string;
  readonly tanggalLahir: string;
  readonly pemeriksaanNama: string;
  readonly radiologNama: string | null;
  readonly hasilStatus: 'MENUNGGU_HASIL' | 'SELESAI';
  readonly createdAt: string;
}

const ACTION_LABEL: Record<RadiologWorklistMenuAction, string> = {
  'new-add-tab': 'New › Add Tab',
  'related-replace-tab': 'Related › Replace Tab',
  'related-add-tab': 'Related › Add Tab',
  verify: 'Verify',
  unverify: 'Unverify',
  teleradiology: 'Teleradiology',
  'ai-request': 'AI Request',
  export: 'Export',
  download: 'Download',
  copy: 'Copy',
};

function toBirthDateCode(tanggalLahir: string): string {
  const d = new Date(tanggalLahir);
  if (isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function toStudyDate(createdAt: string): string {
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

interface ContextMenuState {
  readonly x: number;
  readonly y: number;
  readonly item: WorklistItem;
}

/** Worklist Radiologi2 — tampilan mirip worklist PACS/RIS (BirthDate, Sex,
 * Modality, Modality Group, BodyPart, StudyDesc, StudyDate, Verify) dengan
 * menu klik-kanan (New/Related/Verify/Teleradiology/AI Request/Export/
 * Download/Copy) yang seluruh itemnya aktif. */
export function Radiologi2Page() {
  const { search, setSearch } = useListSearch();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const queryParams = useListQueryParams({ modul: 'RADIOLOGI' }, search);
  const { items, pagination, setPage, loading, error, reload } = usePaginatedList<WorklistItem>(
    '/api/pasien-duplikat',
    queryParams,
  );

  function openContextMenu(e: React.MouseEvent, item: WorklistItem) {
    e.preventDefault();
    setSelectedId(item.id);
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  }

  function handleMenuAction(action: RadiologWorklistMenuAction) {
    if (!contextMenu) return;
    setLastAction(`${ACTION_LABEL[action]} — ${contextMenu.item.nama} (${contextMenu.item.regCode})`);
  }

  return (
    <>
      <ListPageShell
        title="Radiologi2 — Worklist"
        subtitle="Worklist radiologi dengan menu klik-kanan (New, Related, Verify, Teleradiology, AI Request, Export, Download, Copy)"
        searchPlaceholder="Cari nama atau no. reg…"
        searchValue={search}
        onSearchChange={setSearch}
        onRefresh={() => void reload()}
        error={error}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
      >
        {lastAction && (
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              borderRadius: 'var(--radius-card)',
              padding: '0.6rem 0.9rem',
              marginBottom: '0.75rem',
              fontSize: '0.85rem',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <span>✅ Aksi dijalankan: {lastAction}</span>
            <button
              type="button"
              onClick={() => setLastAction(null)}
              style={{ background: 'transparent', border: 'none', color: '#1d4ed8', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
          Klik kanan pada baris untuk membuka menu.
        </p>

        <table className="data-table">
          <thead>
            <tr>
              <th>PF</th>
              <th>BirthDate</th>
              <th>Sex</th>
              <th>Modality</th>
              <th>Modality Group</th>
              <th>BodyPart</th>
              <th>StudyDesc</th>
              <th>StudyDate</th>
              <th>Verify</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9}>Tidak ada data worklist.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  onContextMenu={(e) => openContextMenu(e, item)}
                  onClick={() => setSelectedId(item.id)}
                  style={{
                    cursor: 'context-menu',
                    background: selectedId === item.id ? 'rgba(47,111,237,0.12)' : undefined,
                  }}
                >
                  <td></td>
                  <td>{toBirthDateCode(item.tanggalLahir)}</td>
                  <td>—</td>
                  <td>DX</td>
                  <td>Unknown</td>
                  <td>-</td>
                  <td>{item.pemeriksaanNama || '—'}</td>
                  <td>{toStudyDate(item.createdAt)}</td>
                  <td>{item.radiologNama ?? (item.hasilStatus === 'SELESAI' ? 'Selesai' : '—')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ListPageShell>

      {contextMenu && (
        <RadiologWorklistContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAction={handleMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
