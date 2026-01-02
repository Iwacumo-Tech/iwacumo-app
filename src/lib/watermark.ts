// revelation/src/lib/watermark.ts
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'; // 1. Add degrees to your imports

export async function watermarkPdf(pdfBuffer: Buffer, userEmail: string) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const watermarkText = `Licensed to: ${userEmail} | Booka. | Secure Digital Edition`;

  pages.forEach((page) => {
    const { width, height } = page.getSize();
    
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
      x: width / 6,
      y: height / 3,
      size: 50,
      font: helveticaFont,
      color: rgb(0.8, 0.8, 0.8),
      opacity: 0.2,
      rotate: degrees(45), 
    });
  });

  return await pdfDoc.save();
}