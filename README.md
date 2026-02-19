# 🧾 PWA Billing App

A **Progressive Web App (PWA)** for billing and invoicing, built with a mobile-first, offline-first design philosophy. The app works fully without an internet connection and automatically syncs data when connectivity is restored.

---

## ✨ Features

| Feature                           | Description                                                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 📦 **Product Management**         | Add, edit, delete products with categories, unit prices, tax rates, stock quantities, and quick-shortcut keys                                 |
| 👥 **Customer Management**        | Manage customer profiles with name, phone, email, and address                                                                                 |
| 🧾 **Billing / Invoice Creation** | Create invoices by selecting customers, adding products (with POS-style shortcut keys), applying discounts, and calculating tax automatically |
| 📋 **Invoice History**            | View all past invoices with status tracking (Paid / Pending / Overdue)                                                                        |
| 📊 **Dashboard**                  | Overview of key metrics and quick-action navigation                                                                                           |
| 📄 **PDF Invoice Generation**     | Print or download invoices as formatted HTML/PDF files including store info and GST details                                                   |
| 🌙 **Multi-Theme Support**        | Switch between multiple visual themes via the `ThemeSelector` component                                                                       |
| 📶 **Offline Indicator**          | Real-time online/offline status display in the app header                                                                                     |
| 📲 **PWA Install Prompt**         | Native install prompt for adding the app to a home screen on mobile/desktop                                                                   |
| 🔄 **Auto Sync**                  | Changes made offline are queued and automatically synced when the device comes back online                                                    |

---

## 🏗️ Tech Stack

| Layer                | Technology                                     |
| -------------------- | ---------------------------------------------- |
| **Framework**        | React 19 + TypeScript                          |
| **Build Tool**       | Vite 5                                         |
| **Styling**          | Tailwind CSS + shadcn/ui (Radix UI primitives) |
| **State Management** | Zustand                                        |
| **Offline Storage**  | IndexedDB (via custom `BillingDatabase` class) |
| **Backend / Sync**   | Supabase (`@supabase/supabase-js`)             |
| **Forms**            | React Hook Form + Zod validation               |
| **Routing**          | React Router DOM v6                            |
| **Charts**           | Recharts                                       |
| **Animations**       | Framer Motion                                  |
| **Notifications**    | Sonner (toast)                                 |
| **Package Manager**  | pnpm                                           |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── BillingScreen.tsx      # Invoice creation with POS-style product selection
│   ├── CustomerManager.tsx    # Customer CRUD management
│   ├── Dashboard.tsx          # Main dashboard with quick-action cards
│   ├── InstallPrompt.tsx      # PWA "Add to Home Screen" prompt
│   ├── InvoiceHistory.tsx     # View and filter past invoices
│   ├── OfflineIndicator.tsx   # Online/Offline status badge
│   ├── ProductManager.tsx     # Product CRUD management
│   ├── ThemeSelector.tsx      # Theme switcher UI
│   └── ui/                    # shadcn/ui component library (buttons, dialogs, etc.)
│
├── contexts/
│   └── ThemeContext.tsx        # Global theme state and CSS variable injection
│
├── hooks/
│   └── useOnlineStatus.ts     # React hook for browser online/offline detection
│
├── lib/
│   ├── database.ts            # IndexedDB wrapper (products, customers, invoices, sync queue)
│   ├── sync.ts                # Sync manager: processes sync queue when online
│   ├── pdf-generator.ts       # Generates printable/downloadable HTML invoices
│   └── utils.ts               # Shared utility helpers
│
├── pages/
│   ├── Index.tsx              # App shell: routing, initialization, header
│   └── NotFound.tsx           # 404 fallback page
│
├── types/
│   └── billing.ts             # TypeScript interfaces: Product, Customer, Invoice, etc.
│
public/
├── manifest.json              # PWA manifest (app name, icons, theme color)
└── sw.js                      # Service Worker for offline caching and background sync
```

---

## 🗃️ Data Model

### `Product`

```ts
{
  (productId,
    name,
    category,
    unitPrice,
    taxRate,
    stockQty,
    shortcutKey,
    syncStatus,
    lastModified);
}
```

### `Customer`

```ts
{
  (customerId, name, phone, email, address, syncStatus, lastModified);
}
```

### `Invoice`

```ts
{ invoiceId, customerId, customerName, date, items[], discount, subtotal, totalTax, totalAmount, paidStatus, syncStatus, lastModified }
```

### `StoreInfo`

```ts
{
  (name, address, gstNumber, phone, email);
}
```

All records carry a `syncStatus` (`'synced' | 'pending'`) and are tracked in a **sync queue** in IndexedDB.

---

## 🔄 Offline-First Architecture

1. **All writes** (create/update/delete) go to **IndexedDB** first — the app works fully offline.
2. Every write also enqueues a `SyncQueueItem` with the action type and payload.
3. When the browser detects an `online` event, `SyncManager.performSync()` drains the queue.
4. Sync is also triggered via the **Service Worker Background Sync API** for reliability.

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 8.10

### Install & Run

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The app will be available at `http://localhost:5173` by default.

---

## 🖨️ Invoice PDF Generation

Invoices can be:

- **Printed** via the browser's native print dialog (`PDFGenerator.generateInvoicePDF`)
- **Downloaded** as a self-contained `.html` file (`PDFGenerator.downloadInvoicePDF`)

The generated invoice includes store name, GST number, customer details, line items with tax breakdown, discount, and total amount (in INR ₹).

---

## 📲 PWA Installation

On supported browsers:

1. Open the app in Chrome/Edge on Android or desktop.
2. The **Install Prompt** component will appear automatically.
3. Click **Install** to add the app to your home screen / taskbar.
4. The app will launch as a standalone window with full offline support.

---

## 🎨 Theming

The app uses CSS custom properties for theming, injected via `ThemeContext`. Use the **Theme Selector** button in the header to switch themes at runtime with no page reload.

---

## 📌 Sample Data

On first launch, the app automatically seeds:

- **5 sample products** (Laptop, Smartphone, T-Shirt, Coffee Mug, Tea) across Electronics, Clothing, Food, and Home & Garden categories.
- **2 sample customers** (John Doe, Jane Smith) for quick testing.

---

## 🔧 Linting

```bash
pnpm lint
```

ESLint is configured with React Hooks and React Refresh plugins for safe development.
