import { describe, expect, test } from 'vitest';
import { buildProV5Url, PRO_V5_DEFAULT_PORT } from '../../apps/web/src/lib/proV5.ts';

describe('buildProV5Url', () => {
  test('mengikuti host yang membuka LabPrima dengan port default Streamlit', () => {
    expect(PRO_V5_DEFAULT_PORT).toBe(8501);
    expect(buildProV5Url({ protocol: 'http:', hostname: '192.168.1.10' })).toBe('http://192.168.1.10:8501/');
  });

  test('memakai localhost bila hostname kosong', () => {
    expect(buildProV5Url({ protocol: 'http:', hostname: '' })).toBe('http://localhost:8501/');
  });

  test('mempertahankan https dan memakai http untuk protokol lain', () => {
    expect(buildProV5Url({ protocol: 'https:', hostname: 'klinik.local' })).toBe('https://klinik.local:8501/');
    expect(buildProV5Url({ protocol: 'file:', hostname: 'localhost' })).toBe('http://localhost:8501/');
  });

  test('membungkus alamat IPv6 dengan kurung siku', () => {
    expect(buildProV5Url({ protocol: 'http:', hostname: '::1' }, 9000)).toBe('http://[::1]:9000/');
    expect(buildProV5Url({ protocol: 'http:', hostname: '[::1]' }, 9000)).toBe('http://[::1]:9000/');
  });

  test('menolak port tidak valid', () => {
    const location = { protocol: 'http:', hostname: 'localhost' };
    expect(() => buildProV5Url(location, 0)).toThrow(RangeError);
    expect(() => buildProV5Url(location, 70000)).toThrow(RangeError);
    expect(() => buildProV5Url(location, 80.5)).toThrow(RangeError);
  });
});
