import { describe, expect, test } from 'vitest';
import { formatAiFotoAnalisa } from '../../apps/web/src/lib/aiFotoAnalisa.ts';

describe('formatAiFotoAnalisa', () => {
  test('combines disease name and kesan', () => {
    expect(formatAiFotoAnalisa({ namaPenyakit: 'Pneumonia', kesan: 'Tampak infiltrat di paru kanan.' })).toBe(
      'Kemungkinan: Pneumonia\n\nTampak infiltrat di paru kanan.',
    );
  });

  test('returns only kesan when disease name is empty', () => {
    expect(formatAiFotoAnalisa({ namaPenyakit: '', kesan: 'Foto tidak cukup jelas untuk dianalisa.' })).toBe(
      'Foto tidak cukup jelas untuk dianalisa.',
    );
  });

  test('returns only the disease line when kesan is empty', () => {
    expect(formatAiFotoAnalisa({ namaPenyakit: 'Fraktur', kesan: '' })).toBe('Kemungkinan: Fraktur');
  });

  test('trims surrounding whitespace and treats whitespace-only fields as empty', () => {
    expect(formatAiFotoAnalisa({ namaPenyakit: '  Bronchitis \n', kesan: '\n Corakan bronkovaskular meningkat. ' })).toBe(
      'Kemungkinan: Bronchitis\n\nCorakan bronkovaskular meningkat.',
    );
    expect(formatAiFotoAnalisa({ namaPenyakit: '   ', kesan: '   ' })).toBe('');
  });
});
