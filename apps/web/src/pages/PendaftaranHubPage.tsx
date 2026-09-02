import { useState } from 'react';
import { PendaftaranUmumPage } from './PendaftaranUmumPage.tsx';
import { AdminKlinikPage } from './AdminKlinikPage.tsx';
import { AbsensiAdminKlinikPage } from './AbsensiAdminKlinikPage.tsx';

const PENDAFTARAN_TABS = [
  { id: 'pendaftaran-umum', label: 'Pendaftaran Umum' },
  { id: 'admin-klinik', label: 'Admin Klinik' },
  { id: 'absensi-admin-klinik', label: 'Absensi' },
] as const;

type PendaftaranTabId = (typeof PENDAFTARAN_TABS)[number]['id'];

function renderTabContent(tabId: PendaftaranTabId) {
  switch (tabId) {
    case 'pendaftaran-umum':
      return <PendaftaranUmumPage />;
    case 'admin-klinik':
      return <AdminKlinikPage />;
    case 'absensi-admin-klinik':
      return <AbsensiAdminKlinikPage />;
    default: {
      const exhaustiveCheck: never = tabId;
      return exhaustiveCheck;
    }
  }
}

/** Menggabungkan Pendaftaran Umum dan Admin Klinik ke dalam satu halaman
 * dengan tab. */
export function PendaftaranHubPage() {
  const [activeTab, setActiveTab] = useState<PendaftaranTabId>('pendaftaran-umum');

  return (
    <>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {PENDAFTARAN_TABS.map((tab) => (
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
      {renderTabContent(activeTab)}
    </>
  );
}
