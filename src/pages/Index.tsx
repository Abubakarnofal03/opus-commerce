import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Award, Headphones, RotateCcw, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { organizationSchema, websiteSchema } from "@/lib/structuredData";
import heroFallback from "@/assets/hero-image.jpg";

const Index = () => {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const { data: banners = [] } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: featuredProducts = [] } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, categories(*)").eq("is_featured", true).limit(4);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["home-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name").limit(3);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales").select("*").eq("is_active", true).gt("end_date", new Date().toISOString());
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = window.setInterval(() => setCurrentBannerIndex((index) => (index + 1) % banners.length), 6500);
    return () => window.clearInterval(interval);
  }, [banners.length]);

  const activeBanner = banners[currentBannerIndex];
  const heroTitle = activeBanner?.show_text_overlay && activeBanner.title ? activeBanner.title : "Objects that make a home feel entirely your own.";
  const heroSubtitle = activeBanner?.show_text_overlay && activeBanner.subtitle ? activeBanner.subtitle : "A considered edit of decor, accessories, and everyday pieces chosen for beauty, quality, and ease.";
  const heroLink = activeBanner?.link_url || "/shop";

  return (
    <>
      <SEOHead
        title="Juraab — Curated Objects for Modern Living"
        description="Discover considered home decor, accessories, wallets and furniture selected for quality, character and everyday ease."
        keywords={["Juraab", "home decor", "furniture", "accessories", "wallets", "curated lifestyle store"]}
        canonicalUrl="https://juraab.shop"
        structuredData={{ "@context": "https://schema.org", "@graph": [organizationSchema, websiteSchema] }}
      />

      <div className="min-h-screen">
        <Navbar />
        <main>
          <section className="page-wrap pt-2 sm:pt-4">
            <div className="relative min-h-[610px] overflow-hidden rounded-[30px] bg-primary sm:min-h-[680px] lg:min-h-[720px]">
              {banners.length > 0 ? banners.map((banner, index) => (
                <div key={banner.id} className={`absolute inset-0 transition-all duration-1000 ${index === currentBannerIndex ? "scale-100 opacity-100" : "scale-105 opacity-0"}`}>
                  <img src={banner.image_url} alt="" className="h-full w-full object-cover" />
                </div>
              )) : <img src={heroFallback} alt="A warm, modern living room" className="absolute inset-0 h-full w-full object-cover" />}
              <div className="image-wash absolute inset-0" />
              <div className="absolute -left-20 top-16 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />

              <div className="relative z-10 flex min-h-[610px] items-end px-6 pb-8 pt-28 sm:min-h-[680px] sm:px-10 sm:pb-10 lg:min-h-[720px] lg:items-center lg:px-16 lg:pb-0">
                <div key={currentBannerIndex} className="max-w-3xl animate-fade-in text-white">
                  <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] backdrop-blur-xl">
                    <Sparkles className="h-3.5 w-3.5 text-[#e1bd7b]" /> The new Juraab edit
                  </span>
                  <h1 className="editorial-title text-[clamp(3rem,7vw,6.75rem)]">{heroTitle}</h1>
                  <p className="mt-6 max-w-xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">{heroSubtitle}</p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Button asChild size="lg" className="premium-button h-14 bg-white px-7 text-primary hover:bg-white/92">
                      <Link to={heroLink}>Explore the collection <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-14 rounded-full border-white/30 bg-white/10 px-7 text-white backdrop-blur-xl hover:bg-white/20 hover:text-white">
                      <Link to="/about">Our point of view</Link>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="liquid-glass absolute bottom-8 right-8 z-20 hidden max-w-[260px] rounded-[22px] p-5 text-foreground lg:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">The Juraab promise</p>
                <p className="mt-2 font-display text-xl leading-snug">Beautifully chosen. Clearly presented. Easy to order.</p>
              </div>

              {banners.length > 1 && <div className="absolute right-6 top-6 z-20 flex gap-2 rounded-full bg-black/15 p-2 backdrop-blur-xl sm:right-8 sm:top-8">{banners.map((_, index) => <button key={index} onClick={() => setCurrentBannerIndex(index)} className={`h-2 rounded-full transition-all ${index === currentBannerIndex ? "w-7 bg-white" : "w-2 bg-white/45 hover:bg-white/80"}`} aria-label={`Show banner ${index + 1}`} />)}</div>}
            </div>
          </section>

          <section className="page-wrap py-8 sm:py-10" aria-label="Shopping benefits">
            <div className="grid divide-y rounded-[24px] border border-border/60 bg-card/65 px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
              {[
                { icon: ShieldCheck, title: "Secure checkout", detail: "Your order is protected" },
                { icon: Truck, title: "Reliable delivery", detail: "Updates from door to door" },
                { icon: RotateCcw, title: "Easy returns", detail: "7 days to change your mind" },
                { icon: Headphones, title: "Human support", detail: "Real help when you need it" },
              ].map(({ icon: Icon, title, detail }) => <div key={title} className="flex items-center gap-4 px-3 py-5 sm:px-5"><Icon className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} /><div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{detail}</p></div></div>)}
            </div>
          </section>

          <section className="section-pad page-wrap">
            <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div><p className="section-kicker">Shop by mood</p><h2 className="editorial-title max-w-2xl text-4xl sm:text-5xl lg:text-6xl">Find the piece your space has been waiting for.</h2></div>
              <Link to="/shop" className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold">View everything <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {categories.map((category, index) => (
                <Link key={category.id} to={`/shop?category=${category.slug}`} className={`group relative min-h-[430px] overflow-hidden rounded-[28px] ${index === 1 ? "md:translate-y-8" : ""}`}>
                  {category.image_url ? <img src={category.image_url} alt={category.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/75 via-primary/5 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">Collection 0{index + 1}</span>
                    <div className="mt-2 flex items-end justify-between gap-4"><h3 className="font-display text-3xl font-normal sm:text-4xl">{category.name}</h3><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur-xl transition-transform group-hover:rotate-45"><ArrowRight className="h-4 w-4" /></span></div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="section-pad bg-secondary/45">
            <div className="page-wrap">
              <div className="mb-10 text-center"><p className="section-kicker">The signature edit</p><h2 className="editorial-title mx-auto max-w-3xl text-4xl sm:text-5xl lg:text-6xl">Pieces people return to again and again.</h2><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">Distinctive, useful, and chosen to live beautifully in real homes.</p></div>
              <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                {featuredProducts.map((product) => <ProductCard key={product.id} product={product} sales={sales} />)}
              </div>
              <div className="mt-12 text-center"><Button asChild variant="outline" size="lg" className="h-13 rounded-full border-primary/20 bg-card/70 px-7"><Link to="/shop">Shop all products <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
            </div>
          </section>

          <section className="section-pad page-wrap">
            <div className="liquid-dark relative overflow-hidden rounded-[32px] px-6 py-14 sm:px-12 sm:py-16 lg:px-16">
              <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1fr_.8fr]">
                <div><p className="section-kicker !text-white/55">Why Juraab</p><h2 className="editorial-title max-w-2xl text-4xl sm:text-5xl lg:text-6xl">Premium should feel effortless—not intimidating.</h2></div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {[{ icon: Award, title: "Considered quality", text: "Every product is selected for material, finish, and everyday usefulness." }, { icon: Sparkles, title: "Simple by design", text: "Clear choices, readable details, and an ordering journey anyone can follow." }].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-[24px] border border-white/12 bg-white/[.06] p-6"><Icon className="h-6 w-6 text-accent" /><h3 className="mt-5 font-sans text-base font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-white/60">{text}</p></div>)}
                </div>
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
