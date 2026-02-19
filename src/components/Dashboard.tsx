import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Receipt, 
  Package, 
  Users, 
  FileText, 
  BarChart3,
  Plus,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { billingDB } from '@/lib/database';
import { Invoice, Product, Customer } from '@/types/billing';

interface DashboardStats {
  totalInvoices: number;
  totalProducts: number;
  totalCustomers: number;
  totalRevenue: number;
  pendingInvoices: number;
  lowStockProducts: number;
}

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
    lowStockProducts: 0
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const [invoices, products, customers] = await Promise.all([
        billingDB.getInvoices(),
        billingDB.getProducts(),
        billingDB.getCustomers()
      ]);

      const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const pendingInvoices = invoices.filter(invoice => invoice.paidStatus === 'pending').length;
      const lowStockProducts = products.filter(product => product.stockQty < 10).length;

      setStats({
        totalInvoices: invoices.length,
        totalProducts: products.length,
        totalCustomers: customers.length,
        totalRevenue,
        pendingInvoices,
        lowStockProducts
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const quickActions = [
    {
      title: 'New Invoice',
      description: 'Create a new invoice',
      icon: Plus,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => onNavigate('billing'),
      size: 'large'
    },
    {
      title: 'View Invoices',
      description: 'Manage invoices',
      icon: FileText,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => onNavigate('invoices'),
      size: 'medium'
    },
    {
      title: 'Products',
      description: 'Manage inventory',
      icon: Package,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => onNavigate('products'),
      size: 'medium'
    },
    {
      title: 'Customers',
      description: 'Manage customers',
      icon: Users,
      color: 'bg-orange-500 hover:bg-orange-600',
      action: () => onNavigate('customers'),
      size: 'medium'
    }
  ];

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">PWA Billing Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your business with ease</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold">{stats.totalInvoices}</p>
              </div>
              <Receipt className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Products</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
                {stats.lowStockProducts > 0 && (
                  <Badge variant="destructive" className="text-xs mt-1">
                    {stats.lowStockProducts} Low Stock
                  </Badge>
                )}
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Customers</p>
                <p className="text-2xl font-bold">{stats.totalCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invoices Alert */}
      {stats.pendingInvoices > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">Pending Invoices</p>
                  <p className="text-sm text-yellow-600">
                    You have {stats.pendingInvoices} pending invoice{stats.pendingInvoices > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onNavigate('invoices')}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                View All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        
        {/* New Invoice - Large Button */}
        <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={quickActions[0].action}>
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-4">
              <div className={`p-4 rounded-full ${quickActions[0].color} text-white`}>
                <Plus className="h-8 w-8" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold">{quickActions[0].title}</h3>
                <p className="text-gray-600">{quickActions[0].description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Other Actions - Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.slice(1).map((action, index) => {
            const IconComponent = action.icon;
            return (
              <Card 
                key={index} 
                className="cursor-pointer transition-all hover:shadow-lg" 
                onClick={action.action}
              >
                <CardContent className="p-6 text-center">
                  <div className={`inline-flex p-3 rounded-full ${action.color} text-white mb-4`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                  <p className="text-gray-600 text-sm">{action.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}