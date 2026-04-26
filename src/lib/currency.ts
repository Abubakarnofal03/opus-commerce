import { supabase } from "@/integrations/supabase/client";

let currentCurrency: 'PKR' | 'AED' = 'PKR';

export const initCurrency = async () => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'store_currency')
      .maybeSingle();

    // Handle both JSON stringified '"AED"' and plain 'AED'
    if (data?.value === '"AED"' || data?.value === 'AED') {
      currentCurrency = 'AED';
    } else {
      currentCurrency = 'PKR';
    }
  } catch (e) {
    console.error("Failed to load currency", e);
  }
};

export const setCurrency = (c: 'PKR' | 'AED') => {
  currentCurrency = c;
};

export const getCurrency = () => currentCurrency;

export const formatPrice = (price: number): string => {
  if (currentCurrency === 'AED') {
    return `AED ${price.toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return `Rs ${price.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};
