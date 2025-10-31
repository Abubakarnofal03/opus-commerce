import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, Menu, X, LogOut, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getGuestCart } from "@/lib/cartUtils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SaleTimer } from "./SaleTimer";
import logo from "@/assets/logo.jpg";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [shopOpen, setShopOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        fetchCartCount(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        fetchCartCount(session.user.id);
      } else {
        setIsAdmin(false);
        setCartCount(0);
      }
    });

    fetchCategories();

    return () => subscription.unsubscribe();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    setCategories(data || []);
  };

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const fetchCartCount = async (userId?: string) => {
    if (userId) {
      const { count } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      setCartCount(count || 0);
    } else {
      // Guest user - use session storage
      const guestCart = getGuestCart();
      setCartCount(guestCart.length);
    }
  };

  // Update cart count for guest users when cart changes
  useEffect(() => {
    if (!user) {
      const updateGuestCart = () => {
        const guestCart = getGuestCart();
        setCartCount(guestCart.length);
      };
      
      window.addEventListener('storage', updateGuestCart);
      // Check on mount
      updateGuestCart();
      
      return () => window.removeEventListener('storage', updateGuestCart);
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out successfully" });
    navigate("/");
  };

  return (
    <>
      <SaleTimer />
      <nav className="sticky top-4 z-50 px-4 md:px-6">
        <div className="glass-card rounded-full border border-white/20 shadow-2xl backdrop-blur-2xl">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex h-16 md:h-20 items-center justify-between">
            {/* Logo - Always Visible */}
            <Link to="/" className="flex items-center space-x-3 flex-shrink-0">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full overflow-hidden ring-2 ring-accent/30 shadow-lg">
                <img src={logo} alt="The Shopping Cart" className="h-full w-full object-cover" />
              </div>
              <h1 className="text-base md:text-xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent hidden sm:block">
                The Shopping Cart
              </h1>
            </Link>

            {/* Desktop Navigation - Centered */}
            <div className="hidden lg:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
              <Link to="/" className="text-sm font-medium hover:text-accent transition-colors">
                Home
              </Link>
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="text-sm font-medium bg-transparent hover:bg-transparent data-[state=open]:bg-transparent hover:text-accent transition-colors h-auto p-0">
                      Catalog
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-48 p-2 glass-card rounded-2xl border border-white/20">
                        <NavigationMenuLink asChild>
                          <Link
                            to="/shop"
                            className="block px-3 py-2 text-sm hover:bg-accent/10 rounded-xl transition-colors"
                          >
                            All Products
                          </Link>
                        </NavigationMenuLink>
                        {categories.map((category) => (
                          <NavigationMenuLink key={category.id} asChild>
                            <Link
                              to={`/shop?category=${category.slug}`}
                              className="block px-3 py-2 text-sm hover:bg-accent/10 rounded-xl transition-colors"
                            >
                              {category.name}
                            </Link>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
              <Link to="/about" className="text-sm font-medium hover:text-accent transition-colors">
                About
              </Link>
              <Link to="/contact" className="text-sm font-medium hover:text-accent transition-colors">
                Contact
              </Link>
            </div>

            {/* Actions */}
            <div className="hidden lg:flex items-center space-x-2">
              <ThemeToggle />
              <Link to="/cart" className="relative">
                <Button variant="ghost" size="icon" className="hover:bg-accent/10 rounded-full">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-lg">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </Link>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover:bg-accent/10 rounded-full">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-card border-white/20 rounded-2xl z-[100]">
                    <DropdownMenuItem onClick={() => navigate('/orders')} className="rounded-xl">
                      My Orders
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')} className="rounded-xl">
                        Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout} className="rounded-xl">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => navigate('/auth')} className="rounded-full">
                  Sign In
                </Button>
              )}
            </div>

            {/* Mobile Actions - Only Hamburger Menu */}
            <div className="flex lg:hidden items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="hover:bg-accent/10 rounded-full"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="glass-card rounded-3xl border border-white/20 shadow-2xl backdrop-blur-2xl py-6 space-y-4 mt-4 mx-4 animate-fade-in">
            {/* Cart Item at Top */}
            <Link
              to="/cart"
              className="flex items-center justify-between px-6 py-3 hover:bg-accent/10 transition-colors rounded-2xl mx-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Cart
              </span>
              {cartCount > 0 && (
                <span className="bg-accent text-accent-foreground text-xs rounded-full h-6 w-6 flex items-center justify-center shadow-lg">
                  {cartCount}
                </span>
              )}
            </Link>
            <div className="h-px bg-border/30 mx-4" />
            <div className="flex items-center justify-between px-6">
              <span className="text-sm font-medium">Theme</span>
              <ThemeToggle />
            </div>
              <Link
                to="/"
                className="block px-6 py-3 text-sm font-medium hover:bg-accent/10 transition-colors rounded-2xl mx-4"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Collapsible open={shopOpen} onOpenChange={setShopOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-6 py-3 text-sm font-medium hover:bg-accent/10 transition-colors rounded-2xl mx-4">
                  Catalog
                  <ChevronDown className={`h-4 w-4 transition-transform ${shopOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-8 space-y-2 pt-2">
                  <Link
                    to="/shop"
                    className="block px-6 py-2 text-sm hover:bg-accent/10 transition-colors rounded-xl mx-4"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    All Products
                  </Link>
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/shop?category=${category.slug}`}
                      className="block px-6 py-2 text-sm hover:bg-accent/10 transition-colors rounded-xl mx-4"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {category.name}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
              <Link
                to="/about"
                className="block px-6 py-3 text-sm font-medium hover:bg-accent/10 transition-colors rounded-2xl mx-4"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                to="/contact"
                className="block px-6 py-3 text-sm font-medium hover:bg-accent/10 transition-colors rounded-2xl mx-4"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>
              <div className="h-px bg-border/30 mx-4 my-2" />
              {user ? (
                <>
                  <Link
                    to="/orders"
                    className="block px-6 py-3 text-sm font-medium hover:bg-accent/10 transition-colors rounded-2xl mx-4"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Orders
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="block px-6 py-3 text-sm font-medium hover:bg-accent/10 transition-colors rounded-2xl mx-4"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="block px-6 py-3 text-left w-full text-sm font-medium hover:bg-accent/10 transition-colors rounded-2xl mx-4"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="px-4">
                  <Button
                    onClick={() => {
                      navigate('/auth');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full rounded-full"
                  >
                    Sign In
                  </Button>
                </div>
              )}
          </div>
        )}
      </nav>
    </>
  );
};