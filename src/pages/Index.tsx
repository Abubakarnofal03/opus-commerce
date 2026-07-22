import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Truck, CreditCard, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";
import { calculateSalePrice } from "@/lib/saleUtils";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { SEOHead } from "@/components/SEOHead";
import { organizationSchema, websiteSchema, breadcrumbSchema } from "@/lib/structuredData";

const Index = () => {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  const { data: banners } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Auto-rotate banners every 5 seconds
  useEffect(() => {
    if (!banners || banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1 }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const { data: featuredProducts } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('is_featured', true)
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['home-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
        .limit(3);
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

  const activeBanner = banners?.[currentBannerIndex];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [organizationSchema, websiteSchema]
  };

  return (
    <>
      <SEOHead
              title="Juraab – Pakistan's Online Store for Home Decor, Wallets & More"
              description="Shop premium home decor, wallets, furniture, accessories & garden decorations online in Pakistan. Fast delivery, quality products at juraab.shop"
              keywords={[
                'home decor',
                'wallets',
                'furniture',
                'accessories',
                'garden decorations',
                'juraab',
                'juraab.shop',
                'buy online in Pakistan',
                'premium decor items',
                'online shopping Pakistan',
                'home accessories',
                'leather wallets'
              ]}
              canonicalUrl="https://juraab.shop"
              structuredData={structuredData}
            />
      
      <div className="min-h-screen flex flex-col">
        <Navbar />
      
      <main className="flex-1">
        {/* Dynamic Hero Banner - Premium Full-Screen */}
        <section className="relative w-full h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
          {banners && banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out ${
                index === currentBannerIndex
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-105'
              }`}
              style={{ backgroundImage: `url(${banner.image_url})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-primary/50 via-primary/30 to-primary/60" />
            </div>
          ))}
          
          {activeBanner && activeBanner.show_text_overlay && (
            <div 
              key={currentBannerIndex}
              className="relative z-10 text-center text-white px-6 sm:px-8 md:px-12 max-w-6xl mx-auto"
            >
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-medium mb-4 sm:mb-6 md:mb-8 animate-fade-in leading-tight tracking-tight drop-shadow-lg">
                {activeBanner.title}
              </h1>
              <p className="hidden sm:block text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 md:mb-10 max-w-3xl mx-auto animate-fade-in animate-fade-in-delay-1 font-light tracking-wide drop-shadow-md">
                {activeBanner.subtitle}
              </p>
              <div className="animate-fade-in animate-fade-in-delay-2">
                <Button asChild size="lg" className="bg-white/95 hover:bg-white text-primary font-medium text-sm sm:text-base md:text-lg h-11 sm:h-12 md:h-14 px-6 sm:px-8 md:px-10 rounded-none shadow-2xl hover:shadow-white/20 transition-all duration-300">
                  <Link to={activeBanner.link_url || '/shop'} className="flex items-center gap-2">
                    Explore Collection <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
          
          {/* Navigation Dots - Minimalist */}
          {banners && banners.length > 1 && (
            <div className="absolute bottom-8 sm:bottom-12 left-1/2 transform -translate-x-1/2 flex gap-3 z-20">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBannerIndex(index)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    index === currentBannerIndex
                      ? 'bg-white w-8'
                      : 'bg-white/40 hover:bg-white/70 w-1.5'
                  }`}
                  aria-label={`Go to banner ${index + 1}`}
                />
              ))}
            </div>
          )}
        </section>

        {/* Introduction Section for SEO */}
        {/* <section className="py-12 bg-background">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <p className="text-lg text-muted-foreground leading-relaxed">
              Welcome to <strong>Juraab</strong> – your trusted online destination for premium <strong>home decor</strong>, 
              elegant <strong>wallets</strong>, stylish <strong>furniture</strong>, quality <strong>accessories</strong>, and beautiful 
              <strong> garden decorations</strong> in Pakistan. Shop with confidence and enjoy fast delivery across the country. 
              juraab.shop brings you carefully curated products that blend style, quality, and affordability. We are the best jurab store in Pakistan.
            </p> 
          </div>
        </section>

        {/* Shop by Category - Premium Editorial Layout */}
        <section 
          id="categories-section"
          ref={(el) => (sectionRefs.current['categories-section'] = el)}
          className="py-24 lg:py-32 relative overflow-hidden bg-background"
        >
          <div className="container mx-auto px-6 lg:px-8 relative z-10">
            <div className={`text-center mb-16 lg:mb-20 transition-all duration-700 ${
              visibleSections.has('categories-section') 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-10'
            }`}>
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-medium mb-6 gold-accent pb-8 tracking-tight">
                Curated Collections
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-light">
                Explore our carefully selected categories of premium products
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {categories?.map((category, index) => (
                <Link 
                  key={category.id} 
                  to={`/shop?category=${category.slug}`} 
                  className={`group relative transition-all duration-700 ${
                    visibleSections.has('categories-section')
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <Card className="overflow-hidden rounded-none shadow-elegant hover:shadow-luxury transition-all duration-500 h-full border-0">
                    <div className="aspect-[4/5] bg-muted relative overflow-hidden">
                      {category.image_url && (
                        <img 
                          src={category.image_url} 
                          alt={category.name}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60 group-hover:opacity-50 transition-opacity duration-500" />
                      <div className="absolute inset-0 flex items-end justify-center pb-8">
                        <div className="text-center transform group-hover:-translate-y-2 transition-transform duration-500">
                          <h3 className="font-display text-2xl md:text-3xl font-medium text-white tracking-wide mb-2">
                            {category.name}
                          </h3>
                          <div className="w-0 h-px bg-white group-hover:w-16 mx-auto transition-all duration-500" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Badges with Shadow Cards */}
        <section 
          id="trust-section"
          ref={(el) => (sectionRefs.current['trust-section'] = el)}
          className="py-16 bg-muted/30 relative overflow-hidden"
        >
          {/* Floating decorative elements */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: ShieldCheck, title: "Secure Checkout", desc: "100% secure payments" },
                { icon: CreditCard, title: "Cash on Delivery", desc: "Pay when you receive" },
                { icon: Truck, title: "Fast Delivery", desc: "Quick shipping nationwide" },
                { icon: Award, title: "Premium Quality", desc: "Handcrafted excellence" }
              ].map((badge, index) => (
                <Card 
                  key={index}
                  className={`glass-card glass-hover rounded-xl transition-all duration-500 ${
                    visibleSections.has('trust-section')
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-6 flex items-center space-x-4">
                    <badge.icon className="h-12 w-12 text-accent flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                    <div>
                      <h3 className="font-semibold text-lg">{badge.title}</h3>
                      <p className="text-sm text-muted-foreground">{badge.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Collection - Dynamic */}
        <section 
          id="products-section"
          ref={(el) => (sectionRefs.current['products-section'] = el)}
          className="py-20 bg-muted/30 relative overflow-hidden"
        >
          {/* Animated gradient orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-accent/20 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className={`text-center mb-12 transition-all duration-700 ${
              visibleSections.has('products-section') 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-10'
            }`}>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 gold-accent pb-8">
                Featured Products - Best Sellers
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Handpicked premium home decor, wallets, and accessories for the discerning customer
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-6">
              {featuredProducts?.map((product, index) => {
                const productSale = sales?.find(s => s.product_id === product.id);
                const globalSale = sales?.find(s => s.is_global);
                const { finalPrice, discount } = calculateSalePrice(product.price, productSale, globalSale);
                
                return (
                  <Link 
                    key={product.id} 
                    to={`/product/${product.slug}`} 
                    className={`w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.125rem)] min-w-[280px] max-w-[400px] transition-all duration-500 ${
                      visibleSections.has('products-section')
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-10'
                    }`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    <Card className="glass-card glass-hover overflow-hidden rounded-xl group relative h-full cursor-pointer transform hover:scale-105 transition-all duration-300">
                      {discount && (
                        <Badge className="absolute top-2 left-2 z-10 bg-destructive text-destructive-foreground animate-pulse">
                          {discount}% OFF
                        </Badge>
                      )}
                      {product.is_featured && !discount && (
                        <Badge className="absolute top-2 left-2 z-10 bg-accent text-accent-foreground">
                          <Star className="h-3 w-3 mr-1 animate-pulse" fill="currentColor" />
                          Featured
                        </Badge>
                      )}
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        {product.images?.[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-all duration-500"
                          />
                        )}
                        {/* Shimmer overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                      </div>
                      <CardContent className="p-6">
                        <p className="text-xs text-muted-foreground mb-2">
                          {product.categories?.name}
                        </p>
                        <h3 className="font-display text-lg font-semibold mb-2 truncate">
                          {product.name}
                        </h3>
                        <div className="mb-4">
                          {discount ? (
                            <div className="flex items-center gap-2">
                              <p className="text-xl font-bold text-destructive">
                                {formatPrice(finalPrice)}
                              </p>
                              <p className="text-sm text-muted-foreground line-through">
                                {formatPrice(product.price)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xl font-bold text-accent">
                              {formatPrice(product.price)}
                            </p>
                          )}
                        </div>
                        <Button className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors" size="sm">
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            <div className={`text-center mt-12 transition-all duration-700 ${
              visibleSections.has('products-section') 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-10'
            }`} style={{ transitionDelay: '600ms' }}>
              <Button asChild variant="outline" size="lg" className="hover:scale-105 transition-transform">
                <Link to="/shop">
                  View All Products <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

        <Footer />
      </div>
    </>
  );
};

export default Index;