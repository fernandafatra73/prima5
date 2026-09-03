import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { PdfPreviewModal } from '../components/ui/PdfPreviewModal.tsx';
import {
  regenerateCompleteReportBlob,
  registerPdfPreviewHandler,
  TEMPLAT_BACAAN_THORAX,
  type PrintRadiologyReportInput,
  type RadiologyPdfPreview,
} from './printRadiologyReport.tsx';

export function PdfPreviewHost({ children }: { readonly children: ReactNode }) {
  const [preview, setPreview] = useState<RadiologyPdfPreview | null>(null);
  const [reportInput, setReportInput] = useState<PrintRadiologyReportInput | null>(null);

  useEffect(() => {
    return registerPdfPreviewHandler((next, input) => {
      setPreview(next);
      setReportInput(input);
    });
  }, []);

  const handleTemplatBacaanChange = useCallback(
    async (templatBacaan: string) => {
      if (!reportInput) return;
      const complete = await regenerateCompleteReportBlob(reportInput, templatBacaan);
      setPreview((prev) => (prev ? { ...prev, complete } : prev));
    },
    [reportInput],
  );

  return (
    <>
      {children}
      <PdfPreviewModal
        open={preview !== null}
        withSignature={preview?.withSignature ?? null}
        withoutSignature={preview?.withoutSignature ?? null}
        withSignatureNoFrame={preview?.withSignatureNoFrame ?? null}
        withoutSignatureNoFrame={preview?.withoutSignatureNoFrame ?? null}
        complete={preview?.complete ?? null}
        templatBacaanDefault={TEMPLAT_BACAAN_THORAX}
        onTemplatBacaanChange={reportInput ? handleTemplatBacaanChange : undefined}
        filename={preview?.filename ?? 'hasil-radiologi.pdf'}
        onClose={() => {
          setPreview(null);
          setReportInput(null);
        }}
      />
    </>
  );
}
