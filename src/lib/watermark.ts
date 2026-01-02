// revelation/src/lib/watermark.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function watermarkPdf(pdfBuffer: Buffer, userEmail: string) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const watermarkText = `Licensed to: ${userEmail} | Booka. | Internal ID: ${Math.random().toString(36).substr(2, 9)}`;

  pages.forEach((page) => {
    const { width } = page.getSize();
    
    // Bottom Footer Watermark
    page.drawText(watermarkText, {
      x: 40,
      y: 30,
      size: 9,
      font: helveticaFont,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.7,
    });

    // Center Transparent Watermark
    page.drawText(userEmail, {
      x: width / 4,
      y: 100,
      size: 45,
      font: helveticaFont,
      color: rgb(0.8, 0.8, 0.8),
      opacity: 0.1,
      rotate: { angle: 45, type: 'degrees' },
    });
  });

  return await pdfDoc.save();
}