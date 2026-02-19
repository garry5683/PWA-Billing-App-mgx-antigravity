# Progressive Web Billing Application - MVP Implementation

## Core Files to Create:

### 1. PWA Configuration
- `public/manifest.json` - PWA manifest file
- `public/sw.js` - Service worker for offline functionality
- Update `index.html` - Add PWA meta tags and service worker registration

### 2. Database Layer (IndexedDB)
- `src/lib/database.ts` - IndexedDB wrapper and database schema
- `src/lib/sync.ts` - Sync functionality for online/offline data management

### 3. Core Components
- `src/components/Dashboard.tsx` - Main dashboard with quick actions
- `src/components/ProductManager.tsx` - Product management screen
- `src/components/CustomerManager.tsx` - Customer management screen
- `src/components/BillingScreen.tsx` - Invoice creation screen
- `src/components/InvoiceHistory.tsx` - Invoice list and history

### 4. Utility Components
- `src/components/OfflineIndicator.tsx` - Shows online/offline status
- `src/components/InstallPrompt.tsx` - PWA installation prompt
- `src/lib/pdf-generator.ts` - PDF invoice generation
- `src/hooks/useOnlineStatus.ts` - Hook for online/offline detection

### 5. Types and Interfaces
- `src/types/billing.ts` - TypeScript interfaces for all entities

## Implementation Strategy:
1. Set up PWA configuration and service worker
2. Create IndexedDB database layer with sync capabilities
3. Build core billing components with mobile-first design
4. Implement PDF generation for invoices
5. Add offline/online status detection
6. Test PWA installation and offline functionality

## Key Features:
- Mobile-first responsive design with POS-style buttons
- Complete offline functionality with IndexedDB
- Auto-sync when back online
- PDF invoice generation
- PWA installation support
- Real-time online/offline status indicator