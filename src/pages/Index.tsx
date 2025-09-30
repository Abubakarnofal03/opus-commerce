import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Truck, CreditCard, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";

const Index = () => {
  const { data: banners } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('active', true)
        .order('sort_order')
        .limit(1);
      if (error) throw error;
      return data;
    },
  });

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

  const activeBanner = banners?.[0];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Dynamic Hero Banner */}
        <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
          {activeBanner && (
            <>
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${activeBanner.image_url})` }}
              >
                <div className="absolute inset-0 bg-primary/40" />
              </div>
              <div className="relative z-10 text-center text-primary-foreground px-4 animate-fade-in">
                <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 gold-accent pb-8">
                  {activeBanner.title}
                </h1>
                <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
                  {activeBanner.subtitle}
                </p>
                <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Link to={activeBanner.link_url || '/shop'}>
                    Explore Collection <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </section>

        {/* Trust Badges with Shadow Cards */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="hover-lift">
                <CardContent className="p-6 flex items-center space-x-4">
                  <ShieldCheck className="h-12 w-12 text-accent flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg">Secure Checkout</h3>
                    <p className="text-sm text-muted-foreground">100% secure payments</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover-lift">
                <CardContent className="p-6 flex items-center space-x-4">
                  <CreditCard className="h-12 w-12 text-accent flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg">Cash on Delivery</h3>
                    <p className="text-sm text-muted-foreground">Pay when you receive</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover-lift">
                <CardContent className="p-6 flex items-center space-x-4">
                  <Truck className="h-12 w-12 text-accent flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg">Fast Delivery</h3>
                    <p className="text-sm text-muted-foreground">Quick shipping nationwide</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover-lift">
                <CardContent className="p-6 flex items-center space-x-4">
                  <Award className="h-12 w-12 text-accent flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg">Premium Quality</h3>
                    <p className="text-sm text-muted-foreground">Handcrafted excellence</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Shop by Category - Dynamic */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-4xl font-bold mb-4 gold-accent pb-8">
                Shop by Category
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Explore our curated collections
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {categories?.map((category) => (
                <Link 
                  key={category.id} 
                  to={`/shop?category=${category.slug}`} 
                  className="group"
                >
                  <Card className="hover-lift overflow-hidden">
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {category.image_url && (
                        <img 
                          src={category.image_url} 
                          alt={category.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      <div className="absolute inset-0 bg-primary/40 group-hover:bg-primary/60 transition-colors" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <h3 className="font-display text-3xl md:text-4xl font-bold text-white text-center px-4">
                          {category.name}
                        </h3>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Collection - Dynamic */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-4xl font-bold mb-4 gold-accent pb-8">
                Featured Collection
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Handpicked premium products for the discerning customer
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts?.map((product) => (
                <Card key={product.id} className="hover-lift overflow-hidden border-border group">
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {product.images?.[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                  </div>
                  <CardContent className="p-6">
                    <p className="text-xs text-muted-foreground mb-2">
                      {product.categories?.name}
                    </p>
                    <h3 className="font-display text-lg font-semibold mb-2 truncate">
                      {product.name}
                    </h3>
                    <p className="text-xl font-bold text-accent mb-4">
                      {formatPrice(product.price)}
                    </p>
                    <Button asChild className="w-full" size="sm">
                      <Link to={`/product/${product.slug}`}>
                        View Details
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button asChild variant="outline" size="lg">
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
  );
};

export default Index;