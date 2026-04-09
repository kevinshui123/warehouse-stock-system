/**
 * Invoice PDF API Route
 * GET /api/invoices/[id]/pdf — generate and download invoice PDF
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { generateInvoicePDFBuffer } from "@/lib/pdf";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";

/** Allow longer PDF generation on Vercel (Pro / configurable). */
export const maxDuration = 60;

/**
 * GET /api/invoices/[id]/pdf
 * Generate and return invoice PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rateLimitResponse = await withRateLimit(
      request,
      defaultRateLimits.standard,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch invoice with order and items
    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: session.id },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const order = invoice.order;

    // Client name
    let clientName = "Customer";
    if (invoice.clientId) {
      const client = await prisma.user.findUnique({
        where: { id: invoice.clientId },
        select: { username: true, email: true },
      });
      clientName = client?.username || client?.email || "Customer";
    }

    // Supplier info (seller — from the store owner user who owns the order)
    const orderOwner = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { name: true, email: true, username: true },
    });
    const supplierName = orderOwner?.name || orderOwner?.username || "Supplier";

    // System config for company info
    const configs = await prisma.systemConfig.findMany({
      where: { isPublic: true },
    });
    const getConfig = (key: string) =>
      configs.find((c) => c.key === key)?.value;

    // Build PDF data
    const pdfData = {
      // 单据编号
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: order.orderNumber,
      status: invoice.status,
      issuedAt: invoice.issuedAt,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,

      // 金额
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      shipping: invoice.shipping,
      discount: invoice.discount,
      total: invoice.total,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountDue,

      // 供应商 / FROM
      supplierName,
      supplierPhone: getConfig("company_phone") || undefined,
      supplierAddress: getConfig("company_address") || undefined,

      // 地址
      clientName,
      billingAddress: invoice.billingAddress as {
        name?: string;
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
      } | null,
      shippingAddress: order.shippingAddress as {
        name?: string;
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
      } | null,

      // 商品明细（带 unit）
      items:
        order.items.map((item) => ({
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          // unit 默认 UNIT；后续可在 Product 模型增加 unit 字段后改为动态值
          unit: "UNIT",
        })) || [],

      // 附加信息
      notes: invoice.notes,
      terms: getConfig("default_terms") || "Due on Receipt",
      shipVia: undefined,
      shipDate: order.shippedAt || undefined,
      salesperson: undefined,
      customerPO: undefined,

      // 公司信息（用于 PDF 顶部公司条）
      companyName: getConfig("company_name") || undefined,
      companyAddress: getConfig("company_address") || undefined,
      companyPhone: getConfig("company_phone") || undefined,
      companyEmail: getConfig("company_email") || undefined,
    };

    const pdfBuffer = generateInvoicePDFBuffer(pdfData);
    const safeName = `invoice-${invoice.invoiceNumber.replace(/[^\w.-]+/g, "_")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logger.error("Error generating invoice PDF:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate invoice PDF",
      },
      { status: 500 },
    );
  }
}
