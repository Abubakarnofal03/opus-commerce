import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Minus } from "lucide-react";
import { getGuestCart, updateGuestCartQuantity, removeFromGuestCart, GuestCartItem } from "@/lib/cartUtils";
import { formatPrice } from "@/lib/currency";

const Cart = () => {
  const [user, setUser] = useState<any>(null);
  const [guestCart, setGuestCart] = useState<GuestCartItem[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        setGuestCart(getGuestCart());
      }
    });
  }, []);

  const { data: cartItems, isLoading } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, products(*)')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast({ title: "Item removed from cart" });
    },
  });

  const handleGuestQuantityUpdate = (productId: string, quantity: number) => {
    updateGuestCartQuantity(productId, quantity);
    setGuestCart(getGuestCart());
  };

  const handleGuestRemove = (productId: string) => {
    removeFromGuestCart(productId);
    setGuestCart(getGuestCart());
    toast({ title: "Item removed from cart" });
  };

  const items = user ? cartItems : guestCart;
  const total = user 
    ? cartItems?.reduce((sum, item) => sum + (item.products?.price || 0) * item.quantity, 0) || 0
    : guestCart.reduce((sum, item) => sum + item.product_price * item.quantity, 0);

  if (isLoading && user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading cart...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-center gold-accent pb-6 md:pb-8">
            Shopping Cart
          </h1>

          {!items || items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Your cart is empty</p>
              <Button onClick={() => navigate('/shop')}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              <div className="lg:col-span-2 space-y-4">
                {items.map((item: any) => {
                  const isGuest = !user;
                  const productData = isGuest ? {
                    name: item.product_name,
                    price: item.product_price,
                    image: item.product_image,
                  } : {
                    name: item.products?.name,
                    price: item.products?.price,
                    image: item.products?.images?.[0],
                  };

                  return (
                    <Card key={isGuest ? item.product_id : item.id}>
                      <CardContent className="p-4 md:p-6">
                        <div className="flex gap-3 md:gap-4">
                          {productData.image && (
                            <div className="w-20 h-20 md:w-24 md:h-24 bg-muted rounded overflow-hidden flex-shrink-0">
                              <img
                                src={productData.image}
                                alt={productData.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display text-base md:text-lg font-semibold mb-1 truncate">
                              {productData.name}
                            </h3>
                            <p className="text-accent font-bold mb-2">
                              {formatPrice(productData.price)}
                            </p>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  if (isGuest) {
                                    handleGuestQuantityUpdate(item.product_id, Math.max(1, item.quantity - 1));
                                  } else {
                                    updateQuantity.mutate({ id: item.id, quantity: Math.max(1, item.quantity - 1) });
                                  }
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-10 text-center font-semibold text-sm">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  if (isGuest) {
                                    handleGuestQuantityUpdate(item.product_id, item.quantity + 1);
                                  } else {
                                    updateQuantity.mutate({ id: item.id, quantity: item.quantity + 1 });
                                  }
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-col items-end justify-between">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                if (isGuest) {
                                  handleGuestRemove(item.product_id);
                                } else {
                                  removeItem.mutate(item.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <p className="font-bold text-sm md:text-base">
                              {formatPrice(productData.price * item.quantity)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div>
                <Card>
                  <CardContent className="p-4 md:p-6">
                    <h2 className="font-display text-xl md:text-2xl font-bold mb-4">Order Summary</h2>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Subtotal</span>
                        <span>{formatPrice(total)}</span>
                      </div>
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Shipping</span>
                        <span>FREE</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-bold text-base md:text-lg">
                          <span>Total</span>
                          <span className="text-accent">{formatPrice(total)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => navigate('/checkout')}
                    >
                      Proceed to Checkout
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Cart;
