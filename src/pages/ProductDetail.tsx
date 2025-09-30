import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Minus, Plus, ShoppingCart } from "lucide-react";

const ProductDetail = () => {
  const { slug } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ['related-products', product?.category_id],
    queryFn: async () => {
      if (!product?.category_id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('category_id', product.category_id)
        .neq('id', product.id)
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!product,
  });

  const addToCart = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (existingItem) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast({
        title: "Added to cart",
        description: "Product has been added to your cart.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBuyNow = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    await addToCart.mutateAsync();
    navigate('/checkout');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading product...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Product not found</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Image Carousel */}
            <div className="space-y-4">
              {product.images && product.images.length > 0 && (
                <>
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {product.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {product.images.map((image, index) => (
                        <div key={index} className="aspect-square bg-muted rounded overflow-hidden cursor-pointer hover:opacity-80">
                          <img
                            src={image}
                            alt={`${product.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {product.categories?.name}
                </p>
                <h1 className="font-display text-4xl font-bold mb-4">
                  {product.name}
                </h1>
                <p className="text-3xl font-bold text-accent">
                  ${product.price}
                </p>
              </div>

              {product.description && (
                <div>
                  <h2 className="font-semibold text-lg mb-2">Description</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              <div>
                <h2 className="font-semibold text-lg mb-2">Quantity</h2>
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-xl font-semibold w-12 text-center">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.min(product.stock_quantity || 99, quantity + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBuyNow}
                  disabled={addToCart.isPending}
                >
                  Buy Now
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  size="lg"
                  onClick={() => addToCart.mutate()}
                  disabled={addToCart.isPending}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Cart
                </Button>
              </div>

              {product.stock_quantity !== undefined && (
                <p className="text-sm text-muted-foreground">
                  {product.stock_quantity > 0
                    ? `${product.stock_quantity} items in stock`
                    : "Out of stock"}
                </p>
              )}
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts && relatedProducts.length > 0 && (
            <div className="mt-20">
              <h2 className="font-display text-3xl font-bold mb-8 text-center">Related Products</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {relatedProducts.map((relatedProduct) => (
                  <Card key={relatedProduct.id} className="hover-lift overflow-hidden">
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {relatedProduct.images?.[0] && (
                        <img
                          src={relatedProduct.images[0]}
                          alt={relatedProduct.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-display text-base font-semibold mb-2 truncate">
                        {relatedProduct.name}
                      </h3>
                      <p className="text-lg font-bold text-accent mb-3">
                        ${relatedProduct.price}
                      </p>
                      <Button asChild className="w-full" size="sm">
                        <Link to={`/product/${relatedProduct.slug}`}>
                          View Details
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;