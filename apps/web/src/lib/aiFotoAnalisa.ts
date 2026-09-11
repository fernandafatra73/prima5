export interface AiFotoAnalisaResult {
  readonly namaPenyakit: string;
  readonly kesan: string;
}

/** Menggabungkan hasil /api/analisa-foto-ai/analyze menjadi satu teks, dengan format yang sama seperti tombol AI Foto. */
export function formatAiFotoAnalisa(result: AiFotoAnalisaResult): string {
  const namaPenyakit = result.namaPenyakit.trim();
  const kesan = result.kesan.trim();
  if (!namaPenyakit) return kesan;
  if (!kesan) return `Kemungkinan: ${namaPenyakit}`;
  return `Kemungkinan: ${namaPenyakit}\n\n${kesan}`;
}
