// revelation/src/lib/watermark.ts
import { PDFDocument, rgb, StandardFonts, degrees } from '@cantoo/pdf-lib';

export async function watermarkPdf(
  pdfBuffer: Buffer,
  userEmail: string,
  options?: {
    storeLabel?: string | null;
    storeUrl?: string | null;
  }
) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const watermarkParts = [
    `Licensed to: ${userEmail}`,
    options?.storeLabel ? `Store: ${options.storeLabel}` : "Iwacumo Secure Digital Edition",
    options?.storeUrl ? `Access: ${options.storeUrl}` : null,
  ].filter(Boolean);
  const watermarkText = watermarkParts.join(" | ");

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

  // 🔒 Encrypt with restrictions — no password to open, but print/copy blocked
  pdfDoc.encrypt({
    userPassword: "",
    ownerPassword: `iwacumo-${userEmail}-${Date.now()}`,
    permissions: {
      printing: false,
      modifying: false,
      copying: false,
      annotating: false,
      fillingForms: false,
      documentAssembly: false,
      contentAccessibility: true,
    },
  });

  return await pdfDoc.save({ useObjectStreams: false });
}

// Combined helper: watermark + encrypt in one call (alias kept for clarity)
export async function watermarkAndProtectPdf(
  pdfBuffer: Buffer,
  userEmail: string,
  options?: {
    storeLabel?: string | null;
    storeUrl?: string | null;
  }
) {
  return watermarkPdf(pdfBuffer, userEmail, options);
}