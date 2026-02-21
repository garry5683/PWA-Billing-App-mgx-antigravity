import { Invoice, StoreInfo } from "@/types/billing";

export class PDFGenerator {
  static async generateInvoicePDF(
    invoice: Invoice,
    storeInfo: StoreInfo,
  ): Promise<void> {
    const printWindow = window.open("", "_blank");
    if (!printWindow) throw new Error("Unable to open print window");

    printWindow.document.write(this.generateInvoiceHTML(invoice, storeInfo));
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  }

  static async downloadInvoicePDF(
    invoice: Invoice,
    storeInfo: StoreInfo,
  ): Promise<void> {
    const htmlContent = this.generateInvoiceHTML(invoice, storeInfo);
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${invoice.invoiceId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private static generateInvoiceHTML(
    invoice: Invoice,
    storeInfo: StoreInfo,
  ): string {
    const fmt = (n: number) => `\u20b9${n.toFixed(2)}`;
    const fmtDate = (d: Date) => new Date(d).toLocaleDateString("en-IN");

    const totalItemDiscounts = invoice.items.reduce(
      (s, i) => s + (i.discount ?? 0) * i.qty,
      0,
    );
    const hasDiscounts = invoice.items.some((i) => (i.discount ?? 0) > 0);
    const totalSaved = totalItemDiscounts + (invoice.discount ?? 0);

    const itemRows = invoice.items
      .map((item) => {
        const itemTotalDiscount = (item.discount ?? 0) * item.qty;
        return `
      <tr>
        <td>${item.productName}</td>
        <td class="num">${item.qty}</td>
        <td class="num">${fmt(item.price)}</td>
        ${hasDiscounts ? `<td class="num">${item.discount > 0 ? `${fmt(item.discount)}/unit` : "—"}</td>` : ""}
        ${hasDiscounts ? `<td class="num">${item.discount > 0 ? `&#8722;${fmt(itemTotalDiscount)}` : "—"}</td>` : ""}
        ${hasDiscounts ? `<td class="num"><strong>${fmt(item.discountedPrice ?? item.price)}</strong></td>` : ""}
        <td class="num">${fmt(item.tax)}</td>
        <td class="num"><strong>${fmt(item.lineTotal)}</strong></td>
      </tr>`;
      })
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
      font-size: 13px;
      color: #000;
      background: #fff;
      line-height: 1.5;
    }

    /* ---- Header ---- */
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .company-name { font-size: 22px; font-weight: bold; }
    .company-sub  { font-size: 11px; color: #333; margin-top: 4px; }

    /* ---- Meta ---- */
    .meta { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .meta-block { width: 48%; }
    .meta-block .label {
      font-weight: bold;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
      margin-bottom: 6px;
    }
    .meta-block p { margin: 2px 0; font-size: 12px; }
    .meta-block.right { text-align: right; }

    /* ---- Items table ---- */
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #000; padding: 6px 8px; font-size: 12px; }
    th { background: #f0f0f0; font-weight: bold; }
    .num { text-align: right; }

    /* ---- Totals ---- */
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .totals-table { width: 280px; border-collapse: collapse; }
    .totals-table td { padding: 4px 10px; border-bottom: 1px solid #ccc; font-size: 12px; }
    .totals-table .t-val { text-align: right; }
    .grand-row td {
      font-weight: bold;
      font-size: 15px;
      border-top: 2px solid #000;
      padding-top: 6px;
    }

    /* ---- Savings banner ---- */
    .savings-banner {
      border: 2px dashed #000;
      text-align: center;
      padding: 10px 16px;
      margin-bottom: 20px;
      font-size: 14px;
      font-weight: bold;
      letter-spacing: 0.3px;
    }
    .savings-banner span { font-size: 16px; }

    /* ---- Footer ---- */
    .footer {
      text-align: center;
      padding-top: 14px;
      border-top: 1px solid #000;
      font-size: 11px;
      color: #333;
    }

    @media print { body { margin: 0; padding: 16px; } }
  </style>
</head>
<body>

  <div class="header">
    <div class="company-name">${storeInfo.name}</div>
    <div class="company-sub">
      ${storeInfo.address} &nbsp;|&nbsp;
      GST No: ${storeInfo.gstNumber} &nbsp;|&nbsp;
      Ph: ${storeInfo.phone} &nbsp;|&nbsp; ${storeInfo.email}
    </div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <div class="label">Bill To</div>
      <p><strong>${invoice.customerName}</strong></p>
    </div>
    <div class="meta-block right">
      <div class="label">Invoice Details</div>
      <p><strong>Invoice #:</strong> ${invoice.invoiceId}</p>
      <p><strong>Date:</strong> ${fmtDate(invoice.date)}</p>
      <p><strong>Status:</strong> ${invoice.paidStatus.toUpperCase()}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        ${hasDiscounts ? '<th class="num">Disc/unit</th>' : ""}
        ${hasDiscounts ? '<th class="num">Total Disc</th>' : ""}
        ${hasDiscounts ? '<th class="num">Net Rate</th>' : ""}
        <th class="num">Tax</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals-wrap">
    <table class="totals-table">
      <tr>
        <td>Subtotal</td>
        <td class="t-val">${fmt(invoice.subtotal)}</td>
      </tr>
      <tr>
        <td>Tax</td>
        <td class="t-val">${fmt(invoice.totalTax)}</td>
      </tr>
      ${
        totalItemDiscounts > 0
          ? `
      <tr>
        <td>Item Discounts</td>
        <td class="t-val">&#8722;${fmt(totalItemDiscounts)}</td>
      </tr>`
          : ""
      }
      ${
        (invoice.discount ?? 0) > 0
          ? `
      <tr>
        <td>Extra Discount</td>
        <td class="t-val">&#8722;${fmt(invoice.discount)}</td>
      </tr>`
          : ""
      }
      <tr class="grand-row">
        <td>Grand Total</td>
        <td class="t-val">${fmt(invoice.totalAmount)}</td>
      </tr>
    </table>
  </div>

  ${
    totalSaved > 0
      ? `
  <div class="savings-banner">
    &#127881; You saved <span>${fmt(totalSaved)}</span> on this purchase! &#127881;
  </div>`
      : ""
  }

  <div class="footer">
    <p><strong>Thank you for your business!</strong></p>
    <p>Visit again &mdash; We look forward to serving you.</p>
  </div>

</body>
</html>`;
  }
}
