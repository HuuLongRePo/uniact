function toAsciiSafe(input: string): string {
  // Remove diacritics and replace unsupported chars for built-in Helvetica.
  try {
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '?');
  } catch {
    return String(input).replace(/[^\x20-\x7E]/g, '?');
  }
}

function pdfEscape(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function createSimplePdf(lines: string[]): Uint8Array {
  const safeLines = lines.map((l) => pdfEscape(toAsciiSafe(String(l ?? ''))));

  const textLines = safeLines.length > 0 ? safeLines : ['(empty)'];
  const stream = [
    'BT',
    '/F1 12 Tf',
    '50 760 Td',
    ...textLines.flatMap((l, idx) => (idx === 0 ? [`(${l}) Tj`] : ['T*', `(${l}) Tj`])),
    'ET',
    '',
  ].join('\n');

  const header = '%PDF-1.4\n';

  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 =
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const streamBytes = Buffer.from(stream, 'latin1');
  const obj5 = Buffer.concat([
    Buffer.from(`5 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`, 'latin1'),
    streamBytes,
    Buffer.from('endstream\nendobj\n', 'latin1'),
  ]);

  const parts: Array<Buffer> = [];
  parts.push(Buffer.from(header, 'latin1'));

  const offsets: number[] = [0];

  function pushObj(strOrBuf: string | Buffer) {
    const currentOffset = parts.reduce((sum, b) => sum + b.length, 0);
    offsets.push(currentOffset);
    parts.push(typeof strOrBuf === 'string' ? Buffer.from(strOrBuf, 'latin1') : strOrBuf);
  }

  pushObj(obj1);
  pushObj(obj2);
  pushObj(obj3);
  pushObj(obj4);
  pushObj(obj5);

  const xrefOffset = parts.reduce((sum, b) => sum + b.length, 0);

  const xrefLines: string[] = [];
  xrefLines.push('xref');
  xrefLines.push('0 6');
  xrefLines.push('0000000000 65535 f ');
  for (let i = 1; i <= 5; i++) {
    const off = offsets[i];
    xrefLines.push(String(off).padStart(10, '0') + ' 00000 n ');
  }

  const trailer = [
    'trailer',
    '<< /Size 6 /Root 1 0 R >>',
    'startxref',
    String(xrefOffset),
    '%%EOF',
    '',
  ].join('\n');

  parts.push(Buffer.from(xrefLines.join('\n') + '\n' + trailer, 'latin1'));

  return Buffer.concat(parts);
}
