import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package,
  AlertTriangle,
  Keyboard,
  BarChart3,
  TrendingUp,
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
  Area,
  AreaChart
} from 'recharts';
import { billingDB } from '@/lib/database';
import { Product } from '@/types/billing';
import { toast } from 'sonner';

interface ProductManagerProps {
  onBack: () => void;
}

export function ProductManager({ onBack }: ProductManagerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unitPrice: '',
    taxRate: '',
    stockQty: '',
    shortcutKey: ''
  });

  const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Home & Garden', 'Sports', 'Other'];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery]);

  const loadProducts = async () => {
    try {
      const productList = await billingDB.getProducts();
      setProducts(productList);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.shortcutKey && product.shortcutKey.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredProducts(filtered);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      unitPrice: '',
      taxRate: '',
      stockQty: '',
      shortcutKey: ''
    });
    setEditingProduct(null);
  };

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        unitPrice: product.unitPrice.toString(),
        taxRate: product.taxRate.toString(),
        stockQty: product.stockQty.toString(),
        shortcutKey: product.shortcutKey || ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const validateShortcutKey = (shortcutKey: string): boolean => {
    if (!shortcutKey) return true;
    
    const existingProduct = products.find(p => 
      p.shortcutKey === shortcutKey && 
      p.productId !== editingProduct?.productId
    );
    
    if (existingProduct) {
      toast.error(`Shortcut key "${shortcutKey}" is already used by "${existingProduct.name}"`);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.category || !formData.unitPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!validateShortcutKey(formData.shortcutKey.trim())) {
      return;
    }

    try {
      const productData: Product = {
        productId: editingProduct?.productId || `prod_${Date.now()}`,
        name: formData.name.trim(),
        category: formData.category,
        unitPrice: parseFloat(formData.unitPrice),
        taxRate: parseFloat(formData.taxRate) || 0,
        stockQty: parseInt(formData.stockQty) || 0,
        shortcutKey: formData.shortcutKey.trim() || undefined,
        syncStatus: 'pending',
        lastModified: new Date()
      };

      if (editingProduct) {
        await billingDB.updateProduct(productData);
        toast.success('Product updated successfully');
      } else {
        await billingDB.addProduct(productData);
        toast.success('Product added successfully');
      }

      await loadProducts();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await billingDB.deleteProduct(productId);
      await loadProducts();
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (quantity < 10) return { label: 'Low Stock', variant: 'secondary' as const };
    return { label: 'In Stock', variant: 'default' as const };
  };

  // Chart data preparation
  const categoryData = categories.map(category => {
    const categoryProducts = products.filter(p => p.category === category);
    return {
      name: category,
      count: categoryProducts.length,
      value: categoryProducts.reduce((sum, p) => sum + (p.unitPrice * p.stockQty), 0),
      stock: categoryProducts.reduce((sum, p) => sum + p.stockQty, 0)
    };
  }).filter(item => item.count > 0);

  const stockLevelData = [
    { name: 'In Stock', value: products.filter(p => p.stockQty >= 10).length, color: '#00C49F' },
    { name: 'Low Stock', value: products.filter(p => p.stockQty > 0 && p.stockQty < 10).length, color: '#FFBB28' },
    { name: 'Out of Stock', value: products.filter(p => p.stockQty === 0).length, color: '#FF8042' }
  ];

  const priceRangeData = [
    { name: '₹0-500', count: products.filter(p => p.unitPrice <= 500).length },
    { name: '₹501-2000', count: products.filter(p => p.unitPrice > 500 && p.unitPrice <= 2000).length },
    { name: '₹2001-10000', count: products.filter(p => p.unitPrice > 2000 && p.unitPrice <= 10000).length },
    { name: '₹10000+', count: products.filter(p => p.unitPrice > 10000).length }
  ].filter(item => item.count > 0);

  const topValueProducts = products
    .map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      value: p.unitPrice * p.stockQty,
      price: p.unitPrice,
      stock: p.stockQty
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack} size="sm">
            ← Back
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Product Management</h1>
            <p className="text-sm text-gray-600">Manage inventory with analytics</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="flex items-center gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter product name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="shortcutKey">Shortcut Key</Label>
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-gray-400" />
                  <Input
                    id="shortcutKey"
                    value={formData.shortcutKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, shortcutKey: e.target.value.toUpperCase() }))}
                    placeholder="e.g., L1, TEA, PHONE"
                    maxLength={10}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Quick access key for billing (optional)</p>
              </div>
              
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unitPrice">Unit Price *</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    value={formData.taxRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxRate: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="stockQty">Stock Quantity</Label>
                <Input
                  id="stockQty"
                  type="number"
                  value={formData.stockQty}
                  onChange={(e) => setFormData(prev => ({ ...prev, stockQty: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingProduct ? 'Update' : 'Add'}
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
          <TabsTrigger value="products" className="hidden lg:block">Products</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-blue-500 mb-2" />
                <p className="text-lg sm:text-2xl font-bold">{products.length}</p>
                <p className="text-xs sm:text-sm text-gray-600">Total Products</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <Keyboard className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-green-500 mb-2" />
                <p className="text-lg sm:text-2xl font-bold">
                  {products.filter(p => p.shortcutKey).length}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">With Shortcuts</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-yellow-500 mb-2" />
                <p className="text-lg sm:text-2xl font-bold">
                  {products.filter(p => p.stockQty < 10).length}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">Low Stock</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-purple-500 mb-2" />
                <p className="text-sm sm:text-xl font-bold text-green-600">
                  ₹{products.reduce((sum, p) => sum + (p.unitPrice * p.stockQty), 0).toLocaleString('en-IN')}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">Total Value</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base">Stock Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockLevelData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stockLevelData.map((entry, index) => (
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
                <CardTitle className="text-sm sm:text-base">Products by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        fontSize={12}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
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
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                  Top Value Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topValueProducts} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={10} />
                      <YAxis dataKey="name" type="category" width={80} fontSize={10} />
                      <Tooltip 
                        formatter={(value, name) => [
                          `₹${Number(value).toLocaleString('en-IN')}`, 
                          'Total Value'
                        ]}
                      />
                      <Bar dataKey="value" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  Price Range Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={priceRangeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
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
                <CardTitle className="text-sm sm:text-base">Category Value Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'value' ? `₹${Number(value).toLocaleString('en-IN')}` : value,
                          name === 'value' ? 'Total Value' : name === 'count' ? 'Product Count' : 'Total Stock'
                        ]}
                      />
                      <Bar dataKey="value" fill="#8884d8" name="value" />
                      <Bar dataKey="stock" fill="#82ca9d" name="stock" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4 sm:space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products by name, category, or shortcut key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Products List */}
          <div className="space-y-3 sm:space-y-4">
            {filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="p-6 sm:p-8 text-center">
                  <Package className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No products found</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {searchQuery ? 'Try adjusting your search terms' : 'Get started by adding your first product'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => openDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product.stockQty);
                return (
                  <Card key={product.productId}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex-1 w-full">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-sm sm:text-lg">{product.name}</h3>
                            {product.shortcutKey && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                <Keyboard className="h-3 w-3 mr-1" />
                                {product.shortcutKey}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{product.category}</Badge>
                            <Badge variant={stockStatus.variant} className="text-xs">{stockStatus.label}</Badge>
                            {product.syncStatus === 'pending' && (
                              <Badge variant="secondary" className="text-xs">Pending Sync</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                            <div>
                              <span className="text-gray-600">Price:</span>
                              <p className="font-medium">₹{product.unitPrice.toFixed(2)}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Tax Rate:</span>
                              <p className="font-medium">{product.taxRate}%</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Stock:</span>
                              <p className="font-medium">{product.stockQty} units</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Value:</span>
                              <p className="font-medium">₹{(product.unitPrice * product.stockQty).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(product)}
                            className="flex-1 sm:flex-none"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="ml-1 sm:hidden">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(product.productId)}
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