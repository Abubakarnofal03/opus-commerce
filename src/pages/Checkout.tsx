import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Checkout = () => {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "+92",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Auto-fill from profile if logged in
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (profile) {
              setFormData(prev => ({
                ...prev,
                firstName: profile.full_name?.split(' ')[0] || '',
                lastName: profile.full_name?.split(' ')[1] || '',
                email: profile.email || session.user.email || '',
                phone: profile.phone || '+92',
                addressLine1: profile.address || '',
                city: profile.city || '',
                state: profile.state || '',
                postalCode: profile.zip_code || '',
              }));
            }
          });
      }
    });
  }, []);

  const { data: cartItems } = useQuery({
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

  const total = cartItems?.reduce(
    (sum, item) => sum + (item.products?.price || 0) * item.quantity,
    0
  ) || 0;

  const placeOrder = useMutation({
    mutationFn: async () => {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.phone || 
          !formData.addressLine1 || !formData.city || !formData.state || !formData.postalCode) {
        throw new Error("Please fill in all required fields");
      }

      if (!cartItems || cartItems.length === 0) {
        throw new Error("Your cart is empty");
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id || null,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          shipping_address: formData.addressLine1 + (formData.addressLine2 ? `, ${formData.addressLine2}` : ''),
          shipping_city: formData.city,
          shipping_state: formData.state,
          shipping_zip: formData.postalCode,
          total_amount: total,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.products?.price || 0,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart if user is logged in
      if (user) {
        const { error: clearError } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);

        if (clearError) throw clearError;
      }

      return order.id;
    },
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast({
        title: "Order placed successfully!",
        description: "Thank you for your order. We'll process it shortly.",
      });
      navigate(`/order-confirmation/${orderId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error placing order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (!user && (!cartItems || cartItems.length === 0)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Your cart is empty</p>
            <Button onClick={() => navigate('/shop')}>
              Continue Shopping
            </Button>
          </div>
        </div>
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
            Checkout
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-display text-2xl font-bold mb-6">Shipping Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email (Optional)</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="addressLine1">Address Line 1 *</Label>
                      <Input
                        id="addressLine1"
                        name="addressLine1"
                        value={formData.addressLine1}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                      <Input
                        id="addressLine2"
                        name="addressLine2"
                        value={formData.addressLine2}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State/Province *</Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="postalCode">Postal Code *</Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-display text-2xl font-bold mb-4">Order Summary</h2>
                  
                  <div className="space-y-4 mb-6">
                    {cartItems?.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.products?.name} × {item.quantity}
                        </span>
                        <span className="font-semibold">
                          ${((item.products?.price || 0) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>FREE</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-accent">${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg mb-6">
                    <p className="text-sm font-semibold mb-1">Payment Method</p>
                    <p className="text-sm text-muted-foreground">Cash on Delivery (COD)</p>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => placeOrder.mutate()}
                    disabled={placeOrder.isPending}
                  >
                    {placeOrder.isPending ? "Processing..." : "Place Order"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
