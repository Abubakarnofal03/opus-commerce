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

  const { data: ordersData } = useQuery({
    queryKey: ['admin-orders', ordersPage, ordersPageSize],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*, order_items(*, products(*, product_variations(*)))', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      // Only apply pagination if not "all"
      if (ordersPageSize !== 'all') {
        const from = (ordersPage - 1) * ordersPageSize;
        const to = from + ordersPageSize - 1;
        query = query.range(from, to);
      }
      
      const { data, error, count } = await query;
      if (error) throw error;
      return { orders: data, totalCount: count || 0 };
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({ title: "Order status updated" });
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

  // Filter and search orders
  const filteredOrders = orders?.filter(order => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesProduct = productFilter === "all" || order.order_items?.some((item: any) => item.product_id === productFilter);
    const matchesSearch = !searchQuery || 
      order.order_number.toString().includes(searchQuery) ||
      order.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.phone.includes(searchQuery) ||
      order.order_items?.some((item: any) => 
        item.products?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesStatus && matchesProduct && matchesSearch;
  }) || [];

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

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full flex flex-wrap gap-1 h-auto p-1">
              <TabsTrigger value="orders" className="text-xs md:text-sm flex-1 min-w-[80px]">Orders</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs md:text-sm flex-1 min-w-[80px]">Analytics</TabsTrigger>
              <TabsTrigger value="products" className="text-xs md:text-sm flex-1 min-w-[80px]">Products</TabsTrigger>
              <TabsTrigger value="categories" className="text-xs md:text-sm flex-1 min-w-[80px]">Categories</TabsTrigger>
              <TabsTrigger value="reviews" className="text-xs md:text-sm flex-1 min-w-[80px]">Reviews</TabsTrigger>
              <TabsTrigger value="banners" className="text-xs md:text-sm flex-1 min-w-[80px]">Banners</TabsTrigger>
              <TabsTrigger value="blogs" className="text-xs md:text-sm flex-1 min-w-[80px]">Blogs</TabsTrigger>
              <TabsTrigger value="meta-catalog" className="text-xs md:text-sm flex-1 min-w-[100px]">Meta Catalog</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">
                  Total Orders: <span className="font-semibold text-foreground">{totalOrdersCount || 0}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPageSizeDialog(true)}
                >
                  Settings ({ordersPageSize === 'all' ? 'All' : ordersPageSize} per page)
                </Button>
              </div>

              <Card className="mb-4">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Search</label>
                      <input
                        type="text"
                        placeholder="Order ID, name, product..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Filter by Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                    <div>
                      <label className="text-sm font-medium mb-2 block">Filter by Product</label>
                      <Select value={productFilter} onValueChange={setProductFilter}>
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
                    <div className="flex items-end gap-2 flex-wrap">
                      <Button onClick={() => setShowPageSizeDialog(true)} variant="outline" size="sm" className="min-w-[100px]">
                        <Filter className="h-4 w-4 mr-2" />
                        {ordersPageSize} per page
                      </Button>
                      <Button onClick={() => setExportDialog(true)} variant="outline" className="flex-1 min-w-[140px]">
                        <Download className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                      <Button onClick={() => setInstaWorldDialog(true)} variant="secondary" className="flex-1 min-w-[140px]">
                        <Download className="h-4 w-4 mr-2" />
                        INSTA WORLD
                      </Button>
                      <Button onClick={() => setCustomExportDialog(true)} className="flex-1 min-w-[140px]">
                        <Download className="h-4 w-4 mr-2" />
                        Custom Export
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {filteredOrders.length > 0 && (
                <Card className="mb-4">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
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
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Bulk actions:</span>
                          <Select onValueChange={handleBulkStatusChange}>
                            <SelectTrigger className="w-[180px]">
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

              <div className="flex items-center justify-between px-4 py-2 bg-muted/30 rounded-lg mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{filteredOrders.length}</span> order{filteredOrders.length !== 1 ? 's' : ''}
                  {statusFilter !== "all" && <span className="ml-1">({statusFilter})</span>}
                </p>
              </div>
              
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No orders match your filters
                </div>
              ) : null}
              
              {filteredOrders.map((order, index) => (
                <Collapsible 
                  key={order.id}
                  open={expandedOrders.has(order.id)}
                  onOpenChange={() => toggleOrderExpanded(order.id)}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedOrders.has(order.id)}
                          onCheckedChange={() => toggleOrderSelection(order.id)}
                          className="mt-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 flex-1">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto hover:bg-transparent w-full sm:w-auto justify-start">
                              <div className="text-left">
                                <CardTitle className="text-base sm:text-lg">Order #{order.order_number}</CardTitle>
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
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {order.order_items?.map((item: any) => {
                          const isEditing = editingOrderItem?.itemId === item.id;
                          const itemVariations = productVariations?.filter(v => v.product_id === item.product_id) || [];
                          const itemColors = productColors?.filter(c => c.product_id === item.product_id) || [];

                          return (
                            <div key={item.id} className="flex flex-col gap-2 text-sm border-b pb-2">
                              {isEditing ? (
                                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                                  <div className="font-medium">{item.products?.name}</div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-xs text-muted-foreground">Quantity</label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={editingOrderItem.quantity}
                                        onChange={(e) => setEditingOrderItem({
                                          ...editingOrderItem,
                                          quantity: parseInt(e.target.value) || 1
                                        })}
                                        className="h-8"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-muted-foreground">Price per item</label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editingOrderItem.price}
                                        onChange={(e) => setEditingOrderItem({
                                          ...editingOrderItem,
                                          price: parseFloat(e.target.value) || 0
                                        })}
                                        className="h-8"
                                      />
                                    </div>
                                    {itemVariations.length > 0 && (
                                      <div>
                                        <label className="text-xs text-muted-foreground">Variation</label>
                                        <Select
                                          value={editingOrderItem.variationId || "none"}
                                          onValueChange={(value) => setEditingOrderItem({
                                            ...editingOrderItem,
                                            variationId: value === "none" ? null : value
                                          })}
                                        >
                                          <SelectTrigger className="h-8">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">No variation</SelectItem>
                                            {itemVariations.map(v => (
                                              <SelectItem key={v.id} value={v.id}>
                                                {v.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                    {itemColors.length > 0 && (
                                      <div>
                                        <label className="text-xs text-muted-foreground">Color</label>
                                        <Select
                                          value={editingOrderItem.colorId || "none"}
                                          onValueChange={(value) => setEditingOrderItem({
                                            ...editingOrderItem,
                                            colorId: value === "none" ? null : value
                                          })}
                                        >
                                          <SelectTrigger className="h-8">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">No color</SelectItem>
                                            {itemColors.map(c => (
                                              <SelectItem key={c.id} value={c.id}>
                                                <div className="flex items-center gap-2">
                                                  <span 
                                                    className="inline-block w-3 h-3 rounded-full border" 
                                                    style={{ backgroundColor: c.color_code }}
                                                  />
                                                  {c.name}
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => updateOrderItem.mutate({
                                        itemId: item.id,
                                        quantity: editingOrderItem.quantity,
                                        price: editingOrderItem.price,
                                        variationId: editingOrderItem.variationId,
                                        colorId: editingOrderItem.colorId,
                                        orderId: order.id
                                      })}
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingOrderItem(null)}
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{item.products?.name}</span>
                                      {item.variation_name && (
                                        <Badge variant="outline" className="text-xs">
                                          {item.variation_name}
                                        </Badge>
                                      )}
                                      {item.color_name && (
                                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                                          {item.color_code && (
                                            <span 
                                              className="inline-block w-3 h-3 rounded-full border" 
                                              style={{ backgroundColor: item.color_code }}
                                            />
                                          )}
                                          {item.color_name}
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.price)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{formatPrice(item.price * item.quantity)}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingOrderItem({
                                        itemId: item.id,
                                        quantity: item.quantity,
                                        price: item.price,
                                        variationId: item.variation_id,
                                        colorId: item.color_id
                                      })}
                                      className="h-8"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (confirm('Are you sure you want to delete this item?')) {
                                          deleteOrderItem.mutate({ itemId: item.id, orderId: order.id });
                                        }
                                      }}
                                      className="h-8 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
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
                              {editingPhone?.orderId === order.id ? (
                                <div className="space-y-2 mt-1">
                                  <Input
                                    value={editingPhone.phone}
                                    onChange={(e) => setEditingPhone({ orderId: order.id, phone: e.target.value })}
                                    className="h-8"
                                    placeholder="Enter phone number..."
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => updatePhone.mutate({ orderId: order.id, phone: editingPhone.phone })}
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingPhone(null)}
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{order.phone}</p>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingPhone({ orderId: order.id, phone: order.phone || '' })}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-2">
                            <h4 className="font-semibold text-sm mb-2">Shipping Address</h4>
                            {editingAddress?.orderId === order.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingAddress.address}
                                  onChange={(e) => setEditingAddress({ orderId: order.id, address: e.target.value })}
                                  className="w-full px-3 py-2 border rounded-md text-sm"
                                  rows={3}
                                  placeholder="Enter shipping address..."
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => updateShippingAddress.mutate({ orderId: order.id, address: editingAddress.address })}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingAddress(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="text-sm space-y-1">
                                  <p>{order.shipping_address}</p>
                                  <p>{order.shipping_city}, {order.shipping_state} {order.shipping_zip}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingAddress({ orderId: order.id, address: order.shipping_address || '' })}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit Address
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Editable City */}
                          <div className="pt-2">
                            <h4 className="font-semibold text-sm mb-2">City</h4>
                            {editingCity?.orderId === order.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editingCity.city}
                                  onChange={(e) => setEditingCity({ orderId: order.id, city: e.target.value })}
                                  className="w-full px-3 py-2 border rounded-md text-sm"
                                  placeholder="Enter city..."
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => updateShippingCity.mutate({ orderId: order.id, city: editingCity.city })}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingCity(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground">{order.shipping_city || 'N/A'}</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingCity({ orderId: order.id, city: order.shipping_city || '' })}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit City
                                </Button>
                              </div>
                            )}
                          </div>

                          {order.notes && (
                            <>
                              <h4 className="font-semibold text-sm pt-2">Customer Notes</h4>
                              <p className="text-sm text-muted-foreground">{order.notes}</p>
                            </>
                          )}

                          <div className="pt-2">
                            <h4 className="font-semibold text-sm mb-2">Customer Confirmation</h4>
                            {editingCustomerConfirmation?.orderId === order.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editingCustomerConfirmation.confirmation}
                                  onChange={(e) => setEditingCustomerConfirmation({ orderId: order.id, confirmation: e.target.value })}
                                  className="w-full px-3 py-2 border rounded-md text-sm"
                                  placeholder="Add customer confirmation..."
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => updateCustomerConfirmation.mutate({ orderId: order.id, confirmation: editingCustomerConfirmation.confirmation })}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingCustomerConfirmation(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                  {order.customer_confirmation || 'No customer confirmation'}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingCustomerConfirmation({ orderId: order.id, confirmation: order.customer_confirmation || '' })}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="pt-2">
                            <h4 className="font-semibold text-sm mb-2">Courier Company</h4>
                            {editingCourierCompany?.orderId === order.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editingCourierCompany.courier}
                                  onChange={(e) => setEditingCourierCompany({ orderId: order.id, courier: e.target.value })}
                                  className="w-full px-3 py-2 border rounded-md text-sm"
                                  placeholder="Add courier company..."
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => updateCourierCompany.mutate({ orderId: order.id, courier: editingCourierCompany.courier })}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingCourierCompany(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                  {order.courier_company || 'No courier company'}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingCourierCompany({ orderId: order.id, courier: order.courier_company || '' })}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="pt-2">
                            <h4 className="font-semibold text-sm mb-2">Admin Notes</h4>
                            {editingNote?.orderId === order.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingNote.note}
                                  onChange={(e) => setEditingNote({ orderId: order.id, note: e.target.value })}
                                  className="w-full px-3 py-2 border rounded-md text-sm"
                                  rows={3}
                                  placeholder="Add admin notes..."
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => updateAdminNote.mutate({ orderId: order.id, note: editingNote.note })}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingNote(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                  {order.admin_notes || 'No admin notes'}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingNote({ orderId: order.id, note: order.admin_notes || '' })}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit Note
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="pt-4 border-t">
                            <Button
                              onClick={() => sendWhatsAppConfirmation(order)}
                              className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white"
                              size="lg"
                            >
                              <MessageCircle className="h-5 w-5 mr-2 fill-white" />
                              Send WhatsApp Confirmation
                            </Button>
                          </div>

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

              {/* Pagination */}
              {ordersPageSize !== 'all' && totalPages > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                          className={ordersPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
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
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setOrdersPage(pageNum)}
                              isActive={ordersPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
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
                                      alt={`Review ${index + 1}`}
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