import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Truck, CreditCard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const { data: featuredProducts } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('is_featured', true)
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          >
            <div className="absolute inset-0 bg-primary/40" />
          </div>
          <div className="relative z-10 text-center text-primary-foreground px-4 animate-fade-in">
            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 gold-accent pb-8">
              Elevate Your Lifestyle
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
              Discover premium home décor and luxury leather accessories
            </p>
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link to="/shop">
                Explore Collection <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-center justify-center space-x-4">
                <ShieldCheck className="h-12 w-12 text-accent" />
                <div>
                  <h3 className="font-semibold">Secure Checkout</h3>
                  <p className="text-sm text-muted-foreground">100% secure payments</p>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-4">
                <CreditCard className="h-12 w-12 text-accent" />
                <div>
                  <h3 className="font-semibold">Cash on Delivery</h3>
                  <p className="text-sm text-muted-foreground">Pay when you receive</p>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-4">
                <Truck className="h-12 w-12 text-accent" />
                <div>
                  <h3 className="font-semibold">Fast Delivery</h3>
                  <p className="text-sm text-muted-foreground">Quick shipping nationwide</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-4xl font-bold mb-4 gold-accent pb-8">
                Featured Collection
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Handpicked premium products for the discerning customer
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredProducts?.map((product) => (
                <Card key={product.id} className="hover-lift overflow-hidden border-border">
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {product.images?.[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <CardContent className="p-6">
                    <p className="text-xs text-muted-foreground mb-2">
                      {product.categories?.name}
                    </p>
                    <h3 className="font-display text-xl font-semibold mb-2">
                      {product.name}
                    </h3>
                    <p className="text-2xl font-bold text-accent mb-4">
                      ${product.price}
                    </p>
                    <Button asChild className="w-full" variant="secondary">
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

        {/* Categories */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-4xl font-bold mb-4 gold-accent pb-8">
                Shop by Category
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Link to="/shop?category=home-decor" className="group">
                <Card className="hover-lift overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <h3 className="font-display text-3xl font-bold group-hover:text-accent transition-colors">
                      Home Décor
                    </h3>
                  </div>
                </Card>
              </Link>
              <Link to="/shop?category=mens-wallets" className="group">
                <Card className="hover-lift overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <h3 className="font-display text-3xl font-bold group-hover:text-accent transition-colors">
                      Men's Wallets
                    </h3>
                  </div>
                </Card>
              </Link>
              <Link to="/shop?category=womens-wallets" className="group">
                <Card className="hover-lift overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <h3 className="font-display text-3xl font-bold group-hover:text-accent transition-colors">
                      Women's Wallets
                    </h3>
                  </div>
                </Card>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;