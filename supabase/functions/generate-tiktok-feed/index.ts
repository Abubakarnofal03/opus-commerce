import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Category mapping to Google Product Taxonomy (full path format)
const categoryMap: Record<string, string> = {
  "Home & Kitchen": "Home & Garden > Kitchen & Dining",
  "Electronics": "Electronics",
  "Clothing": "Apparel & Accessories > Clothing",
  "Beauty": "Health & Beauty",
  "Sports": "Sporting Goods",
  "Toys": "Toys & Games",
  "Books": "Media > Books",
  "Jewelry": "Apparel & Accessories > Jewelry",
  "Furniture": "Home & Garden > Furniture",
  "Office": "Office Supplies",
};

const getGoogleCategory = (categoryName: string | null): string => {
  if (!categoryName) return "Home & Garden";
  return categoryMap[categoryName] || "Home & Garden";
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

    const storeDomain = "juraab.shop";
    const brandName = "Juraab";
    const currency = "PKR";

    // Helper to escape CSV values
    const escapeCsv = (value: string) => {
      if (!value) return '';
      const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n');
      if (needsQuotes) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Clean CSV format - just headers and data (no template instruction rows)
    const headers = 'sku_id,title,description,availability,condition,price,link,image_link,video_link,brand,additional_image_link,age_group,color,gender,item_group_id,google_product_category,material,pattern,product_type,sale_price,sale_price_effective_date,shipping,shipping_weight,gtin,mpn,size,tax,ios_url,ios_app_store_id,ios_app_name,iPhone_url,iPhone_app_store_id,iPhone_app_name,iPad_url,iPad_app_store_id,iPad_app_name,android_url,android_package,android_app_name,custom_label_0,custom_label_1,custom_label_2,custom_label_3,custom_label_4';

    // Generate product rows
    const productRows = products?.map((product: any) => {
      const categoryName = product.categories?.name || '';
      const availability = (product.stock_quantity || 0) > 0 ? 'in stock' : 'out of stock';
      const productUrl = `https://${storeDomain}/product/${product.slug}`;
      const mainImage = product.images?.[0] || '';
      
      // Additional images - wrapped in quotes with comma separation inside
      const additionalImages = product.images?.slice(1, 10);
      const additionalImageLink = additionalImages && additionalImages.length > 0 
        ? `"${additionalImages.join(',')}"` 
        : '';
      
      // Clean description and title for CSV
      const cleanDescription = (product.description || '')
        .replace(/[\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);

      const cleanTitle = (product.name || '')
        .replace(/[\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const googleCategory = getGoogleCategory(categoryName);

      // All 44 columns (no prefix column)
      const columns = [
        escapeCsv(product.id), // sku_id
        escapeCsv(cleanTitle), // title
        escapeCsv(cleanDescription), // description
        availability, // availability
        'new', // condition
        `${product.price} ${currency}`, // price
        productUrl, // link
        mainImage, // image_link
        product.video_url || '', // video_link
        brandName, // brand
        additionalImageLink, // additional_image_link
        '', // age_group
        '', // color
        '', // gender
        '', // item_group_id
        googleCategory, // google_product_category
        '', // material
        '', // pattern
        categoryName, // product_type
        '', // sale_price
        '', // sale_price_effective_date
        `PK::Standard:${product.shipping_cost} ${currency}`, // shipping
        product.weight_kg ? `${product.weight_kg} kg` : '', // shipping_weight
        '', // gtin
        '', // mpn
        '', // size
        '', // tax
        '', // ios_url
        '', // ios_app_store_id
        '', // ios_app_name
        '', // iPhone_url
        '', // iPhone_app_store_id
        '', // iPhone_app_name
        '', // iPad_url
        '', // iPad_app_store_id
        '', // iPad_app_name
        '', // android_url
        '', // android_package
        '', // android_app_name
        '', // custom_label_0
        '', // custom_label_1
        '', // custom_label_2
        '', // custom_label_3
        '' // custom_label_4
      ];

      return columns.join(',');
    }) || [];

    // Combine header + product rows (clean CSV format)
    const csvContent = [headers, ...productRows].join('\n');

    console.log(`Generated CSV feed with ${productRows.length} products`);

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tiktok-catalog-feed-${new Date().toISOString().split('T')[0]}.csv"`,
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
