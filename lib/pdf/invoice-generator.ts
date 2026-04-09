/**
 * Sales Order / Invoice PDF Generator
 * 版式参考: Asia Foods 送货单 / 销售单 (Letter/A4)
 * 特点:
 *   - 顶部公司信息（左）+ 单据编号/日期/状态（右）
 *   - FROM / TO / SHIP TO 三栏地址块
 *   - 上方一行元数据: Order#, Date, Ship Date, Via, Terms, Salesperson, Customer PO#
 *   - 商品明细表: Item# | Description | QTY | Type | Rate | Amount
 *   - 底部 SUBTOTAL / TOTAL / 已付 / 余额 + 签名区
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { APP_DISPLAY_NAME } from "@/lib/brand";

/** 单个商品行 */
export interface InvoiceItem {
  productName: string;
  sku?: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  /** 计量单位，如 CASE、UNIT、LB 等（图片中 Type 列） */
  unit?: string;
}

/** PDF 数据结构 */
export interface InvoicePDFData {
  // 单据编号与状态
  invoiceNumber: string;
  orderNumber?: string;
  status: string;
  issuedAt: Date | string;
  dueDate: Date | string;
  paidAt?: Date | string | null;

  // 金额
  subtotal: number;
  tax?: number | null;
  shipping?: number | null;
  discount?: number | null;
  total: number;
  amountPaid: number;
  amountDue: number;

  // 地址
  clientName?: string;
  billingAddress?: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  } | null;
  shippingAddress?: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  } | null;

  // 供应商 / FROM（卖方信息）
  supplierName?: string;
  supplierAddress?: string;
  supplierPhone?: string;

  // 商品明细
  items?: InvoiceItem[];

  // 附加信息
  notes?: string | null;
  terms?: string;      // 如 "Due on Receipt"、"Net 30"
  shipVia?: string;    // 承运方式，如 "UPS", "FEDEX", "OWN TRUCK"
  shipDate?: Date | string;
  salesperson?: string;
  customerPO?: string; // 客户采购单号

  // 公司信息
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
}

