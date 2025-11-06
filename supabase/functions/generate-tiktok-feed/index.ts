import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Category mapping to Google Product Taxonomy
const categoryMap: Record<string, string> = {
  "Home & Kitchen": "632",
  "Electronics": "222",
  "Clothing": "166",
  "Beauty": "469",
  "Sports": "499",
  "Toys": "1253",
  "Books": "783",
  "Jewelry": "188",
  "Furniture": "436",
  "Office": "922",
};

const getGoogleCategory = (categoryName: string | null): string => {
  if (!categoryName) return "632"; // Default: Home & Garden
  return categoryMap[categoryName] || "632";
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching products for TikTok feed...');

    // Fetch products with categories
    const { data: products, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    console.log(`Found ${products?.length || 0} products`);

    const storeDomain = "theshoppingcart.shop";
    const brandName = "The Shopping Cart";
    const currency = "PKR";

    // TSV Header
    const headers = [
      'id',
      'title',
      'description',
      'availability',
      'condition',
      'price',
      'link',
      'image_link',
      'brand',
      'google_product_category',
      'product_type',
      'additional_image_link'
    ];

    // Generate TSV rows
    const rows = products?.map((product: any) => {
      const categoryName = product.categories?.name || '';
      const availability = (product.stock_quantity || 0) > 0 ? 'in_stock' : 'out_of_stock';
      const productUrl = `https://${storeDomain}/product/${product.slug}`;
      const mainImage = product.images?.[0] || '';
      const additionalImages = product.images?.slice(1, 4).join(',') || '';
      
      // Clean description (remove newlines and tabs for TSV)
      const cleanDescription = (product.description || '')
        .replace(/[\t\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);

      // Clean title
      const cleanTitle = (product.name || '')
        .replace(/[\t\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return [
        product.id,
        cleanTitle,
        cleanDescription,
        availability,
        'new',
        `${product.price} ${currency}`,
        productUrl,
        mainImage,
        brandName,
        getGoogleCategory(categoryName),
        categoryName,
        additionalImages
      ].join('\t');
    }) || [];

    // Combine headers and rows
    const tsvContent = [headers.join('\t'), ...rows].join('\n');

    console.log(`Generated TSV feed with ${rows.length} products`);

    return new Response(tsvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Content-Disposition': `attachment; filename="tiktok-catalog-feed-${new Date().toISOString().split('T')[0]}.tsv"`,
      },
    });

  } catch (error: any) {
    console.error('Error generating TikTok feed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
