import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { formatPrice } from "@/lib/currency";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Pencil,
  Trash2,
  MessageCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface OrderDetailCardProps {
  orderId: string | null;
  orderIds: string[];
  onClose: () => void;
  onStatusChange: (orderId: string, status: string) => void;
  onItemUpdate: (params: {
    itemId: string;
    quantity: number;
    price: number;
    variationId: string | null;
    colorId: string | null;
    orderId: string;
  }) => void;
  onItemDelete: (params: { itemId: string; orderId: string }) => void;
  onPhoneUpdate: (params: { orderId: string; phone: string }) => void;
  onAddressUpdate: (params: { orderId: string; address: string }) => void;
  onCityUpdate: (params: { orderId: string; city: string }) => void;
  onCourierUpdate: (params: { orderId: string; courier: string }) => void;
  onAdminNoteUpdate: (params: { orderId: string; note: string }) => void;
  onCustomerConfirmationUpdate: (params: { orderId: string; confirmation: string }) => void;
  onWhatsAppClick: (order: any) => void;
  productVariations?: any[];
  productColors?: any[];
  onNavigate?: (orderId: string) => void;
}

export const OrderDetailCard = ({
  orderId,
  orderIds,
  onClose,
  onStatusChange,
  onItemUpdate,
  onItemDelete,
  onPhoneUpdate,
  onAddressUpdate,
  onCityUpdate,
  onCourierUpdate,
  onAdminNoteUpdate,
  onCustomerConfirmationUpdate,
  onWhatsAppClick,
  productVariations = [],
  productColors = [],
  onNavigate,
}: OrderDetailCardProps) => {
  const [editingItem, setEditingItem] = useState<{
    itemId: string;
    quantity: number;
    price: number;
    variationId: string | null;
    colorId: string | null;
  } | null>(null);
  const [editingPhone, setEditingPhone] = useState<{ phone: string } | null>(null);
  const [editingAddress, setEditingAddress] = useState<{ address: string } | null>(null);
  const [editingCity, setEditingCity] = useState<{ city: string } | null>(null);
  const [editingCourier, setEditingCourier] = useState<{ courier: string } | null>(null);
  const [editingNote, setEditingNote] = useState<{ note: string } | null>(null);
  const [editingConfirmation, setEditingConfirmation] = useState<{ confirmation: string } | null>(null);

  // Swipe gesture state
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;
  // Minimum horizontal/vertical ratio to consider it a horizontal swipe
  const minHorizontalRatio = 1.5;

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*, product_variations(*)))')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Reset editing states when order changes
  useEffect(() => {
    if (order) {
      setEditingItem(null);
      setEditingPhone(null);
      setEditingAddress(null);
      setEditingCity(null);
      setEditingCourier(null);
      setEditingNote(null);
      setEditingConfirmation(null);
    }
  }, [order?.id]);

  const currentIndex = orderId ? orderIds.indexOf(orderId) : -1;
  const lastValidIndexRef = useRef<number>(0);

  // Keep track of the last valid index
  useEffect(() => {
    if (currentIndex !== -1) {
      lastValidIndexRef.current = currentIndex;
    }
  }, [currentIndex]);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < orderIds.length - 1;

  // Handle case where current order is no longer in filtered list (e.g., status changed)
  useEffect(() => {
    if (orderId && !orderIds.includes(orderId)) {
      // Current order is no longer in the filtered list
      if (orderIds.length > 0) {
        // Navigate to the next available order near the same position
        if (onNavigate) {
          // Use the last valid index, clamped to the new list bounds
          const targetIndex = Math.min(lastValidIndexRef.current, orderIds.length - 1);
          onNavigate(orderIds[targetIndex]);
        }
      } else {
        // No orders left, close the detail card
        onClose();
      }
    }
  }, [orderId, orderIds, onNavigate, onClose]);

  const handlePrevious = () => {
    if (hasPrevious && onNavigate && currentIndex > 0) {
      const prevOrderId = orderIds[currentIndex - 1];
      onNavigate(prevOrderId);
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigate && currentIndex >= 0 && currentIndex < orderIds.length - 1) {
      const nextOrderId = orderIds[currentIndex + 1];
      onNavigate(nextOrderId);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!orderId || !onNavigate) return;
      if (e.key === 'ArrowLeft' && hasPrevious) {
        handlePrevious();
      } else if (e.key === 'ArrowRight' && hasNext) {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orderId, hasPrevious, hasNext, onNavigate]);

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    // Don't trigger swipe if touching interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('[role="button"]') ||
      target.closest('[contenteditable]') ||
      target.closest('[data-radix-portal]') ||
      target.closest('[role="dialog"]')
    ) {
      return;
    }

    const touch = e.touches[0];
    touchEndRef.current = null;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    const deltaX = currentX - touchStartRef.current.x;
    const deltaY = Math.abs(currentY - touchStartRef.current.y);

    // Only prevent scroll if swipe is primarily horizontal
    const isHorizontal = Math.abs(deltaX) > deltaY * minHorizontalRatio;

    if (isHorizontal && Math.abs(deltaX) > 10) {
      // Prevent scrolling when swiping horizontally
      e.preventDefault();
      e.stopPropagation();
      // Limit the offset for visual feedback (max 60px)
      setSwipeOffset(Math.max(-60, Math.min(60, deltaX * 0.4)));
    }

    // Update touchEnd for swipe detection
    touchEndRef.current = { x: currentX, y: currentY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !touchEndRef.current) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      setSwipeOffset(0);
      return;
    }

    const deltaX = touchStartRef.current.x - touchEndRef.current.x;
    const deltaY = Math.abs(touchStartRef.current.y - touchEndRef.current.y);

    // Only trigger swipe if it's primarily horizontal
    const isHorizontal = Math.abs(deltaX) > deltaY * minHorizontalRatio;

    if (!isHorizontal) {
      // Reset if swipe wasn't horizontal enough (likely scrolling)
      touchStartRef.current = null;
      touchEndRef.current = null;
      setSwipeOffset(0);
      return;
    }

    const isLeftSwipe = deltaX > minSwipeDistance;
    const isRightSwipe = deltaX < -minSwipeDistance;

    if (isLeftSwipe && hasNext && onNavigate) {
      e.preventDefault();
      handleNext();
    }
    if (isRightSwipe && hasPrevious && onNavigate) {
      e.preventDefault();
      handlePrevious();
    }

    // Reset with animation
    setSwipeOffset(0);
    setTimeout(() => {
      touchStartRef.current = null;
      touchEndRef.current = null;
    }, 200);
  };

  if (!orderId) return null;

  return (
    <Sheet open={!!orderId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
      >
        <div
          className="h-full w-full"
          style={{
            transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
            transition: swipeOffset !== 0 ? 'none' : 'transform 0.2s ease-out',
            touchAction: 'pan-y pinch-zoom',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading order details...</div>
            </div>
          ) : order ? (
            <>
              <SheetHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-xl sm:text-2xl">
                    Order #{order.order_number}
                  </SheetTitle>
                  <div className="flex items-center gap-2">
                    {/* Navigation buttons */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePrevious}
                        disabled={!hasPrevious || currentIndex === -1}
                        className="h-8 w-8"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground px-2">
                        {currentIndex >= 0 ? `${currentIndex + 1} / ${orderIds.length}` : `- / ${orderIds.length}`}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNext}
                        disabled={!hasNext || currentIndex === -1}
                        className="h-8 w-8"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Select
                    value={order.status}
                    onValueChange={(status) => onStatusChange(order.id, status)}
                  >
                    <SelectTrigger className="w-[150px]">
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
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(order.created_at), 'PPP')}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Order Items */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Order Items</h3>
                  <div className="space-y-3">
                    {order.order_items?.map((item: any) => {
                      const isEditing = editingItem?.itemId === item.id;
                      const itemVariations = productVariations.filter(v => v.product_id === item.product_id);
                      const itemColors = productColors.filter(c => c.product_id === item.product_id);

                      return (
                        <div key={item.id} className="border rounded-lg p-3">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="font-medium">{item.products?.name}</div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground">Quantity</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={editingItem.quantity}
                                    onChange={(e) => setEditingItem({
                                      ...editingItem,
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
                                    value={editingItem.price}
                                    onChange={(e) => setEditingItem({
                                      ...editingItem,
                                      price: parseFloat(e.target.value) || 0
                                    })}
                                    className="h-8"
                                  />
                                </div>
                                {itemVariations.length > 0 && (
                                  <div className="col-span-2">
                                    <label className="text-xs text-muted-foreground">Variation</label>
                                    <Select
                                      value={editingItem.variationId || "none"}
                                      onValueChange={(value) => setEditingItem({
                                        ...editingItem,
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
                                  <div className="col-span-2">
                                    <label className="text-xs text-muted-foreground">Color</label>
                                    <Select
                                      value={editingItem.colorId || "none"}
                                      onValueChange={(value) => setEditingItem({
                                        ...editingItem,
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
                                  onClick={() => {
                                    onItemUpdate({
                                      itemId: editingItem.itemId,
                                      quantity: editingItem.quantity,
                                      price: editingItem.price,
                                      variationId: editingItem.variationId,
                                      colorId: editingItem.colorId,
                                      orderId: order.id
                                    });
                                    setEditingItem(null);
                                  }}
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingItem(null)}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
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
                                <span className="text-sm text-muted-foreground">
                                  Qty: {item.quantity} × {formatPrice(item.price)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{formatPrice(item.price * item.quantity)}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingItem({
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
                                      onItemDelete({ itemId: item.id, orderId: order.id });
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
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-accent">{formatPrice(Number(order.total_amount))}</span>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-4">Customer Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Name:</span>
                      <p className="font-medium">{order.first_name} {order.last_name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <p className="font-medium">{order.email || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Phone:</span>
                      {editingPhone ? (
                        <div className="space-y-2 mt-1">
                          <Input
                            value={editingPhone.phone}
                            onChange={(e) => setEditingPhone({ phone: e.target.value })}
                            className="h-8"
                            placeholder="Enter phone number..."
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                onPhoneUpdate({ orderId: order.id, phone: editingPhone.phone });
                                setEditingPhone(null);
                              }}
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
                            onClick={() => setEditingPhone({ phone: order.phone || '' })}
                            className="h-6 w-6 p-0"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">Shipping Address</h3>
                  {editingAddress ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingAddress.address}
                        onChange={(e) => setEditingAddress({ address: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        rows={3}
                        placeholder="Enter shipping address..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            onAddressUpdate({ orderId: order.id, address: editingAddress.address });
                            setEditingAddress(null);
                          }}
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
                        onClick={() => setEditingAddress({ address: order.shipping_address || '' })}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit Address
                      </Button>
                    </div>
                  )}
                </div>

                {/* City */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">City</h3>
                  {editingCity ? (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={editingCity.city}
                        onChange={(e) => setEditingCity({ city: e.target.value })}
                        className="h-8"
                        placeholder="Enter city..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            onCityUpdate({ orderId: order.id, city: editingCity.city });
                            setEditingCity(null);
                          }}
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
                      <p className="text-sm">{order.shipping_city || 'N/A'}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingCity({ city: order.shipping_city || '' })}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit City
                      </Button>
                    </div>
                  )}
                </div>

                {/* Customer Notes */}
                {order.notes && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-lg mb-2">Customer Notes</h3>
                    <p className="text-sm text-muted-foreground">{order.notes}</p>
                  </div>
                )}

                {/* Customer Confirmation */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">Customer Confirmation</h3>
                  {editingConfirmation ? (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={editingConfirmation.confirmation}
                        onChange={(e) => setEditingConfirmation({ confirmation: e.target.value })}
                        className="h-8"
                        placeholder="Add customer confirmation..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            onCustomerConfirmationUpdate({ orderId: order.id, confirmation: editingConfirmation.confirmation });
                            setEditingConfirmation(null);
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingConfirmation(null)}
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
                        onClick={() => setEditingConfirmation({ confirmation: order.customer_confirmation || '' })}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>

                {/* Courier Company */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">Courier Company</h3>
                  {editingCourier ? (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={editingCourier.courier}
                        onChange={(e) => setEditingCourier({ courier: e.target.value })}
                        className="h-8"
                        placeholder="Add courier company..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            onCourierUpdate({ orderId: order.id, courier: editingCourier.courier });
                            setEditingCourier(null);
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCourier(null)}
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
                        onClick={() => setEditingCourier({ courier: order.courier_company || '' })}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>

                {/* Admin Notes */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">Admin Notes</h3>
                  {editingNote ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingNote.note}
                        onChange={(e) => setEditingNote({ note: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        rows={3}
                        placeholder="Add admin notes..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            onAdminNoteUpdate({ orderId: order.id, note: editingNote.note });
                            setEditingNote(null);
                          }}
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
                        onClick={() => setEditingNote({ note: order.admin_notes || '' })}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit Note
                      </Button>
                    </div>
                  )}
                </div>

                {/* WhatsApp Button */}
                <div className="border-t pt-4">
                  <Button
                    onClick={() => onWhatsAppClick(order)}
                    className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white"
                    size="lg"
                  >
                    <MessageCircle className="h-5 w-5 mr-2 fill-white" />
                    Send WhatsApp Confirmation
                  </Button>
                </div>

                {/* Order ID */}
                <div className="border-t pt-4 text-sm">
                  <span className="text-muted-foreground">Order ID:</span>
                  <p className="font-mono text-xs break-all">{order.id}</p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};

