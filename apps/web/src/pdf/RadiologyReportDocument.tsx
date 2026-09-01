import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { formatPdfClinicalText, truncatePdfCell } from './pdfText.ts';

export interface RadiologyReportData {
  readonly logoSrc: string;
  readonly signatureSrc?: string;
  readonly includeSignature: boolean;
  readonly includeFrame?: boolean;
  readonly regCode: string;
  readonly nama: string;
  readonly umurLabel: string;
  readonly tanggal: string;
  readonly alamat: string;
  readonly pemeriksaan: string;
  readonly dokterPengirim: string;
  readonly klinis: string;
  readonly kesan: string;
  readonly radiologNama: string;
}

const BLUE = '#2b4c9b';
const BLACK = '#1a1a1a';

const styles = StyleSheet.create({
  page: {
    padding: 12,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: BLACK,
  },
  frame: {
    height: '100%',
    padding: 10,
    flexDirection: 'column',
  },
  frameBorder: {
    borderWidth: 1,
    borderColor: BLACK,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  logo: {
    width: 48,
    height: 48,
    marginRight: 8,
  },
  headerText: {
    flex: 1,
    paddingTop: 4,
  },
  clinicSmall: {
    fontSize: 8,
    color: BLACK,
    marginBottom: 2,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BLUE,
    marginBottom: 3,
  },
  clinicAddress: {
    fontSize: 8.5,
    color: BLACK,
    lineHeight: 1.35,
  },
  divider: {
    height: 2.5,
    backgroundColor: BLUE,
    marginTop: 6,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  recipientBox: {
    width: 185,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  recipientBoxBorder: {
    borderWidth: 1,
    borderColor: BLACK,
  },
  recipientLine: {
    fontSize: 8.5,
    lineHeight: 1.5,
    color: BLACK,
    marginBottom: 2,
  },
  recipientDoctor: {
    color: BLUE,
  },
  patientTable: {
    marginBottom: 8,
  },
  patientTableBorder: {
    borderWidth: 1,
    borderColor: BLACK,
  },
  patientRow: {
    flexDirection: 'row',
    minHeight: 22,
  },
  patientRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
  },
  patientRowLast: {
    flexDirection: 'row',
    minHeight: 22,
  },
  colLabelLeft: {
    width: 75,
    paddingVertical: 4,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  colColon: {
    width: 14,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colColonBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BLACK,
  },
  colValueLeft: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  colValueLeftBorder: {
    borderRightWidth: 1,
    borderColor: BLACK,
  },
  colLabelRight: {
    width: 55,
    paddingVertical: 4,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  colValueRight: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 8.5,
    lineHeight: 1.35,
  },
  colonText: {
    fontSize: 8.5,
    color: BLACK,
    textAlign: 'center',
  },
  label: {
    color: BLACK,
  },
  value: {
    color: BLUE,
  },
  title: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 'bold',
    textDecoration: 'underline',
    marginBottom: 6,
    color: BLACK,
  },
  klinisBlock: {
    marginTop: 22,
    width: '100%',
  },
  bodyMiddle: {
    flexGrow: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  clinicalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  clinicalInlineLabel: {
    width: 44,
    fontSize: 10,
    color: BLACK,
    flexShrink: 0,
  },
  clinicalValueWrap: {
    flex: 1,
  },
  clinicalInlineValue: {
    fontSize: 10,
    color: BLUE,
    lineHeight: 1.4,
  },
  kesanBlock: {
    width: '100%',
    // Turunkan 4cm dari posisi tengah semula (4 * 28.3465 pt/cm).
    marginTop: 113.4,
  },
  signatureWrap: {
    marginTop: 'auto',
    alignItems: 'flex-end',
    // ~3 baris kosong (enter) + 0.5cm (14.17pt) tambahan di atas blok tanda tangan.
    paddingTop: 62.17,
  },
  signature: {
    width: 200,
    alignItems: 'center',
    fontSize: 9.5,
    color: BLACK,
  },
  signatureLine: {
    marginBottom: 0,
  },
  signatureImage: {
    width: 130,
    height: 52,
    objectFit: 'contain',
    marginTop: 2,
    marginBottom: 0,
  },
  /** Sama tinggi dengan blok gambar tanda tangan (52 + marginTop 2). */
  signatureGap: {
    height: 52,
    marginTop: 2,
    marginBottom: 0,
  },
  signatureName: {
    textDecoration: 'underline',
    marginTop: 4,
    marginBottom: 4,
    fontSize: 10,
    color: BLUE,
  },
});

function PatientRow({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  last = false,
  includeFrame,
}: {
  readonly leftLabel: string;
  readonly leftValue: string;
  readonly rightLabel: string;
  readonly rightValue: string;
  readonly last?: boolean;
  readonly includeFrame: boolean;
}) {
  const rowStyle = last
    ? styles.patientRowLast
    : includeFrame
      ? [styles.patientRow, styles.patientRowBorder]
      : styles.patientRow;
  const colColonStyle = includeFrame ? [styles.colColon, styles.colColonBorder] : styles.colColon;
  const colValueLeftStyle = includeFrame
    ? [styles.colValueLeft, styles.colValueLeftBorder]
    : styles.colValueLeft;

  return (
    <View style={rowStyle}>
      <View style={styles.colLabelLeft}>
        <Text style={[styles.cellText, styles.label]}>{leftLabel}</Text>
      </View>
      <View style={colColonStyle}>
        <Text style={styles.colonText}>:</Text>
      </View>
      <View style={colValueLeftStyle}>
        <Text style={[styles.cellText, styles.value]}>{truncatePdfCell(leftValue)}</Text>
      </View>
      <View style={styles.colLabelRight}>
        <Text style={[styles.cellText, styles.label]}>{rightLabel}</Text>
      </View>
      <View style={colColonStyle}>
        <Text style={styles.colonText}>:</Text>
      </View>
      <View style={styles.colValueRight}>
        <Text style={[styles.cellText, styles.value]}>{truncatePdfCell(rightValue)}</Text>
      </View>
    </View>
  );
}

export function RadiologyReportDocument({ data }: { readonly data: RadiologyReportData }) {
  const dokter = truncatePdfCell(data.dokterPengirim, 36);
  const includeFrame = data.includeFrame ?? true;

  return (
    <Document>
      {/* 420.95 pt x 595.28 pt = 14.85cm x 21cm (A4 dibagi 2, 28.3465 pt/cm) */}
      <Page size={[420.95, 595.28]} style={styles.page}>
        <View style={includeFrame ? [styles.frame, styles.frameBorder] : styles.frame}>
          <View style={styles.headerRow}>
            <Image style={styles.logo} src={data.logoSrc} />
            <View style={styles.headerText}>
              <Text style={styles.clinicSmall}>KLINIK ROENTGEN DAN USG</Text>
              <Text style={styles.clinicName}>PRIMA HUSADA</Text>
              <Text style={styles.clinicAddress}>
                Jl Siliwangi No 28 A Parung Kuda Telp. 0857-1932-5557
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.topRow}>
            <View style={includeFrame ? [styles.recipientBox, styles.recipientBoxBorder] : styles.recipientBox}>
              <Text style={styles.recipientLine}>Kepada Yang terhormat</Text>
              <Text style={styles.recipientLine}>
                <Text>TS : </Text>
                <Text style={styles.recipientDoctor}>{dokter}</Text>
              </Text>
              <Text style={styles.recipientLine}>Di Tempat</Text>
            </View>
          </View>

          <View style={includeFrame ? [styles.patientTable, styles.patientTableBorder] : styles.patientTable}>
            <PatientRow
              leftLabel="Nama Pasien"
              leftValue={data.nama}
              rightLabel="Umur"
              rightValue={data.umurLabel}
              includeFrame={includeFrame}
            />
            <PatientRow
              leftLabel="Alamat"
              leftValue={data.alamat}
              rightLabel="Tanggal"
              rightValue={data.tanggal}
              includeFrame={includeFrame}
            />
            <PatientRow
              leftLabel="Pemeriksaan"
              leftValue={data.pemeriksaan}
              rightLabel="No."
              rightValue={data.regCode}
              last
              includeFrame={includeFrame}
            />
          </View>

          <Text style={styles.title}>HASIL PEMERIKSAAN RADIOLOGI</Text>

          <View style={styles.klinisBlock}>
            <View style={styles.clinicalRow}>
              <Text style={styles.clinicalInlineLabel}>Klinis : </Text>
              <View style={styles.clinicalValueWrap}>
                <Text style={styles.clinicalInlineValue}>
                  {formatPdfClinicalText(data.klinis)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.bodyMiddle}>
            <View style={styles.kesanBlock}>
              <View style={styles.clinicalRow}>
                <Text style={styles.clinicalInlineLabel}>Kesan : </Text>
                <View style={styles.clinicalValueWrap}>
                  <Text style={styles.clinicalInlineValue}>
                    {formatPdfClinicalText(data.kesan)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.signatureWrap}>
            <View style={styles.signature}>
              <Text style={styles.signatureLine}>Salam Sejawat,</Text>
              {data.includeSignature && data.signatureSrc ? (
                <Image style={styles.signatureImage} src={data.signatureSrc} />
              ) : (
                <View style={styles.signatureGap} />
              )}
              <Text style={styles.signatureName}>{truncatePdfCell(data.radiologNama, 40)}</Text>
              <Text style={styles.signatureLine}>RADIOLOG</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
