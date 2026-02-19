import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  User,
  Users,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { billingDB } from '@/lib/database';
import { Customer, Invoice } from '@/types/billing';
import { toast } from 'sonner';

interface CustomerManagerProps {
  onBack: () => void;
}

export function CustomerManager({ onBack }: CustomerManagerProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery]);

  const loadData = async () => {
    try {
      const [customerList, invoiceList] = await Promise.all([
        billingDB.getCustomers(),
        billingDB.getInvoices()
      ]);
      setCustomers(customerList);
      setInvoices(invoiceList);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
  };

  const filterCustomers = () => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCustomers(filtered);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: ''
    });
    setEditingCustomer(null);
  };

  const openDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Please fill in name and phone number');
      return;
    }

    try {
      const customerData: Customer = {
        customerId: editingCustomer?.customerId || `cust_${Date.now()}`,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        syncStatus: 'pending',
        lastModified: new Date()
      };

      if (editingCustomer) {
        await billingDB.updateCustomer(customerData);
        toast.success('Customer updated successfully');
      } else {
        await billingDB.addCustomer(customerData);
        toast.success('Customer added successfully');
      }

      await loadData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Failed to save customer');
    }
  };

  const handleDelete = async (customerId: string) => {
    const customerInvoices = invoices.filter(inv => inv.customerId === customerId);
    
    if (customerInvoices.length > 0) {
      toast.error('Cannot delete customer with existing invoices');
      return;
    }

    if (!confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      await billingDB.deleteCustomer(customerId);
      await loadData();
      toast.success('Customer deleted successfully');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  // Analytics calculations
  const getCustomerStats = (customerId: string) => {
    const customerInvoices = invoices.filter(inv => inv.customerId === customerId);
    const totalSpent = customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalInvoices = customerInvoices.length;
    const lastPurchase = customerInvoices.length > 0 
      ? new Date(Math.max(...customerInvoices.map(inv => new Date(inv.date).getTime())))
      : null;
    
    return { totalSpent, totalInvoices, lastPurchase };
  };

  const topCustomers = customers
    .map(customer => {
      const stats = getCustomerStats(customer.customerId);
      return {
        ...customer,
        ...stats,
        name: customer.name.length > 15 ? customer.name.substring(0, 15) + '...' : customer.name
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  const customerSegments = [
    { 
      name: 'High Value (₹10K+)', 
      value: customers.filter(c => getCustomerStats(c.customerId).totalSpent >= 10000).length,
      color: '#00C49F'
    },
    { 
      name: 'Medium Value (₹5K-10K)', 
      value: customers.filter(c => {
        const spent = getCustomerStats(c.customerId).totalSpent;
        return spent >= 5000 && spent < 10000;
      }).length,
      color: '#FFBB28'
    },
    { 
      name: 'Low Value (<₹5K)', 
      value: customers.filter(c => getCustomerStats(c.customerId).totalSpent < 5000).length,
      color: '#FF8042'
    }
  ];

  const monthlyCustomerData = () => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        newCustomers: customers.filter(c => {
          const customerDate = new Date(c.lastModified);
          return customerDate.getMonth() === date.getMonth() && 
                 customerDate.getFullYear() === date.getFullYear();
        }).length,
        revenue: invoices.filter(inv => {
          const invDate = new Date(inv.date);
          return invDate.getMonth() === date.getMonth() && 
                 invDate.getFullYear() === date.getFullYear();
        }).reduce((sum, inv) => sum + inv.totalAmount, 0)
      };
    }).reverse();
    
    return last6Months;
  };

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const avgOrderValue = invoices.length > 0 ? totalRevenue / invoices.length : 0;
  const activeCustomers = customers.filter(c => getCustomerStats(c.customerId).totalInvoices > 0).length;

  return (
    <div className="p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack} size="sm">
            ← Back
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Customer Management</h1>
            <p className="text-sm text-gray-600">Manage customers with analytics</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="flex items-center gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Customer</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter address"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingCustomer ? 'Update' : 'Add'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="customers" className="hidden lg:block">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-blue-500 mb-2" />
                <p className="text-lg sm:text-2xl font-bold">{customers.length}</p>
                <p className="text-xs sm:text-sm text-gray-600">Total Customers</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-green-500 mb-2" />
                <p className="text-lg sm:text-2xl font-bold">{activeCustomers}</p>
                <p className="text-xs sm:text-sm text-gray-600">Active Customers</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-purple-500 mb-2" />
                <p className="text-sm sm:text-xl font-bold text-green-600">
                  ₹{avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">Avg Order Value</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-orange-500 mb-2" />
                <p className="text-sm sm:text-xl font-bold text-blue-600">
                  ₹{totalRevenue.toLocaleString('en-IN')}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">Total Revenue</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base">Customer Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={customerSegments}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {customerSegments.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base">Monthly Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyCustomerData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="newCustomers" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="New Customers"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  Top Customers by Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCustomers.slice(0, 8)} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={10} />
                      <YAxis dataKey="name" type="category" width={80} fontSize={10} />
                      <Tooltip 
                        formatter={(value, name) => [
                          `₹${Number(value).toLocaleString('en-IN')}`, 
                          'Total Spent'
                        ]}
                      />
                      <Bar dataKey="totalSpent" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyCustomerData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'revenue' ? `₹${Number(value).toLocaleString('en-IN')}` : value,
                          name === 'revenue' ? 'Revenue' : 'New Customers'
                        ]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Customer Purchase Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCustomers.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        fontSize={10}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="totalInvoices" fill="#82ca9d" name="Total Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4 sm:space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search customers by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Customers List */}
          <div className="space-y-3 sm:space-y-4">
            {filteredCustomers.length === 0 ? (
              <Card>
                <CardContent className="p-6 sm:p-8 text-center">
                  <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {searchQuery ? 'Try adjusting your search terms' : 'Get started by adding your first customer'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => openDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Customer
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredCustomers.map((customer) => {
                const stats = getCustomerStats(customer.customerId);
                return (
                  <Card key={customer.customerId}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex-1 w-full">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-sm sm:text-lg">{customer.name}</h3>
                            {stats.totalInvoices > 0 && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                Active Customer
                              </Badge>
                            )}
                            {customer.syncStatus === 'pending' && (
                              <Badge variant="secondary" className="text-xs">Pending Sync</Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span>{customer.phone}</span>
                            </div>
                            {customer.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-gray-400" />
                                <span className="truncate">{customer.email}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3 w-3 text-gray-400" />
                              <span className="font-medium text-green-600">
                                ₹{stats.totalSpent.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-3 w-3 text-gray-400" />
                              <span>{stats.totalInvoices} orders</span>
                            </div>
                          </div>
                          
                          {customer.address && (
                            <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-gray-600">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="truncate">{customer.address}</span>
                            </div>
                          )}
                          
                          {stats.lastPurchase && (
                            <div className="mt-2 text-xs text-gray-500">
                              Last purchase: {stats.lastPurchase.toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(customer)}
                            className="flex-1 sm:flex-none"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="ml-1 sm:hidden">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(customer.customerId)}
                            className="flex-1 sm:flex-none"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="ml-1 sm:hidden">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}