import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import axios from 'axios';
import prisma from "@/lib/prisma";
import { publicProcedure } from "@/server/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

/**
 * PDF Watermarking Service
 * Handles personalized ebook generation post-purchase.
 */

export const generateWatermarkedEbook = publicProcedure
  .input(z.object({
    orderId: z.string(),
    variantId: z.string(),
  }))
  .mutation(async ({ input }) => {
    // 1. Verify the order and payment status
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        customer: { include: { user: true } },
        line_items: {
          where: { book_variant_id: input.variantId },
          include: { book_variant: true },
        }
      }
    });

    if (!order || order.payment_status !== 'captured') {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Order not found or payment not verified."
      });
    }

    const lineItem = order.line_items[0];
    const variant = lineItem?.book_variant;
    const pdfUrl = variant?.digital_asset_url || (variant as any)?.book?.pdf_url;

    if (!pdfUrl) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Digital asset not found for this book."
      });
    }

    try {
      // 2. Fetch the original PDF
      const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
      const existingPdfBytes = response.data;

      // 3. Load PDF and prepare watermarking
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      
      const buyerInfo = `Purchased by: ${order.customer.user.email} | Order: ${order.order_number}`;
      const watermarkText = `Personalized for ${order.customer.user.first_name} ${order.customer.user.last_name || ''}`;

      // 4. Add a Personalized First Page (Cover)
      const firstPage = pdfDoc.insertPage(0);
      const { width, height } = firstPage.getSize();
      
      firstPage.drawText('Thank you for your purchase!', {
        x: 50,
        y: height - 100,
        size: 30,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      firstPage.drawText(buyerInfo, {
        x: 50,
        y: height - 150,
        size: 12,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      firstPage.drawText("This copy is licensed for your personal use only. Distribution is prohibited.", {
        x: 50,
        y: 100,
        size: 10,
        font: helveticaFont,
        color: rgb(0.7, 0.1, 0.1),
      });

      // 5. Apply Watermark to all original pages
      // We start from index 1 because index 0 is now our new cover
      for (let i = 1; i < pdfDoc.getPageCount(); i++) {
        const page = pages[i - 1]; // Array is original pages
        const { width: pWidth } = page.getSize();
        
        // Add footer watermark
        page.drawText(buyerInfo, {
          x: pWidth / 2 - 150,
          y: 20,
          size: 8,
          font: helveticaFont,
          color: rgb(0.7, 0.7, 0.7),
          opacity: 0.6,
        });

        // Optional: Diagonal semi-transparent watermark in middle
        page.drawText(watermarkText, {
          x: pWidth / 4,
          y: page.getSize().height / 2,
          size: 40,
          font: helveticaFont,
          color: rgb(0.9, 0.9, 0.9),
          rotate: { type: 'degrees', angle: 45 } as any,
          opacity: 0.3,
        });
      }

      // 6. Serialize the PDF
      const pdfBytes = await pdfDoc.save();
      
      // Note: In a production environment, you would upload this buffer 
      // to Cloudinary/S3 and return the URL. For this step, we return the base64.
      const base64Pdf = Buffer.from(pdfBytes).toString('base64');

      return {
        success: true,
        fileName: `protected_${order.order_number}.pdf`,
        data: `data:application/pdf;base64,${base64Pdf}`,
      };

    } catch (error) {
      console.error("Watermarking error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate watermarked ebook."
      });
    }
  });