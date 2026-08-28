import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { apiGet } from '../lib/api.ts';
import { formatRupiah } from '../lib/format.ts';
import '../components/ui/ui.css';

interface BulanPajakBulananItem {
  readonly no: number;
  readonly bulan: string;
  readonly jumlahPasien: number;
  readonly harga: number;
  readonly pendapatan: number;
  readonly biayaSewaTempat: number;
  readonly biayaListrikAir: number;
  readonly gajiFernanda: number;
  readonly gajiChalimatusadiah: number;
  readonly gajiRiki: number;
  readonly gajiAgung: number;
  readonly gajiKaryawan1: number;
  readonly gajiKaryawan2: number;
  readonly bahanRoentgen: number;
  readonly peralatanRoentgen: number;
  readonly penyusutanManual: number;
  readonly perbaikanAlat: number;
  readonly totalBebanUsaha: number;
  readonly labaBersih: number;
  readonly hargaPeralatan: number;
  readonly tarifPenyusutanTahunanPersen: number;
  readonly penyusutanPeralatanBulan: number;
  readonly akumulasiPenyusutanAwal: number;
  readonly akumulasiPenyusutanAkhir: number;
  readonly modalAwal: number;
  readonly modalAkhir: number;
  readonly kasAwal: number;
  readonly kasAkhir: number;
  readonly piutangUsaha: number;
  readonly perlengkapan: number;
  readonly utangUsaha: number;
  readonly peralatanNet: number;
  readonly jumlahAktiva: number;
  readonly modalPH: number;
}

interface LaporanPajakBulananData {
  readonly year: number;
  readonly modul: 'RADIOLOGI' | 'LABORATORIUM';
  readonly bulan: readonly BulanPajakBulananItem[];
}

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function row(label: string, value: number, opts?: { readonly bold?: boolean; readonly indent?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.3rem 0',
        paddingLeft: opts?.indent ? '1.25rem' : 0,
        fontWeight: opts?.bold ? 700 : 400,
      }}
    >
      <span>{label}</span>
      <span>{formatRupiah(value)}</span>
    </div>
  );
}

interface HasilPerbulanPageProps {
  readonly modul?: 'RADIOLOGI' | 'LABORATORIUM';
}

