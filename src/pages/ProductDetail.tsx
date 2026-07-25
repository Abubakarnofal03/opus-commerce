import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Minus, Plus, ShoppingCart, X, Star, ShieldCheck, Truck, Banknote, Package } from "lucide-react";
import { addToGuestCart } from "@/lib/cartUtils";
import { formatPrice } from "@/lib/currency";
import { LoadingScreen } from "@/components/LoadingScreen";
import { calculateSalePrice } from "@/lib/saleUtils";
import { Badge } from "@/components/ui/badge";
import { trackAddToCart as trackMetaAddToCart } from "@/lib/metaPixel";
import { trackViewContent, trackAddToCart as trackTikTokAddToCart } from "@/lib/tiktokPixel";
import { trackEvent } from "@/hooks/useAnalytics";
import { SEOHead } from "@/components/SEOHead";
import { organizationSchema, productSchema, breadcrumbSchema } from "@/lib/structuredData";
import ProductReviews from "@/components/ProductReviews";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProductCard } from "@/components/ProductCard";


const ProductDetail = ({ key }: { key?: string }) => {
  const { slug } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zoomDialogOpen, setZoomDialogOpen] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<any>(null);
  const [selectedColor, setSelectedColor] = useState<any>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const purchaseActionsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Reset component state when slug changes
  useEffect(() => {
    setQuantity(1);
    setSelectedImageIndex(0);
    setSelectedVariation(null);
    setSelectedColor(null);

    // Invalidate all queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['product', slug] });
    queryClient.invalidateQueries({ queryKey: ['product-variations'] });
    queryClient.invalidateQueries({ queryKey: ['product-colors'] });
    queryClient.invalidateQueries({ queryKey: ['related-products'] });
  }, [slug, queryClient]);

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

  useEffect(() => {
    const handleScroll = () => {
      const actions = purchaseActionsRef.current;
      setShowStickyBar(Boolean(actions && actions.getBoundingClientRect().bottom < 0));
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [product?.id]);

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

  const { data: variations } = useQuery({
    queryKey: ["product-variations", product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data, error } = await supabase
        .from("product_variations")
        .select("*")
        .eq("product_id", product.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!product,
  });

  const { data: colors } = useQuery({
    queryKey: ["product-colors", product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data, error } = await supabase
        .from("product_colors")
        .select("*")
        .eq("product_id", product.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!product,
  });

  // Set first variation as default when variations load
  useEffect(() => {
    if (variations && variations.length > 0 && !selectedVariation) {
      setSelectedVariation(variations.find((variation) => variation.quantity > 0) || variations[0]);
    }
  }, [variations, selectedVariation]);

  // Set first color as default when colors load
  useEffect(() => {
    if (colors && colors.length > 0 && !selectedColor) {
      setSelectedColor(colors.find((color) => color.quantity > 0) || colors[0]);
    }
  }, [colors, selectedColor]);

  const addToCart = useMutation({
    mutationFn: async () => {
      // Check stock availability
      if (selectedColor && selectedColor.quantity < quantity) {
        throw new Error(`Only ${selectedColor.quantity} items available in stock`);
      }
      if (selectedVariation && !selectedColor && selectedVariation.quantity < quantity) {
        throw new Error(`Only ${selectedVariation.quantity} items available in stock`);
      }

      // Determine the price to use (color > variation > product)
      const priceToUse = selectedColor
        ? selectedColor.price
        : selectedVariation
          ? selectedVariation.price
          : product.price;

      if (user) {
        // Check if item already exists in cart (considering both variation and color)
        const { data: existingItems } = await supabase
          .from("cart_items")
          .select("*")
          .eq("user_id", user.id)
          .eq("product_id", product.id);

        let existingItem = null;
        if (existingItems && existingItems.length > 0) {
          // Find exact match including variation and color
          existingItem = existingItems.find(item =>
            item.variation_id === (selectedVariation?.id || null) &&
            item.color_id === (selectedColor?.id || null)
          );
        }

        if (existingItem) {
          // Update quantity of existing item
          const { error } = await supabase
            .from("cart_items")
            .update({ quantity: existingItem.quantity + quantity })
            .eq("id", existingItem.id);
          if (error) throw error;
        } else {
          // Insert new cart item
          const { error } = await supabase.from("cart_items").insert({
            user_id: user.id,
            product_id: product.id,
            quantity,
            variation_id: selectedVariation?.id || null,
            variation_name: selectedVariation?.name || null,
            variation_price: selectedVariation?.price || null,
            color_id: selectedColor?.id || null,
            color_name: selectedColor?.name || null,
            color_code: selectedColor?.color_code || null,
            color_price: selectedColor?.price || null,
          });
          if (error) throw error;
        }
      } else {
        // Guest cart
        addToGuestCart({
          product_id: product.id,
          quantity,
          product_name: product.name,
          product_price: product.price,
          product_image: product.images?.[0],
          shipping_cost: product.shipping_cost || 0,
          variation_id: selectedVariation?.id || null,
          variation_name: selectedVariation?.name || null,
          variation_price: selectedVariation?.price || null,
          color_id: selectedColor?.id || null,
          color_name: selectedColor?.name || null,
          color_code: selectedColor?.color_code || null,
          color_price: (selectedColor?.price && parseFloat(selectedColor.price) > 0)
            ? parseFloat(selectedColor.price)
            : null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      // Calculate sale price for tracking (use color > variation > product price)
      const basePrice = (selectedColor?.price && parseFloat(selectedColor.price) > 0)
        ? parseFloat(selectedColor.price)
        : selectedVariation
          ? selectedVariation.price
          : product.price;
      const productSale = sales?.find((s) => s.product_id === product.id);
      const globalSale = sales?.find((s) => s.is_global);
      const { finalPrice } = calculateSalePrice(basePrice, productSale, globalSale);

      // Track Meta Pixel AddToCart event
      trackMetaAddToCart(product.id, product.name, basePrice);

      // Track TikTok Pixel AddToCart event
      trackTikTokAddToCart(product.id, product.name, finalPrice);

      // Track analytics event
      trackEvent('add_to_cart', {
        product_id: product.id,
        product_name: product.name,
        price: finalPrice,
        quantity,
        variation_id: selectedVariation?.id,
        variation_name: selectedVariation?.name,
        color_id: selectedColor?.id,
        color_name: selectedColor?.name,
      });

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
    // Wait for cart to be refetched before navigating
    await queryClient.refetchQueries({ queryKey: ["cart"] });
    navigate("/checkout");
  };

  // Calculate sale price (needed for tracking)
  // Use color price if selected and has value, otherwise variation price, otherwise product price
  const displayPrice = (selectedColor?.price && parseFloat(selectedColor.price) > 0)
    ? parseFloat(selectedColor.price)
    : selectedVariation
      ? selectedVariation.price
      : product?.price || 0;
  const productSale = sales?.find((s) => s.product_id === product?.id);
  const globalSale = sales?.find((s) => s.is_global);
  const applySaleToItem = selectedColor
    ? selectedColor.apply_sale !== false
    : selectedVariation
      ? selectedVariation.apply_sale !== false
      : true;
  const { finalPrice, discount } = calculateSalePrice(displayPrice, productSale, globalSale, applySaleToItem);

  // Calculate total price (finalPrice * quantity)
  const totalPrice = finalPrice * quantity;

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

  // Keep product images separate from banner images
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
        title={product.meta_title || `${product.name} | Buy Online at Juraab`}
        description={
          product.meta_description ||
          product.description ||
          `Buy ${product.name} online in Pakistan. Premium quality products at juraab.shop with fast delivery.`
        }
        keywords={product.focus_keywords || [product.name, product.categories?.name || "", "buy online Pakistan"]}
        canonicalUrl={`https://juraab.shop/product/${product.slug}`}
        ogImage={productImages[0]}
        ogType="product"
        structuredData={structuredData}
      />

      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 pb-16 pt-6 md:pb-24 md:pt-10">
          <div className="page-wrap">
            <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Home</Link><span>/</span>
              <Link to="/shop" className="hover:text-foreground">Shop</Link><span>/</span>
              {product.categories && <><Link to={`/shop?category=${product.categories.slug}`} className="hover:text-foreground">{product.categories.name}</Link><span>/</span></>}
              <span className="max-w-[220px] truncate text-foreground">{product.name}</span>
            </nav>
            {/* Standard Layout */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-14">
              {/* Media Gallery */}
              <div className="space-y-3 md:space-y-4 lg:sticky lg:top-28 lg:self-start">
                {/* Media Carousel (Video + Images) */}
                {(product.video_url || (product.images && product.images.length > 0)) &&
                  (product.video_url ? 1 : 0) + (product.images?.length || 0) > 1 ? (
                  <Carousel className="w-full">
                    <CarouselContent>
                      {/* Video as first carousel item */}
                      {product.video_url && (
                        <CarouselItem key="video">
                          <div className="aspect-[4/5] overflow-hidden rounded-[28px] border border-white/70 bg-secondary/50 shadow-xl shadow-primary/5">
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
                            className="aspect-[4/5] cursor-zoom-in overflow-hidden rounded-[28px] border border-white/70 bg-secondary/50 shadow-xl shadow-primary/5 transition-all duration-300 hover:shadow-2xl"
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
                      <div className="aspect-[4/5] overflow-hidden rounded-[28px] border border-white/70 bg-secondary/50 shadow-xl shadow-primary/5">
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
                        className="aspect-[4/5] cursor-zoom-in overflow-hidden rounded-[28px] border border-white/70 bg-secondary/50 shadow-xl shadow-primary/5 transition-all duration-300 hover:shadow-2xl"
                        onClick={() => {
                          setSelectedImageIndex(0);
                          setZoomDialogOpen(true);
                        }}
                      >
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                    ) : null}
                  </>
                )}

                {/* Image Thumbnails Gallery */}
                {productImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {productImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedImageIndex(index);
                          setZoomDialogOpen(true);
                        }}
                        className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 border-transparent bg-secondary transition-all duration-200 hover:border-primary md:h-20 md:w-20"
                      >
                        <img
                          src={image}
                          alt={`${product.name} thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Clear stock status */}
                {product.stock_quantity > 0 && (
                  <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" /> In stock and ready to order
                  </div>
                )}
              </div>

              <div className="space-y-5 md:space-y-6">
                <div className="liquid-glass rounded-[24px] p-4 sm:rounded-[28px] sm:p-6 md:p-8">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 sm:mb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{product.categories?.name}</p>
                    {product.sku && <p className="text-[11px] text-muted-foreground">Item {product.sku}</p>}
                  </div>
                  <h1 className="editorial-title mb-4 text-[2rem] sm:mb-5 sm:text-4xl lg:text-[3.5rem]">
                    {product.name}
                  </h1>
                  {discount ? (
                    <div className="space-y-3 sm:space-y-4">
                      <Badge className="rounded-full border-0 bg-destructive px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-destructive-foreground shadow-sm sm:px-3.5 sm:py-1.5 sm:text-xs">Save {discount}%</Badge>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:gap-x-4">
                        <p className="text-[2.25rem] font-bold leading-none tracking-[-0.035em] text-destructive sm:text-[2.75rem] lg:text-[3.5rem]">{formatPrice(totalPrice)}</p>
                        <p className="text-base font-medium text-muted-foreground/70 line-through sm:text-xl md:text-2xl">
                          {formatPrice(displayPrice * quantity)}
                        </p>
                      </div>
                      <p className="inline-flex rounded-full bg-emerald-600/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 sm:px-3 sm:py-1.5 sm:text-sm">
                        You save {formatPrice((displayPrice - finalPrice) * quantity)}
                      </p>
                      {quantity > 1 && (
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(finalPrice)} × {quantity}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl font-semibold text-foreground sm:text-3xl md:text-4xl">{formatPrice(totalPrice)}</p>
                      {quantity > 1 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatPrice(displayPrice)} × {quantity}
                        </p>
                      )}
                    </div>
                  )}
                {product.stock_quantity !== undefined && product.stock_quantity < 10 && (
                  <div className="mt-4 rounded-xl border border-accent/25 bg-accent/8 p-3 sm:mt-6 sm:rounded-2xl sm:p-4">
                    {product.stock_quantity > 0 ? (
                      <p className="text-sm font-semibold text-foreground">
                        Only {product.stock_quantity} {product.stock_quantity === 1 ? "piece" : "pieces"} currently available
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-destructive">Currently out of stock</p>
                    )}
                  </div>
                )}

                {variations && variations.length > 0 && (
                  <div className="mt-5 space-y-3 border-t pt-5 sm:mt-7 sm:pt-6">
                    <h2 className="text-base font-semibold text-foreground">Choose an option</h2>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {variations.map((variation, index) => {
                        const isOutOfStock = variation.quantity === 0;
                        const varSale = sales?.find((s) => s.product_id === product?.id);
                        const varGlobalSale = sales?.find((s) => s.is_global);
                        const varApplySale = variation.apply_sale !== false;
                        const { finalPrice: varFinalPrice, discount: varDiscount } = calculateSalePrice(
                          variation.price,
                          varSale,
                          varGlobalSale,
                          varApplySale
                        );
                        const isSelected = selectedVariation?.id === variation.id;

                        return (
                          <button
                            key={variation.id}
                            onClick={() => {
                              if (!isOutOfStock) {
                                setSelectedVariation(variation);
                                setQuantity(1);
                              }
                            }}
                            disabled={isOutOfStock}
                            className={`
                              relative flex min-h-[68px] flex-col items-center justify-center rounded-xl px-2 py-2.5 transition-all duration-200 sm:min-h-[76px] sm:rounded-2xl sm:px-3 sm:py-3
                              ${isOutOfStock
                                ? 'opacity-50 cursor-not-allowed bg-muted/50 border border-dashed border-border'
                                : isSelected
                                  ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02] ring-2 ring-primary/40 border border-primary'
                                  : 'bg-card border border-border hover:border-primary hover:shadow-md'
                              }
                            `}
                          >
                            {/* Discount Badge */}
                            {varDiscount > 0 && !isOutOfStock && (
                              <div className={`
                                absolute -top-2 left-1/2 -translate-x-1/2 z-10
                                px-1.5 py-0.5 rounded-full text-[10px] font-bold
                                ${isSelected
                                  ? 'bg-white text-primary'
                                  : 'bg-destructive text-white'
                                }
                              `}>
                                -{varDiscount}%
                              </div>
                            )}

                            {/* Out of Stock Overlay */}
                            {isOutOfStock && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-lg z-10">
                                <span className="text-[10px] font-bold text-destructive">SOLD OUT</span>
                              </div>
                            )}

                            {/* Content */}
                            <div className={`text-center space-y-0.5 ${isOutOfStock ? 'opacity-40' : ''}`}>
                              <div className={`font-semibold text-xs ${isSelected ? 'text-white' : 'text-foreground'}`}>
                                {variation.name}
                              </div>
                              {varDiscount > 0 ? (
                                <>
                                  <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-destructive'}`}>
                                    {formatPrice(varFinalPrice)}
                                  </div>
                                  <div className={`text-[10px] line-through ${isSelected ? 'text-white/60' : 'text-muted-foreground'}`}>
                                    {formatPrice(variation.price)}
                                  </div>
                                </>
                              ) : (
                                <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-foreground'}`}>
                                  {formatPrice(variation.price)}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {colors && colors.length > 0 && (
                  <div className="mt-5 border-t pt-5 sm:mt-7 sm:pt-6">
                    <h2 className="mb-3 text-base font-semibold">Choose a colour</h2>
                    <div className="flex flex-wrap gap-3">
                      {colors.map((color) => {
                        const isOutOfStock = color.quantity === 0;
                        // Use color price if set, otherwise fall back to variation or product price
                        const colorDisplayPrice = (color.price && color.price > 0)
                          ? color.price
                          : selectedVariation
                            ? selectedVariation.price
                            : product?.price || 0;
                        const colorSale = sales?.find((s) => s.product_id === product?.id);
                        const colorGlobalSale = sales?.find((s) => s.is_global);
                        const colorApplySale = color.apply_sale !== false;
                        const { finalPrice: colorFinalPrice, discount: colorDiscount } = calculateSalePrice(
                          colorDisplayPrice,
                          colorSale,
                          colorGlobalSale,
                          colorApplySale
                        );

                        return (
                          <button
                            key={color.id}
                            onClick={() => {
                              if (!isOutOfStock) {
                                setSelectedColor(color);
                                setQuantity(1);
                              }
                            }}
                            disabled={isOutOfStock}
                            className={`
                              relative flex min-h-[52px] items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200 sm:min-h-[58px] sm:rounded-2xl sm:px-4 sm:py-3
                              ${isOutOfStock
                                ? 'opacity-40 cursor-not-allowed bg-card border-2 border-border'
                                : selectedColor?.id === color.id
                                  ? 'bg-primary text-primary-foreground shadow-lg scale-105 ring-2 ring-primary ring-offset-2'
                                  : 'bg-card border-2 border-border hover:border-primary hover:shadow-md'
                              }
                            `}
                          >
                            {isOutOfStock && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <X className="h-12 w-12 text-destructive opacity-70" strokeWidth={3} />
                              </div>
                            )}
                            <div
                              className="w-6 h-6 rounded-full border-2 border-border"
                              style={{ backgroundColor: color.color_code }}
                            />
                            <div className={`text-center space-y-1 ${isOutOfStock ? 'opacity-50' : ''}`}>
                              <div className="font-semibold text-sm">{color.name}</div>
                              {colorDiscount ? (
                                <div className="space-y-0.5">
                                  <div className={`text-xs font-bold ${selectedColor?.id === color.id ? 'text-white' : 'text-destructive'}`}>{formatPrice(colorFinalPrice)}</div>
                                  <div className="text-xs line-through opacity-60">{formatPrice(colorDisplayPrice)}</div>
                                </div>
                              ) : (
                                <div className="text-xs font-medium">{formatPrice(colorDisplayPrice)}</div>
                              )}
                              {isOutOfStock && (
                                <div className="text-[10px] font-bold text-destructive">Out of Stock</div>
                              )}
                            </div>
                            {colorDiscount && !isOutOfStock && (
                              <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                -{colorDiscount}%
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-5 border-t pt-5 sm:mt-7 sm:pt-6">
                  <h2 className="mb-2 text-sm font-semibold sm:mb-3 sm:text-base">Quantity</h2>
                  <div className="inline-flex items-center rounded-full border bg-card/70 p-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full border-0 sm:h-11 sm:w-11"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                    <span className="w-10 text-center text-base font-semibold sm:w-12 sm:text-lg" aria-live="polite">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full border-0 sm:h-11 sm:w-11"
                      onClick={() => {
                        const maxQty = selectedColor
                          ? selectedColor.quantity
                          : selectedVariation
                            ? selectedVariation.quantity
                            : (product.stock_quantity || 99);
                        setQuantity(Math.min(maxQty, quantity + 1));
                      }}
                      disabled={
                        (selectedColor ? selectedColor.quantity === 0 :
                          selectedVariation ? selectedVariation.quantity === 0 :
                            product.stock_quantity === 0)
                      }
                    >
                      <Plus className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </div>
                </div>

                <div ref={purchaseActionsRef} className="mt-5 grid grid-cols-2 gap-2 sm:mt-7 sm:gap-3">
                  <Button
                    variant="outline"
                    className="h-12 w-full rounded-full border-2 border-primary bg-transparent px-2 text-sm font-semibold text-primary shadow-none hover:bg-primary/10 hover:text-primary dark:border-primary dark:bg-transparent dark:text-primary dark:hover:bg-primary/10 disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 sm:h-14 sm:px-4 sm:text-base"
                    size="lg"
                    onClick={() => addToCart.mutate()}
                    disabled={
                      addToCart.isPending ||
                      (selectedColor ? selectedColor.quantity === 0 :
                        selectedVariation ? selectedVariation.quantity === 0 :
                          product.stock_quantity === 0)
                    }
                  >
                    <ShoppingCart className="!h-4 !w-4 text-current sm:!h-5 sm:!w-5" />
                    {selectedColor && selectedColor.quantity === 0 ? 'Out of Stock' :
                      selectedVariation && !selectedColor && selectedVariation.quantity === 0 ? 'Out of Stock' :
                        'Add to Cart'}
                  </Button>
                  <Button
                    className="h-12 w-full rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15 sm:h-14 sm:text-base"
                    size="lg"
                    onClick={handleBuyNow}
                    disabled={
                      addToCart.isPending ||
                      (selectedColor ? selectedColor.quantity === 0 :
                        selectedVariation ? selectedVariation.quantity === 0 :
                          product.stock_quantity === 0)
                    }
                  >
                    Buy now
                  </Button>
                </div>
                <p className="mt-3 text-center text-[10px] text-muted-foreground sm:mt-4 sm:text-xs">Secure checkout · No account required</p>
                </div>
                {/* Trust Badges */}
                <div className="grid grid-cols-2 gap-2 rounded-[20px] border bg-card/55 p-4 sm:gap-3 sm:rounded-[24px] sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
                      <ShieldCheck className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-tight text-foreground">7-day easy</p>
                      <p className="text-xs leading-tight text-muted-foreground">returns</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
                      <Banknote className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-tight text-foreground">Cash on</p>
                      <p className="text-xs leading-tight text-muted-foreground">delivery</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
                      <Truck className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-tight text-foreground">Tracked delivery</p>
                      <p className="text-xs leading-tight text-muted-foreground">order updates</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
                      <Package className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-tight text-foreground">Quality checked</p>
                      <p className="text-xs leading-tight text-muted-foreground">before dispatch</p>
                    </div>
                  </div>
                </div>
                {product.description && (
                  <div className="rounded-[24px] border bg-card/55 p-6">
                    <p className="section-kicker">The details</p>
                    <h2 className="font-display text-2xl font-normal">About this piece</h2>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground md:text-base">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Why Buy This Section */}
                <div className="rounded-[24px] border bg-card/55 p-6">
                  <h2 className="flex items-center gap-2 font-display text-2xl font-normal">
                    <Star className="h-5 w-5 fill-accent text-accent" />
                    The Juraab standard
                  </h2>
                  <div className="mt-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <p className="text-sm leading-6 text-muted-foreground">Selected with close attention to material, finish, and everyday durability.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <p className="text-sm leading-6 text-muted-foreground">Clear product details and real support if you need help choosing.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <p className="text-sm leading-6 text-muted-foreground">A straightforward 7-day return window for added confidence.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <p className="text-sm leading-6 text-muted-foreground">Secure checkout with cash-on-delivery where available.</p>
                    </div>
                  </div>
                </div>

                {/* FAQ Section */}
                <div className="rounded-[24px] border bg-card/55 p-6">
                  <p className="section-kicker">Good to know</p>
                  <h2 className="font-display text-2xl font-normal">Frequently asked questions</h2>
                  <div className="mt-5 divide-y">
                    <details className="group py-1">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between py-3 text-sm font-semibold">
                        <span>What are the delivery charges?</span>
                        <span className="text-xl font-normal transition group-open:rotate-45">+</span>
                      </summary>
                      <p className="text-sm text-muted-foreground mt-3 pl-6">
                        Delivery costs, if any, are shown clearly during checkout before you confirm your order.
                      </p>
                    </details>
                    <details className="group py-1">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between py-3 text-sm font-semibold">
                        <span>What payment methods do you accept?</span>
                        <span className="text-xl font-normal transition group-open:rotate-45">+</span>
                      </summary>
                      <p className="text-sm text-muted-foreground mt-3 pl-6">
                        We accept Cash on Delivery (COD) and online bank transfers for your convenience.
                      </p>
                    </details>
                    <details className="group py-1">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between py-3 text-sm font-semibold">
                        <span>Can I return the product if it is not right for me?</span>
                        <span className="text-xl font-normal transition group-open:rotate-45">+</span>
                      </summary>
                      <p className="text-sm text-muted-foreground mt-3 pl-6">
                        Yes! We offer a 7-day easy return policy. If you're not satisfied, simply return it for a full refund.
                      </p>
                    </details>
                    <details className="group py-1">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between py-3 text-sm font-semibold">
                        <span>How long does delivery take?</span>
                        <span className="text-xl font-normal transition group-open:rotate-45">+</span>
                      </summary>
                      <p className="text-sm text-muted-foreground mt-3 pl-6">
                        Delivery typically takes 2-5 business days depending on your location in Pakistan.
                      </p>
                    </details>
                    <details className="group py-1">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between py-3 text-sm font-semibold">
                        <span>Is every item quality checked?</span>
                        <span className="text-xl font-normal transition group-open:rotate-45">+</span>
                      </summary>
                      <p className="text-sm text-muted-foreground mt-3 pl-6">
                        Yes. Items are checked before dispatch, and our support team is available if something is not as expected.
                      </p>
                    </details>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner Images Section - Displayed below product info */}
            {product.banner_image && product.banner_image.length > 0 && (
              <div className="mt-8 md:mt-12 space-y-4">
                {product.banner_image.map((banner, index) => (
                  <div key={index} className="w-full rounded-xl overflow-hidden shadow-lg">
                    <img
                      src={banner}
                      alt={`${product.name} banner ${index + 1}`}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Customer Reviews - Always shown for both layouts */}
            <div className="mt-12 md:mt-20">
              <ProductReviews productId={product.id} productName={product.name} />
            </div>

            {/* Related Products */}
            {relatedProducts && relatedProducts.length > 0 && (
              <div className="mt-16 md:mt-24">
                <div className="mb-10 text-center">
                  <p className="section-kicker">Complete the edit</p>
                  <h2 className="editorial-title text-4xl sm:text-5xl">You may also like</h2>
                  <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground">More considered pieces from the same collection.</p>
                </div>
                <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                  {relatedProducts.map((relatedProduct) => <ProductCard key={relatedProduct.id} product={relatedProduct} sales={sales || []} user={user} />)}
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

        {/* Sticky Add to Cart Bar */}
        {showStickyBar && (
          <div className="liquid-glass fixed bottom-2 left-2 right-2 z-40 rounded-[20px] shadow-2xl animate-slide-up sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-[22px]">
            <div className="page-wrap py-2 sm:py-3">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
                  {product.images?.[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="hidden h-12 w-12 rounded-xl object-cover sm:block"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-xs font-semibold sm:text-sm">{product.name}</h3>
                    <p className={`text-base font-bold sm:text-lg ${discount ? "text-destructive" : "text-foreground"}`}>
                      {formatPrice(totalPrice)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden items-center gap-2 rounded-full border bg-card/50 px-2 py-1 sm:flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-semibold w-6 text-center">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => {
                        const maxQty = selectedColor
                          ? selectedColor.quantity
                          : selectedVariation
                            ? selectedVariation.quantity
                            : (product.stock_quantity || 99);
                        setQuantity(Math.min(maxQty, quantity + 1));
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="hidden h-11 rounded-full border-2 border-primary bg-transparent px-5 font-semibold text-primary hover:bg-primary/10 hover:text-primary dark:border-primary dark:bg-transparent dark:text-primary dark:hover:bg-primary/10 disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 sm:inline-flex"
                      onClick={() => addToCart.mutate()}
                      disabled={
                        addToCart.isPending ||
                        (selectedColor ? selectedColor.quantity === 0 :
                          selectedVariation ? selectedVariation.quantity === 0 :
                            product.stock_quantity === 0)
                      }
                    >
                      <ShoppingCart className="mr-2 !h-4 !w-4 text-current" />
                      {selectedColor && selectedColor.quantity === 0 ? 'Out of Stock' :
                        selectedVariation && !selectedColor && selectedVariation.quantity === 0 ? 'Out of Stock' :
                          'Add to Cart'}
                    </Button>
                    <Button
                      className="h-10 flex-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground sm:h-11 sm:flex-initial sm:px-6"
                      onClick={handleBuyNow}
                      disabled={
                        addToCart.isPending ||
                        (selectedColor ? selectedColor.quantity === 0 :
                          selectedVariation ? selectedVariation.quantity === 0 :
                            product.stock_quantity === 0)
                      }
                    >
                      Buy now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </>
  );
};

export default ProductDetail;
