export interface Sale {
  id: string;
  product_id: string | null;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_global: boolean;
}

export const calculateSalePrice = (
  originalPrice: number,
  productSale: Sale | null,
  globalSale: Sale | null
): { finalPrice: number; discount: number | null } => {
  // Product-specific sale takes priority over global sale
  const activeSale = productSale || globalSale;
  
  if (!activeSale) {
    return { finalPrice: originalPrice, discount: null };
  }

  const discountAmount = (originalPrice * activeSale.discount_percentage) / 100;
  const finalPrice = originalPrice - discountAmount;

  return { 
    finalPrice: Math.round(finalPrice * 100) / 100, 
    discount: activeSale.discount_percentage 
  };
};
