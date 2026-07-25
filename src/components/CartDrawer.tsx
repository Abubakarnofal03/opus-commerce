import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight, ShieldCheck, Truck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getGuestCart, updateGuestCartQuantity, removeFromGuestCart, GuestCartItem } from "@/lib/cartUtils";
import { formatPrice } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";

interface CartDrawerProps {
  children?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CartDrawer = ({ children, isOpen, onOpenChange }: CartDrawerProps) => {
  const [open, setOpen] = useState(false);
  const [cartItems, setCartItems] = useState<GuestCartItem[]>([]);
  const [dbItems, setDbItems] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Threshold for free shipping in PKR (10,000 PKR ~ $35 USD)
  const FREE_SHIPPING_THRESHOLD = 10000;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadCartData = async () => {
    if (user) {
      setLoading(true);
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          products (*),
          product_variations (*),
          color_options (*)
        `)
        .eq('user_id', user.id);

      if (!error && data) {
        setDbItems(data);
      }
      setLoading(false);
    } else {
      setCartItems(getGuestCart());
    }
  };

  useEffect(() => {
    loadCartData();

    const handleCartUpdate = () => {
      loadCartData();
    };

    const handleCurrencyUpdate = () => {
      setCartItems([...getGuestCart()]);
    };

    window.addEventListener('opus-cart-updated', handleCartUpdate);
    window.addEventListener('opus-currency-changed', handleCurrencyUpdate);

    return () => {
      window.removeEventListener('opus-cart-updated', handleCartUpdate);
      window.removeEventListener('opus-currency-changed', handleCurrencyUpdate);
    };
  }, [user]);

  const handleSheetOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (onOpenChange) onOpenChange(newOpen);
    if (newOpen) loadCartData();
  };

  const isControlled = typeof isOpen !== 'undefined';
  const effectiveOpen = isControlled ? isOpen : open;

  // Calculate totals
  const totalAmount = user
    ? dbItems.reduce((acc, item) => {
        const itemPrice = item.color_options?.price || item.product_variations?.price || item.products?.price || 0;
        return acc + itemPrice * item.quantity;
      }, 0)
    : cartItems.reduce((acc, item) => {
        const itemPrice = item.color_price || item.variation_price || item.product_price || 0;
        return acc + itemPrice * item.quantity;
      }, 0);

  const itemCount = user
    ? dbItems.reduce((acc, item) => acc + item.quantity, 0)
    : cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const shippingProgress = Math.min(100, Math.round((totalAmount / FREE_SHIPPING_THRESHOLD) * 100));
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - totalAmount);

  const handleUpdateQuantity = async (item: any, newQty: number) => {
    if (user) {
      if (newQty <= 0) {
        await supabase.from('cart_items').delete().eq('id', item.id);
      } else {
        await supabase.from('cart_items').update({ quantity: newQty }).eq('id', item.id);
      }
      loadCartData();
    } else {
      updateGuestCartQuantity(item.product_id, newQty, item.variation_id, item.color_id);
    }
  };

  const handleRemove = async (item: any) => {
    if (user) {
      await supabase.from('cart_items').delete().eq('id', item.id);
      loadCartData();
    } else {
      removeFromGuestCart(item.product_id, item.variation_id, item.color_id);
    }
  };

  const handleCheckout = () => {
    handleSheetOpenChange(false);
    navigate('/checkout');
  };

  const handleViewCart = () => {
    handleSheetOpenChange(false);
    navigate('/cart');
  };

  return (
    <Sheet open={effectiveOpen} onOpenChange={handleSheetOpenChange}>
      {children && <SheetTrigger asChild>{children}</SheetTrigger>}
      <SheetContent className="w-full sm:max-w-md flex flex-col justify-between p-0 bg-background border-l border-border">
        {/* Header */}
        <div className="p-6 border-b border-border bg-background">
          <SheetHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <SheetTitle className="font-display text-xl tracking-tight">Shopping Bag</SheetTitle>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
          </SheetHeader>

          {/* Free Shipping Progress Indicator */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/60">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground mb-1.5">
              <Truck className="w-3.5 h-3.5 text-accent" />
              {remainingForFreeShipping === 0 ? (
                <span className="text-accent font-semibold">🎉 You unlocked Complimentary Express Delivery!</span>
              ) : (
                <span>Add {formatPrice(remainingForFreeShipping)} more for Complimentary Express Shipping</span>
              )}
            </div>
            <Progress value={shippingProgress} className="h-1.5 bg-muted-foreground/20" />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {itemCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-lg font-medium text-foreground">Your bag is empty</h3>
                <p className="text-sm text-muted-foreground">Explore our curated luxury collections to add items.</p>
              </div>
              <Button
                onClick={() => {
                  handleSheetOpenChange(false);
                  navigate('/shop');
                }}
                className="mt-2 rounded-full px-6 text-xs uppercase tracking-widest font-medium"
              >
                Explore Shop
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {user
                ? dbItems.map((item) => {
                    const price = item.color_options?.price || item.product_variations?.price || item.products?.price || 0;
                    const image = item.products?.images?.[0] || item.products?.image_url;
                    return (
                      <div key={item.id} className="py-4 flex gap-4 first:pt-0 last:pb-0">
                        <div className="w-20 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                          {image ? (
                            <img src={image} alt={item.products?.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No img</div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-sm text-foreground line-clamp-1">{item.products?.name}</h4>
                              <button
                                onClick={() => handleRemove(item)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {(item.product_variations || item.color_options) && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {[item.product_variations?.name, item.color_options?.name].filter(Boolean).join(' / ')}
                              </p>
                            )}
                            <p className="text-xs font-semibold text-foreground mt-1">{formatPrice(price)}</p>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-border rounded-full overflow-hidden bg-background">
                              <button
                                onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                                className="px-2.5 py-1 text-xs hover:bg-muted transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-3 text-xs font-medium">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                                className="px-2.5 py-1 text-xs hover:bg-muted transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-xs font-medium text-foreground">{formatPrice(price * item.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                : cartItems.map((item, idx) => {
                    const price = item.color_price || item.variation_price || item.product_price || 0;
                    return (
                      <div key={idx} className="py-4 flex gap-4 first:pt-0 last:pb-0">
                        <div className="w-20 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                          {item.product_image ? (
                            <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No img</div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-sm text-foreground line-clamp-1">{item.product_name}</h4>
                              <button
                                onClick={() => handleRemove(item)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {(item.variation_name || item.color_name) && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {[item.variation_name, item.color_name].filter(Boolean).join(' / ')}
                              </p>
                            )}
                            <p className="text-xs font-semibold text-foreground mt-1">{formatPrice(price)}</p>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-border rounded-full overflow-hidden bg-background">
                              <button
                                onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                                className="px-2 py-1 text-xs hover:bg-muted transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-3 text-xs font-medium">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                                className="px-2 py-1 text-xs hover:bg-muted transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-xs font-medium text-foreground">{formatPrice(price * item.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
            </div>
          )}
        </div>

        {/* Footer Summary & Actions */}
        {itemCount > 0 && (
          <div className="p-6 border-t border-border bg-background space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{formatPrice(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Estimated Taxes & Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-foreground pt-2 border-t border-border/60">
                <span>Total</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleCheckout}
                className="w-full rounded-full py-6 text-sm font-medium tracking-wide flex items-center justify-center gap-2 group"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                onClick={handleViewCart}
                className="w-full rounded-full py-5 text-xs tracking-wider uppercase font-medium border-border"
              >
                View Full Bag
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>Guaranteed Encrypted Luxury Checkout</span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
