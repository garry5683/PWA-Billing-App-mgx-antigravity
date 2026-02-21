import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  FileText, 
  Download,
  Calendar,
  DollarSign,
  Eye,
  Filter,
  Printer
} from 'lucide-react';
import { billingDB } from '@/lib/database';
import { Invoice } from '@/types/billing';
import { PDFGenerator } from '@/lib/pdf-generator';
import { thermalPrinter } from '@/lib/thermal-printer';
import { toast } from 'sonner';

interface InvoiceHistoryProps {
  onBack: () => void;
}

export function InvoiceHistory({ onBack }: InvoiceHistoryProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const storeInfo = {
    name: 'Your Store Name',
    address: '123 Business Street, City, State 12345',
    gstNumber: 'GST123456789',
    phone: '+91 9876543210',
    email: 'store@example.com'
  };

  const loadInvoices = async () => {
    try {
      const invoiceList = await billingDB.getInvoices();
      // Sort by date, newest first
      invoiceList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setInvoices(invoiceList);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filterInvoices = useCallback(() => {
    let filtered = invoices;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(invoice =>
        invoice.invoiceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.paidStatus === statusFilter);
    }

    setFilteredInvoices(filtered);
  }, [invoices, searchQuery, statusFilter]);

  useEffect(() => {
    filterInvoices();
  }, [filterInvoices]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
  const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-IN');

  const downloadInvoicePDF = async (invoice: Invoice) => {
    try {
      await PDFGenerator.downloadInvoicePDF(invoice, storeInfo);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const printThermal = async (invoice: Invoice) => {
    try {
      const success = await thermalPrinter.printInvoice(invoice, storeInfo);
      if (success) {
        toast.success('Thermal receipt printed');
      } else {
        toast.info('Please connect your USB Thermal Printer first.');
      }
    } catch (error) {
      console.error('Thermal print error:', error);
      toast.error('Thermal printing failed');
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, newStatus: 'paid' | 'pending' | 'overdue') => {
    try {
      const invoice = invoices.find(inv => inv.invoiceId === invoiceId);
      if (!invoice) return;

      invoice.paidStatus = newStatus;
      invoice.syncStatus = 'pending';
      invoice.lastModified = new Date();

      await billingDB.updateInvoice(invoice);
      await loadInvoices();
      toast.success('Invoice status updated');
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    }
  };

  const totalStats = {
    totalInvoices: invoices.length,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    paidAmount: invoices.filter(inv => inv.paidStatus === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0),
    pendingAmount: invoices.filter(inv => inv.paidStatus === 'pending').reduce((sum, inv) => sum + inv.totalAmount, 0)
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Invoice History</h1>
            <p className="text-gray-600">Manage your invoices</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{totalStats.totalInvoices}</p>
            <p className="text-sm text-gray-600">Total Invoices</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{formatCurrency(totalStats.totalAmount)}</p>
            <p className="text-sm text-gray-600">Total Amount</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalStats.paidAmount)}</p>
            <p className="text-sm text-gray-600">Paid Amount</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalStats.pendingAmount)}</p>
            <p className="text-sm text-gray-600">Pending Amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by invoice ID or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        {filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-600">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Start creating invoices to see them here'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.invoiceId}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{invoice.invoiceId}</h3>
                      <Badge variant={getStatusVariant(invoice.paidStatus)}>
                        {invoice.paidStatus.toUpperCase()}
                      </Badge>
                      {invoice.syncStatus === 'pending' && (
                        <Badge variant="secondary">Pending Sync</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Customer:</span>
                        <p className="font-medium">{invoice.customerName}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Date:</span>
                        <p className="font-medium">{formatDate(invoice.date)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Items:</span>
                        <p className="font-medium">{invoice.items.length} item(s)</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <p className="font-medium text-lg">{formatCurrency(invoice.totalAmount)}</p>
                      </div>
                    </div>
                    
                    {selectedInvoice?.invoiceId === invoice.invoiceId && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">Invoice Items:</h4>
                        <div className="space-y-1 text-sm">
                          {invoice.items.map((item, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{item.productName} × {item.qty}</span>
                              <span>{formatCurrency(item.lineTotal)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t mt-2 pt-2 text-sm">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(invoice.subtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tax:</span>
                            <span>{formatCurrency(invoice.totalTax)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Discount:</span>
                            <span>-{formatCurrency(invoice.discount)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Total:</span>
                            <span>{formatCurrency(invoice.totalAmount)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInvoice(
                        selectedInvoice?.invoiceId === invoice.invoiceId ? null : invoice
                      )}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadInvoicePDF(invoice)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => printThermal(invoice)}
                      className="border-primary text-primary hover:bg-primary/10"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    
                    <Select 
                      value={invoice.paidStatus} 
                      onValueChange={(value: 'paid' | 'pending' | 'overdue') => 
                        updateInvoiceStatus(invoice.invoiceId, value)
                      }
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}