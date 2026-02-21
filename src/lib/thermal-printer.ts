/// <reference types="w3c-web-usb" />
import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import { Invoice, StoreInfo } from "@/types/billing";

export class ThermalPrinterService {
  private device: USBDevice | null = null;

  async connect(): Promise<boolean> {
    try {
      if (!navigator.usb) {
        throw new Error("WebUSB is not supported in this browser.");
      }

      this.device = await navigator.usb.requestDevice({
        filters: [], // Request all USB devices, user will pick the printer
      });

      await this.device.open();
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }
      await this.device.claimInterface(0);

      return true;
    } catch (error) {
      console.error("Thermal Printer connection error:", error);
      return false;
    }
  }

  async printInvoice(invoice: Invoice, storeInfo: StoreInfo): Promise<boolean> {
    if (!this.device) {
      const connected = await this.connect();
      if (!connected) return false;
    }

    try {
      const encoder = new ReceiptPrinterEncoder({
        language: "esc-pos",
        width: 32, // Standard 58mm printer width (32 chars)
      });

      const fmt = (n: number) => `\u20b9${n.toFixed(2)}`;

      encoder
        .initialize()
        .align("center")
        .bold(true)
        .line(storeInfo.name)
        .bold(false)
        .line(storeInfo.address)
        .line(`Ph: ${storeInfo.phone}`)
        .line(`GST: ${storeInfo.gstNumber}`)
        .newline()
        .line("--------------------------------")
        .bold(true)
        .line(`INVOICE: ${invoice.invoiceId}`)
        .bold(false)
        .line(`Date: ${new Date(invoice.date).toLocaleDateString()}`)
        .line(`Customer: ${invoice.customerName}`)
        .line("--------------------------------")
        .align("left");

      // Table Header
      encoder.table(
        [
          { width: 16, align: "left" },
          { width: 4, align: "center" },
          { width: 12, align: "right" },
        ],
        [["Item", "Qty", "Amt"]],
      );

      encoder.line("--------------------------------");

      // Items
      invoice.items.forEach((item) => {
        encoder.table(
          [
            { width: 16, align: "left" },
            { width: 4, align: "center" },
            { width: 12, align: "right" },
          ],
          [
            [
              item.productName.substring(0, 15),
              item.qty.toString(),
              item.lineTotal.toFixed(2),
            ],
          ],
        );

        // If discount exists, show it
        if (item.discount > 0) {
          encoder.line(` Disc: ₹${(item.discount * item.qty).toFixed(2)}`);
        }
      });

      encoder
        .line("--------------------------------")
        .align("right")
        .line(`Subtotal: ${fmt(invoice.subtotal)}`)
        .line(`Tax: ${fmt(invoice.totalTax)}`);

      if (invoice.discount > 0) {
        encoder.line(`Extra Discount: -${fmt(invoice.discount)}`);
      }

      encoder
        .bold(true)
        .line(`TOTAL: ${fmt(invoice.totalAmount)}`)
        .bold(false)
        .newline()
        .align("center")
        .line("Thank you for your business!")
        .newline()
        .cut()
        .encode();

      const result = encoder.encode();

      // Send to USB endpoint
      // Usually endpoint 1 or 2 is the OUT endpoint for printers
      const endpoint =
        this.device?.configuration?.interfaces[0].alternates[0].endpoints.find(
          (e) => e.direction === "out",
        );

      if (!endpoint) {
        throw new Error("Could not find output endpoint on device.");
      }

      await this.device?.transferOut(endpoint.endpointNumber, result);

      return true;
    } catch (error) {
      console.error("Printing error:", error);
      return false;
    }
  }
}

export const thermalPrinter = new ThermalPrinterService();
