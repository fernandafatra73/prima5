import type { PrintRadiologyReportInput } from './printRadiologyReport.tsx';

/** Cetak kartu amplop hasil radiologi (8x6cm) lewat jendela print browser —
 * pola sama seperti mode "amplop" klasik di CetakALModal, tapi dipanggil
 * langsung dari data pratinjau hasil radiologi (tanpa perlu buka modal lain). */
export function printRadiologyAmplop(input: PrintRadiologyReportInput): void {
  const win = window.open('', '_blank', 'width=850,height=700');
  if (!win) {
    alert('Jendela cetak diblokir oleh browser. Harap izinkan pop-up untuk situs ini.');
    return;
  }

  const amplopHtml = `
    <div class="amplop-sheet">
      <div class="amplop-header">
        <div class="amplop-title">KLINIK PRIMA HUSADA</div>
        <div class="amplop-subtitle">HASIL PEMERIKSAAN RADIOLOGI</div>
      </div>
      <div class="amplop-body">
        <table class="amplop-table">
          <tr>
            <th>No. Foto / RM</th>
            <td><strong>${input.regCode}</strong></td>
          </tr>
          <tr>
            <th>Nama Pasien</th>
            <td><strong>${input.nama}</strong> (${input.umurLabel})</td>
          </tr>
          <tr>
            <th>Tanggal Foto</th>
            <td>${input.tanggal}</td>
          </tr>
          <tr>
            <th>Jenis Pemeriksaan</th>
            <td><strong>${input.pemeriksaan}</strong></td>
          </tr>
          <tr>
            <th>Kepada Yth. TS</th>
            <td>${input.dokterPengirim}</td>
          </tr>
        </table>
      </div>
      <div class="amplop-footer">
        * Harap membawa amplop &amp; hasil foto ini saat kontrol kembali ke dokter yang merawat.
      </div>
    </div>
  `;

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Amplop — ${input.nama}</title>
        <style>
          @page { margin: 2cm 0 0 0.5cm; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #0f172a;
            background: #fff;
            margin: 0;
            padding: 0;
          }
          .amplop-sheet {
            width: 8cm;
            height: 6cm;
            box-sizing: border-box;
            overflow: hidden;
            border: 1.75px solid #1e293b;
            padding: 8px;
            border-radius: 8px;
            margin: 0;
            display: flex;
            flex-direction: column;
          }
          .amplop-header {
            text-align: center;
            border-bottom: 1.5px solid #1d4ed8;
            padding-bottom: 4px;
            margin-bottom: 5px;
          }
          .amplop-title {
            font-size: 12.5px;
            font-weight: 800;
            letter-spacing: 0.3px;
            color: #0f172a;
          }
          .amplop-subtitle {
            font-size: 9px;
            font-weight: 700;
            margin-top: 2px;
            color: #1d4ed8;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .amplop-body {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .amplop-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .amplop-table th {
            text-align: left;
            width: 80px;
            padding: 3px 4px 3px 0;
            font-size: 8.5px;
            color: #475569;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .amplop-table td {
            padding: 3px 0;
            font-size: 9.5px;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .amplop-footer {
            margin-top: 4px;
            font-size: 7px;
            font-style: italic;
            color: #64748b;
            text-align: center;
          }
        </style>
      </head>
      <body>
        ${amplopHtml}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  win.document.close();
}
