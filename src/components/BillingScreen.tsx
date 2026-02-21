import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Trash2, 
  Calculator,
  Receipt,
  User,
  Package,
  Keyboard,
  ShoppingCart,
  X,
  Wallet,
  Pencil,
  Check
} from 'lucide-react';
import { billingDB, CASH_IN_HAND_CUSTOMER_ID } from '@/lib/database';
import { Product, Customer, Invoice, InvoiceLineItem } from '@/types/billing';
import { PDFGenerator } from '@/lib/pdf-generator';
import { toast } from 'sonner';

interface BillingScreenProps {
  onBack: () => void;
}

export function BillingScreen({ onBack }: BillingScreenProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceLineItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // New customer form
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  // Cash-in-Hand edit state
  const [isEditingCashInHand, setIsEditingCashInHand] = useState(false);
  const [cashInHandForm, setCashInHandForm] = useState({
    name: 'Cash in Hand',
    phone: 'N/A',
    email: '',
    address: 'Walk-in Customer'
  });

  const productSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const storeInfo = {
    name: 'Your Store Name',
    address: '123 Business Street, City, State 12345',
    gstNumber: 'GST123456789',
    phone: '+91 9876543210',
    email: 'store@example.com'
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, productSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-select Cash-in-Hand customer on load
  const loadData = async () => {
    try {
      const [customerList, productList] = await Promise.all([
        billingDB.getCustomers(),
        billingDB.getProducts()
      ]);
      setCustomers(customerList);
      setProducts(productList);

      // Only auto-select Cash-in-Hand if no customer is already chosen
      setSelectedCustomer(prev => {
        if (prev) return prev;
        const cashInHand = customerList.find(c => c.customerId === CASH_IN_HAND_CUSTOMER_ID);
        return cashInHand ?? null;
      });

      // Sync the edit form with the stored Cash-in-Hand customer (respects user edits)
      const cashCustomer = customerList.find(c => c.customerId === CASH_IN_HAND_CUSTOMER_ID);
      if (cashCustomer) {
        setCashInHandForm({
          name: cashCustomer.name,
          phone: cashCustomer.phone,
          email: cashCustomer.email,
          address: cashCustomer.address
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
  };

  const filterProducts = () => {
    if (!productSearch.trim()) {
      setFilteredProducts([]);
      setShowProductDropdown(false);
      return;
    }

    const availableProducts = products.filter(product => product.stockQty > 0);
    const filtered = availableProducts.filter(product =>
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (product.shortcutKey && product.shortcutKey.toLowerCase().includes(productSearch.toLowerCase())) ||
      product.category.toLowerCase().includes(productSearch.toLowerCase())
    );
    
    setFilteredProducts(filtered.slice(0, 10));
    setShowProductDropdown(filtered.length > 0);
    setHighlightedIndex(-1);
  };

  // Only show non-cash-in-hand customers in the search list
  const regularCustomers = customers.filter(c => !c.isCashInHand);
  const cashInHandCustomer = customers.find(c => c.customerId === CASH_IN_HAND_CUSTOMER_ID);

  const filteredCustomers = regularCustomers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone.includes(customerSearch)
  );

  const handleProductSearchFocus = () => {
    if (productSearch.trim() && filteredProducts.length > 0) {
      setShowProductDropdown(true);
    }
  };

  const handleProductSearchChange = (value: string) => {
    setProductSearch(value);
    if (value.trim()) {
      setShowProductDropdown(true);
    } else {
      setShowProductDropdown(false);
    }
  };

  const handleProductSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showProductDropdown || filteredProducts.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredProducts.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
          addProductToInvoice(filteredProducts[highlightedIndex]);
        } else if (filteredProducts.length > 0) {
          addProductToInvoice(filteredProducts[0]);
        }
        break;
      case 'Escape':
        setShowProductDropdown(false);
        setHighlightedIndex(-1);
        productSearchRef.current?.blur();
        break;
    }
  };

  const clearProductSearch = () => {
    setProductSearch('');
    setShowProductDropdown(false);
    setHighlightedIndex(-1);
    productSearchRef.current?.focus();
  };

  const addCustomer = async () => {
    if (!newCustomerForm.name.trim() || !newCustomerForm.phone.trim()) {
      toast.error('Please fill in name and phone number');
      return;
    }

    try {
      const customer: Customer = {
        customerId: `cust_${Date.now()}`,
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        email: newCustomerForm.email.trim(),
        address: newCustomerForm.address.trim(),
        syncStatus: 'pending',
        lastModified: new Date()
      };

      await billingDB.addCustomer(customer);
      await loadData();
      setSelectedCustomer(customer);
      setNewCustomerForm({ name: '', phone: '', email: '', address: '' });
      setIsCustomerDialogOpen(false);
      toast.success('Customer added successfully');
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
    }
  };

  const saveCashInHandEdits = async () => {
    try {
      await billingDB.updateCashInHandCustomer(cashInHandForm);
      // Reflect the new name in the selected customer if currently set to cash-in-hand
      if (selectedCustomer?.isCashInHand) {
        setSelectedCustomer(prev => prev ? { ...prev, ...cashInHandForm } : prev);
      }
      setIsEditingCashInHand(false);
      await loadData();
      toast.success('Cash in Hand defaults updated');
    } catch (error) {
      console.error('Error updating Cash in Hand customer:', error);
      toast.error('Failed to update Cash in Hand details');
    }
  };

  const selectCashInHand = () => {
    if (cashInHandCustomer) {
      setSelectedCustomer(cashInHandCustomer);
    }
    setIsCustomerDialogOpen(false);
    setCustomerSearch('');
    setIsEditingCashInHand(false);
  };

  const addProductToInvoice = (product: Product, quantity: number = 1) => {
    const existingItemIndex = invoiceItems.findIndex(item => item.productId === product.productId);
    
    if (existingItemIndex >= 0) {
      const updatedItems = [...invoiceItems];
      const newQty = updatedItems[existingItemIndex].qty + quantity;
      
      if (newQty > product.stockQty) {
        toast.error(`Only ${product.stockQty} units available in stock`);
        return;
      }
      
      updatedItems[existingItemIndex].qty = newQty;
      updatedItems[existingItemIndex].tax = (product.unitPrice * newQty * product.taxRate) / 100;
      updatedItems[existingItemIndex].lineTotal = (product.unitPrice * newQty) + updatedItems[existingItemIndex].tax;
      
      setInvoiceItems(updatedItems);
    } else {
      if (quantity > product.stockQty) {
        toast.error(`Only ${product.stockQty} units available in stock`);
        return;
      }
      
      const tax = (product.unitPrice * quantity * product.taxRate) / 100;
      const lineTotal = (product.unitPrice * quantity) + tax;
      
      const newItem: InvoiceLineItem = {
        productId: product.productId,
        productName: product.name,
        qty: quantity,
        price: product.unitPrice,
        tax: tax,
        lineTotal: lineTotal
      };
      
      setInvoiceItems([...invoiceItems, newItem]);
    }
    
    setProductSearch('');
    setShowProductDropdown(false);
    setHighlightedIndex(-1);
    toast.success(`Added ${product.name} to invoice`);
  };

  const updateItemQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(productId);
      return;
    }

    const product = products.find(p => p.productId === productId);
    if (!product) return;

    if (newQty > product.stockQty) {
      toast.error(`Only ${product.stockQty} units available in stock`);
      return;
    }

    const updatedItems = invoiceItems.map(item => {
      if (item.productId === productId) {
        const tax = (product.unitPrice * newQty * product.taxRate) / 100;
        const lineTotal = (product.unitPrice * newQty) + tax;
        return {
          ...item,
          qty: newQty,
          tax: tax,
          lineTotal: lineTotal
        };
      }
      return item;
    });

    setInvoiceItems(updatedItems);
  };

  const removeItem = (productId: string) => {
    setInvoiceItems(invoiceItems.filter(item => item.productId !== productId));
  };

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalTax = invoiceItems.reduce((sum, item) => sum + item.tax, 0);
    const totalAmount = subtotal + totalTax - discount;

    return { subtotal, totalTax, totalAmount };
  };

  const saveInvoice = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (invoiceItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      const { subtotal, totalTax, totalAmount } = calculateTotals();
      
      const invoice: Invoice = {
        invoiceId: `INV-${Date.now()}`,
        customerId: selectedCustomer.customerId,
        customerName: selectedCustomer.name,
        date: new Date(),
        items: invoiceItems,
        discount: discount,
        subtotal: subtotal,
        totalTax: totalTax,
        totalAmount: totalAmount,
        paidStatus: 'paid',
        syncStatus: 'pending',
        lastModified: new Date()
      };

      await billingDB.addInvoice(invoice);

      // Update product stock
      for (const item of invoiceItems) {
        const product = products.find(p => p.productId === item.productId);
        if (product) {
          product.stockQty -= item.qty;
          await billingDB.updateProduct(product);
        }
      }

      // Generate PDF
      await PDFGenerator.generateInvoicePDF(invoice, storeInfo);

      // Reset form but keep Cash-in-Hand selected
      const cashCustomer = await billingDB.getCashInHandCustomer();
      setSelectedCustomer(cashCustomer);
      setInvoiceItems([]);
      setDiscount(0);
      setProductSearch('');
      
      toast.success('Invoice created successfully');
      await loadData();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    }
  };

  const { subtotal, totalTax, totalAmount } = calculateTotals();

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Create Invoice</h1>
            <p style={{ color: 'var(--color-textSecondary)' }}>POS Billing Screen</p>
          </div>
        </div>
        <Button
          onClick={saveInvoice}
          style={{ backgroundColor: 'var(--color-success)', color: '#fff' }}
          className="hover:opacity-90"
        >
          <Receipt className="h-4 w-4 mr-2" />
          Save Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <User className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCustomer ? (
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: selectedCustomer.isCashInHand
                    ? 'color-mix(in srgb, var(--color-warning) 12%, var(--color-background))'
                    : 'color-mix(in srgb, var(--color-primary) 10%, var(--color-background))',
                  borderColor: selectedCustomer.isCashInHand
                    ? 'var(--color-warning)'
                    : 'var(--color-primary)'
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {selectedCustomer.isCashInHand ? (
                      <Wallet className="h-4 w-4" style={{ color: 'var(--color-warning)' }} />
                    ) : (
                      <User className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                    )}
                    <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                      {selectedCustomer.name}
                    </h3>
                    {selectedCustomer.isCashInHand && (
                      <Badge
                        className="text-xs font-medium"
                        style={{ backgroundColor: 'var(--color-warning)', color: '#fff' }}
                      >
                        Walk-in
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCustomerDialogOpen(true)}
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    Change
                  </Button>
                </div>
                <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                  {selectedCustomer.isCashInHand ? 'No customer details required' : selectedCustomer.phone}
                </p>
                {!selectedCustomer.isCashInHand && selectedCustomer.email && (
                  <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                    {selectedCustomer.email}
                  </p>
                )}
              </div>
            ) : (
              <Button
                className="w-full"
                onClick={() => setIsCustomerDialogOpen(true)}
                style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
              >
                <User className="h-4 w-4 mr-2" />
                Select Customer
              </Button>
            )}

            {/* Customer Selection Dialog */}
            <Dialog open={isCustomerDialogOpen} onOpenChange={(open) => {
              setIsCustomerDialogOpen(open);
              if (!open) {
                setIsEditingCashInHand(false);
                setCustomerSearch('');
              }
            }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle style={{ color: 'var(--color-text)' }}>Select Customer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">

                  {/* ── Cash in Hand Quick-Select ── */}
                  <div
                    className="rounded-lg border-2 p-3"
                    style={{
                      borderColor: 'var(--color-warning)',
                      backgroundColor: 'color-mix(in srgb, var(--color-warning) 8%, var(--color-background))'
                    }}
                  >
                    {!isEditingCashInHand ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-5 w-5" style={{ color: 'var(--color-warning)' }} />
                          <div>
                            <div className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                              {cashInHandForm.name}
                              <Badge
                                className="text-xs"
                                style={{ backgroundColor: 'var(--color-warning)', color: '#fff' }}
                              >
                                Walk-in
                              </Badge>
                            </div>
                            <div className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                              {cashInHandForm.phone} · {cashInHandForm.address}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingCashInHand(true)}
                            title="Edit Cash in Hand defaults"
                            style={{ color: 'var(--color-textSecondary)' }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={selectCashInHand}
                            style={{ backgroundColor: 'var(--color-warning)', color: '#fff' }}
                            className="hover:opacity-90"
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ── Edit Cash-in-Hand defaults ── */
                      <div className="space-y-2">
                        <p className="text-xs font-medium" style={{ color: 'var(--color-warning)' }}>
                          Edit Walk-in Customer Defaults
                        </p>
                        <Input
                          placeholder="Display name"
                          value={cashInHandForm.name}
                          onChange={(e) => setCashInHandForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <Input
                          placeholder="Phone"
                          value={cashInHandForm.phone}
                          onChange={(e) => setCashInHandForm(prev => ({ ...prev, phone: e.target.value }))}
                        />
                        <Input
                          placeholder="Email (optional)"
                          value={cashInHandForm.email}
                          onChange={(e) => setCashInHandForm(prev => ({ ...prev, email: e.target.value }))}
                        />
                        <Input
                          placeholder="Address / note"
                          value={cashInHandForm.address}
                          onChange={(e) => setCashInHandForm(prev => ({ ...prev, address: e.target.value }))}
                        />
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="flex-1 hover:opacity-90"
                            style={{ backgroundColor: 'var(--color-warning)', color: '#fff' }}
                            onClick={saveCashInHandEdits}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingCashInHand(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Regular customer search ── */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-textSecondary)' }} />
                    <Input
                      placeholder="Search customers by name or phone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="max-h-52 overflow-y-auto space-y-2">
                    {filteredCustomers.length === 0 && customerSearch && (
                      <p className="text-sm text-center py-4" style={{ color: 'var(--color-textSecondary)' }}>
                        No customers found
                      </p>
                    )}
                    {filteredCustomers.map(customer => (
                      <div
                        key={customer.customerId}
                        className="p-3 border rounded-lg cursor-pointer transition-colors"
                        style={{ borderColor: 'var(--color-border)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 8%, var(--color-background))')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setIsCustomerDialogOpen(false);
                          setCustomerSearch('');
                        }}
                      >
                        <div className="font-medium" style={{ color: 'var(--color-text)' }}>{customer.name}</div>
                        <div className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>{customer.phone}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Add New Customer */}
                  <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                    <h4 className="font-medium mb-3" style={{ color: 'var(--color-text)' }}>Add New Customer</h4>
                    <div className="space-y-3">
                      <Input
                        placeholder="Customer name *"
                        value={newCustomerForm.name}
                        onChange={(e) => setNewCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <Input
                        placeholder="Phone number *"
                        value={newCustomerForm.phone}
                        onChange={(e) => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                      <Button
                        onClick={addCustomer}
                        className="w-full hover:opacity-90"
                        style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                      >
                        Add Customer
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Enhanced Product Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Package className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              Add Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative" ref={dropdownRef}>
              <Label htmlFor="productSearch" className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                Search Products
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-textSecondary)' }} />
                <Input
                  ref={productSearchRef}
                  id="productSearch"
                  type="text"
                  placeholder="Type product name, shortcut key, or category..."
                  value={productSearch}
                  onChange={(e) => handleProductSearchChange(e.target.value)}
                  onFocus={handleProductSearchFocus}
                  onKeyDown={handleProductSearchKeyDown}
                  className="pl-10 pr-10"
                  autoComplete="off"
                />
                {productSearch && (
                  <button
                    onClick={clearProductSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-80"
                    style={{ color: 'var(--color-textSecondary)' }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="text-xs mt-1 flex items-center gap-4" style={{ color: 'var(--color-textSecondary)' }}>
                <span>💡 Use ↑↓ arrows to navigate, Enter to select</span>
                {filteredProducts.length > 0 && (
                  <span style={{ color: 'var(--color-primary)' }}>{filteredProducts.length} found</span>
                )}
              </div>

              {/* Enhanced Dropdown */}
              {showProductDropdown && filteredProducts.length > 0 && (
                <div
                  className="absolute z-50 w-full mt-1 rounded-lg shadow-lg max-h-80 overflow-y-auto border"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  {filteredProducts.map((product, index) => (
                    <div
                      key={product.productId}
                      className="p-4 cursor-pointer border-b last:border-b-0 transition-colors"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: index === highlightedIndex
                          ? 'color-mix(in srgb, var(--color-primary) 10%, var(--color-background))'
                          : undefined
                      }}
                      onClick={() => addProductToInvoice(product)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium" style={{ color: 'var(--color-text)' }}>{product.name}</h4>
                            {product.shortcutKey && (
                              <Badge
                                variant="secondary"
                                className="text-xs"
                                style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, var(--color-background))', color: 'var(--color-primary)' }}
                              >
                                <Keyboard className="h-3 w-3 mr-1" />
                                {product.shortcutKey}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-medium" style={{ color: 'var(--color-success)' }}>₹{product.unitPrice}</span>
                            <span
                              className="px-2 py-1 rounded text-xs"
                              style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-textSecondary)' }}
                            >
                              {product.category}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs`} style={{
                              backgroundColor: product.stockQty > 10
                                ? 'color-mix(in srgb, var(--color-success) 15%, var(--color-background))'
                                : product.stockQty > 0
                                  ? 'color-mix(in srgb, var(--color-warning) 15%, var(--color-background))'
                                  : 'color-mix(in srgb, var(--color-error) 15%, var(--color-background))',
                              color: product.stockQty > 10
                                ? 'var(--color-success)'
                                : product.stockQty > 0
                                  ? 'var(--color-warning)'
                                  : 'var(--color-error)'
                            }}>
                              {product.stockQty} in stock
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <Button size="sm" variant="outline" className="h-8 px-3">
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No results message */}
              {productSearch && !showProductDropdown && (
                <div
                  className="absolute z-50 w-full mt-1 rounded-lg shadow-lg p-4 text-center border"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-textSecondary)'
                  }}
                >
                  <Package className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--color-border)' }} />
                  <p className="text-sm">No products found for "{productSearch}"</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-textSecondary)', opacity: 0.7 }}>
                    Try searching by name, shortcut key, or category
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items Table */}
      {invoiceItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <ShoppingCart className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              Invoice Items ({invoiceItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ color: 'var(--color-text)' }}>Product</TableHead>
                    <TableHead className="text-right" style={{ color: 'var(--color-text)' }}>Price</TableHead>
                    <TableHead className="text-center" style={{ color: 'var(--color-text)' }}>Quantity</TableHead>
                    <TableHead className="text-right" style={{ color: 'var(--color-text)' }}>Tax</TableHead>
                    <TableHead className="text-right" style={{ color: 'var(--color-text)' }}>Total</TableHead>
                    <TableHead className="text-center" style={{ color: 'var(--color-text)' }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceItems.map((item) => {
                    const product = products.find(p => p.productId === item.productId);
                    return (
                      <TableRow key={item.productId}>
                        <TableCell>
                          <div>
                            <div className="font-medium" style={{ color: 'var(--color-text)' }}>{item.productName}</div>
                            {product?.shortcutKey && (
                              <Badge variant="outline" className="text-xs mt-1">
                                <Keyboard className="h-3 w-3 mr-1" />
                                {product.shortcutKey}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right" style={{ color: 'var(--color-text)' }}>₹{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateItemQuantity(item.productId, parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-center"
                            min="1"
                          />
                        </TableCell>
                        <TableCell className="text-right" style={{ color: 'var(--color-textSecondary)' }}>₹{item.tax.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium" style={{ color: 'var(--color-text)' }}>₹{item.lineTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(item.productId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Summary */}
      <Card
        className="border-2"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)'
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Calculator className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
            Invoice Summary
            {selectedCustomer && (
              <span className="ml-auto text-sm font-normal flex items-center gap-1">
                {selectedCustomer.isCashInHand
                  ? <><Wallet className="h-4 w-4" style={{ color: 'var(--color-warning)' }} /><span style={{ color: 'var(--color-warning)' }}>{selectedCustomer.name}</span></>
                  : <><User className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /><span style={{ color: 'var(--color-primary)' }}>{selectedCustomer.name}</span></>
                }
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-textSecondary)' }}>Items:</span>
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>{invoiceItems.length} item(s)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-textSecondary)' }}>Subtotal:</span>
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-textSecondary)' }}>Tax:</span>
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>₹{totalTax.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="discount" className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Discount:</Label>
                <Input
                  id="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 h-8 text-right"
                  placeholder="0"
                />
              </div>
              <div className="border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between font-bold text-xl">
                  <span style={{ color: 'var(--color-text)' }}>Total Amount:</span>
                  <span style={{ color: 'var(--color-success)' }}>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {invoiceItems.length > 0 && (
            <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <Button
                onClick={saveInvoice}
                className="w-full text-lg py-3 hover:opacity-90"
                style={{ backgroundColor: 'var(--color-success)', color: '#fff' }}
              >
                <Receipt className="h-5 w-5 mr-2" />
                Save Invoice & Generate PDF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}