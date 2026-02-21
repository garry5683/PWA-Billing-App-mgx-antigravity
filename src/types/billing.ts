export interface Product {
  productId: string;
  name: string;
  category: string;
  unitPrice: number;
  costPrice: number; // purchase / cost price (what the owner paid)
  defaultDiscount: number; // preset discount per unit (₹) applied when added to invoice
  taxRate: number;
  stockQty: number;
  shortcutKey?: string;
  syncStatus: "synced" | "pending";
  lastModified: Date;
}

export interface Customer {
  customerId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  isCashInHand?: boolean;
  syncStatus: "synced" | "pending";
  lastModified: Date;
}

export interface InvoiceLineItem {
  productId: string;
  productName: string;
  qty: number;
  price: number; // overridable selling unit price (does not affect catalog)
  costPrice: number; // snapshot of cost price at billing time (internal)
  taxRate: number; // overridable tax % (does not affect catalog)
  discount: number; // per-unit discount in ₹/unit  (total discount = discount × qty)
  discountedPrice: number; // net unit price after discount: price − discount
  tax: number; // computed on net price: (price − discount) × qty × taxRate / 100
  lineTotal: number; // computed: discountedPrice × qty + tax
}

export interface Invoice {
  invoiceId: string;
  customerId: string;
  customerName: string;
  date: Date;
  items: InvoiceLineItem[];
  discount: number;
  subtotal: number;
  totalTax: number;
  totalAmount: number;
  paidStatus: "paid" | "pending" | "overdue";
  syncStatus: "synced" | "pending";
  lastModified: Date;
}

export interface StoreInfo {
  name: string;
  address: string;
  gstNumber: string;
  phone: string;
  email: string;
}

export interface SyncQueueItem {
  id: string;
  type: "product" | "customer" | "invoice";
  action: "create" | "update" | "delete";
  data:
    | Product
    | Customer
    | Invoice
    | { productId?: string; customerId?: string; invoiceId?: string };
  timestamp: Date;
}
