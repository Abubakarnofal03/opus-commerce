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
import { Package, ShoppingBag, DollarSign, Plus, Pencil, Trash2, Image as ImageIcon, Download, ChevronDown, ChevronUp, CalendarIcon, BarChart3, Filter, Search, Save, X, CheckSquare, Square, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductDialog } from "@/components/admin/ProductDialog";
import { CategoryDialog } from "@/components/admin/CategoryDialog";
import { BannerDialog } from "@/components/admin/BannerDialog";
import { BlogDialog } from "@/components/admin/BlogDialog";
import { SaleDialog } from "@/components/admin/SaleDialog";
import { PromotionalBarDialog } from "@/components/admin/PromotionalBarDialog";
import { MetaCatalogSync } from "@/components/admin/MetaCatalogSync";
import { TikTokFeedGenerator } from "@/components/admin/TikTokFeedGenerator";
import ReviewDialog from "@/components/admin/ReviewDialog";
import { OrderAnalytics } from "@/components/admin/OrderAnalytics";
import { SiteAnalytics } from "@/components/admin/SiteAnalytics";
import { DraggableProductList } from "@/components/admin/DraggableProductList";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice } from "@/lib/currency";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderListItem } from "@/components/admin/OrderListItem";
import { OrderDetailCard } from "@/components/admin/OrderDetailCard";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import * as XLSX from 'xlsx';

// Format phone number for WhatsApp
const formatPhoneForWhatsApp = (phone: string): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 92 (Pakistan country code)
  if (cleaned.startsWith('0')) {
    return '92' + cleaned.slice(1);
  }
  
  // If already has country code
  if (cleaned.startsWith('92')) {
    return cleaned;
  }
  
  // Add country code
  return '92' + cleaned;
};

// Generate WhatsApp message
const generateWhatsAppMessage = (order: any): string => {
  const items = order.order_items?.map((item: any) => {
    const variationInfo = item.variation_name ? `\n  Variation: ${item.variation_name}` : '';
    const colorInfo = item.color_name ? `\n  Color: ${item.color_name}` : '';
    return `• ${item.products?.name}${variationInfo}${colorInfo}\n  Qty: ${item.quantity} × ${formatPrice(item.price)} = ${formatPrice(item.price * item.quantity)}`;
  }).join('\n\n') || 'No items';

  return `*Order Confirmation Request*

Order #: ${order.order_number}
Customer: ${order.first_name} ${order.last_name}

*Order Items:*
${items}

*Order Total: ${formatPrice(order.total_amount)}*

*Delivery Address:*
${order.shipping_address}
${order.shipping_city}, ${order.shipping_state || ''} ${order.shipping_zip || ''}

Do you confirm this order?
Please reply YES to confirm or NO to cancel.`;
};

