/** Port default aplikasi Radiologi Reader Pro-V5 (Streamlit). */
export const PRO_V5_DEFAULT_PORT = 8501;

export interface LocationLike {
  readonly protocol: string;
  readonly hostname: string;
}

/** URL aplikasi Pro-V5 mengikuti host yang sedang membuka LabPrima, supaya
 * komputer lain di jaringan klinik tidak diarahkan ke "localhost" miliknya
 * sendiri. */
export function buildProV5Url(location: LocationLike, port: number = PRO_V5_DEFAULT_PORT): string {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError(`Port Pro-V5 tidak valid: ${port}`);
  }
  const protocol = location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = location.hostname.trim() === '' ? 'localhost' : location.hostname.trim();
  const host = hostname.includes(':') && !hostname.startsWith('[') ? `[${hostname}]` : hostname;
  return `${protocol}//${host}:${port}/`;
}
