import { pdf } from '@react-pdf/renderer';
import { loadLogoDataUrl } from './loadLogoDataUrl.ts';
import { loadSignatureDataUrl } from './loadSignatureDataUrl.ts';
import {
  RadiologyReportDocument,
  type RadiologyReportData,
} from './RadiologyReportDocument.tsx';

export type PrintRadiologyReportInput = Omit<
  RadiologyReportData,
  'logoSrc' | 'signatureSrc' | 'includeSignature' | 'includeFrame' | 'templatBacaan'
>;

export interface RadiologyPdfPreview {
  readonly withSignature: Blob;
  readonly withoutSignature: Blob;
  readonly withSignatureNoFrame: Blob;
  readonly withoutSignatureNoFrame: Blob;
  readonly complete: Blob;
  readonly filename: string;
}

/** Templat bacaan baku foto rontgen thorax, disisipkan di varian "Cetak
 * Lengkap" 2 baris di bawah Klinis. */
const TEMPLAT_BACAAN_THORAX = `Trakea berada di garis tengah.
Siluet jantung tidak tampak membesar.
Mediastinum tidak tampak melebar.
Tampak peningkatan infiltrat pada lapangan paru kanan
Corakan bronkovaskular tampak meningkat pada area tersebut.
Tidak tampak pneumotoraks.
Tidak tampak efusi pleura.
Hemidiafragma tampak dalam batas yang dapat dinilai.
Struktur tulang yang tervisualisasi tidak menunjukkan kelainan osseus akut yang jelas.`;

let openPreview: ((preview: RadiologyPdfPreview) => void) | null = null;

export function registerPdfPreviewHandler(
  handler: (preview: RadiologyPdfPreview) => void,
): () => void {
  openPreview = handler;
  return () => {
    openPreview = null;
  };
}

async function buildReportBlob(
  input: PrintRadiologyReportInput,
  logoSrc: string,
  includeSignature: boolean,
  includeFrame: boolean,
  signatureSrc?: string,
  templatBacaan?: string,
): Promise<Blob> {
  return pdf(
    <RadiologyReportDocument
      data={{
        ...input,
        logoSrc,
        includeSignature,
        includeFrame,
        signatureSrc: includeSignature ? signatureSrc : undefined,
        templatBacaan,
      }}
    />,
  ).toBlob();
}

export async function generateRadiologyReportVersions(
  input: PrintRadiologyReportInput,
): Promise<RadiologyPdfPreview> {
  const logoSrc = await loadLogoDataUrl();
  let signatureSrc: string | undefined;
  try {
    signatureSrc = await loadSignatureDataUrl();
  } catch {
    signatureSrc = undefined;
  }

  const [withSignature, withoutSignature, withSignatureNoFrame, withoutSignatureNoFrame, complete] =
    await Promise.all([
      buildReportBlob(input, logoSrc, true, true, signatureSrc),
      buildReportBlob(input, logoSrc, false, true),
      buildReportBlob(input, logoSrc, true, false, signatureSrc),
      buildReportBlob(input, logoSrc, false, false),
      buildReportBlob(input, logoSrc, true, true, signatureSrc, TEMPLAT_BACAAN_THORAX),
    ]);

  const cleanName = input.nama.trim().replace(/[/\\?%*:|"<>]/g, '_') || 'pasien';

  return {
    withSignature,
    withoutSignature,
    withSignatureNoFrame,
    withoutSignatureNoFrame,
    complete,
    filename: `${cleanName}.pdf`,
  };
}

/** @deprecated Prefer `generateRadiologyReportVersions` for preview flows. */
export async function generateRadiologyReportBlob(
  input: PrintRadiologyReportInput,
  includeSignature = true,
): Promise<Blob> {
  const versions = await generateRadiologyReportVersions(input);
  return includeSignature ? versions.withSignature : versions.withoutSignature;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function printRadiologyReport(input: PrintRadiologyReportInput): Promise<void> {
  const versions = await generateRadiologyReportVersions(input);

  if (openPreview) {
    openPreview(versions);
    return;
  }

  downloadBlob(versions.withSignature, versions.filename);
}
