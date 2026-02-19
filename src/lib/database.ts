import { Product, Customer, Invoice, SyncQueueItem } from '@/types/billing';

class BillingDatabase {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'PWABillingDB';
  private readonly version = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Products store
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'productId' });
          productStore.createIndex('category', 'category', { unique: false });
          productStore.createIndex('name', 'name', { unique: false });
        }

        // Customers store
        if (!db.objectStoreNames.contains('customers')) {
          const customerStore = db.createObjectStore('customers', { keyPath: 'customerId' });
          customerStore.createIndex('name', 'name', { unique: false });
          customerStore.createIndex('phone', 'phone', { unique: false });
        }

        // Invoices store
        if (!db.objectStoreNames.contains('invoices')) {
          const invoiceStore = db.createObjectStore('invoices', { keyPath: 'invoiceId' });
          invoiceStore.createIndex('customerId', 'customerId', { unique: false });
          invoiceStore.createIndex('date', 'date', { unique: false });
          invoiceStore.createIndex('paidStatus', 'paidStatus', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db) {
      await this.init();
    }
    const transaction = this.db!.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  // Product operations
  async addProduct(product: Product): Promise<void> {
    const store = await this.getStore('products', 'readwrite');
    product.lastModified = new Date();
    product.syncStatus = 'pending';
    await this.promisifyRequest(store.add(product));
    await this.addToSyncQueue('product', 'create', product);
  }

  async updateProduct(product: Product): Promise<void> {
    const store = await this.getStore('products', 'readwrite');
    product.lastModified = new Date();
    product.syncStatus = 'pending';
    await this.promisifyRequest(store.put(product));
    await this.addToSyncQueue('product', 'update', product);
  }

  async deleteProduct(productId: string): Promise<void> {
    const store = await this.getStore('products', 'readwrite');
    await this.promisifyRequest(store.delete(productId));
    await this.addToSyncQueue('product', 'delete', { productId });
  }

  async getProducts(): Promise<Product[]> {
    const store = await this.getStore('products');
    return this.promisifyRequest(store.getAll());
  }

  async getProduct(productId: string): Promise<Product | undefined> {
    const store = await this.getStore('products');
    return this.promisifyRequest(store.get(productId));
  }

  // Customer operations
  async addCustomer(customer: Customer): Promise<void> {
    const store = await this.getStore('customers', 'readwrite');
    customer.lastModified = new Date();
    customer.syncStatus = 'pending';
    await this.promisifyRequest(store.add(customer));
    await this.addToSyncQueue('customer', 'create', customer);
  }

  async updateCustomer(customer: Customer): Promise<void> {
    const store = await this.getStore('customers', 'readwrite');
    customer.lastModified = new Date();
    customer.syncStatus = 'pending';
    await this.promisifyRequest(store.put(customer));
    await this.addToSyncQueue('customer', 'update', customer);
  }

  async deleteCustomer(customerId: string): Promise<void> {
    const store = await this.getStore('customers', 'readwrite');
    await this.promisifyRequest(store.delete(customerId));
    await this.addToSyncQueue('customer', 'delete', { customerId });
  }

  async getCustomers(): Promise<Customer[]> {
    const store = await this.getStore('customers');
    return this.promisifyRequest(store.getAll());
  }

  async getCustomer(customerId: string): Promise<Customer | undefined> {
    const store = await this.getStore('customers');
    return this.promisifyRequest(store.get(customerId));
  }

  // Invoice operations
  async addInvoice(invoice: Invoice): Promise<void> {
    const store = await this.getStore('invoices', 'readwrite');
    invoice.lastModified = new Date();
    invoice.syncStatus = 'pending';
    await this.promisifyRequest(store.add(invoice));
    await this.addToSyncQueue('invoice', 'create', invoice);
  }

  async updateInvoice(invoice: Invoice): Promise<void> {
    const store = await this.getStore('invoices', 'readwrite');
    invoice.lastModified = new Date();
    invoice.syncStatus = 'pending';
    await this.promisifyRequest(store.put(invoice));
    await this.addToSyncQueue('invoice', 'update', invoice);
  }

  async getInvoices(): Promise<Invoice[]> {
    const store = await this.getStore('invoices');
    return this.promisifyRequest(store.getAll());
  }

  async getInvoice(invoiceId: string): Promise<Invoice | undefined> {
    const store = await this.getStore('invoices');
    return this.promisifyRequest(store.get(invoiceId));
  }

  // Sync queue operations
  private async addToSyncQueue(type: 'product' | 'customer' | 'invoice', action: 'create' | 'update' | 'delete', data: Product | Customer | Invoice | { productId?: string; customerId?: string }): Promise<void> {
    const store = await this.getStore('syncQueue', 'readwrite');
    const syncItem: SyncQueueItem = {
      id: `${type}_${action}_${Date.now()}_${Math.random()}`,
      type,
      action,
      data,
      timestamp: new Date()
    };
    await this.promisifyRequest(store.add(syncItem));
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const store = await this.getStore('syncQueue');
    return this.promisifyRequest(store.getAll());
  }

  async clearSyncQueue(): Promise<void> {
    const store = await this.getStore('syncQueue', 'readwrite');
    await this.promisifyRequest(store.clear());
  }

  async removeSyncItem(id: string): Promise<void> {
    const store = await this.getStore('syncQueue', 'readwrite');
    await this.promisifyRequest(store.delete(id));
  }

  // Utility method to promisify IndexedDB requests
  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Search methods
  async searchProducts(query: string): Promise<Product[]> {
    const products = await this.getProducts();
    return products.filter(product => 
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    const customers = await this.getCustomers();
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(query.toLowerCase()) ||
      customer.phone.includes(query) ||
      customer.email.toLowerCase().includes(query.toLowerCase())
    );
  }
}

export const billingDB = new BillingDatabase();