import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronDown, LogOut, Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getGuestCart } from "@/lib/cartUtils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SaleTimer } from "./SaleTimer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const fetchCartCount = async (userId?: string) => {
    if (userId) {
      const { count } = await supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      setCartCount(count || 0);
    } else {
      setCartCount(getGuestCart().reduce((sum, item) => sum + item.quantity, 0));
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        fetchCartCount(session.user.id);
      } else {
        fetchCartCount();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        fetchCartCount(session.user.id);
      } else {
        setIsAdmin(false);
        fetchCartCount();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const updateCart = () => fetchCartCount(user?.id);
    window.addEventListener("storage", updateCart);
    window.addEventListener("opus-cart-updated", updateCart);
    return () => {
      window.removeEventListener("storage", updateCart);
      window.removeEventListener("opus-cart-updated", updateCart);
    };
  }, [user]);

  useEffect(() => setMobileMenuOpen(false), [location.pathname, location.search]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "You are signed out" });
    navigate("/");
  };

  const navLink = (path: string) =>
    `rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors ${
      location.pathname === path ? "bg-primary/8 text-primary" : "text-foreground/72 hover:bg-primary/5 hover:text-foreground"
    }`;

  return (
    <>
      <SaleTimer />
      <header className="sticky top-0 z-50 py-1.5 sm:py-3">
        <div className="page-wrap">
          <nav className="liquid-glass flex h-[60px] items-center justify-between rounded-[20px] px-2.5 sm:h-[68px] sm:rounded-[24px] sm:px-5" aria-label="Main navigation">
            <Link to="/" className="group flex min-w-0 items-center gap-3 rounded-full pr-2" aria-label="Juraab home">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-display text-xl italic text-primary-foreground shadow-md transition-transform group-hover:-rotate-6 sm:h-10 sm:w-10 sm:text-2xl">J</span>
              <span className="hidden min-[390px]:block">
                <span className="block text-[17px] font-semibold tracking-[0.22em] text-foreground">JURAAB</span>
                <span className="block text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Objects for living</span>
              </span>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              <Link to="/" className={navLink("/")}>Home</Link>
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="h-auto rounded-full bg-transparent px-4 py-2.5 text-[15px] font-medium text-foreground/72 hover:bg-primary/5 hover:text-foreground data-[state=open]:bg-primary/5">
                      Shop
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-64 space-y-1 p-3">
                        <NavigationMenuLink asChild>
                          <Link to="/shop" className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-muted">View all products</Link>
                        </NavigationMenuLink>
                        {categories.map((category) => (
                          <NavigationMenuLink key={category.id} asChild>
                            <Link to={`/shop?category=${category.slug}`} className="block rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                              {category.name}
                            </Link>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
              <Link to="/about" className={navLink("/about")}>Our story</Link>
              <Link to="/contact" className={navLink("/contact")}>Help</Link>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden lg:block"><ThemeToggle /></div>
              <Link to="/cart" className="relative flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold transition-colors hover:bg-primary/5 sm:min-h-11 sm:gap-2 sm:px-3" aria-label={`Shopping bag with ${cartCount} items`}>
                <ShoppingBag className="h-5 w-5" strokeWidth={1.7} />
                <span className="hidden sm:inline">Bag</span>
                {cartCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{cartCount}</span>}
              </Link>

              <div className="hidden md:block">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-11 rounded-full px-3"><User className="mr-2 h-4 w-4" />Account</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-2xl p-2">
                      <DropdownMenuItem onClick={() => navigate("/orders")} className="rounded-xl">My orders</DropdownMenuItem>
                      {isAdmin && <DropdownMenuItem onClick={() => navigate("/admin")} className="rounded-xl">Admin dashboard</DropdownMenuItem>}
                      <DropdownMenuItem onClick={handleLogout} className="rounded-xl"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button onClick={() => navigate("/auth")} className="h-11 rounded-full px-5">Sign in</Button>
                )}
              </div>

              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="h-10 w-10 rounded-full md:hidden" aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </nav>

          {mobileMenuOpen && (
            <div className="liquid-glass mt-2 rounded-[20px] p-3 md:hidden animate-fade-in">
              <div className="space-y-1">
                <Link to="/" className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted">Home</Link>
                <Collapsible open={shopOpen} onOpenChange={setShopOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                    Shop <ChevronDown className={`h-4 w-4 transition-transform ${shopOpen ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-3 border-l pl-3">
                    <Link to="/shop" className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-muted">All products</Link>
                    {categories.map((category) => <Link key={category.id} to={`/shop?category=${category.slug}`} className="block rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{category.name}</Link>)}
                  </CollapsibleContent>
                </Collapsible>
                <Link to="/about" className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted">Our story</Link>
                <Link to="/contact" className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted">Help & contact</Link>
                <Link to="/orders" className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted">Track an order</Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="block rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15 dark:bg-primary/15 dark:hover:bg-primary/20"
                  >
                    Admin dashboard
                  </Link>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">Appearance</span><ThemeToggle /></div>
                {user ? <Button variant="outline" onClick={handleLogout} className="rounded-full">Sign out</Button> : <Button onClick={() => navigate("/auth")} className="rounded-full px-6">Sign in</Button>}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
};
