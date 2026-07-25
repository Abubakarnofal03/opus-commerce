import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";
import { SEOHead } from "@/components/SEOHead";
import { breadcrumbSchema, organizationSchema } from "@/lib/structuredData";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 12;

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("category");
  const [minPrice, setMinPrice] = useState("0");
  const [maxPrice, setMaxPrice] = useState("50000");
  const [debouncedMinPrice, setDebouncedMinPrice] = useState("0");
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState("50000");
  const [user, setUser] = useState<any>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedMinPrice(minPrice || "0");
      setDebouncedMaxPrice(maxPrice || "50000");
    }, 450);
    return () => window.clearTimeout(timer);
  }, [minPrice, maxPrice]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
  }, []);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
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

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products", selectedCategory, debouncedMinPrice, debouncedMaxPrice, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories(*)", { count: "exact" })
        .gte("price", Math.max(0, Number(debouncedMinPrice) || 0))
        .lte("price", Math.max(0, Number(debouncedMaxPrice) || 50000));

      if (selectedCategory) {
        const category = categories.find((item) => item.slug === selectedCategory);
        if (category) query = query.eq("category_id", category.id);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const { data, error, count } = await query
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .range(from, from + ITEMS_PER_PAGE - 1);
      if (error) throw error;
      return { products: data || [], count: count || 0 };
    },
    enabled: !categoriesLoading,
  });

  useEffect(() => setCurrentPage(1), [selectedCategory, debouncedMinPrice, debouncedMaxPrice]);
  useEffect(() => {
    if (currentPage > 1) window.scrollTo({ top: 220, behavior: "smooth" });
  }, [currentPage]);

  const handleCategoryChange = (slug: string | null) => setSearchParams(slug ? { category: slug } : {});
  const selectedCategoryData = categories.find((category) => category.slug === selectedCategory);
  const products = productsData?.products || [];
  const totalCount = productsData?.count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const isLoading = categoriesLoading || productsLoading;

  const FilterFields = () => (
    <div className="space-y-7">
      <div>
        <Label className="text-sm font-semibold">Price range</Label>
        <p className="mt-1 text-xs text-muted-foreground">Set a comfortable spending range.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="space-y-1.5 text-xs text-muted-foreground">Minimum<Input type="number" min="0" inputMode="numeric" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} className="h-12 rounded-xl bg-card text-base text-foreground" /></label>
          <label className="space-y-1.5 text-xs text-muted-foreground">Maximum<Input type="number" min="0" inputMode="numeric" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className="h-12 rounded-xl bg-card text-base text-foreground" /></label>
        </div>
        <p className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">Showing {formatPrice(Number(debouncedMinPrice) || 0)} to {formatPrice(Number(debouncedMaxPrice) || 50000)}</p>
      </div>
      <Button variant="outline" className="h-12 w-full rounded-full" onClick={() => { setMinPrice("0"); setMaxPrice("50000"); }}>Reset price</Button>
    </div>
  );

  const pageTitle = selectedCategoryData ? `${selectedCategoryData.name} — Juraab Collection` : "Shop the Juraab Collection";
  const pageDescription = selectedCategoryData ? `Explore Juraab's considered ${selectedCategoryData.name.toLowerCase()} collection.` : "Explore considered decor, furniture, accessories and gifts from Juraab.";

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        keywords={selectedCategoryData?.focus_keywords || ["Juraab collection", "home decor", "furniture", "accessories"]}
        canonicalUrl={selectedCategory ? `https://juraab.shop/shop?category=${selectedCategory}` : "https://juraab.shop/shop"}
        structuredData={{ "@context": "https://schema.org", "@graph": [organizationSchema, breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Shop", url: "/shop" }, ...(selectedCategoryData ? [{ name: selectedCategoryData.name, url: `/shop?category=${selectedCategory}` }] : [])])] }}
      />

      <div className="min-h-screen">
        <Navbar />
        <main>
          <section className="page-wrap pt-8 sm:pt-12 lg:pt-16">
            <div className="relative overflow-hidden rounded-[30px] bg-primary px-6 py-14 text-primary-foreground sm:px-10 sm:py-16 lg:px-16 lg:py-20">
              <div className="absolute -right-16 -top-28 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative z-10 max-w-3xl">
                <p className="section-kicker !text-white/55">Curated for real life</p>
                <h1 className="editorial-title text-5xl sm:text-6xl lg:text-7xl">{selectedCategoryData?.name || "The collection"}</h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-white/66 sm:text-lg">Distinctive objects, honest details, and a refreshingly simple way to shop.</p>
              </div>
              <div className="liquid-glass absolute bottom-6 right-6 hidden rounded-[20px] px-5 py-4 text-foreground lg:block"><p className="text-2xl font-semibold">{totalCount}</p><p className="text-xs text-muted-foreground">pieces to discover</p></div>
            </div>
          </section>

          <section className="page-wrap py-8 sm:py-10">
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
              <button onClick={() => handleCategoryChange(null)} className={`min-h-12 shrink-0 rounded-full border px-5 text-sm font-semibold transition-colors ${!selectedCategory ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card/70 hover:border-primary/30"}`}>All pieces</button>
              {categories.map((category) => <button key={category.id} onClick={() => handleCategoryChange(category.slug)} className={`min-h-12 shrink-0 rounded-full border px-5 text-sm font-semibold transition-colors ${selectedCategory === category.slug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card/70 hover:border-primary/30"}`}>{category.name}</button>)}
            </div>
          </section>

          <section className="page-wrap pb-20 lg:pb-28">
            <div className="mb-7 flex items-center justify-between gap-4 border-b pb-5">
              <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{totalCount}</span> {totalCount === 1 ? "piece" : "pieces"}</p>
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild><Button variant="outline" className="h-11 rounded-full lg:hidden"><SlidersHorizontal className="mr-2 h-4 w-4" />Price filter</Button></SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-[28px] px-6 pb-8">
                  <SheetHeader><SheetTitle className="font-display text-2xl font-normal">Refine the collection</SheetTitle></SheetHeader>
                  <div className="mt-7"><FilterFields /><Button className="mt-3 h-12 w-full rounded-full" onClick={() => setMobileFiltersOpen(false)}>Show products <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="grid gap-8 lg:grid-cols-[250px_1fr] xl:gap-12">
              <aside className="hidden lg:block">
                <div className="liquid-glass sticky top-28 rounded-[24px] p-6">
                  <p className="section-kicker">Refine</p>
                  <FilterFields />
                </div>
              </aside>

              <div>
                {isLoading ? (
                  <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index}><Skeleton className="aspect-[4/5] rounded-[24px]" /><Skeleton className="mt-4 h-4 w-2/3" /><Skeleton className="mt-3 h-4 w-1/3" /></div>)}</div>
                ) : products.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed bg-card/50 px-6 py-20 text-center"><h2 className="font-display text-3xl font-normal">Nothing here just yet.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">Try another category or widen your price range to see more pieces.</p><Button className="mt-6 rounded-full" onClick={() => { handleCategoryChange(null); setMinPrice("0"); setMaxPrice("50000"); }}>Show all products</Button></div>
                ) : (
                  <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} sales={sales} user={user} />)}</div>
                )}

                {!isLoading && totalPages > 1 && <div className="mt-14 flex justify-center"><Pagination><PaginationContent className="rounded-full border bg-card/70 p-1.5">
                  <PaginationItem><PaginationPrevious href="#" onClick={(event) => { event.preventDefault(); if (currentPage > 1) setCurrentPage(currentPage - 1); }} className={currentPage === 1 ? "pointer-events-none opacity-40" : "cursor-pointer"} /></PaginationItem>
                  {Array.from({ length: totalPages }).map((_, index) => { const page = index + 1; if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) return <PaginationItem key={page}><PaginationLink href="#" onClick={(event) => { event.preventDefault(); setCurrentPage(page); }} isActive={currentPage === page}>{page}</PaginationLink></PaginationItem>; if (page === currentPage - 2 || page === currentPage + 2) return <PaginationItem key={page}><PaginationEllipsis /></PaginationItem>; return null; })}
                  <PaginationItem><PaginationNext href="#" onClick={(event) => { event.preventDefault(); if (currentPage < totalPages) setCurrentPage(currentPage + 1); }} className={currentPage === totalPages ? "pointer-events-none opacity-40" : "cursor-pointer"} /></PaginationItem>
                </PaginationContent></Pagination></div>}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Shop;
