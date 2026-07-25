import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Eye, ShoppingBag, Star } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { calculateSalePrice } from "@/lib/saleUtils";
import { addToGuestCart, GuestCartItem } from "@/lib/cartUtils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    price: number;
    images?: string[];
    image_url?: string;
    gallery_images?: string[];
    is_featured?: boolean;
    stock_quantity?: number;
    shipping_cost?: number;
    categories?: { name: string } | null;
  };
  sales?: any[];
  user?: any;
  onQuickView?: (product: any) => void;
}

export const ProductCard = ({ product, sales = [], user, onQuickView }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const productSale = sales.find((sale: any) => sale.product_id === product.id && sale.is_active) || null;
  const globalSale = sales.find((sale: any) => sale.is_global && sale.is_active) || null;
  const saleInfo = calculateSalePrice(product.price, productSale, globalSale);
  const primaryImage = product.images?.[0] || product.image_url || "/placeholder.svg";
  const secondaryImage = product.images?.[1] || product.gallery_images?.[0] || primaryImage;
  const productUrl = `/product/${encodeURIComponent(product.slug || product.id)}`;
  const soldOut = product.stock_quantity === 0;

  const handleQuickAdd = async () => {
    if (soldOut) return;
    setAdding(true);
    try {
      if (user) {
        const { data: existing, error: findError } = await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("user_id", user.id)
          .eq("product_id", product.id)
          .is("variation_id", null)
          .is("color_id", null)
          .maybeSingle();
        if (findError) throw findError;
        if (existing) {
          const { error } = await supabase.from("cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("cart_items").insert({ user_id: user.id, product_id: product.id, quantity: 1 });
          if (error) throw error;
        }
      } else {
        const item: GuestCartItem = {
          product_id: product.id,
          quantity: 1,
          product_name: product.name,
          product_price: saleInfo.finalPrice,
          product_image: primaryImage,
          shipping_cost: product.shipping_cost || 0,
        };
        addToGuestCart(item);
      }
      window.dispatchEvent(new Event("opus-cart-updated"));
      toast({ title: "Added to your bag", description: `${product.name} is ready for checkout.` });
    } catch (error: any) {
      toast({ title: "We couldn't add that item", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <article className="group flex h-full flex-col" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="relative overflow-hidden rounded-[24px] bg-muted">
        <Link to={productUrl} className="relative block aspect-[4/5] overflow-hidden" aria-label={`View ${product.name}`}>
          <img src={primaryImage} alt={product.name} className={`h-full w-full object-cover transition-all duration-700 ease-out ${isHovered && secondaryImage !== primaryImage ? "scale-105 opacity-0" : "scale-100 opacity-100"}`} loading="lazy" onError={(event) => { (event.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }} />
          {secondaryImage !== primaryImage && <img src={secondaryImage} alt="" aria-hidden="true" className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out ${isHovered ? "scale-105 opacity-100" : "scale-100 opacity-0"}`} loading="lazy" />}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/18 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {saleInfo.discount !== null && <Badge className="rounded-full border-0 bg-card/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground shadow-sm backdrop-blur-xl">Save {saleInfo.discount}%</Badge>}
          {product.is_featured && saleInfo.discount === null && <Badge className="rounded-full border-0 bg-primary/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-sm backdrop-blur-xl"><Star className="mr-1 h-3 w-3 fill-current" />Signature</Badge>}
        </div>

        <div className="absolute inset-x-3 bottom-3 flex gap-2 transition-all duration-300 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
          <button type="button" onClick={handleQuickAdd} disabled={adding || soldOut} className="liquid-glass flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70">
            <ShoppingBag className="h-4 w-4" />{soldOut ? "Sold out" : adding ? "Adding…" : "Quick add"}
          </button>
          {onQuickView && <button type="button" onClick={() => onQuickView(product)} className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full" aria-label={`Quick view ${product.name}`}><Eye className="h-4 w-4" /></button>}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-1 pb-2 pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{product.categories?.name || "Juraab edit"}</span>
          <span className="flex items-center gap-1 text-[11px] font-medium"><Star className="h-3 w-3 fill-accent text-accent" />4.9</span>
        </div>
        <Link to={productUrl} className="flex items-start justify-between gap-3 text-[15px] font-semibold leading-snug text-foreground hover:text-primary/70">
          <span>{product.name}</span><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-base font-semibold text-foreground">{formatPrice(saleInfo.finalPrice)}</span>
          {saleInfo.discount !== null && <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price)}</span>}
        </div>
      </div>
    </article>
  );
};
