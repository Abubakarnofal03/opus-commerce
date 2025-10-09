import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Minus,
  Plus,
  ShoppingCart,
  X,
  Star,
  ShieldCheck,
  Truck,
  Banknote,
  Package,
  ChevronRight,
  RotateCcw,
  CreditCard,
  Smartphone,
  Landmark,
} from "lucide-react";
import { addToGuestCart } from "@/lib/cartUtils";
import { formatPrice } from "@/lib/currency";
import { LoadingScreen } from "@/components/LoadingScreen";
import { calculateSalePrice } from "@/lib/saleUtils";
import { Badge } from "@/components/ui/badge";
import { trackAddToCart as trackMetaAddToCart } from "@/lib/metaPixel";
import { trackViewContent, trackAddToCart as trackTikTokAddToCart } from "@/lib/tiktokPixel";
import { SEOHead } from "@/components/SEOHead";
import { organizationSchema, productSchema, breadcrumbSchema } from "@/lib/structuredData";
import ProductReviews from "@/components/ProductReviews";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

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
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, categories(*)").eq("slug", slug).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("is_active", true)
        .gt("end_date", new Date().toISOString());
      if (error) throw error;
      return data;
    },
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ["related-products", product?.category_id],
    queryFn: async () => {
      if (!product?.category_id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(*)")
        .eq("category_id", product.category_id)
        .neq("id", product.id)
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
        .from("cart_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (existingItem) {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + quantity })
          .eq("id", existingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cart_items").insert({
          user_id: user.id,
          product_id: product.id,
          quantity,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      // Calculate sale price for tracking
      const productSale = sales?.find((s) => s.product_id === product.id);
      const globalSale = sales?.find((s) => s.is_global);
      const { finalPrice } = calculateSalePrice(product.price, productSale, globalSale);

      // Track Meta Pixel AddToCart event
      trackMetaAddToCart(product.id, product.name, product.price);

      // Track TikTok Pixel AddToCart event
      trackTikTokAddToCart(product.id, product.name, finalPrice);

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
    navigate("/checkout");
  };

  // Calculate sale price (needed for tracking)
  const productSale = sales?.find((s) => s.product_id === product?.id);
  const globalSale = sales?.find((s) => s.is_global);
  const { finalPrice, discount } = calculateSalePrice(product?.price || 0, productSale, globalSale);

  // Track TikTok Pixel ViewContent event when product loads
  useEffect(() => {
    if (product) {
      trackViewContent(product.id, product.name, finalPrice);
    }
  }, [product, finalPrice]);

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
        stock_quantity: product.stock_quantity,
      }),
      breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Shop", url: "/shop" },
        ...(product.categories
          ? [{ name: product.categories.name, url: `/shop?category=${product.categories.slug}` }]
          : []),
        { name: product.name, url: `/product/${product.slug}` },
      ]),
    ],
  };

  return (
    <>
      <SEOHead
        title={product.meta_title || `${product.name} | Buy Online at The Shopping Cart`}
        description={
          product.meta_description ||
          product.description ||
          `Buy ${product.name} online in Pakistan. Premium quality products at TheShoppingCart.shop with fast delivery.`
        }
        keywords={product.focus_keywords || [product.name, product.categories?.name || "", "buy online Pakistan"]}
        canonicalUrl={`https://theshoppingcart.shop/product/${product.slug}`}
        ogImage={productImages[0]}
        ogType="product"
        structuredData={structuredData}
      />

      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 py-6 md:py-10">
          <div className="container mx-auto px-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm mb-6 flex-wrap">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Link to="/shop" className="text-muted-foreground hover:text-primary transition-colors">
                Shop
              </Link>
              {product.categories && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Link
                    to={`/shop?category=${product.categories.slug}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {product.categories.name}
                  </Link>
                </>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
              {/* Media Gallery */}
              <div className="space-y-4">
                {(product.video_url || (product.images && product.images.length > 0)) &&
                (product.video_url ? 1 : 0) + (product.images?.length || 0) > 1 ? (
                  <Carousel className="w-full">
                    <CarouselContent>
                      {product.video_url && (
                        <CarouselItem key="video">
                          <div className="aspect-square bg-muted rounded-xl overflow-hidden border-2 border-border/50">
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
                      {product.images?.map((image, index) => (
                        <CarouselItem key={`image-${index}`}>
                          <div
                            className="aspect-square bg-muted rounded-xl overflow-hidden cursor-zoom-in border-2 border-border/50 hover:border-primary/50 transition-colors"
                            onClick={() => {
                              setSelectedImageIndex(index);
                              setZoomDialogOpen(true);
                            }}
                          >
                            <img
                              src={image}
                              alt={`${product.name} ${index + 1}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-4" />
                    <CarouselNext className="right-4" />
                  </Carousel>
                ) : (
                  <>
                    {product.video_url ? (
                      <div className="aspect-square bg-muted rounded-xl overflow-hidden border-2 border-border/50">
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
                        className="aspect-square bg-muted rounded-xl overflow-hidden cursor-zoom-in border-2 border-border/50 hover:border-primary/50 transition-colors"
                        onClick={() => {
                          setSelectedImageIndex(0);
                          setZoomDialogOpen(true);
                        }}
                      >
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : null}
                  </>
                )}

                {/* Trust Banner */}
                {/* <Card className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-center gap-8 flex-wrap">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Secure Checkout</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">7-Day Returns</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Authentic Products</span>
                      </div>
                    </div>
                  </CardContent>
                </Card> */}
              </div>

              {/* Product Info */}
              <div className="space-y-6">
                <div>
                  {product.categories && (
                    <Link
                      to={`/shop?category=${product.categories.slug}`}
                      className="inline-block text-sm font-medium text-primary hover:underline mb-2"
                    >
                      {product.categories.name}
                    </Link>
                  )}
                  <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                    {product.name}
                  </h1>
                  {product.sku && <p className="text-sm text-muted-foreground mb-4">SKU: {product.sku}</p>}

                  {/* Price Section */}
                  <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-6 border-2 border-primary/20 mb-6">
                    {discount ? (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="destructive" className="text-base px-3 py-1">
                            {discount}% OFF
                          </Badge>
                          <span className="text-sm text-muted-foreground">Limited Time Offer</span>
                        </div>
                        <div className="flex items-baseline gap-4 mb-2">
                          <p className="text-4xl md:text-5xl font-bold text-primary">{formatPrice(finalPrice)}</p>
                          <p className="text-2xl text-muted-foreground line-through">{formatPrice(product.price)}</p>
                        </div>
                        <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                          You Save: {formatPrice(product.price - finalPrice)}
                        </p>
                      </>
                    ) : (
                      <p className="text-4xl md:text-5xl font-bold text-primary">{formatPrice(product.price)}</p>
                    )}
                  </div>
                </div>

                {/* Stock Alert */}
                {product.stock_quantity !== undefined && product.stock_quantity < 10 && (
                  <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-2 border-orange-500/50 rounded-lg p-4 animate-pulse">
                    {product.stock_quantity > 0 ? (
                      <p className="text-base font-bold text-orange-600 dark:text-orange-400 text-center">
                        ⚡ Hurry! Only {product.stock_quantity} {product.stock_quantity === 1 ? "item" : "items"} left
                        in stock
                      </p>
                    ) : (
                      <p className="text-base font-bold text-destructive text-center">❌ Out of stock</p>
                    )}
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="bg-muted/50 rounded-xl p-6">
                  <h2 className="font-semibold text-lg mb-3">Quantity</h2>
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full border-2"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    <span className="text-2xl font-bold w-16 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full border-2"
                      onClick={() => setQuantity(Math.min(product.stock_quantity || 99, quantity + 1))}
                      disabled={product.stock_quantity === 0}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    className="w-full text-lg h-14 font-bold shadow-lg hover:shadow-xl transition-all"
                    size="lg"
                    onClick={handleBuyNow}
                    disabled={addToCart.isPending || product.stock_quantity === 0}
                  >
                    <ShoppingCart className="mr-2 h-6 w-6" />
                    Buy Now
                  </Button>
                  <Button
                    className="w-full text-lg h-14 font-bold"
                    variant="outline"
                    size="lg"
                    onClick={() => addToCart.mutate()}
                    disabled={addToCart.isPending || product.stock_quantity === 0}
                  >
                    Add to Cart
                  </Button>
                </div>

                {/* Payment Methods */}
                <Card className="border-2">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-3 text-center">We Accept</p>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                        <Banknote className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium">Cash on Delivery</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium">Card</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                        <Smartphone className="h-5 w-5 text-purple-600" />
                        <span className="text-sm font-medium">Mobile Wallet</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                        <Landmark className="h-5 w-5 text-orange-600" />
                        <span className="text-sm font-medium">Bank Transfer</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Trust Badges Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-2 border-primary/30 hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">7-Day Easy</p>
                        <p className="text-xs text-muted-foreground">Return Policy</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-primary/30 hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Truck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Free Delivery</p>
                        <p className="text-xs text-muted-foreground">All Over Pakistan</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-primary/30 hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">100% Authentic</p>
                        <p className="text-xs text-muted-foreground">Original Products</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-primary/30 hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Secure Payment</p>
                        <p className="text-xs text-muted-foreground">100% Protected</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Product Details Tabs */}
            <div className="mt-16">
              <Tabs defaultValue="description" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                  <TabsTrigger
                    value="description"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                  >
                    Description
                  </TabsTrigger>
                  <TabsTrigger
                    value="reviews"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                  >
                    Customer Reviews
                  </TabsTrigger>
                  <TabsTrigger
                    value="shipping"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                  >
                    Shipping & Returns
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="description" className="py-8">
                  {product.description ? (
                    <div className="prose prose-lg max-w-none dark:prose-invert">
                      <p className="text-base leading-relaxed whitespace-pre-wrap">{product.description}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No description available.</p>
                  )}
                </TabsContent>
                <TabsContent value="reviews" className="py-8">
                  <ProductReviews productId={product.id} />
                </TabsContent>
                <TabsContent value="shipping" className="py-8">
                  <div className="space-y-6 max-w-3xl">
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                          <Truck className="h-6 w-6 text-primary" />
                          Shipping Information
                        </h3>
                        <Separator className="mb-4" />
                        <ul className="space-y-3 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-primary font-bold">✓</span>
                            <span>Free shipping on all orders across Pakistan</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary font-bold">✓</span>
                            <span>Delivery within 3-5 business days</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary font-bold">✓</span>
                            <span>Same-day dispatch for orders placed before 2 PM</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary font-bold">✓</span>
                            <span>Track your order in real-time</span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                          <RotateCcw className="h-6 w-6 text-primary" />
                          Return Policy
                        </h3>
                        <Separator className="mb-4" />
                        <ul className="space-y-3 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-primary font-bold">✓</span>
                            <span>7-day easy return policy on all products</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary font-bold">✓</span>
                            <span>Full refund if product is damaged or defective</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary font-bold">✓</span>
                            <span>Product must be unused and in original packaging</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary font-bold">✓</span>
                            <span>Free return pickup from your doorstep</span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                          <ShieldCheck className="h-6 w-6 text-primary" />
                          Our Guarantee
                        </h3>
                        <Separator className="mb-4" />
                        <p className="text-sm leading-relaxed">
                          We stand behind the quality of our products. Every item is carefully inspected before
                          dispatch. If you're not completely satisfied with your purchase, contact our customer support
                          team within 7 days and we'll make it right.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Related Products */}
            {relatedProducts && relatedProducts.length > 0 && (
              <div className="mt-20">
                <div className="text-center mb-10">
                  <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">You May Also Like</h2>
                  <p className="text-muted-foreground">Handpicked products just for you</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {relatedProducts.map((relatedProduct) => {
                    const relatedProductSale = sales?.find((s) => s.product_id === relatedProduct.id);
                    const relatedGlobalSale = sales?.find((s) => s.is_global);
                    const { finalPrice: relatedFinalPrice, discount: relatedDiscount } = calculateSalePrice(
                      relatedProduct.price,
                      relatedProductSale,
                      relatedGlobalSale,
                    );

                    return (
                      <Link to={`/product/${relatedProduct.slug}`} key={relatedProduct.id}>
                        <Card className="group glass-card glass-hover overflow-hidden rounded-xl relative border-2 border-border/50 hover:border-primary/50 transition-all hover:shadow-xl">
                          {relatedDiscount && (
                            <Badge variant="destructive" className="absolute top-3 left-3 z-10 text-xs font-bold">
                              {relatedDiscount}% OFF
                            </Badge>
                          )}
                          <div className="aspect-square bg-muted relative overflow-hidden">
                            {relatedProduct.images?.[0] && (
                              <img
                                src={relatedProduct.images[0]}
                                alt={relatedProduct.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-display text-sm md:text-base font-semibold mb-2 truncate group-hover:text-primary transition-colors">
                              {relatedProduct.name}
                            </h3>
                            <div className="mb-3">
                              {relatedDiscount ? (
                                <div className="flex items-center gap-2">
                                  <p className="text-base md:text-lg font-bold text-primary">
                                    {formatPrice(relatedFinalPrice)}
                                  </p>
                                  <p className="text-xs text-muted-foreground line-through">
                                    {formatPrice(relatedProduct.price)}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-base md:text-lg font-bold text-primary">
                                  {formatPrice(relatedProduct.price)}
                                </p>
                              )}
                            </div>
                            <Button className="w-full text-xs md:text-sm" size="sm">
                              View Details
                            </Button>
                          </CardContent>
                        </Card>
                      </Link>
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
