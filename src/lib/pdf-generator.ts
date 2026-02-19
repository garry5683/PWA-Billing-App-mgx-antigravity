import { Invoice, StoreInfo } from '@/types/billing';

export class PDFGenerator {
  static async generateInvoicePDF(invoice: Invoice, storeInfo: StoreInfo): Promise<void> {
    // Create a new window for the PDF content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window');
    }

    const htmlContent = this.generateInvoiceHTML(invoice, storeInfo);
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  }

  static async downloadInvoicePDF(invoice: Invoice, storeInfo: StoreInfo): Promise<void> {
    // For a more robust solution, you would use a library like jsPDF or Puppeteer
    // For this demo, we'll create a downloadable HTML file
    const htmlContent = this.generateInvoiceHTML(invoice, storeInfo);
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.invoiceId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  private static generateInvoiceHTML(invoice: Invoice, storeInfo: StoreInfo): string {
    const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;
    const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-IN');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoiceId}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .customer-details, .invoice-info {
            width: 48%;
        }
        .section-title {
            font-weight: bold;
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th,
        .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .items-table .number {
            text-align: right;
        }
        .totals {
            float: right;
            width: 300px;
        }
        .totals table {
            width: 100%;
            border-collapse: collapse;
        }
        .totals td {
            padding: 5px 10px;
            border-bottom: 1px solid #ddd;
        }
        .totals .total-row {
            font-weight: bold;
            font-size: 16px;
            background-color: #f5f5f5;
        }
        .footer {
            clear: both;
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
        }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">${storeInfo.name}</div>
        <div>${storeInfo.address}</div>
        <div>GST No: ${storeInfo.gstNumber}</div>
        <div>Phone: ${storeInfo.phone} | Email: ${storeInfo.email}</div>
    </div>

    <div class="invoice-details">
        <div class="customer-details">
            <div class="section-title">Bill To:</div>
            <div><strong>${invoice.customerName}</strong></div>
        </div>
        <div class="invoice-info">
            <div class="section-title">Invoice Details:</div>
            <div><strong>Invoice #:</strong> ${invoice.invoiceId}</div>
            <div><strong>Date:</strong> ${formatDate(invoice.date)}</div>
            <div><strong>Status:</strong> ${invoice.paidStatus.toUpperCase()}</div>
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Item</th>
                <th class="number">Qty</th>
                <th class="number">Rate</th>
                <th class="number">Tax</th>
                <th class="number">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.items.map(item => `
                <tr>
                    <td>${item.productName}</td>
                    <td class="number">${item.qty}</td>
                    <td class="number">${formatCurrency(item.price)}</td>
                    <td class="number">${formatCurrency(item.tax)}</td>
                    <td class="number">${formatCurrency(item.lineTotal)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="totals">
        <table>
            <tr>
                <td>Subtotal:</td>
                <td class="number">${formatCurrency(invoice.subtotal)}</td>
            </tr>
            <tr>
                <td>Discount:</td>
                <td class="number">-${formatCurrency(invoice.discount)}</td>
            </tr>
            <tr>
                <td>Tax:</td>
                <td class="number">${formatCurrency(invoice.totalTax)}</td>
            </tr>
            <tr class="total-row">
                <td>Total:</td>
                <td class="number">${formatCurrency(invoice.totalAmount)}</td>
            </tr>
        </table>
    </div>

    <div class="footer">
        <p><strong>Thank you for your business!</strong></p>
        <p>Visit again</p>
    </div>
</body>
</html>`;
  }
}