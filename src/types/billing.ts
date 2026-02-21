export interface Product {
  productId: string;
  name: string;
  category: string;
  unitPrice: number;
  taxRate: number;
  stockQty: number;
  shortcutKey?: string; // New field for shortcut keys
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
  price: number;
  tax: number;
  lineTotal: number;
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