export function HasilPerbulanPage({ modul = 'RADIOLOGI' }: HasilPerbulanPageProps) {
  const moduleLabel = modul === 'RADIOLOGI' ? 'Radiologi' : 'Laboratorium';
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [bulanKe, setBulanKe] = useState<number>(new Date().getMonth() + 1);
  const [data, setData] = useState<LaporanPajakBulananData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<LaporanPajakBulananData>(
        `/api/laporan/pajak-bulanan?year=${year}&modul=${modul}`,
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat hasil perbulan');
    } finally {
      setLoading(false);
    }
  }, [year, modul]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const yearOptions = [];
  for (let y = currentYear + 1; y >= currentYear - 5; y--) {
    yearOptions.push(y);
  }

  const item = useMemo(
    () => data?.bulan.find((b) => b.no === bulanKe) ?? null,
    [data, bulanKe],
  );

  const totalBhp = item ? item.bahanRoentgen + item.peralatanRoentgen : 0;
  const jumlahPasiva = item ? item.utangUsaha + item.modalPH : 0;

  return (
    <ListPageShell
      title={`Hasil Perbulan ${moduleLabel}`}
      subtitle="Laporan keuangan ringkas per bulan — Pendapatan, Beban Usaha, Modal, dan mini Neraca. Data sama dengan Laporan Pajak Bulanan; untuk mengubah angka, edit di halaman tersebut."
      onRefresh={() => void fetchData()}
      error={error}
      loading={loading}
      filterExtra={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div className="form-field" style={{ minWidth: '130px', margin: 0 }}>
            <label htmlFor="filter-year-hasil-perbulan">Tahun</label>
            <select
              id="filter-year-hasil-perbulan"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ minWidth: '150px', margin: 0 }}>
            <label htmlFor="filter-bulan-hasil-perbulan">Bulan</label>
            <select
              id="filter-bulan-hasil-perbulan"
              value={bulanKe}
              onChange={(e) => setBulanKe(Number(e.target.value))}
            >
              {NAMA_BULAN.map((nama, idx) => (
                <option key={nama} value={idx + 1}>{nama}</option>
              ))}
            </select>
          </div>
        </div>
      }
    >
      {!item ? (
        <p style={{ textAlign: 'center', padding: '1.5rem' }}>Tidak ada data untuk bulan ini.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* LAPORAN KEUANGAN */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ marginTop: 0, textAlign: 'center', color: 'var(--color-primary)' }}>
              LAPORAN KEUANGAN PRIMA HUSADA
            </h3>
            <p style={{ textAlign: 'right', fontWeight: 700, margin: '0 0 0.75rem' }}>
              BULAN {item.bulan.toUpperCase()} {year}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderBottom: '1px dashed var(--color-border)', paddingBottom: '0.3rem' }}>
              <span>Pendapatan Jasa Pelayanan</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              <span>Harga × Jumlah Pasien ({item.jumlahPasien})</span>
              <span>{formatRupiah(item.harga)}</span>
            </div>
            {row('Total Pendapatan', item.pendapatan, { bold: true })}

            <h4 style={{ marginBottom: '0.25rem', marginTop: '1.25rem' }}>Beban Usaha</h4>
            {row('Beban Sewa Tempat', item.biayaSewaTempat)}
            {row('Beban Listrik dan Air', item.biayaListrikAir)}
            <div style={{ fontWeight: 600, padding: '0.3rem 0' }}>Beban Gaji</div>
            {row('Fernanda', item.gajiFernanda, { indent: true })}
            {row('Chalimatusadiah', item.gajiChalimatusadiah, { indent: true })}
            {row('Riki', item.gajiRiki, { indent: true })}
            {row('Agung', item.gajiAgung, { indent: true })}
            {row('Karyawan 1', item.gajiKaryawan1, { indent: true })}
            {row('Karyawan 2', item.gajiKaryawan2, { indent: true })}
            {row('Bahan Roentgen', item.bahanRoentgen)}
            {row('Peralatan Roentgen (Dev+Fix)', item.peralatanRoentgen)}
            {row('Total BHP', totalBhp, { indent: true })}
            {row('Perbaikan Alat', item.perbaikanAlat)}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, padding: '0.4rem 0', borderTop: '1px dashed var(--color-border)' }}>
              <span>Total Beban Usaha</span>
              <span>{formatRupiah(item.totalBebanUsaha)}</span>
            </div>

            <h4 style={{ marginBottom: '0.25rem', marginTop: '1.25rem' }}>Modal</h4>
            {row('Modal Awal Bulan', item.modalAwal)}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
              <span>Penyusutan Peralatan ({item.tarifPenyusutanTahunanPersen}%/tahun)</span>
              <span>{formatRupiah(item.penyusutanPeralatanBulan)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: item.labaBersih >= 0 ? '#15803d' : '#b91c1c' }}>
              <span>Laba Bersih</span>
              <span>{formatRupiah(item.labaBersih)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem', padding: '0.6rem 0', marginTop: '0.5rem', borderTop: '2px solid var(--color-border)', color: 'var(--color-primary)' }}>
              <span>MODAL AKHIR BULAN</span>
              <span>{formatRupiah(item.modalAkhir)}</span>
            </div>
          </div>

          {/* NERACA */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ marginTop: 0, textAlign: 'center', color: 'var(--color-primary)' }}>
              NERACA — {item.bulan.toUpperCase()} {year}
            </h3>

            <h4 style={{ marginBottom: '0.5rem' }}>Aktiva</h4>
            {row('Kas', item.kasAkhir)}
            {row('Piutang Usaha', item.piutangUsaha)}
            {row('Perlengkapan', item.perlengkapan)}
            {row('Peralatan', item.hargaPeralatan)}
            {row('Akumulasi Penyusutan Alat', -item.akumulasiPenyusutanAkhir)}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, padding: '0.4rem 0', borderTop: '1px dashed var(--color-border)' }}>
              <span>Jumlah Aktiva</span>
              <span>{formatRupiah(item.jumlahAktiva)}</span>
            </div>

            <h4 style={{ marginBottom: '0.5rem', marginTop: '1.5rem' }}>Pasiva</h4>
            {row('Utang Usaha', item.utangUsaha)}
            {row('Modal PH', item.modalPH)}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, padding: '0.4rem 0', borderTop: '1px dashed var(--color-border)' }}>
              <span>Jumlah Pasiva</span>
              <span>{formatRupiah(jumlahPasiva)}</span>
            </div>
          </div>
        </div>
      )}
    </ListPageShell>
  );
}
