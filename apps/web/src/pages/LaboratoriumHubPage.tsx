import { useEffect, useState, type FormEvent } from 'react';
import type { AppViewId } from '../config/navigation.ts';
import { Modal } from '../components/ui/Modal.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { apiGet, apiPut } from '../lib/api.ts';
import { LaboratoriumPage } from './LaboratoriumPage.tsx';
import { LabDuplikatPage } from './LabDuplikatPage.tsx';
import { KwitansiLaboratoriumPage } from './KwitansiLaboratoriumPage.tsx';
import { SharingArsipPage } from './SharingArsipPage.tsx';
import { HargaPemeriksaanLabPage } from './HargaPemeriksaanLabPage.tsx';
import { CetakLabLabPage } from './CetakLabLabPage.tsx';
import { PaketLabMasterPage } from './PaketLabMasterPage.tsx';
import { PetugasLabPage } from './PetugasLabPage.tsx';
import { KlasifikasiPaketPage } from './KlasifikasiPaketPage.tsx';
import { HitunganLedPage } from './HitunganLedPage.tsx';
import { KaryawanPage } from './KaryawanPage.tsx';

const LABORATORIUM_TABS = [
  { id: 'lab', label: 'Registrasi Lab' },
  { id: 'lab-duplikat', label: 'Duplikat Registrasi' },
  { id: 'kwitansi-laboratorium', label: 'Kwitansi' },
  { id: 'sharing-lab', label: 'Sharing Lab' },
  { id: 'harga-pemeriksaan-lab', label: 'Harga Pemeriksaan Lab' },
  { id: 'cetak-amplop-lab', label: 'Cetak Amplop' },
  { id: 'cetak-label-lab', label: 'Cetak Label' },
  { id: 'paket-lab-master', label: 'Jenis Pemeriksaan Lab' },
  { id: 'petugas-lab-master', label: 'Analis' },
  { id: 'klasifikasi-paket', label: 'Klasifikasi Paket' },
  { id: 'hitungan-led', label: 'Hitungan LED' },
  { id: 'karyawan-laboratorium', label: 'Daftar Karyawan' },
] as const;

type LaboratoriumTabId = (typeof LABORATORIUM_TABS)[number]['id'];

function isLaboratoriumTabId(value: AppViewId): value is LaboratoriumTabId {
  return (LABORATORIUM_TABS as readonly { readonly id: string }[]).some((tab) => tab.id === value);
}

function renderTabContent(tabId: LaboratoriumTabId, goToTab: (tab: LaboratoriumTabId) => void) {
  switch (tabId) {
    case 'lab':
      return (
        <LaboratoriumPage
          onNavigate={(view) => {
            if (isLaboratoriumTabId(view)) goToTab(view);
          }}
        />
      );
    case 'lab-duplikat':
      return <LabDuplikatPage />;
    case 'kwitansi-laboratorium':
      return <KwitansiLaboratoriumPage />;
    case 'sharing-lab':
      return <SharingArsipPage modul="LABORATORIUM" />;
    case 'harga-pemeriksaan-lab':
      return <HargaPemeriksaanLabPage />;
    case 'cetak-amplop-lab':
      return <CetakLabLabPage mode="amplop" />;
    case 'cetak-label-lab':
      return <CetakLabLabPage mode="label" />;
    case 'paket-lab-master':
      return <PaketLabMasterPage />;
    case 'petugas-lab-master':
      return <PetugasLabPage />;
    case 'klasifikasi-paket':
      return <KlasifikasiPaketPage />;
    case 'hitungan-led':
      return <HitunganLedPage />;
    case 'karyawan-laboratorium':
      return <KaryawanPage departemen="LABORATORIUM" />;
    default: {
      const exhaustiveCheck: never = tabId;
      return exhaustiveCheck;
    }
  }
}

const REAGEN_REMINDER_STORAGE_KEY = 'labprima-reagen-stock-opname-reminder-tanggal';

const DEFAULT_REAGEN_REMINDER_PESAN =
  'Perhatian, sudah tanggal 20. Segera hitung stock opname laboratorium, dan lakukan pembelian jika stok kurang.';

interface ReagenReminderSetting {
  readonly tanggal: number;
  readonly pesan: string;
}