function fmt(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function fmtCurrency(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 把多行地址拼成单行字符串 */
function addrLine(addr: {
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
} | null | undefined): string[] {
  if (!addr) return [];
  const lines: string[] = [];
  if (addr.name) lines.push(addr.name);
  if (addr.street) lines.push(addr.street);
  const csz = [addr.city, addr.state, addr.zipCode].filter(Boolean).join(", ");
  if (csz) lines.push(csz);
  if (addr.country && addr.country !== "US") lines.push(addr.country);
  return lines;
}

/** 状态徽章颜色 */
const STATUS_COLORS: Record<string, [number, number, number]> = {
  draft:     [156, 163, 175],
  pending:   [245, 158,  11],
  confirmed: [ 59, 130, 246],
  processing:[168,  85, 247],
  shipped:   [ 59, 130, 246],
  delivered: [ 34, 197,  94],
  paid:      [ 34, 197,  94],
  overdue:   [239,  68,  68],
  cancelled: [107, 114, 128],
  refunded:  [245, 158,  11],
};

export function generateInvoicePDF(data: InvoicePDFData): string {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });

  const PAGE_W = doc.internal.pageSize.width;   // 612 pt (letter)
  const PAGE_H = doc.internal.pageSize.height;  // 792 pt
  const MARGIN_L = 36;
  const MARGIN_R = 36;
  const COL_GAP = 18;

  // ── 配色 ────────────────────────────────────────────────────────
  const RED     = [198, 40, 40] as [number, number, number];
  const DARK    = [ 15, 23, 42] as [number, number, number];
  const GRAY    = [ 75, 85, 99] as [number, number, number];
  const LIGHT_G = [241, 245, 249] as [number, number, number];
  const WHITE   = [255, 255, 255] as [number, number, number];

  // ── 顶部背景条 ─────────────────────────────────────────────────
  doc.setFillColor(...RED);
  doc.rect(0, 0, PAGE_W, 58, "F");

  // 公司名称（居中红色条内）
  const coName = data.companyName || APP_DISPLAY_NAME;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text(coName, PAGE_W / 2, 26, { align: "center" });

  // 公司联系信息（红色条下方小字）
  const coSub = [data.companyAddress, data.companyPhone, data.companyEmail]
    .filter(Boolean).join("   |   ");
  if (coSub) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text(coSub, PAGE_W / 2, 42, { align: "center" });
  }

  // ── 单据标题 ───────────────────────────────────────────────────
  const titleY = 76;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...RED);
  doc.text("SALES ORDER", MARGIN_L, titleY);

  // 单据编号 + 状态（右上方）
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Order #: ${data.orderNumber || data.invoiceNumber}`, PAGE_W - MARGIN_R, titleY - 10, { align: "right" });
  doc.text(`Date: ${fmt(data.issuedAt)}`, PAGE_W - MARGIN_R, titleY, { align: "right" });

  const sc = STATUS_COLORS[data.status] || GRAY;
  doc.setTextColor(...sc);
  doc.text(data.status.toUpperCase(), PAGE_W - MARGIN_R, titleY + 10, { align: "right" });

  // 分隔线
  doc.setDrawColor(...RED);
  doc.setLineWidth(1.2);
  doc.line(MARGIN_L, titleY + 16, PAGE_W - MARGIN_R, titleY + 16);

  // ── FROM / TO / SHIP TO 三栏地址 ───────────────────────────────
  const col1X = MARGIN_L;
  const col2X = MARGIN_L + (PAGE_W - MARGIN_L - MARGIN_R) / 3 + COL_GAP / 2;
  const col3X = MARGIN_L + 2 * (PAGE_W - MARGIN_L - MARGIN_R) / 3 + COL_GAP;
  const addrW = (PAGE_W - MARGIN_L - MARGIN_R - 2 * COL_GAP) / 3;
  let addrY = titleY + 26;

  // 小标题样式
  const labelStyle = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...RED);
  };
  const valueStyle = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
  };

  // FROM（卖方）
  labelStyle();
  doc.text("FROM", col1X, addrY);
  addrY += 12;
  valueStyle();
  const fromName = data.supplierName || coName;
  doc.text(fromName, col1X, addrY);
  addrY += 11;
  const fromLines = addrLine({ name: undefined, street: data.supplierAddress, city: undefined, state: undefined, zipCode: undefined, country: undefined });
  for (const line of fromLines) {
    doc.text(line, col1X, addrY);
    addrY += 11;
  }
  if (data.supplierPhone) {
    doc.text(data.supplierPhone, col1X, addrY);
    addrY += 11;
  }
  const coLines = addrLine({ name: undefined, street: data.companyAddress, city: undefined, state: undefined, zipCode: undefined, country: undefined });
  for (const line of coLines) {
    doc.text(line, col1X, addrY);
    addrY += 11;
  }
  if (data.companyPhone && data.supplierPhone !== data.companyPhone) {
    doc.text(data.companyPhone, col1X, addrY);
  }

  // TO（买方 BILL TO）
  addrY = titleY + 26;
  labelStyle();
  doc.text("TO", col2X, addrY);
  addrY += 12;
  valueStyle();
  const billName = data.billingAddress?.name || data.clientName || "Customer";
  doc.text(billName, col2X, addrY);
  addrY += 11;
  for (const line of addrLine(data.billingAddress)) {
    doc.text(line, col2X, addrY);
    addrY += 11;
  }

  // SHIP TO
  addrY = titleY + 26;
  labelStyle();
  doc.text("SHIP TO", col3X, addrY);
  addrY += 12;
  valueStyle();
  const shipName = data.shippingAddress?.name || data.billingAddress?.name || data.clientName || "Customer";
  doc.text(shipName, col3X, addrY);
  addrY += 11;
  for (const line of addrLine(data.shippingAddress || data.billingAddress)) {
    doc.text(line, col3X, addrY);
    addrY += 11;
  }

  // ── 元数据行（Order#, Date, Ship Date, Via, Terms, Salesperson, PO#）───
  const metaY = addrY + 8;

  const metaRow = (label: string, value: string, x: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...RED);
    doc.text(label, x, metaY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(value || "—", x, metaY + 11);
  };

  const totalW = PAGE_W - MARGIN_L - MARGIN_R;
  const metaCol = totalW / 4;

  metaRow("ORDER #", data.orderNumber || data.invoiceNumber, MARGIN_L);
  metaRow("DATE", fmt(data.issuedAt), MARGIN_L + metaCol);

  if (data.shipDate) {
    metaRow("SHIP DATE", fmt(data.shipDate), MARGIN_L + 2 * metaCol);
  } else if (data.shipVia) {
    // 如果没有 shipDate，把 Ship Via 放在第三列
    metaRow("VIA", data.shipVia, MARGIN_L + 2 * metaCol);
    if (data.terms) metaRow("TERMS", data.terms, MARGIN_L + 3 * metaCol - 20);
  } else {
    if (data.terms) metaRow("TERMS", data.terms, MARGIN_L + 2 * metaCol);
    if (data.salesperson) metaRow("SALESPERSON", data.salesperson, MARGIN_L + 3 * metaCol);
  }

  if (data.shipDate && data.shipVia) metaRow("VIA", data.shipVia, MARGIN_L + 3 * metaCol);

  if (!data.shipDate) {
    // 补充 Terms 和 Salesperson
    if (!data.shipVia && data.terms) metaRow("TERMS", data.terms, MARGIN_L + 2 * metaCol);
    if (data.salesperson) metaRow("SALESPERSON", data.salesperson, MARGIN_L + 3 * metaCol);
    if (data.customerPO) metaRow("CUSTOMER PO#", data.customerPO, MARGIN_L + 3 * metaCol);
  }

  // 元数据分隔线
  doc.setDrawColor(198, 40, 40);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_L, metaY + 20, PAGE_W - MARGIN_R, metaY + 20);

  // ── 商品明细表 ──────────────────────────────────────────────────
  const tableStartY = metaY + 28;

  if (data.items && data.items.length > 0) {
    const tableData = data.items.map((item, idx) => [
      String(idx + 1),
      item.productName + (item.sku ? `  (${item.sku})` : ""),
      item.quantity.toString(),
      item.unit || "UNIT",
      fmtCurrency(item.price),
      fmtCurrency(item.subtotal),
    ]);

    autoTable(doc, {
      startY: tableStartY,
      head: [["#", "DESCRIPTION", "QTY", "TYPE", "RATE", "AMOUNT"]],
      body: tableData,
      theme: "striped",
      styles: {
        fontSize: 9,
        cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
        textColor: DARK,
        lineColor: [203, 213, 225],
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: RED,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 22, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 40, halign: "center" },
        3: { cellWidth: 40, halign: "center" },
        4: { cellWidth: 60, halign: "right" },
        5: { cellWidth: 70, halign: "right" },
      },
      alternateRowStyles: { fillColor: LIGHT_G },
      margin: { left: MARGIN_L, right: MARGIN_R },
    });
  }

  const finalY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      ?.finalY || tableStartY + 20;

  // ── 金额汇总（右对齐）──────────────────────────────────────────
  const sumX = PAGE_W - MARGIN_R - 160;
  const sumValX = PAGE_W - MARGIN_R;
  let sumY = Math.max(finalY + 20, tableStartY + (data.items?.length || 0) * 20 + 20);

  const sumLine = (label: string, value: string, bold = false, color: [number, number, number] = DARK) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text(label, sumX, sumY);
    doc.setTextColor(...color);
    doc.text(value, sumValX, sumY, { align: "right" });
    sumY += 15;
  };

  // Subtotal
  sumLine("Subtotal:", fmtCurrency(data.subtotal));

  // Tax
  if (data.tax && data.tax > 0) sumLine(`Tax:`, fmtCurrency(data.tax));

  // Shipping
  if (data.shipping && data.shipping > 0) sumLine("Shipping:", fmtCurrency(data.shipping));

  // Discount（绿色负数）
  if (data.discount && data.discount > 0) {
    sumLine("Discount:", `-${fmtCurrency(data.discount)}`, false, [34, 197, 94]);
  }

  // TOTAL（双线）
  sumY += 2;
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.8);
  doc.line(sumX, sumY, sumValX, sumY);
  sumY += 6;
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.4);
  doc.line(sumX, sumY, sumValX, sumY);
  sumY += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...RED);
  doc.text("TOTAL:", sumX, sumY);
  doc.text(fmtCurrency(data.total), sumValX, sumY, { align: "right" });

  // Amount Paid / Balance Due
  sumY += 18;
  if (data.amountPaid > 0) {
    sumLine("Amount Paid:", fmtCurrency(data.amountPaid), false, [34, 197, 94]);
  }
  sumLine("Balance Due:", fmtCurrency(data.amountDue), true,
    data.amountDue > 0 ? RED : [34, 197, 94]);

  // ── 底部信息区 ─────────────────────────────────────────────────
  const footerY = Math.max(sumY + 10, finalY + 30);

  // TERMS（左）
  if (data.terms) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...RED);
    doc.text("TERMS:", MARGIN_L, footerY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.text(data.terms, MARGIN_L + 42, footerY);
  }

  // 签名线
  const sigY = footerY + 22;
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_L, sigY, MARGIN_L + 160, sigY);
  doc.line(MARGIN_L + 200, sigY, MARGIN_L + 360, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text("AUTHORIZED SIGNATURE", MARGIN_L, sigY + 9);
  doc.text("DATE", MARGIN_L + 200, sigY + 9);

  // 备注
  if (data.notes) {
    const notesY = sigY + 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...RED);
    doc.text("NOTES:", MARGIN_L, notesY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.setFontSize(8.5);
    const split = doc.splitTextToSize(data.notes, PAGE_W - MARGIN_L - MARGIN_R);
    doc.text(split, MARGIN_L, notesY + 11);
  }

  // ── 页脚 ────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.height;
  doc.setDrawColor(198, 40, 40);
  doc.setLineWidth(0.8);
  doc.line(MARGIN_L, pageH - 24, PAGE_W - MARGIN_R, pageH - 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(`${coName}  |  Thank you for your business!`, PAGE_W / 2, pageH - 14, { align: "center" });

  return doc.output("datauristring");
}

/** Buffer 版（用于 API 响应） */
export function generateInvoicePDFBuffer(data: InvoicePDFData): Buffer {
  const base64 = generateInvoicePDF(data);
  const base64Data = base64.split(",")[1] || "";
  return Buffer.from(base64Data, "base64");
}
