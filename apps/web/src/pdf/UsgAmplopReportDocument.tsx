import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

export interface UsgAmplopData {
  readonly logoSrc: string;
  readonly namaKlinik: string;
  readonly alamatKlinik: string;
  readonly teleponKlinik: string;
}

const BLUE = '#2b4c9b';
const BLACK = '#1a1a1a';

const styles = StyleSheet.create({
  page: { padding: 12, fontFamily: 'Helvetica', fontSize: 8, color: BLACK },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 34, height: 34, marginRight: 8 },
  headerText: { flex: 1 },
  clinicName: { fontSize: 12.5, fontWeight: 'bold', color: BLUE, marginBottom: 2 },
  clinicAddress: { fontSize: 7.5, color: BLACK, lineHeight: 1.3 },
});

/** Amplop kecil (10cm x 8cm = 283.465pt x 226.772pt, 28.3465 pt/cm) berisi
 * kop klinik saja sebagai alamat pengirim, dicetak langsung di badan amplop. */
export function UsgAmplopReportDocument({ data }: { readonly data: UsgAmplopData }) {
  return (
    <Document title={`Amplop_${data.namaKlinik}.pdf`}>
      <Page size={[283.465, 226.772]} style={styles.page}>
        <View style={styles.headerRow}>
          {data.logoSrc ? <Image style={styles.logo} src={data.logoSrc} /> : null}
          <View style={styles.headerText}>
            <Text style={styles.clinicName}>{data.namaKlinik}</Text>
            <Text style={styles.clinicAddress}>
              {data.alamatKlinik}
              {data.teleponKlinik ? ` Telp. ${data.teleponKlinik}` : ''}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
