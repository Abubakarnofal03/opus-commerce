import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, ShoppingCart, Star, Package, Truck, ShieldCheck, Eye } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PremiumProductLayoutProps {
  product: any;
  productImages: string[];
  finalPrice: number;
  displayPrice: number;
  discount: number;
  quantity: number;
  setQuantity: (q: number) => void;
  selectedVariation: any;
  setSelectedVariation: (v: any) => void;
  selectedColor: any;
  setSelectedColor: (c: any) => void;
  variations: any[];
  colors: any[];
  onAddToCart: () => void;
  onBuyNow: () => void;
  addToCartMutation: any;
  recentPurchases: number;
  getAvailableStock: () => number;
}

export const PremiumProductLayout = ({
  product,
  productImages,
  finalPrice,
  displayPrice,
  discount,
  quantity,
  setQuantity,
  selectedVariation,
  setSelectedVariation,
  selectedColor,
  setSelectedColor,
  variations,
  colors,
  onAddToCart,
  onBuyNow,
  addToCartMutation,
  recentPurchases,
  getAvailableStock,
}: PremiumProductLayoutProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zoomDialogOpen, setZoomDialogOpen] = useState(false);
  const [viewersCount] = useState(() => Math.floor(Math.random() * 40) + 20); // 20-59 viewers

  const availableStock = getAvailableStock();
  const isOutOfStock = availableStock <= 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
      {/* Left: Image Gallery */}
      <div className="space-y-4">
        {/* Main Image with SALE badge */}
        <div className="relative">
          {discount > 0 && (
            <Badge className="absolute top-4 left-4 z-10 bg-destructive text-destructive-foreground text-lg px-4 py-2 font-bold">
              SALE
            </Badge>
          )}
          
          <div
            className="aspect-square bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl overflow-hidden cursor-zoom-in border-2 border-border/40 hover:border-primary/50 transition-all duration-300 shadow-2xl relative"
            onClick={() => setZoomDialogOpen(true)}
          >
            <img
              src={product.banner_image || productImages[selectedImageIndex] || "/placeholder.svg"}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            
            {/* Certification badges overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <div className="bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-lg">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>
              <div className="bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-lg">
                <Truck className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnail Gallery */}
        {productImages.length > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {productImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImageIndex === index
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border/40 hover:border-primary/30"
                }`}
              >
                <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Video if available */}
        {product.video_url && (
          <div className="aspect-video bg-muted/20 rounded-xl overflow-hidden border border-border/40">
            <video src={product.video_url} controls className="w-full h-full" poster={productImages[0]}>
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>

      {/* Right: Product Info */}
      <div className="space-y-5">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
          {product.name}
        </h1>

        {/* Rating & Reviews */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">6 Reviews</span>
        </div>

        {/* Stock Badge */}
        {!isOutOfStock && (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-sm px-3 py-1">
            In Stock
          </Badge>
        )}

        {/* Social Proof */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-orange-600">
            <Package className="h-4 w-4" />
            <span className="font-medium">{recentPurchases} sold in last 14 hours</span>
          </div>
        </div>

        {/* Price Section */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-foreground">
              {formatPrice(finalPrice)}
            </span>
            {discount > 0 && (
              <>
                <span className="text-2xl text-muted-foreground line-through">
                  {formatPrice(displayPrice)}
                </span>
                <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-base px-3 py-1">
                  Save {formatPrice(displayPrice - finalPrice)} ({discount}% off)
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Buy More and Save Section */}
        {variations && variations.length > 0 && (
          <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/40">
            <p className="font-semibold text-foreground">Buy more and save</p>
            <div className="space-y-2">
              {variations.map((variation, index) => (
                <button
                  key={variation.id}
                  onClick={() => setSelectedVariation(variation)}
                  disabled={variation.quantity <= 0}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    selectedVariation?.id === variation.id
                      ? "border-primary bg-primary/5"
                      : "border-border/40 hover:border-primary/30"
                  } ${variation.quantity <= 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} relative`}
                >
                  {index === 1 && (
                    <Badge className="absolute -top-2 right-2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 font-bold">
                      Popular
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedVariation?.id === variation.id
                        ? "border-primary bg-primary"
                        : "border-border"
                    }`} />
                    <div className="text-left">
                      <div className="font-medium">{variation.name}</div>
                      {variation.quantity <= 0 && (
                        <div className="text-xs text-destructive">Out of stock</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-foreground">{formatPrice(variation.price)}</div>
                    {variation.quantity > 0 && (
                      <div className="text-xs text-muted-foreground line-through">
                        {formatPrice(variation.price * 1.2)}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color Selection */}
        {colors && colors.length > 0 && (
          <div className="space-y-3">
            <p className="font-semibold text-foreground">Select Color</p>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color)}
                  disabled={color.quantity <= 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                    selectedColor?.id === color.id
                      ? "border-primary bg-primary/5"
                      : "border-border/40 hover:border-primary/30"
                  } ${color.quantity <= 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div
                    className="w-6 h-6 rounded-full border border-border"
                    style={{ backgroundColor: color.color_code }}
                  />
                  <span className="font-medium">{color.name}</span>
                  {color.quantity <= 0 && (
                    <span className="text-xs text-destructive">(Out of stock)</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="space-y-2">
          <p className="font-semibold text-foreground">Quantity</p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={isOutOfStock}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
              disabled={isOutOfStock || quantity >= availableStock}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold bg-foreground text-background hover:bg-foreground/90"
            onClick={onAddToCart}
            disabled={addToCartMutation.isPending || isOutOfStock}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {isOutOfStock ? "Out of Stock" : "ADD TO CART"}
          </Button>

          <Button
            size="lg"
            variant="default"
            className="w-full h-14 text-lg font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onBuyNow}
            disabled={addToCartMutation.isPending || isOutOfStock}
          >
            Buy with Cash on Delivery
          </Button>
        </div>

        {/* Delivery Info */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="h-4 w-4" />
            <span>
              <span className="font-semibold text-foreground">ESTIMATED DELIVERY BETWEEN</span> Monday 17 November and Thursday 20 November
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{viewersCount}</span> PEOPLE LOOKING FOR THIS PRODUCT
            </span>
          </div>
        </div>
      </div>

      {/* Image Zoom Dialog */}
      <Dialog open={zoomDialogOpen} onOpenChange={setZoomDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <img
            src={productImages[selectedImageIndex] || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-full object-contain"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
