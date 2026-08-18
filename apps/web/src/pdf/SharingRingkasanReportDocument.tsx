import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

export interface SharingRingkasanReportRow {
  readonly dokterNama: string;
  readonly totalPasien: number;
  readonly totalSharingFormatted: string;
}

export interface SharingRingkasanReportData {
  readonly logoSrc: string;
  readonly moduleLabel: string;
  readonly reportLabel: string;
  readonly periodeLabel: string;
  readonly tanggalCetak: string;
  readonly rows: readonly SharingRingkasanReportRow[];
  readonly totalPasien: number;
  readonly totalSharingFormatted: string;
  readonly adminNama: string;
}

const BLUE = '#2b4c9b';
const BLACK = '#1a1a1a';

const styles = StyleSheet.create({
  page: {
    padding: 16,
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: BLACK,
  },
  frame: {
    height: '100%',
    borderWidth: 1,
    borderColor: BLACK,
    padding: 10,
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  logo: {
    width: 44,
    height: 44,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  clinicName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: BLUE,
    marginBottom: 2,
  },
  clinicAddress: {
    fontSize: 8,
    color: BLACK,
    lineHeight: 1.35,
  },
  divider: {
    height: 2,
    backgroundColor: BLUE,
    marginVertical: 5,
  },
  titleSection: {
    textAlign: 'center',
    marginVertical: 4,
  },
  reportTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: BLUE,
    textTransform: 'uppercase',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
    padding: 5,
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
  },
  infoText: {
    fontSize: 8,
  },
  bold: {
    fontWeight: 'bold',
  },
  table: {
    marginVertical: 4,
    borderWidth: 0.8,
    borderColor: BLACK,
  },
  thRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderBottomWidth: 0.8,
    borderColor: BLACK,
    paddingVertical: 5,
    fontWeight: 'bold',
    fontSize: 9,
  },
  trRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#cbd5e1',
    paddingVertical: 5,
    fontSize: 9,
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    fontSize: 9.5,
    fontWeight: 'bold',
    backgroundColor: '#f1f5f9',
  },
  colDokter: { width: '52%', paddingLeft: 5 },
  colPasien: { width: '20%', textAlign: 'center' },
  colSharing: { width: '28%', textAlign: 'right', paddingRight: 5 },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
    paddingHorizontal: 20,
  },
  signatureBox: {
    alignItems: 'center',
    width: 150,
  },
  signatureTitle: {
    fontSize: 8,
    marginBottom: 28,
  },
  signatureName: {
    fontSize: 8,
    fontWeight: 'bold',
    borderTopWidth: 0.8,
    borderColor: BLACK,
    paddingTop: 2,
    width: '100%',
    textAlign: 'center',
  },
});

export function SharingRingkasanReportDocument({ data }: { readonly data: SharingRingkasanReportData }) {
  return (
    <Document title={`Laporan_${data.reportLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.headerRow}>
            {data.logoSrc ? <Image style={styles.logo} src={data.logoSrc} /> : null}
            <View style={styles.headerText}>
              <Text style={styles.clinicName}>KLINIK PRIMA HUSADA</Text>
              <Text style={styles.clinicAddress}>
                Jl Siliwangi No 28 A Parung Kuda Telp. 0857-1932-5557
              </Text>
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.titleSection}>
            <Text style={styles.reportTitle}>
              LAPORAN {data.reportLabel} — RINGKASAN {data.moduleLabel}
            </Text>
          </View>

          <View style={styles.infoGrid}>
            <Text style={styles.infoText}>
              Periode: <Text style={styles.bold}>{data.periodeLabel}</Text>
            </Text>
            <Text style={styles.infoText}>
              Tgl Cetak: <Text style={styles.bold}>{data.tanggalCetak}</Text>
            </Text>
          </View>

          <View style={styles.table}>
            <View style={styles.thRow}>
              <Text style={styles.colDokter}>Dokter Pengirim</Text>
              <Text style={styles.colPasien}>Jumlah Pasien</Text>
              <Text style={styles.colSharing}>Total Sharing</Text>
            </View>
            {data.rows.length === 0 ? (
              <View style={styles.trRow}>
                <Text style={{ width: '100%', textAlign: 'center', paddingVertical: 4 }}>
                  Belum ada data pasien untuk kriteria ini.
                </Text>
              </View>
            ) : (
              data.rows.map((row) => (
                <View key={row.dokterNama} style={styles.trRow}>
                  <Text style={styles.colDokter}>{row.dokterNama}</Text>
                  <Text style={styles.colPasien}>{row.totalPasien}</Text>
                  <Text style={styles.colSharing}>{row.totalSharingFormatted}</Text>
                </View>
              ))
            )}
            <View style={styles.totalRow}>
              <Text style={styles.colDokter}>Total Gabungan</Text>
              <Text style={styles.colPasien}>{data.totalPasien}</Text>
              <Text style={styles.colSharing}>{data.totalSharingFormatted}</Text>
            </View>
          </View>

          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>Petugas Admin Klinik</Text>
              <Text style={styles.signatureName}>
                {data.adminNama ? data.adminNama : '( Petugas Admin Klinik )'}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
