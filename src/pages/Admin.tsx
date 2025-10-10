import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Package, ShoppingBag, DollarSign, Plus, Pencil, Trash2, Image as ImageIcon, Download, ChevronDown, ChevronUp, CalendarIcon } from "lucide-react";
import { ProductDialog } from "@/components/admin/ProductDialog";
import { CategoryDialog } from "@/components/admin/CategoryDialog";
import { BannerDialog } from "@/components/admin/BannerDialog";
import { BlogDialog } from "@/components/admin/BlogDialog";
import { SaleDialog } from "@/components/admin/SaleDialog";
import { MetaCatalogSync } from "@/components/admin/MetaCatalogSync";
import ReviewDialog from "@/components/admin/ReviewDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice } from "@/lib/currency";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import * as XLSX from 'xlsx';

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [productDialog, setProductDialog] = useState({ open: false, product: null });
  const [categoryDialog, setCategoryDialog] = useState({ open: false, category: null });
  const [bannerDialog, setBannerDialog] = useState({ open: false, banner: null });
  const [blogDialog, setBlogDialog] = useState({ open: false, blog: null });
  const [reviewDialog, setReviewDialog] = useState({ open: false, review: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: "", id: "", name: "" });
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [exportDialog, setExportDialog] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        checkAdminStatus(session.user.id);
      }
    });
  }, [navigate]);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (!data) {
      navigate('/');
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
    } else {
      setIsAdmin(true);
    }
  };

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: banners } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: blogs } = useQuery({
    queryKey: ['admin-blogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, products(name)')
        .order('review_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({ title: "Order status updated" });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const { error } = await supabase.from(type as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`admin-${variables.type}`] });
      queryClient.invalidateQueries({ queryKey: [variables.type] });
      toast({ title: `${variables.type.slice(0, -1)} deleted successfully` });
      setDeleteDialog({ open: false, type: "", id: "", name: "" });
    },
  });

  const handleDelete = () => {
    deleteItem.mutate({ type: deleteDialog.type, id: deleteDialog.id });
  };

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const exportOrdersToExcel = (filterByDate: boolean = false) => {
    if (!orders || orders.length === 0) {
      toast({
        title: "No orders to export",
        description: "There are no orders available to download.",
        variant: "destructive",
      });
      return;
    }

    let filteredOrders = orders;
    
    if (filterByDate && startDate && endDate) {
      filteredOrders = orders.filter((order) => {
        const orderDate = new Date(order.created_at);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return orderDate >= start && orderDate <= end;
      });

      if (filteredOrders.length === 0) {
        toast({
          title: "No orders found",
          description: "No orders found in the selected date range.",
          variant: "destructive",
        });
        return;
      }
    }

    const exportData = filteredOrders.flatMap((order) => {
      return order.order_items?.map((item: any, index: number) => ({
        'Order ID': order.id,
        'Order Date': format(new Date(order.created_at), 'PPP'),
        'Status': order.status,
        'Customer First Name': order.first_name,
        'Customer Last Name': order.last_name,
        'Email': order.email || 'N/A',
        'Phone': order.phone,
        'Address': order.shipping_address,
        'City': order.shipping_city,
        'State': order.shipping_state,
        'Zip': order.shipping_zip,
        'Product Name': item.products?.name || 'N/A',
        'Quantity': item.quantity,
        'Price': item.price,
        'Item Total': item.price * item.quantity,
        'Order Total': index === 0 ? Number(order.total_amount) : '',
        'Notes': order.notes || 'N/A',
      }));
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    
    const dateRangeStr = filterByDate && startDate && endDate 
      ? `_${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}`
      : '';
    const fileName = `orders${dateRangeStr}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Export successful",
      description: `Downloaded ${filteredOrders.length} orders to ${fileName}`,
    });
    
    setExportDialog(false);
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const stats = {
    totalOrders: orders?.length || 0,
    totalProducts: products?.length || 0,
    totalRevenue: orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0,
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <LoadingScreen message="Verifying admin access..." />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-4xl font-bold mb-8 text-center gold-accent pb-8">
            Admin Dashboard
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-3xl font-bold">{stats.totalOrders}</p>
                  </div>
                  <ShoppingBag className="h-12 w-12 text-accent" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Products</p>
                    <p className="text-3xl font-bold">{stats.totalProducts}</p>
                  </div>
                  <Package className="h-12 w-12 text-accent" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-3xl font-bold">{formatPrice(stats.totalRevenue)}</p>
                  </div>
                  <DollarSign className="h-12 w-12 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="orders">
            <TabsList className="w-full flex flex-wrap gap-1 h-auto p-1">
              <TabsTrigger value="orders" className="text-xs md:text-sm flex-1 min-w-[80px]">Orders</TabsTrigger>
              <TabsTrigger value="products" className="text-xs md:text-sm flex-1 min-w-[80px]">Products</TabsTrigger>
              <TabsTrigger value="categories" className="text-xs md:text-sm flex-1 min-w-[80px]">Categories</TabsTrigger>
              <TabsTrigger value="reviews" className="text-xs md:text-sm flex-1 min-w-[80px]">Reviews</TabsTrigger>
              <TabsTrigger value="banners" className="text-xs md:text-sm flex-1 min-w-[80px]">Banners</TabsTrigger>
              <TabsTrigger value="blogs" className="text-xs md:text-sm flex-1 min-w-[80px]">Blogs</TabsTrigger>
              <TabsTrigger value="meta-catalog" className="text-xs md:text-sm flex-1 min-w-[100px]">Meta Catalog</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setExportDialog(true)} variant="outline" className="w-full sm:w-auto text-xs sm:text-sm">
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Export Orders to Excel</span>
                  <span className="sm:hidden">Export Orders</span>
                </Button>
              </div>
              {orders?.map((order) => (
                <Collapsible 
                  key={order.id}
                  open={expandedOrders.has(order.id)}
                  onOpenChange={() => toggleOrderExpanded(order.id)}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto hover:bg-transparent w-full sm:w-auto justify-start">
                            <div className="text-left">
                              <CardTitle className="text-base sm:text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {format(new Date(order.created_at), 'PPP')}
                              </p>
                            </div>
                            {expandedOrders.has(order.id) ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <Select
                          value={order.status}
                          onValueChange={(status) => updateOrderStatus.mutate({ orderId: order.id, status })}
                        >
                          <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.products?.name} x {item.quantity}</span>
                            <span>{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        ))}
                        <div className="border-t pt-2 flex justify-between font-bold">
                          <span>Total</span>
                          <span className="text-accent">{formatPrice(Number(order.total_amount))}</span>
                        </div>
                      </div>

                      <CollapsibleContent className="mt-4 space-y-4">
                        <div className="border-t pt-4 space-y-3">
                          <h4 className="font-semibold text-sm">Customer Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Name:</span>
                              <p className="font-medium">{order.first_name} {order.last_name}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Email:</span>
                              <p className="font-medium">{order.email || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Phone:</span>
                              <p className="font-medium">{order.phone}</p>
                            </div>
                          </div>

                          <h4 className="font-semibold text-sm pt-2">Shipping Address</h4>
                          <div className="text-sm space-y-1">
                            <p>{order.shipping_address}</p>
                            <p>{order.shipping_city}, {order.shipping_state} {order.shipping_zip}</p>
                          </div>

                          {order.notes && (
                            <>
                              <h4 className="font-semibold text-sm pt-2">Order Notes</h4>
                              <p className="text-sm text-muted-foreground">{order.notes}</p>
                            </>
                          )}

                          <div className="text-sm">
                            <span className="text-muted-foreground">Order ID:</span>
                            <p className="font-mono text-xs break-all">{order.id}</p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>
              ))}
            </TabsContent>

            <TabsContent value="products">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle>Products</CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <SaleDialog />
                    <Button onClick={() => setProductDialog({ open: true, product: null })} className="flex-1 sm:flex-initial">
                      <Plus className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Add Product</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Name</TableHead>
                        <TableHead className="min-w-[80px]">SKU</TableHead>
                        <TableHead className="min-w-[100px]">Category</TableHead>
                        <TableHead className="min-w-[80px]">Price</TableHead>
                        <TableHead className="min-w-[60px]">Stock</TableHead>
                        <TableHead className="min-w-[80px]">Featured</TableHead>
                        <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products?.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{product.sku || "—"}</TableCell>
                          <TableCell>{product.categories?.name || "—"}</TableCell>
                          <TableCell>{formatPrice(product.price)}</TableCell>
                          <TableCell>{product.stock_quantity}</TableCell>
                          <TableCell>
                            {product.is_featured && <Badge variant="secondary">Featured</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setProductDialog({ open: true, product })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDialog({ 
                                open: true, 
                                type: "products", 
                                id: product.id, 
                                name: product.name 
                              })}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle>Categories</CardTitle>
                  <Button onClick={() => setCategoryDialog({ open: true, category: null })} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Add Category</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Name</TableHead>
                        <TableHead className="min-w-[120px]">Slug</TableHead>
                        <TableHead className="min-w-[150px]">Description</TableHead>
                        <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories?.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{category.slug}</TableCell>
                          <TableCell>{category.description || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCategoryDialog({ open: true, category })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDialog({ 
                                open: true, 
                                type: "categories", 
                                id: category.id, 
                                name: category.name 
                              })}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle>Customer Reviews</CardTitle>
                  <Button onClick={() => setReviewDialog({ open: true, review: null })} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Add Review</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Product</TableHead>
                        <TableHead className="min-w-[120px]">Reviewer</TableHead>
                        <TableHead className="min-w-[80px]">Rating</TableHead>
                        <TableHead className="min-w-[150px]">Title</TableHead>
                        <TableHead className="min-w-[80px]">Verified</TableHead>
                        <TableHead className="min-w-[100px]">Date</TableHead>
                        <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviews?.map((review: any) => (
                        <TableRow key={review.id}>
                          <TableCell className="font-medium">{review.products?.name || 'N/A'}</TableCell>
                          <TableCell>{review.reviewer_name}</TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              {"⭐".repeat(review.rating)}
                            </div>
                          </TableCell>
                          <TableCell>{review.review_title}</TableCell>
                          <TableCell>
                            <Badge variant={review.is_verified ? "default" : "secondary"}>
                              {review.is_verified ? "Verified" : "Unverified"}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(review.review_date), 'PP')}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReviewDialog({ open: true, review })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDialog({ 
                                open: true, 
                                type: "reviews", 
                                id: review.id, 
                                name: review.review_title 
                              })}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="banners">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle>Homepage Banners</CardTitle>
                  <Button onClick={() => setBannerDialog({ open: true, banner: null })} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Add Banner</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">Preview</TableHead>
                        <TableHead className="min-w-[150px]">Title</TableHead>
                        <TableHead className="min-w-[80px]">Sort Order</TableHead>
                        <TableHead className="min-w-[80px]">Status</TableHead>
                        <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {banners?.map((banner) => (
                        <TableRow key={banner.id}>
                          <TableCell>
                            {banner.image_url ? (
                              <img src={banner.image_url} alt={banner.title} className="h-12 w-20 object-cover rounded" />
                            ) : (
                              <div className="h-12 w-20 bg-muted rounded flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{banner.title}</TableCell>
                          <TableCell>{banner.sort_order}</TableCell>
                          <TableCell>
                            <Badge variant={banner.active ? "default" : "secondary"}>
                              {banner.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBannerDialog({ open: true, banner })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDialog({ 
                                open: true, 
                                type: "banners", 
                                id: banner.id, 
                                name: banner.title 
                              })}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="blogs">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle>Blog Posts</CardTitle>
                  <Button onClick={() => setBlogDialog({ open: true, blog: null })} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Add Blog Post</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Title</TableHead>
                        <TableHead className="min-w-[120px]">Slug</TableHead>
                        <TableHead className="min-w-[80px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Created</TableHead>
                        <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blogs?.map((blog) => (
                        <TableRow key={blog.id}>
                          <TableCell className="font-medium">{blog.title}</TableCell>
                          <TableCell className="text-xs">{blog.slug}</TableCell>
                          <TableCell>
                            <Badge variant={blog.published ? "default" : "secondary"}>
                              {blog.published ? "Published" : "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{format(new Date(blog.created_at), 'PP')}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBlogDialog({ open: true, blog })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDialog({ 
                                open: true, 
                                type: "blogs", 
                                id: blog.id, 
                                name: blog.title 
                              })}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="meta-catalog" className="space-y-4">
              <MetaCatalogSync />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      <ProductDialog
        open={productDialog.open}
        onOpenChange={(open) => setProductDialog({ open, product: null })}
        product={productDialog.product}
        categories={categories || []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-products'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }}
      />

      <CategoryDialog
        open={categoryDialog.open}
        onOpenChange={(open) => setCategoryDialog({ open, category: null })}
        category={categoryDialog.category}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['categories'] });
        }}
      />

      <BannerDialog
        open={bannerDialog.open}
        onOpenChange={(open) => setBannerDialog({ open, banner: null })}
        banner={bannerDialog.banner}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
          queryClient.invalidateQueries({ queryKey: ['banners'] });
        }}
      />

      <BlogDialog
        open={blogDialog.open}
        onOpenChange={(open) => setBlogDialog({ open, blog: null })}
        blog={blogDialog.blog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-blogs'] });
        }}
      />

      <ReviewDialog
        open={reviewDialog.open}
        onOpenChange={(open) => setReviewDialog({ open, review: null })}
        review={reviewDialog.review}
        products={products || []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
        }}
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: "", id: "", name: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteDialog.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={exportDialog} onOpenChange={setExportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export Orders to Excel</AlertDialogTitle>
            <AlertDialogDescription>
              Choose to export all orders or filter by date range.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={() => exportOrdersToExcel(false)}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Export All Orders
            </Button>
            <Button
              onClick={() => exportOrdersToExcel(true)}
              disabled={!startDate || !endDate}
              className="w-full sm:w-auto"
            >
              Export Filtered Orders
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;