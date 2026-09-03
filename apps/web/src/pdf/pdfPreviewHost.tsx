import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { PdfPreviewModal } from '../components/ui/PdfPreviewModal.tsx';
import {
  regenerateCompleteReportBlob,
  registerPdfPreviewHandler,
  TEMPLAT_BACAAN_THORAX,
  type PrintRadiologyReportInput,
  type RadiologyPdfPreview,
} from './printRadiologyReport.tsx';
import { printRadiologyAmplop } from './printRadiologyAmplop.ts';

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

  const handleCetakAmplop = useCallback(() => {
    if (!reportInput) return;
    printRadiologyAmplop(reportInput);
  }, [reportInput]);

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
        onCetakAmplop={reportInput ? handleCetakAmplop : undefined}
        filename={preview?.filename ?? 'hasil-radiologi.pdf'}
        onClose={() => {
          setPreview(null);
          setReportInput(null);
        }}
      />
    </>
  );
}
