import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Minus, Plus, ShoppingCart, X, Star } from "lucide-react";
import { addToGuestCart } from "@/lib/cartUtils";
import { formatPrice } from "@/lib/currency";
import { LoadingScreen } from "@/components/LoadingScreen";
import { calculateSalePrice } from "@/lib/saleUtils";
import { Badge } from "@/components/ui/badge";
import { trackAddToCart } from "@/lib/metaPixel";
import { SEOHead } from "@/components/SEOHead";
import { organizationSchema, productSchema, breadcrumbSchema } from "@/lib/structuredData";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const ProductDetail = () => {
  const { slug } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zoomDialogOpen, setZoomDialogOpen] = useState(false);
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

  const { data: sales } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('is_active', true)
        .gt('end_date', new Date().toISOString());
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
        addToGuestCart({
          product_id: product.id,
          quantity,
          product_name: product.name,
          product_price: product.price,
          product_image: product.images?.[0],
        });
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
      
      // Track Meta Pixel AddToCart event
      trackAddToCart(product.id, product.name, product.price);
      
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
    await addToCart.mutateAsync();
    navigate('/checkout');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <LoadingScreen message="Loading product details..." />
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

  const productSale = sales?.find(s => s.product_id === product.id);
  const globalSale = sales?.find(s => s.is_global);
  const { finalPrice, discount } = calculateSalePrice(product.price, productSale, globalSale);

  const productImages = product.images || [];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema,
      productSchema({
        name: product.name,
        description: product.description || product.name,
        price: finalPrice,
        images: productImages,
        sku: product.sku,
        stock_quantity: product.stock_quantity
      }),
      breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Shop", url: "/shop" },
        ...(product.categories ? [{ name: product.categories.name, url: `/shop?category=${product.categories.slug}` }] : []),
        { name: product.name, url: `/product/${product.slug}` }
      ])
    ]
  };

  return (
    <>
      <SEOHead
        title={product.meta_title || `${product.name} | Buy Online at The Shopping Cart`}
        description={product.meta_description || product.description || `Buy ${product.name} online in Pakistan. Premium quality products at TheShoppingCart.shop with fast delivery.`}
        keywords={product.focus_keywords || [product.name, product.categories?.name || '', 'buy online Pakistan']}
        canonicalUrl={`https://theshoppingcart.shop/product/${product.slug}`}
        ogImage={productImages[0]}
        ogType="product"
        structuredData={structuredData}
      />
      
      <div className="min-h-screen flex flex-col">
        <Navbar />
      
      <main className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Media Gallery */}
            <div className="space-y-3 md:space-y-4">
              {/* Media Carousel (Video + Images) */}
              {((product.video_url || (product.images && product.images.length > 0)) && 
                ((product.video_url ? 1 : 0) + (product.images?.length || 0)) > 1) ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {/* Video as first carousel item */}
                    {product.video_url && (
                      <CarouselItem key="video">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                          <video
                            src={product.video_url}
                            controls
                            className="w-full h-full object-cover"
                            poster={product.images?.[0]}
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      </CarouselItem>
                    )}
                    {/* Images as subsequent carousel items */}
                    {product.images?.map((image, index) => (
                      <CarouselItem key={`image-${index}`}>
                        <div 
                          className="aspect-square bg-muted rounded-lg overflow-hidden cursor-zoom-in"
                          onClick={() => {
                            setSelectedImageIndex(index);
                            setZoomDialogOpen(true);
                          }}
                        >
                          <img
                            src={image}
                            alt={`${product.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </Carousel>
              ) : (
                /* Single item display */
                <>
                  {product.video_url ? (
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      <video
                        src={product.video_url}
                        controls
                        className="w-full h-full object-cover"
                        poster={product.images?.[0]}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ) : product.images?.[0] ? (
                    <div 
                      className="aspect-square bg-muted rounded-lg overflow-hidden cursor-zoom-in"
                      onClick={() => {
                        setSelectedImageIndex(0);
                        setZoomDialogOpen(true);
                      }}
                    >
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="space-y-4 md:space-y-6">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-2">
                  {product.categories?.name}
                </p>
                <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
                  {product.name}
                </h1>
                {discount ? (
                  <div className="space-y-2">
                    <Badge className="bg-destructive text-destructive-foreground">
                      {discount}% OFF
                    </Badge>
                    <div className="flex items-center gap-3">
                      <p className="text-2xl md:text-3xl font-bold text-destructive">
                        {formatPrice(finalPrice)}
                      </p>
                      <p className="text-lg md:text-xl text-muted-foreground line-through">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-2xl md:text-3xl font-bold text-accent">
                    {formatPrice(product.price)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {product.shipping_cost === 0 ? (
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                    Free Shipping
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Shipping: {formatPrice(product.shipping_cost)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                {product.shipping_cost === 0 ? (
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                    Free Shipping
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Shipping: {formatPrice(product.shipping_cost)}
                  </p>
                )}
              </div>

              {product.description && (
                <div>
                  <h2 className="font-semibold text-base md:text-lg mb-2">Description</h2>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              {product.stock_quantity !== undefined && product.stock_quantity < 10 && (
                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  {product.stock_quantity > 0 ? (
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                      Hurry! Only {product.stock_quantity} {product.stock_quantity === 1 ? 'item' : 'items'} left in stock
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-destructive">
                      Out of stock
                    </p>
                  )}
                </div>
              )}

              <div>
                <h2 className="font-semibold text-base md:text-lg mb-2">Quantity</h2>
                <div className="flex items-center space-x-3 md:space-x-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 md:h-10 md:w-10"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  <span className="text-lg md:text-xl font-semibold w-10 md:w-12 text-center">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 md:h-10 md:w-10"
                    onClick={() => setQuantity(Math.min(product.stock_quantity || 99, quantity + 1))}
                    disabled={product.stock_quantity === 0}
                  >
                    <Plus className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3 pt-2 md:pt-4">
                <Button
                  className="w-full text-sm md:text-base"
                  size="lg"
                  onClick={handleBuyNow}
                  disabled={addToCart.isPending || product.stock_quantity === 0}
                >
                  Buy Now
                </Button>
                <Button
                  className="w-full text-sm md:text-base"
                  variant="outline"
                  size="lg"
                  onClick={() => addToCart.mutate()}
                  disabled={addToCart.isPending || product.stock_quantity === 0}
                >
                  <ShoppingCart className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  Add to Cart
                </Button>
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts && relatedProducts.length > 0 && (
            <div className="mt-12 md:mt-20">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">Related Products</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {relatedProducts.map((relatedProduct) => {
                  const relatedProductSale = sales?.find(s => s.product_id === relatedProduct.id);
                  const relatedGlobalSale = sales?.find(s => s.is_global);
                  const { finalPrice: relatedFinalPrice, discount: relatedDiscount } = calculateSalePrice(
                    relatedProduct.price,
                    relatedProductSale,
                    relatedGlobalSale
                  );
                  
                  return (
                    <Card key={relatedProduct.id} className="glass-card glass-hover overflow-hidden rounded-xl relative">
                      {relatedDiscount && (
                        <Badge className="absolute top-2 left-2 z-10 bg-destructive text-destructive-foreground text-xs">
                          {relatedDiscount}% OFF
                        </Badge>
                      )}
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        {relatedProduct.images?.[0] && (
                          <img
                            src={relatedProduct.images[0]}
                            alt={relatedProduct.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <CardContent className="p-3 md:p-4">
                        <h3 className="font-display text-sm md:text-base font-semibold mb-1 md:mb-2 truncate">
                          {relatedProduct.name}
                        </h3>
                        <div className="mb-2 md:mb-3">
                          {relatedDiscount ? (
                            <div className="flex items-center gap-2">
                              <p className="text-base md:text-lg font-bold text-destructive">
                                {formatPrice(relatedFinalPrice)}
                              </p>
                              <p className="text-xs text-muted-foreground line-through">
                                {formatPrice(relatedProduct.price)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-base md:text-lg font-bold text-accent">
                              {formatPrice(relatedProduct.price)}
                            </p>
                          )}
                        </div>
                        <Button asChild className="w-full text-xs md:text-sm" size="sm">
                          <Link to={`/product/${relatedProduct.slug}`}>
                            View Details
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Image Zoom Dialog */}
      <Dialog open={zoomDialogOpen} onOpenChange={setZoomDialogOpen}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-50 rounded-full bg-background/80 hover:bg-background"
            onClick={() => setZoomDialogOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          {product.images && product.images[selectedImageIndex] && (
            <img
              src={product.images[selectedImageIndex]}
              alt={`${product.name} ${selectedImageIndex + 1}`}
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
    </>
  );
};

export default ProductDetail;
