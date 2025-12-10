import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatPrice } from "@/lib/currency";
import { ChevronLeft, ChevronRight, MessageCircle, Pencil, Save, Trash2, X, Loader2 } from "lucide-react";
import { useState } from "react";

interface OrderDetailCardProps {
  orderId: string | null;
  orderIds: string[];
  onClose: () => void;
  onNavigate: (orderId: string) => void;
}

// Format phone number for WhatsApp
const formatPhoneForWhatsApp = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) return '92' + cleaned.slice(1);
  if (cleaned.startsWith('92')) return cleaned;
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'shipped': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const OrderDetailCard = ({ orderId, orderIds, onClose, onNavigate }: OrderDetailCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editingConfirmation, setEditingConfirmation] = useState<string | null>(null);
  const [editingCourier, setEditingCourier] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [editingCity, setEditingCity] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState<string | null>(null);

  const currentIndex = orderId ? orderIds.indexOf(orderId) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < orderIds.length - 1;

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name, product_variations(*), sku))')
        .eq('id', orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const { data: productColors } = useQuery({
    queryKey: ['product-colors-for-order'],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_colors').select('*');
      if (error) throw error;
      return data;
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      toast({ title: "Status updated" });
    },
  });

  const updateField = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      const { error } = await supabase.from('orders').update({ [field]: value }).eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: (_, { field }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      toast({ title: `${field.replace('_', ' ')} updated` });
      setEditingNote(null);
      setEditingConfirmation(null);
      setEditingCourier(null);
      setEditingAddress(null);
      setEditingCity(null);
      setEditingPhone(null);
    },
  });

  const deleteOrderItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('order_items').delete().eq('id', itemId);
      if (error) throw error;
      // Recalculate total
      const { data: items } = await supabase.from('order_items').select('price, quantity').eq('order_id', orderId);
      const newTotal = items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
      await supabase.from('orders').update({ total_amount: newTotal }).eq('id', orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders-list'] });
      toast({ title: "Item deleted" });
    },
  });

  const sendWhatsAppConfirmation = () => {
    if (!order) return;
    const formattedPhone = formatPhoneForWhatsApp(order.phone);
    const message = generateWhatsAppMessage(order);
    window.open(`https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < orderIds.length) {
      onNavigate(orderIds[newIndex]);
    }
  };

  return (
    <Sheet open={!!orderId} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header with navigation */}
        <div className="sticky top-0 bg-background z-10 border-b">
          <SheetHeader className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleNavigate('prev')} disabled={!hasPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <SheetTitle className="text-lg">
                  Order #{order?.order_number || '...'}
                </SheetTitle>
                <Button variant="ghost" size="icon" onClick={() => handleNavigate('next')} disabled={!hasNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                {currentIndex + 1} of {orderIds.length}
              </span>
            </div>
          </SheetHeader>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : order ? (
          <div className="p-4 space-y-6">
            {/* Status & Date */}
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
              <span className="text-sm text-muted-foreground">
                {format(new Date(order.created_at), 'PPP p')}
              </span>
            </div>

            {/* Quick Status Change */}
            <div>
              <label className="text-sm font-medium mb-2 block">Change Status</label>
              <Select value={order.status} onValueChange={(status) => updateOrderStatus.mutate({ status })}>
                <SelectTrigger>
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

            {/* WhatsApp Button */}
            <Button onClick={sendWhatsAppConfirmation} className="w-full bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4 mr-2" />
              Send WhatsApp Confirmation
            </Button>

            {/* Order Items */}
            <div>
              <h3 className="font-semibold mb-3">Order Items</h3>
              <div className="space-y-2">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.products?.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {item.variation_name && (
                          <Badge variant="outline" className="text-xs">{item.variation_name}</Badge>
                        )}
                        {item.color_name && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            {item.color_code && (
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color_code }} />
                            )}
                            {item.color_name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.quantity} × {formatPrice(item.price)} = {formatPrice(item.quantity * item.price)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm('Delete this item?')) deleteOrderItem.mutate(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-accent">{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <h3 className="font-semibold mb-3">Customer Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <p className="font-medium">{order.first_name} {order.last_name}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <p className="font-medium">{order.email || 'N/A'}</p>
                </div>
                
                {/* Editable Phone */}
                <div>
                  <label className="text-xs text-muted-foreground">Phone</label>
                  {editingPhone !== null ? (
                    <div className="flex gap-2 mt-1">
                      <Input value={editingPhone} onChange={(e) => setEditingPhone(e.target.value)} className="h-8" />
                      <Button size="sm" onClick={() => updateField.mutate({ field: 'phone', value: editingPhone })}>
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingPhone(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{order.phone}</p>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingPhone(order.phone)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <h3 className="font-semibold mb-3">Shipping Address</h3>
              {editingAddress !== null ? (
                <div className="space-y-2">
                  <textarea
                    value={editingAddress}
                    onChange={(e) => setEditingAddress(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateField.mutate({ field: 'shipping_address', value: editingAddress })}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingAddress(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm">{order.shipping_address}</p>
                  <Button size="sm" variant="outline" onClick={() => setEditingAddress(order.shipping_address)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                </div>
              )}
              
              {/* City */}
              <div className="mt-3">
                <label className="text-xs text-muted-foreground">City</label>
                {editingCity !== null ? (
                  <div className="flex gap-2 mt-1">
                    <Input value={editingCity} onChange={(e) => setEditingCity(e.target.value)} className="h-8" />
                    <Button size="sm" onClick={() => updateField.mutate({ field: 'shipping_city', value: editingCity })}>
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingCity(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{order.shipping_city}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingCity(order.shipping_city)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground mt-1">
                {order.shipping_state} {order.shipping_zip}
              </p>
            </div>

            {/* Customer Notes */}
            {order.notes && (
              <div>
                <h3 className="font-semibold mb-2">Customer Notes</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{order.notes}</p>
              </div>
            )}

            {/* Customer Confirmation */}
            <div>
              <h3 className="font-semibold mb-2">Customer Confirmation</h3>
              {editingConfirmation !== null ? (
                <div className="space-y-2">
                  <Input value={editingConfirmation} onChange={(e) => setEditingConfirmation(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateField.mutate({ field: 'customer_confirmation', value: editingConfirmation })}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingConfirmation(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">{order.customer_confirmation || 'Not set'}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingConfirmation(order.customer_confirmation || '')}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Courier Company */}
            <div>
              <h3 className="font-semibold mb-2">Courier Company</h3>
              {editingCourier !== null ? (
                <div className="space-y-2">
                  <Input value={editingCourier} onChange={(e) => setEditingCourier(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateField.mutate({ field: 'courier_company', value: editingCourier })}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingCourier(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">{order.courier_company || 'Not set'}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingCourier(order.courier_company || '')}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Admin Notes */}
            <div>
              <h3 className="font-semibold mb-2">Admin Notes</h3>
              {editingNote !== null ? (
                <div className="space-y-2">
                  <textarea
                    value={editingNote}
                    onChange={(e) => setEditingNote(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateField.mutate({ field: 'admin_notes', value: editingNote })}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingNote(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {order.admin_notes || 'No notes'}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setEditingNote(order.admin_notes || '')}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit Notes
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            Order not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
