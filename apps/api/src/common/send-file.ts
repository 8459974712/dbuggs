import { Response } from 'express';

export function sendPdf(res: Response, file: { filename: string; buffer: Buffer }) {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${file.filename.replace(/[^\w.-]/g, '_')}"`,
    'Content-Length': String(file.buffer.length),
    'Cache-Control': 'no-store',
  });
  res.end(file.buffer);
}

export function sendCsv(res: Response, file: { filename: string; csv: string }) {
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${file.filename.replace(/[^\w.-]/g, '_')}"`,
    'Cache-Control': 'no-store',
  });
  res.end('﻿' + file.csv);
}