// Open WhatsApp with pre-filled message
const sendWhatsAppConfirmation = (order: any) => {
  const formattedPhone = formatPhoneForWhatsApp(order.phone);
  const message = generateWhatsAppMessage(order);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
};

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [productDialog, setProductDialog] = useState({ open: false, product: null });
  const [categoryDialog, setCategoryDialog] = useState({ open: false, category: null });
  const [bannerDialog, setBannerDialog] = useState({ open: false, banner: null });
  const [promotionalBarDialog, setPromotionalBarDialog] = useState(false);
  const [blogDialog, setBlogDialog] = useState({ open: false, blog: null });
  const [reviewDialog, setReviewDialog] = useState({ open: false, review: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: "", id: "", name: "" });
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [exportDialog, setExportDialog] = useState(false);
  const [instaWorldDialog, setInstaWorldDialog] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [instaStartDate, setInstaStartDate] = useState<Date | undefined>(undefined);
  const [instaEndDate, setInstaEndDate] = useState<Date | undefined>(undefined);
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingNote, setEditingNote] = useState<{ orderId: string; note: string } | null>(null);
  const [editingCustomerConfirmation, setEditingCustomerConfirmation] = useState<{ orderId: string; confirmation: string } | null>(null);
  const [editingCourierCompany, setEditingCourierCompany] = useState<{ orderId: string; courier: string } | null>(null);
  const [editingAddress, setEditingAddress] = useState<{ orderId: string; address: string } | null>(null);
  const [editingPhone, setEditingPhone] = useState<{ orderId: string; phone: string } | null>(null);
  const [editingCity, setEditingCity] = useState<{ orderId: string; city: string } | null>(null);
  const [exportStatusFilter, setExportStatusFilter] = useState<string>("all");
  const [instaStatusFilter, setInstaStatusFilter] = useState<string>("all");
  const [instaProductFilter, setInstaProductFilter] = useState<string>("all");
  const [customExportDialog, setCustomExportDialog] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [customStatusFilter, setCustomStatusFilter] = useState<string>("all");
  const [customProductFilter, setCustomProductFilter] = useState<string>("all");
  const [editingOrderItem, setEditingOrderItem] = useState<{ 
    itemId: string; 
    quantity: number; 
    price: number;
    variationId: string | null;
    colorId: string | null;
  } | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("orders");
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState<number | 'all'>(50);
  const [showPageSizeDialog, setShowPageSizeDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // If a filter/search is active, switch to "all" to ensure client-side filtering
  // Do NOT automatically revert back; let the user control page size selection.
  useEffect(() => {
    const anyFilterActive = statusFilter !== 'all' || productFilter !== 'all' || searchQuery.trim() !== '';
    if (anyFilterActive && ordersPageSize !== 'all') {
      setOrdersPageSize('all');
    }
  }, [statusFilter, productFilter, searchQuery, ordersPageSize]);

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

  // Request notification permission when admin logs in
  useEffect(() => {
    if (isAdmin && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            toast({
              title: "Notifications enabled",
              description: "You'll receive alerts for new orders.",
            });
          }
        });
      }
    }
  }, [isAdmin, toast]);

  // Set up realtime listener for new orders
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newOrder = payload.new as any;
          
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('New Order Arrived! 🎉', {
              body: `Order #${newOrder.order_number}`,
              icon: '/logo.jpg',
              badge: '/logo.jpg',
              tag: 'new-order',
              requireInteraction: false
            });

            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          }

          // Also show toast notification
          toast({
            title: "New Order Arrived! 🎉",
            description: `Order #${newOrder.order_number}`,
          });

          // Refresh orders list
          queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient, toast]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data;
    },
    enabled: activeTab === 'categories',
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
    enabled: ['products', 'analytics', 'orders'].includes(activeTab),
  });

  // Separate query for just the count
  const { data: totalOrdersCount } = useQuery({
    queryKey: ['admin-orders-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: activeTab === 'orders' || activeTab === 'analytics',
  });

  const { data: ordersData, isLoading: ordersLoading, isFetching: ordersFetching } = useQuery({
    queryKey: ['admin-orders', ordersPage, ordersPageSize, statusFilter, productFilter, searchQuery],
    queryFn: async () => {
      // Build lightweight query - only fetch essential fields for list view
      // Include order_items.product_id for product filtering
      let query = supabase
        .from('orders')
        .select('id, order_number, status, created_at, first_name, last_name, phone, shipping_city, total_amount, order_items(product_id)', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      // Server-side filtering by status
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Note: Product filtering will be done client-side for now
      // Server-side product filtering requires a more complex query structure
      
      // Only apply pagination if not "all"
      if (ordersPageSize !== 'all') {
        const from = (ordersPage - 1) * ordersPageSize;
        const to = from + ordersPageSize - 1;
        query = query.range(from, to);
      }
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      // Client-side filtering for search and product (lightweight since we only have minimal data)
      let filteredData = data || [];
      
      // Product filter (client-side - we have order_items.product_id in the data)
      if (productFilter !== 'all') {
        filteredData = filteredData.filter(order => {
          const orderItems = order.order_items as any[];
          return orderItems?.some((item: any) => item.product_id === productFilter);
        });
      }
      
      // Search filter
      if (searchQuery.trim()) {
        filteredData = filteredData.filter(order => {
          const searchLower = searchQuery.toLowerCase();
          return (
            order.order_number.toString().includes(searchQuery) ||
            order.first_name?.toLowerCase().includes(searchLower) ||
            order.last_name?.toLowerCase().includes(searchLower) ||
            order.phone?.includes(searchQuery)
          );
        });
      }
      
      return { orders: filteredData, totalCount: count || 0 };
    },
    enabled: activeTab === 'orders' || activeTab === 'analytics',
  });

  const orders = ordersData?.orders;
  const totalOrders = ordersData?.totalCount || 0;
  const totalPages = ordersPageSize === 'all' ? 1 : Math.ceil(totalOrders / ordersPageSize);

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
    enabled: activeTab === 'banners',
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
    enabled: activeTab === 'blogs',
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
    enabled: activeTab === 'reviews',
  });

  const { data: productVariations } = useQuery({
    queryKey: ['product-variations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variations')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: activeTab === 'products',
  });

  const { data: productColors } = useQuery({
    queryKey: ['product-colors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_colors')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: activeTab === 'products',
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      toast({ title: "Order status updated" });
      
      // Check if the updated order still matches the current filter
      // If not, it will be removed from filteredOrders and OrderDetailCard will handle navigation
      // We don't need to manually close here - the useEffect in OrderDetailCard will handle it
    },
  });

  const bulkUpdateOrderStatus = useMutation({
    mutationFn: async ({ orderIds, status }: { orderIds: string[]; status: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .in('id', orderIds);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({ title: `${variables.orderIds.length} orders updated to ${variables.status}` });
      setSelectedOrders(new Set());
    },
  });

  const updateAdminNote = useMutation({
    mutationFn: async ({ orderId, note }: { orderId: string; note: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ admin_notes: note })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      toast({ title: "Note updated" });
      setEditingNote(null);
    },
  });

  const updateCustomerConfirmation = useMutation({
    mutationFn: async ({ orderId, confirmation }: { orderId: string; confirmation: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ customer_confirmation: confirmation })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      toast({ title: "Customer confirmation updated" });
      setEditingCustomerConfirmation(null);
    },
  });

  const updateCourierCompany = useMutation({
    mutationFn: async ({ orderId, courier }: { orderId: string; courier: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ courier_company: courier })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      toast({ title: "Courier company updated" });
      setEditingCourierCompany(null);
    },
  });

  const updateShippingAddress = useMutation({
    mutationFn: async ({ orderId, address }: { orderId: string; address: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ shipping_address: address })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      toast({ title: "Shipping address updated" });
      setEditingAddress(null);
    },
  });

  const updateShippingCity = useMutation({
    mutationFn: async ({ orderId, city }: { orderId: string; city: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ shipping_city: city })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      toast({ title: 'City updated' });
      setEditingCity(null);
    },
  });

  const updatePhone = useMutation({
    mutationFn: async ({ orderId, phone }: { orderId: string; phone: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ phone })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      toast({ title: "Phone number updated" });
      setEditingPhone(null);
    },
  });

  const updateOrderItem = useMutation({
    mutationFn: async ({ 
      itemId, 
      quantity, 
      price,
      variationId,
      colorId,
      orderId
    }: { 
      itemId: string; 
      quantity: number; 
      price: number;
      variationId: string | null;
      colorId: string | null;
      orderId: string;
    }) => {
      // Get variation and color details
      let variationName = null;
      let variationPrice = null;
      let colorName = null;
      let colorPrice = null;
      let colorCode = null;

      if (variationId) {
        const { data: variation } = await supabase
          .from('product_variations')
          .select('name, price')
          .eq('id', variationId)
          .single();
        if (variation) {
          variationName = variation.name;
          variationPrice = variation.price;
        }
      }

      if (colorId) {
        const { data: color } = await supabase
          .from('product_colors')
          .select('name, price, color_code')
          .eq('id', colorId)
          .single();
        if (color) {
          colorName = color.name;
          colorPrice = color.price;
          colorCode = color.color_code;
        }
      }

      // Update order item
      const { error } = await supabase
        .from('order_items')
        .update({ 
          quantity, 
          price,
          variation_id: variationId,
          variation_name: variationName,
          variation_price: variationPrice,
          color_id: colorId,
          color_name: colorName,
          color_price: colorPrice,
          color_code: colorCode
        })
        .eq('id', itemId);
      if (error) throw error;

      // Recalculate order total
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('price, quantity')
        .eq('order_id', orderId);
      
      if (orderItems) {
        const newTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        await supabase
          .from('orders')
          .update({ total_amount: newTotal })
          .eq('id', orderId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      toast({ title: "Order item updated" });
      setEditingOrderItem(null);
    },
  });

  const deleteOrderItem = useMutation({
    mutationFn: async ({ itemId, orderId }: { itemId: string; orderId: string }) => {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;

      // Recalculate order total
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('price, quantity')
        .eq('order_id', orderId);
      
      if (orderItems && orderItems.length > 0) {
        const newTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        await supabase
          .from('orders')
          .update({ total_amount: newTotal })
          .eq('id', orderId);
      } else {
        // If no items left, set total to 0
        await supabase
          .from('orders')
          .update({ total_amount: 0 })
          .eq('id', orderId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
      toast({ title: "Order item deleted" });
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

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleBulkStatusChange = (status: string) => {
    if (selectedOrders.size === 0) {
      toast({
        title: "No orders selected",
        description: "Please select at least one order to update.",
        variant: "destructive",
      });
      return;
    }
    bulkUpdateOrderStatus.mutate({ orderIds: Array.from(selectedOrders), status });
  };

  const exportOrdersToInstaWorld = async (filterByDate: boolean = false) => {
    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
      return;
    }
    const orders = allOrders || [];
    if (orders.length === 0) {
      toast({ title: 'No orders to export', description: 'There are no orders available to download.', variant: 'destructive' });
      return;
    }

    let filteredOrders = orders;
    
    // Apply status filter
    if (instaStatusFilter !== "all") {
      filteredOrders = filteredOrders.filter(order => order.status === instaStatusFilter);
    }
    
    // Apply product filter
    if (instaProductFilter !== "all") {
      filteredOrders = filteredOrders.filter(order => {
        const orderItems = order.order_items || [];
        return orderItems.some((item: any) => item.product_id === instaProductFilter);
      });
    }
    
    // Apply date filter
    if (filterByDate && instaStartDate && instaEndDate) {
      filteredOrders = filteredOrders.filter((order) => {
        const orderDate = new Date(order.created_at);
        const start = new Date(instaStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(instaEndDate);
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

    // Sort orders by order ID in ascending order
    filteredOrders = filteredOrders.sort((a, b) => a.order_number - b.order_number);

    // Create CSV data for INSTA WORLD
    const csvData = filteredOrders.flatMap((order) => {
      const orderItems = order.order_items || [];
      return orderItems.map((item: any) => {
        const product = products?.find(p => p.id === item.product_id);
        const variationInfo = item.variation_name ? ` - ${item.variation_name}` : '';
        const colorInfo = item.color_name ? ` - ${item.color_name}` : '';
        const itemTitle = `${product?.name || 'N/A'}${variationInfo}${colorInfo}`;
        
        return {
          ref_no: order.order_number,
          consignee_first_name: order.first_name,
          consignee_last_name: order.last_name,
          consignee_email: order.email || "",
          consignee_phone: order.phone,
          consignee_city: order.shipping_city,
          consignee_address: order.shipping_address,
          amount: order.total_amount,
          financial_status: "COD",
          remarks: order.admin_notes || order.notes || "",
          item_title: itemTitle,
          item_price: item.price,
          item_quantity: item.quantity,
          item_sku: product?.sku || "",
          item_kg: product?.weight_kg || "",
        };
      });
    });

    // Convert to CSV format
    const headers = [
      "ref_no", "consignee_first_name", "consignee_last_name", "consignee_email",
      "consignee_phone", "consignee_city", "consignee_address", "amount",
      "financial_status", "remarks", "item_title", "item_price",
      "item_quantity", "item_sku", "item_kg"
    ];

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => 
        headers.map(header => {
          let value = row[header as keyof typeof row]?.toString() || "";
          
          // Remove line breaks and carriage returns that break CSV format
          value = value.replace(/[\r\n]+/g, ' ').trim();
          
          // Escape quotes by doubling them
          value = value.replace(/"/g, '""');
          
          // Always wrap fields in quotes to prevent CSV issues
          return `"${value}"`;
        }).join(",")
      )
    ].join("\n");

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    
    const dateRangeStr = filterByDate && instaStartDate && instaEndDate 
      ? `_${format(instaStartDate, 'yyyy-MM-dd')}_to_${format(instaEndDate, 'yyyy-MM-dd')}`
      : '';
    const fileName = `insta_world_orders${dateRangeStr}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setInstaWorldDialog(false);
    setInstaStartDate(undefined);
    setInstaEndDate(undefined);
    setInstaStatusFilter("all");
    
    toast({
      title: "Export successful",
      description: `Downloaded ${filteredOrders.length} orders to ${fileName}`,
    });
  };

  const exportOrdersToCustomFormat = async (filterByDate: boolean = false) => {
    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
      return;
    }
    const orders = allOrders || [];
    if (orders.length === 0) {
      toast({ title: 'No orders to export', description: 'There are no orders available to download.', variant: 'destructive' });
      return;
    }

    let filteredOrders = orders;
    
    // Apply status filter
    if (customStatusFilter !== "all") {
      filteredOrders = filteredOrders.filter(order => order.status === customStatusFilter);
    }
    
    // Apply product filter
    if (customProductFilter !== "all") {
      filteredOrders = filteredOrders.filter(order => {
        const orderItems = order.order_items || [];
        return orderItems.some((item: any) => item.product_id === customProductFilter);
      });
    }
    
    // Apply date filter
    if (filterByDate && customStartDate && customEndDate) {
      filteredOrders = filteredOrders.filter((order) => {
        const orderDate = new Date(order.created_at);
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
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

    // Sort orders by order ID in ascending order
    filteredOrders = filteredOrders.sort((a, b) => a.order_number - b.order_number);

    // Create CSV data - one row per order
    const csvData = filteredOrders.map((order) => {
      const orderItems = order.order_items || [];
      
      // Calculate total quantity
      const totalQuantity = orderItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
      
      // Calculate total booking weight
      const totalWeight = orderItems.reduce((sum: number, item: any) => {
        const product = products?.find(p => p.id === item.product_id);
        const weight = product?.weight_kg || 0;
        return sum + (weight * item.quantity);
      }, 0);
      
      // Build order detail with item names and variations
      const orderDetail = orderItems.map((item: any) => {
        const product = products?.find(p => p.id === item.product_id);
        let itemDetail = `${product?.name || 'Unknown Product'} (${item.quantity}x)`;
        
        if (item.variation_name) {
          itemDetail += ` - ${item.variation_name}`;
        }
        if (item.color_name) {
          itemDetail += ` - ${item.color_name}`;
        }
        
        return itemDetail;
      }).join('; ');

      return {
        order_reference: order.order_number,
        order_amount: order.total_amount,
        order_detail: orderDetail,
        customer_name: `${order.first_name} ${order.last_name}`,
        customer_phone: order.phone,
        order_address: order.shipping_address,
        city: order.shipping_city,
        items: totalQuantity,
        airway_bill_copies: "1",
        notes: order.admin_notes || order.notes || "",
        address_code: "001",
        return_address_code: "",
        order_type: "normal",
        booking_weight: totalWeight.toFixed(2),
      };
    });

    // Convert to CSV format
    const headers = [
      "Order Reference Number", "Order Amount", "Order Detail", "Customer Name",
      "Customer Phone", "Order Address", "City", "Items",
      "Airway Bill Copies", "Notes", "Address Code", "Return Address Code",
      "Order Type", "Booking Weight"
    ];

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => 
        [
          row.order_reference,
          row.order_amount,
          row.order_detail,
          row.customer_name,
          row.customer_phone,
          row.order_address,
          row.city,
          row.items,
          row.airway_bill_copies,
          row.notes,
          row.address_code,
          row.return_address_code,
          row.order_type,
          row.booking_weight,
        ].map(value => {
          let strValue = value?.toString() || "";
          
          // Remove line breaks and carriage returns
          strValue = strValue.replace(/[\r\n]+/g, ' ').trim();
          
          // Escape quotes by doubling them
          strValue = strValue.replace(/"/g, '""');
          
          // Always wrap fields in quotes
          return `"${strValue}"`;
        }).join(",")
      )
    ].join("\n");

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    
    const dateRangeStr = filterByDate && customStartDate && customEndDate 
      ? `_${format(customStartDate, 'yyyy-MM-dd')}_to_${format(customEndDate, 'yyyy-MM-dd')}`
      : '';
    const fileName = `custom_orders${dateRangeStr}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCustomExportDialog(false);
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setCustomStatusFilter("all");
    setCustomProductFilter("all");
    
    toast({
      title: "Export successful",
      description: `Downloaded ${filteredOrders.length} orders to ${fileName}`,
    });
  };

  const exportOrdersToExcel = async (filterByDate: boolean = false) => {
    // Always fetch the complete list of orders so that exports include all records
    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
      return;
    }
    const ordersToProcess = allOrders || [];
    if (ordersToProcess.length === 0) {
      toast({
        title: 'No orders to export',
        description: 'There are no orders available to download.',
        variant: 'destructive',
      });
      return;
    }

    let filteredOrders = ordersToProcess;
    
    // Apply status filter
    if (exportStatusFilter !== "all") {
      filteredOrders = filteredOrders.filter(order => order.status === exportStatusFilter);
    }
    
    // Apply date filter
    if (filterByDate && startDate && endDate) {
      filteredOrders = filteredOrders.filter((order) => {
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

    // Sort orders by order ID in ascending order
    filteredOrders = filteredOrders.sort((a, b) => a.order_number - b.order_number);

    // Create export data with exact sequence requested
    const exportData = filteredOrders.flatMap((order) => {
      return order.order_items?.map((item: any, index: number) => {
        const variationInfo = item.variation_name ? ` (${item.variation_name})` : '';
        const colorInfo = item.color_name ? ` (${item.color_name})` : '';
        return {
          'Order ID': order.order_number,
          'Order Date': format(new Date(order.created_at), 'PPP'),
          'Customer Name': `${order.first_name} ${order.last_name}`,
          'Email': order.email || 'N/A',
          'Customer Confirmation': order.customer_confirmation || 'N/A',
          'Phone Number': order.phone,
          'Address': order.shipping_address,
          'City': order.shipping_city,
          'Product Name': (item.products?.name || 'N/A') + variationInfo + colorInfo,
          'Quantity': item.quantity,
          'Price': item.price,
          'Item Total': item.price * item.quantity,
          'Order Total': index === 0 ? Number(order.total_amount) : '',
          'Status': order.status,
          'Notes': order.admin_notes || 'N/A',
          'Courier Company': order.courier_company || 'N/A',
        };
      });
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

  // Orders are now filtered server-side, but we still need filteredOrders for display
  // Note: Product filtering with search might need additional client-side filtering
  const filteredOrders = orders || [];
  
  // Get list of order IDs for navigation
  const orderIds = filteredOrders.map(o => o.id);

  const stats = {
    totalOrders: totalOrdersCount ?? 0,
    totalProducts: products?.length || 0,
    totalRevenue: orders?.filter(order => order.status === 'delivered').reduce((sum, order) => sum + Number(order.total_amount), 0) || 0,
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
      
      <main className="flex-1 py-4 sm:py-6 lg:py-12">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 lg:mb-8 text-center gold-accent pb-4 sm:pb-6 lg:pb-8">
            Admin Dashboard
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Orders</p>
                    <p className="text-2xl sm:text-3xl font-bold truncate">{stats.totalOrders}</p>
                  </div>
                  <ShoppingBag className="h-8 w-8 sm:h-12 sm:w-12 text-accent flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Products</p>
                    <p className="text-2xl sm:text-3xl font-bold truncate">{stats.totalProducts}</p>
                  </div>
                  <Package className="h-8 w-8 sm:h-12 sm:w-12 text-accent flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Revenue</p>
                    <p className="text-2xl sm:text-3xl font-bold truncate">{formatPrice(stats.totalRevenue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 sm:h-12 sm:w-12 text-accent flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="w-full inline-flex flex-nowrap gap-1 h-auto p-1 min-w-max sm:min-w-0">
                <TabsTrigger value="orders" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">Orders</TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">Analytics</TabsTrigger>
                <TabsTrigger value="products" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">Products</TabsTrigger>
                <TabsTrigger value="categories" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">Categories</TabsTrigger>
                <TabsTrigger value="reviews" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">Reviews</TabsTrigger>
                <TabsTrigger value="banners" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">Banners</TabsTrigger>
                <TabsTrigger value="blogs" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">Blogs</TabsTrigger>
                <TabsTrigger value="meta-catalog" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">Meta Catalog</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="orders" className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
              {/* Header with total and settings */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="text-sm text-muted-foreground">
                  Total Orders: <span className="font-semibold text-foreground">{totalOrdersCount || 0}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPageSizeDialog(true)}
                  className="w-full sm:w-auto"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Settings ({ordersPageSize === 'all' ? 'All' : ordersPageSize} per page)
                </Button>
              </div>

              {/* Filters Card */}
              <Card className="mb-4 shadow-sm">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="space-y-4">
                    {/* Search and Filters Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 lg:col-span-1">
                        <label className="text-sm font-medium mb-2 block">Search Orders</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Order #, name, phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Status</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Product</label>
                        <Select value={productFilter} onValueChange={setProductFilter}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Products</SelectItem>
                            {products?.map(product => (
                              <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Export Buttons */}
                    <div className="border-t pt-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          onClick={() => setExportDialog(true)} 
                          variant="outline" 
                          size="sm"
                          className="flex-1 sm:flex-initial"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Excel Export
                        </Button>
                        <Button 
                          onClick={() => setInstaWorldDialog(true)} 
                          variant="secondary" 
                          size="sm"
                          className="flex-1 sm:flex-initial"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Insta World
                        </Button>
                        <Button 
                          onClick={() => setCustomExportDialog(true)} 
                          size="sm"
                          className="flex-1 sm:flex-initial"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Custom Export
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {filteredOrders.length > 0 && (
                <Card className="mb-4 shadow-sm">
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                          onCheckedChange={toggleSelectAll}
                          id="select-all"
                        />
                        <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                          {selectedOrders.size > 0 ? (
                            <span>
                              {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
                            </span>
                          ) : (
                            <span>Select all ({filteredOrders.length})</span>
                          )}
                        </label>
                      </div>
                      
                      {selectedOrders.size > 0 && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t">
                          <span className="text-sm text-muted-foreground sm:self-center">Bulk actions:</span>
                          <Select onValueChange={handleBulkStatusChange}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                              <SelectValue placeholder="Change status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Set to Pending</SelectItem>
                              <SelectItem value="processing">Set to Processing</SelectItem>
                              <SelectItem value="shipped">Set to Shipped</SelectItem>
                              <SelectItem value="delivered">Set to Delivered</SelectItem>
                              <SelectItem value="cancelled">Set to Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-muted/30 rounded-lg mb-4">
                {ordersLoading || ordersFetching ? (
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-32" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-semibold text-foreground">{filteredOrders.length}</span> order{filteredOrders.length !== 1 ? 's' : ''}
                      {statusFilter !== "all" && <span className="ml-1">({statusFilter})</span>}
                    </p>
                    {filteredOrders.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Page {ordersPage} of {totalPages}
                      </p>
                    )}
                  </>
                )}
              </div>
              
              {/* Loading State */}
              {(ordersLoading || ordersFetching) ? (
                <div className="space-y-3">
                  {Array.from({ length: ordersPageSize === 'all' ? 10 : Math.min(ordersPageSize as number, 10) }).map((_, index) => (
                    <Card key={`skeleton-${index}`} className="animate-pulse">
                      <div className="p-3 sm:p-4">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <Skeleton className="h-5 w-5 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-40" />
                                <div className="flex flex-wrap items-center gap-2">
                                  <Skeleton className="h-3 w-24" />
                                  <Skeleton className="h-3 w-20" />
                                  <Skeleton className="h-3 w-16" />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-5 w-16" />
                              </div>
                            </div>
                          </div>
                          <Skeleton className="h-10 w-[140px] sm:w-[150px] flex-shrink-0" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No orders match your filters
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => (
                    <OrderListItem
                      key={order.id}
                      order={order}
                      isSelected={selectedOrders.has(order.id)}
                      onSelect={(orderId) => toggleOrderSelection(orderId)}
                      onStatusChange={(orderId, status) => updateOrderStatus.mutate({ orderId, status })}
                      onClick={(orderId) => setSelectedOrderId(orderId)}
                    />
                  ))}
                </div>
              )}

              {/* Order Detail Card */}
              <OrderDetailCard
                orderId={selectedOrderId}
                orderIds={orderIds}
                onClose={() => setSelectedOrderId(null)}
                onNavigate={(orderId) => setSelectedOrderId(orderId)}
                onStatusChange={(orderId, status) => updateOrderStatus.mutate({ orderId, status })}
                onItemUpdate={(params) => updateOrderItem.mutate(params)}
                onItemDelete={(params) => {
                  if (confirm('Are you sure you want to delete this item?')) {
                    deleteOrderItem.mutate(params);
                  }
                }}
                onPhoneUpdate={(params) => updatePhone.mutate(params)}
                onAddressUpdate={(params) => updateShippingAddress.mutate(params)}
                onCityUpdate={(params) => updateShippingCity.mutate(params)}
                onCourierUpdate={(params) => updateCourierCompany.mutate(params)}
                onAdminNoteUpdate={(params) => updateAdminNote.mutate(params)}
                onCustomerConfirmationUpdate={(params) => updateCustomerConfirmation.mutate(params)}
                onWhatsAppClick={sendWhatsAppConfirmation}
                productVariations={productVariations}
                productColors={productColors}
              />

              {/* Pagination */}
              {ordersPageSize !== 'all' && totalPages > 1 && (
                <div className="mt-4 sm:mt-6">
                  <Pagination>
                    <PaginationContent className="flex-wrap gap-1 sm:gap-2">
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                          className={ordersPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {/* Show page numbers - responsive: fewer on mobile */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (ordersPage <= 3) {
                          pageNum = i + 1;
                        } else if (ordersPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = ordersPage - 2 + i;
                        }
                        
                        return (
                          <PaginationItem key={pageNum} className="hidden sm:block">
                            <PaginationLink
                              onClick={() => setOrdersPage(pageNum)}
                              isActive={ordersPage === pageNum}
                              className="cursor-pointer min-w-[2.5rem]"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      {/* Show current page on mobile */}
                      <PaginationItem className="sm:hidden">
                        <PaginationLink
                          isActive
                          className="cursor-default min-w-[2.5rem]"
                        >
                          {ordersPage} / {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setOrdersPage(p => Math.min(totalPages, p + 1))}
                          className={ordersPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics">
              <div className="space-y-8">
                <SiteAnalytics />
                <div className="border-t pt-8">
                  <h3 className="text-xl font-bold mb-4">Order Analytics</h3>
                  <OrderAnalytics
                    orders={orders || []}
                    products={products || []}
                    selectedCity={selectedCity}
                    setSelectedCity={setSelectedCity}
                    selectedProduct={selectedProduct}
                    setSelectedProduct={setSelectedProduct}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
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

              <DraggableProductList
                products={products || []}
                categories={categories || []}
                onEdit={(product) => setProductDialog({ open: true, product })}
                onDelete={(product) => setDeleteDialog({ 
                  open: true, 
                  type: "products", 
                  id: product.id, 
                  name: product.name 
                })}
              />
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

            <TabsContent value="reviews" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Review Management</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Approve or reject customer reviews</p>
                  </div>
                  <Button onClick={() => setReviewDialog({ open: true, review: null })} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Add Review</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reviews?.map((review: any) => (
                      <Card key={review.id} className={review.is_verified ? "border-green-200" : "border-amber-200"}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star} className={star <= review.rating ? "text-yellow-400" : "text-gray-300"}>
                                      ⭐
                                    </span>
                                  ))}
                                </div>
                                <Badge variant={review.is_verified ? "default" : "secondary"}>
                                  {review.is_verified ? "Approved ✓" : "Pending Approval"}
                                </Badge>
                              </div>
                              <div>
                                <h4 className="font-semibold">{review.review_title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{review.review_text}</p>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Product: {review.products?.name || 'N/A'}</span>
                                <span>•</span>
                                <span>By: {review.reviewer_name}</span>
                                <span>•</span>
                                <span>{format(new Date(review.review_date), 'PPP')}</span>
                              </div>
                              {review.review_images && review.review_images.length > 0 && (
                                <div className="flex gap-2">
                                  {review.review_images.map((image: string, index: number) => (
                                    <img
                                      key={index}
                                      src={image}
                                      alt={`Review for ${review.products?.name} ${index + 1}`}
                                      className="w-16 h-16 object-cover rounded"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {!review.is_verified ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    supabase
                                      .from("reviews")
                                      .update({ is_verified: true })
                                      .eq("id", review.id)
                                      .then(() => {
                                        toast({ title: "Review approved" });
                                        queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
                                      });
                                  }}
                                >
                                  Approve
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    supabase
                                      .from("reviews")
                                      .update({ is_verified: false })
                                      .eq("id", review.id)
                                      .then(() => {
                                        toast({ title: "Review unapproved" });
                                        queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
                                      });
                                  }}
                                >
                                  Unapprove
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setReviewDialog({ open: true, review })}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm("Delete this review?")) {
                                    supabase
                                      .from("reviews")
                                      .delete()
                                      .eq("id", review.id)
                                      .then(() => {
                                        toast({ title: "Review deleted" });
                                        queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
                                      });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {(!reviews || reviews.length === 0) && (
                      <div className="text-center py-12 text-muted-foreground">
                        No reviews yet
                      </div>
                    )}
                  </div>
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

              <Card className="mt-6">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle>Top Promotional Bar</CardTitle>
                  <Button onClick={() => setPromotionalBarDialog(true)} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Manage Promotional Bars</span>
                    <span className="sm:hidden">Manage</span>
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create rotating promotional messages that appear at the top of your site. 
                    Add sale announcements, countdown timers, and special offers that automatically rotate.
                  </p>
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
              <TikTokFeedGenerator />
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

      <PromotionalBarDialog
        open={promotionalBarDialog}
        onOpenChange={setPromotionalBarDialog}
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
              Choose to export all orders or filter by date range and status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Status</label>
              <Select value={exportStatusFilter} onValueChange={setExportStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date (Optional)</label>
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
                <label className="text-sm font-medium">End Date (Optional)</label>
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

      {/* INSTA WORLD Export Dialog */}
      <AlertDialog 
        open={instaWorldDialog} 
        onOpenChange={(open) => {
          setInstaWorldDialog(open);
          if (!open) {
            setInstaStatusFilter("all");
            setInstaProductFilter("all");
            setInstaStartDate(undefined);
            setInstaEndDate(undefined);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export Orders for INSTA WORLD</AlertDialogTitle>
            <AlertDialogDescription>
              Choose to export all orders or filter by status and date range. File will be in CSV format.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Status</label>
              <Select value={instaStatusFilter} onValueChange={setInstaStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Product</label>
              <Select value={instaProductFilter} onValueChange={setInstaProductFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date (Optional)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {instaStartDate ? format(instaStartDate, "PPP") : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={instaStartDate}
                      onSelect={setInstaStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date (Optional)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {instaEndDate ? format(instaEndDate, "PPP") : "Pick end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={instaEndDate}
                      onSelect={setInstaEndDate}
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
              onClick={() => exportOrdersToInstaWorld(false)}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Export All Orders
            </Button>
            <Button
              onClick={() => exportOrdersToInstaWorld(true)}
              disabled={!instaStartDate || !instaEndDate}
              className="w-full sm:w-auto"
            >
              Export Filtered Orders
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom Export Dialog */}
      <AlertDialog open={customExportDialog} onOpenChange={setCustomExportDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Export Orders (Custom Format)</AlertDialogTitle>
            <AlertDialogDescription>
              Export orders with custom fields. You can filter by status, product, and date range.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Status</label>
              <Select value={customStatusFilter} onValueChange={setCustomStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Product</label>
              <Select value={customProductFilter} onValueChange={setCustomProductFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products?.map(product => (
                    <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date (Optional)</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, "PPP") : "Pick start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date (Optional)</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEndDate ? format(customEndDate, "PPP") : "Pick end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={() => exportOrdersToCustomFormat(false)}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Export All Orders
            </Button>
            <Button
              onClick={() => exportOrdersToCustomFormat(true)}
              disabled={!customStartDate || !customEndDate}
              className="w-full sm:w-auto"
            >
              Export Filtered Orders
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Page Size Dialog */}
      <AlertDialog open={showPageSizeDialog} onOpenChange={setShowPageSizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Orders Per Page</AlertDialogTitle>
            <AlertDialogDescription>
              Select how many orders to display per page. Default is 50.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <label className="text-sm font-medium">Orders per page</label>
            <Select value={ordersPageSize.toString()} onValueChange={(v) => {
              setOrdersPageSize(v === 'all' ? 'all' : Number(v));
              setOrdersPage(1);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;