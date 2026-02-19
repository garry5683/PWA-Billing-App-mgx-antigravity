import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  X
} from 'lucide-react';
import { billingDB } from '@/lib/database';
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
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
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

  const loadData = async () => {
    try {
      const [customerList, productList] = await Promise.all([
        billingDB.getCustomers(),
        billingDB.getProducts()
      ]);
      setCustomers(customerList);
      setProducts(productList);
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
    
    setFilteredProducts(filtered.slice(0, 10)); // Limit to 10 results for better UX
    setShowProductDropdown(filtered.length > 0);
    setHighlightedIndex(-1);
  };

  const filteredCustomers = customers.filter(customer =>
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
        paidStatus: 'pending',
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

      // Reset form
      setSelectedCustomer(null);
      setInvoiceItems([]);
      setDiscount(0);
      setProductSearch('');
      
      toast.success('Invoice created successfully');
      await loadData(); // Refresh data
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
            <h1 className="text-2xl font-bold">Create Invoice</h1>
            <p className="text-gray-600">POS Billing Screen</p>
          </div>
        </div>
        <Button onClick={saveInvoice} className="bg-green-600 hover:bg-green-700">
          <Receipt className="h-4 w-4 mr-2" />
          Save Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCustomer ? (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{selectedCustomer.name}</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    Change
                  </Button>
                </div>
                <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                {selectedCustomer.email && (
                  <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                )}
              </div>
            ) : (
              <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <User className="h-4 w-4 mr-2" />
                    Select Customer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Select Customer</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search customers..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {filteredCustomers.map(customer => (
                        <div
                          key={customer.customerId}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setIsCustomerDialogOpen(false);
                            setCustomerSearch('');
                          }}
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-600">{customer.phone}</div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Add New Customer</h4>
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
                        <Button onClick={addCustomer} className="w-full">
                          Add Customer
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Product Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Add Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative" ref={dropdownRef}>
              <Label htmlFor="productSearch" className="text-sm font-medium">
                Search Products
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-4">
                <span>💡 Use ↑↓ arrows to navigate, Enter to select</span>
                {filteredProducts.length > 0 && (
                  <span className="text-blue-600">{filteredProducts.length} found</span>
                )}
              </div>

              {/* Enhanced Dropdown */}
              {showProductDropdown && filteredProducts.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {filteredProducts.map((product, index) => (
                    <div
                      key={product.productId}
                      className={`p-4 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-blue-50 transition-colors ${
                        index === highlightedIndex ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => addProductToInvoice(product)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{product.name}</h4>
                            {product.shortcutKey && (
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                <Keyboard className="h-3 w-3 mr-1" />
                                {product.shortcutKey}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="font-medium text-green-600">₹{product.unitPrice}</span>
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">{product.category}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              product.stockQty > 10 
                                ? 'bg-green-100 text-green-700' 
                                : product.stockQty > 0 
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
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
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No products found for "{productSearch}"</p>
                  <p className="text-xs text-gray-400 mt-1">Try searching by name, shortcut key, or category</p>
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
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Invoice Items ({invoiceItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceItems.map((item) => {
                    const product = products.find(p => p.productId === item.productId);
                    return (
                      <TableRow key={item.productId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            {product?.shortcutKey && (
                              <Badge variant="outline" className="text-xs mt-1">
                                <Keyboard className="h-3 w-3 mr-1" />
                                {product.shortcutKey}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateItemQuantity(item.productId, parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-center"
                            min="1"
                          />
                        </TableCell>
                        <TableCell className="text-right">₹{item.tax.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">₹{item.lineTotal.toFixed(2)}</TableCell>
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

      {/* Invoice Summary at Bottom */}
      <Card className="bg-gray-50 border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Invoice Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items:</span>
                <span className="font-medium">{invoiceItems.length} item(s)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax:</span>
                <span className="font-medium">₹{totalTax.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="discount" className="text-sm text-gray-600">Discount:</Label>
                <Input
                  id="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 h-8 text-right"
                  placeholder="0"
                />
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between font-bold text-xl">
                  <span>Total Amount:</span>
                  <span className="text-green-600">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {invoiceItems.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <Button onClick={saveInvoice} className="w-full bg-green-600 hover:bg-green-700 text-lg py-3">
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