/** Ucapkan teks lewat speaker, pola sama seperti peringatan stok film di
 * PemakaianFilmPage. */
function speakText(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'id-ID';
  utter.rate = 0.95;
  utter.pitch = 1;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

/** Menggabungkan seluruh sub-halaman modul Laboratorium ke dalam satu
 * halaman dengan tab, menggantikan dropdown navbar Laboratorium yang
 * sebelumnya membuka jendela terpisah per menu. */
export function LaboratoriumHubPage() {
  const [activeTab, setActiveTab] = useState<LaboratoriumTabId>('lab');

  const [reminderSetting, setReminderSetting] = useState<ReagenReminderSetting | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [form, setForm] = useState({ tanggal: '20', pesan: DEFAULT_REAGEN_REMINDER_PESAN });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{ item: ReagenReminderSetting }>('/api/reagen-reminder-setting');
        setReminderSetting(res.item);
      } catch {
        // Gagal memuat pengaturan — pakai default (tanggal 20) sampai berhasil dimuat ulang.
        setReminderSetting({ tanggal: 20, pesan: DEFAULT_REAGEN_REMINDER_PESAN });
      }
    })();
  }, []);

  // Ucapkan pengingat stock opname reagen sekali per hari, pada tanggal &
  // dengan isi teks sesuai pengaturan (bukan setiap kali tab Laboratorium
  // dibuka di hari yang sama).
  useEffect(() => {
    if (!reminderSetting) return;
    const now = new Date();
    if (now.getDate() !== reminderSetting.tanggal) return;
    const todayKey = now.toISOString().split('T')[0] ?? '';
    try {
      if (window.localStorage.getItem(REAGEN_REMINDER_STORAGE_KEY) === todayKey) return;
      window.localStorage.setItem(REAGEN_REMINDER_STORAGE_KEY, todayKey);
    } catch {
      // localStorage tidak tersedia (mis. private mode) — tetap ucapkan sekali.
    }
    speakText(reminderSetting.pesan);
  }, [reminderSetting]);

  function openSettings() {
    setForm({
      tanggal: String(reminderSetting?.tanggal ?? 20),
      pesan: reminderSetting?.pesan ?? DEFAULT_REAGEN_REMINDER_PESAN,
    });
    setSaveError(null);
    setSettingsOpen(true);
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await apiPut<{ item: ReagenReminderSetting }>('/api/reagen-reminder-setting', {
        tanggal: Number(form.tanggal) || 20,
        pesan: form.pesan,
      });
      setReminderSetting(res.item);
      setSettingsOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan pengingat');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {LABORATORIUM_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`btn btn--sm ${activeTab === tab.id ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setActiveTab(tab.id)}
              style={activeTab !== tab.id ? { border: '1px solid var(--color-border)' } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={openSettings}
          style={{ border: '1px solid var(--color-border)' }}
          title="Atur tanggal & isi suara pengingat stock opname reagen"
        >
          🔊 Pengingat Reagen
        </button>
      </div>
      {renderTabContent(activeTab, setActiveTab)}

      <Modal open={settingsOpen} title="Pengaturan Pengingat Stock Opname Reagen" onClose={() => setSettingsOpen(false)}>
        <form onSubmit={(e) => void handleSaveSettings(e)} className="form-grid">
          {saveError && <p className="alert alert--error form-field--full">{saveError}</p>}
          <div className="form-field">
            <label htmlFor="reagen-tanggal">Tanggal Pengingat (1-31)</label>
            <input
              id="reagen-tanggal"
              type="number"
              min="1"
              max="31"
              required
              value={form.tanggal}
              onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
            />
          </div>
          <div className="form-field form-field--full">
            <label htmlFor="reagen-pesan">Isi Suara Pengingat</label>
            <textarea
              id="reagen-pesan"
              rows={4}
              required
              value={form.pesan}
              onChange={(e) => setForm((f) => ({ ...f, pesan: e.target.value }))}
            />
          </div>
          <div className="form-field form-field--full">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => speakText(form.pesan)}
              style={{ border: '1px solid var(--color-border)' }}
            >
              🔊 Tes Suara
            </button>
          </div>
          <ModalFormFooter onCancel={() => setSettingsOpen(false)} submitLabel="Simpan" loading={saving} />
        </form>
      </Modal>
    </>
  );
}
