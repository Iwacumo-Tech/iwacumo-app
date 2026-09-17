import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPreorderReminderEmail, sendPreorderAvailableEmail } from "@/lib/email";

export const maxDuration = 300;

function getPreorderCustomers(book: any) {
  const customerMap = new Map<string, { email: string; firstName: string }>();

  for (const variant of book.variants || []) {
    for (const lineItem of variant.order_lineitems || []) {
      const customer = lineItem.order?.customer;
      if (customer?.user?.email && !customerMap.has(customer.user.email)) {
        customerMap.set(customer.user.email, {
          email: customer.user.email,
          firstName: customer.user.first_name || customer.user.email.split("@")[0] || "Customer",
        });
      }
    }
  }

  return Array.from(customerMap.values());
}

export async function GET() {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // 1. Find books releasing tomorrow (send reminder)
    const booksReleasingTomorrow = await prisma.book.findMany({
      where: {
        preorder_enabled: true,
        preorder_reminder_sent: false,
        publication_date: {
          gte: tomorrow,
          lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
        },
        published: true,
        deleted_at: null,
      },
      include: {
        variants: {
          include: {
            order_lineitems: {
              where: { is_preorder: true },
              include: {
                order: {
                  include: {
                    customer: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    let remindersSent = 0;

    for (const book of booksReleasingTomorrow) {
      const customers = getPreorderCustomers(book);

      for (const customer of customers) {
        try {
          await sendPreorderReminderEmail({
            to: customer.email,
            firstName: customer.firstName,
            bookTitle: book.title,
            bookCoverUrl: book.book_cover,
            releaseDate: book.publication_date!,
            bookId: book.id,
          });
          remindersSent++;
        } catch (error) {
          console.error(`Failed to send reminder to ${customer.email}:`, error);
        }
      }

      await prisma.book.update({
        where: { id: book.id },
        data: { preorder_reminder_sent: true },
      });
    }

    // 2. Find books releasing today (send available notification)
    const booksReleasingToday = await prisma.book.findMany({
      where: {
        preorder_enabled: true,
        preorder_available_sent: false,
        publication_date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        published: true,
        deleted_at: null,
      },
      include: {
        variants: {
          include: {
            order_lineitems: {
              where: { is_preorder: true },
              include: {
                order: {
                  include: {
                    customer: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    let availableSent = 0;

    for (const book of booksReleasingToday) {
      const customers = getPreorderCustomers(book);

      for (const customer of customers) {
        try {
          await sendPreorderAvailableEmail({
            to: customer.email,
            firstName: customer.firstName,
            bookTitle: book.title,
            bookCoverUrl: book.book_cover,
            bookId: book.id,
          });
          availableSent++;
        } catch (error) {
          console.error(`Failed to send available notification to ${customer.email}:`, error);
        }
      }

      await prisma.book.update({
        where: { id: book.id },
        data: { preorder_available_sent: true },
      });
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      availableSent,
    });
  } catch (error) {
    console.error("Preorder notification cron failed:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to process preorder notifications",
    }, { status: 500 });
  }
}
