import { billingDB } from './database';
import { Product, Customer, Invoice, SyncQueueItem } from '@/types/billing';

class SyncManager {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.performSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Register service worker for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      this.registerBackgroundSync();
    }
  }

  private async registerBackgroundSync(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('background-sync');
    } catch (error) {
      console.log('Background sync registration failed:', error);
    }
  }

  async performSync(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      const syncQueue = await billingDB.getSyncQueue();
      
      for (const item of syncQueue) {
        try {
          await this.syncItem(item);
          await billingDB.removeSyncItem(item.id);
        } catch (error) {
          console.error('Failed to sync item:', item, error);
          // Continue with other items even if one fails
        }
      }

      // Also sync any items that might have been marked as pending
      await this.syncPendingItems();

    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    // In a real implementation, this would make API calls to your server
    // For this demo, we'll just simulate the sync and mark items as synced
    
    console.log('Syncing item:', item);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update the local item to mark it as synced
    switch (item.type) {
      case 'product':
        if (item.action !== 'delete' && 'productId' in item.data) {
          const product = await billingDB.getProduct(item.data.productId);
          if (product) {
            product.syncStatus = 'synced';
            await billingDB.updateProduct(product);
          }
        }
        break;
      case 'customer':
        if (item.action !== 'delete' && 'customerId' in item.data) {
          const customer = await billingDB.getCustomer(item.data.customerId);
          if (customer) {
            customer.syncStatus = 'synced';
            await billingDB.updateCustomer(customer);
          }
        }
        break;
      case 'invoice':
        if (item.action !== 'delete' && 'invoiceId' in item.data) {
          const invoice = await billingDB.getInvoice(item.data.invoiceId);
          if (invoice) {
            invoice.syncStatus = 'synced';
            await billingDB.updateInvoice(invoice);
          }
        }
        break;
    }
  }

  private async syncPendingItems(): Promise<void> {
    // Sync products
    const products = await billingDB.getProducts();
    for (const product of products.filter(p => p.syncStatus === 'pending')) {
      try {
        // Simulate API sync
        await new Promise(resolve => setTimeout(resolve, 50));
        product.syncStatus = 'synced';
        await billingDB.updateProduct(product);
      } catch (error) {
        console.error('Failed to sync product:', product.productId, error);
      }
    }

    // Sync customers
    const customers = await billingDB.getCustomers();
    for (const customer of customers.filter(c => c.syncStatus === 'pending')) {
      try {
        // Simulate API sync
        await new Promise(resolve => setTimeout(resolve, 50));
        customer.syncStatus = 'synced';
        await billingDB.updateCustomer(customer);
      } catch (error) {
        console.error('Failed to sync customer:', customer.customerId, error);
      }
    }

    // Sync invoices
    const invoices = await billingDB.getInvoices();
    for (const invoice of invoices.filter(i => i.syncStatus === 'pending')) {
      try {
        // Simulate API sync
        await new Promise(resolve => setTimeout(resolve, 50));
        invoice.syncStatus = 'synced';
        await billingDB.updateInvoice(invoice);
      } catch (error) {
        console.error('Failed to sync invoice:', invoice.invoiceId, error);
      }
    }
  }

  // Method to manually trigger sync
  async manualSync(): Promise<void> {
    if (this.isOnline) {
      await this.performSync();
      return;
    }
    throw new Error('Cannot sync while offline');
  }

  // Method to check if there are pending items to sync
  async hasPendingSync(): Promise<boolean> {
    const syncQueue = await billingDB.getSyncQueue();
    if (syncQueue.length > 0) return true;

    const products = await billingDB.getProducts();
    const customers = await billingDB.getCustomers();
    const invoices = await billingDB.getInvoices();

    return products.some(p => p.syncStatus === 'pending') ||
           customers.some(c => c.syncStatus === 'pending') ||
           invoices.some(i => i.syncStatus === 'pending');
  }
}

export const syncManager = new SyncManager();