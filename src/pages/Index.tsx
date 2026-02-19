import { useState, useEffect } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { ProductManager } from '@/components/ProductManager';
import { CustomerManager } from '@/components/CustomerManager';
import { BillingScreen } from '@/components/BillingScreen';
import { InvoiceHistory } from '@/components/InvoiceHistory';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { InstallPrompt } from '@/components/InstallPrompt';
import { ThemeSelector } from '@/components/ThemeSelector';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { billingDB } from '@/lib/database';
import { syncManager } from '@/lib/sync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { toast } from 'sonner';

type Screen = 'dashboard' | 'products' | 'customers' | 'billing' | 'invoices';

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [isInitialized, setIsInitialized] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  useEffect(() => {
    // Trigger sync when coming back online
    if (isOnline && isInitialized) {
      syncManager.performSync().then(() => {
        toast.success('Data synced successfully');
      }).catch((error) => {
        console.error('Sync failed:', error);
      });
    }
  }, [isOnline, isInitialized]);

  const initializeApp = async () => {
    try {
      await billingDB.init();
      setIsInitialized(true);
      
      // Add sample data if database is empty
      await addSampleDataIfEmpty();
      
      toast.success('PWA Billing App initialized');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      toast.error('Failed to initialize app');
    }
  };

  const addSampleDataIfEmpty = async () => {
    try {
      const products = await billingDB.getProducts();
      const customers = await billingDB.getCustomers();

      if (products.length === 0) {
        // Add sample products with shortcut keys
        const sampleProducts = [
          {
            productId: 'prod_1',
            name: 'Laptop',
            category: 'Electronics',
            unitPrice: 45000,
            taxRate: 18,
            stockQty: 10,
            shortcutKey: 'LAP',
            syncStatus: 'synced' as const,
            lastModified: new Date()
          },
          {
            productId: 'prod_2',
            name: 'T-Shirt',
            category: 'Clothing',
            unitPrice: 500,
            taxRate: 5,
            stockQty: 50,
            shortcutKey: 'TSH',
            syncStatus: 'synced' as const,
            lastModified: new Date()
          },
          {
            productId: 'prod_3',
            name: 'Coffee Mug',
            category: 'Home & Garden',
            unitPrice: 150,
            taxRate: 12,
            stockQty: 25,
            shortcutKey: 'MUG',
            syncStatus: 'synced' as const,
            lastModified: new Date()
          },
          {
            productId: 'prod_4',
            name: 'Smartphone',
            category: 'Electronics',
            unitPrice: 25000,
            taxRate: 18,
            stockQty: 15,
            shortcutKey: 'PHN',
            syncStatus: 'synced' as const,
            lastModified: new Date()
          },
          {
            productId: 'prod_5',
            name: 'Tea',
            category: 'Food',
            unitPrice: 50,
            taxRate: 5,
            stockQty: 100,
            shortcutKey: 'TEA',
            syncStatus: 'synced' as const,
            lastModified: new Date()
          }
        ];

        for (const product of sampleProducts) {
          await billingDB.addProduct(product);
        }
      }

      if (customers.length === 0) {
        // Add sample customers
        const sampleCustomers = [
          {
            customerId: 'cust_1',
            name: 'John Doe',
            phone: '+91 9876543210',
            email: 'john@example.com',
            address: '123 Main Street, City, State',
            syncStatus: 'synced' as const,
            lastModified: new Date()
          },
          {
            customerId: 'cust_2',
            name: 'Jane Smith',
            phone: '+91 9876543211',
            email: 'jane@example.com',
            address: '456 Oak Avenue, City, State',
            syncStatus: 'synced' as const,
            lastModified: new Date()
          }
        ];

        for (const customer of sampleCustomers) {
          await billingDB.addCustomer(customer);
        }
      }
    } catch (error) {
      console.error('Error adding sample data:', error);
    }
  };

  const navigateToScreen = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const goToDashboard = () => {
    setCurrentScreen('dashboard');
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-surface">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: 'var(--color-primary)' }}
          ></div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Initializing PWA Billing App...
          </h2>
          <p style={{ color: 'var(--color-textSecondary)' }} className="mt-2">
            Setting up your offline database
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      {/* Header */}
      <header 
        className="shadow-sm border-b"
        style={{ 
          backgroundColor: 'var(--color-background)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 
                className="text-xl font-bold"
                style={{ color: 'var(--color-text)' }}
              >
                PWA Billing
              </h1>
              <OfflineIndicator />
            </div>
            <div className="flex items-center gap-4">
              <ThemeSelector />
              {currentScreen !== 'dashboard' && (
                <button
                  onClick={goToDashboard}
                  className="font-medium hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {currentScreen === 'dashboard' && (
          <Dashboard onNavigate={navigateToScreen} />
        )}
        {currentScreen === 'products' && (
          <ProductManager onBack={goToDashboard} />
        )}
        {currentScreen === 'customers' && (
          <CustomerManager onBack={goToDashboard} />
        )}
        {currentScreen === 'billing' && (
          <BillingScreen onBack={goToDashboard} />
        )}
        {currentScreen === 'invoices' && (
          <InvoiceHistory onBack={goToDashboard} />
        )}
      </main>

      {/* Install Prompt */}
      <InstallPrompt />
    </div>
  );
}

export default function Index() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}