import { ShoppingCart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getGuestCart } from "@/lib/cartUtils";

export const FloatingCartButton = () => {
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [shouldMoveUp, setShouldMoveUp] = useState(false);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      fetchCartCount(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      fetchCartCount(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchCartCount = async (userId?: string) => {
    if (userId) {
      const { count } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      setCartCount(count || 0);
    } else {
      const guestCart = getGuestCart();
      setCartCount(guestCart.length);
    }
  };

  useEffect(() => {
    if (!user) {
      const updateGuestCart = () => {
        const guestCart = getGuestCart();
        setCartCount(guestCart.length);
      };
      
      window.addEventListener('storage', updateGuestCart);
      updateGuestCart();
      
      return () => window.removeEventListener('storage', updateGuestCart);
    }
  }, [user]);

  // Check if on product page and scrolled down to show sticky bar
  useEffect(() => {
    const handleScroll = () => {
      const isProductPage = location.pathname.startsWith('/product/');
      const hasScrolled = window.scrollY > 500;
      setShouldMoveUp(isProductPage && hasScrolled);
    };
    
    handleScroll(); // Check on mount
    window.addEventListener('scroll', handleScroll);
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  return (
    <Link
      to="/cart"
      className={`fixed right-6 z-40 animate-fade-in transition-all duration-300 ${
        shouldMoveUp ? 'bottom-28' : 'bottom-6'
      }`}
    >
      <Button
        size="lg"
        className="relative h-14 w-14 rounded-full glass-button glass-hover"
      >
        <ShoppingCart className="h-6 w-6 text-foreground" />
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
            {cartCount}
          </span>
        )}
      </Button>
    </Link>
  );
};
