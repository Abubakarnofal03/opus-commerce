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

    // Helper to escape CSV values
    const escapeCsv = (value: string) => {
      if (!value) return '';
      const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n');
      if (needsQuotes) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // TikTok CSV Format - Exact structure from template
    // Row 1-2: Guidance comments
    const guidanceRow1 = ',"#To learn more guidance about how to fill the attributes correctly, see morehttps://ads.tiktok.com/help/article?aid=10001006';
    const guidanceRow2 = 'We highly recommend you provide sale price, shipping, which can help improve PVR according to the analysis and will be used as a selling point for attraction in ad format. For other attriutes like gender, age, fill in also if your have it, which can help us better recommend your products.",' + ','.repeat(43);

    // Row 3-16: Context with detailed rules (simplified version)
    const contextRow = 'context,"# Required || The unique ID difined by advertiser for each product || Rules: 1.Character limit: 100; 2.Use valid unicode characters; 3.One catalog don\'t allow two identical sku.","Required || The name for each product || Rules: 1.Character limit: 500; 2.Use valid unicode characters; 3.Can match product title from your landing page.","Required || Details to describe each product || Rules: 1.Character limit: 10,000; 2.Use valid unicode characters; 3.Should match product title from landing page; 4.Contents can\'t lead to shop, competitors, related accessories.","Required || The product\'s inventory status || Accepted values: In stock, Available, Preorder, Out of stock, or Discontinued","Required || The product\'s condition status || Accepted values: New, Refurbished, or Used","Required || The price of each product || Rules: 1.Currency much match the catalog\'s default currency; 2.Price & currency should match with the price from landing page and checkout page; 3.Should only be the price for one sku; 4.Example: 9.97 USD","#Required || A link to the product landing page || Rules: 1. Start with x://xxx.xxx/xxx?xxx=xxx, x can be any length or characters, like can started with http, https; 2. Make sure the verified domain name and can be opened successfully to avoid rejection. ","#Required || A link to the product\'s image || Rules: 1.Start with x://xxx.xxx/xxx?xxx=xxx with the verified domain name and make sure can be opened successfully, x can be any length or characters, like can started with http, https; 2.Need link to the main image of your product (≥500*500 piexls), support image with JPG or PNG format; 3.Do not scale up or upload thumbnail, do not upload placeholder or generic image, do not include watermarks or boards; ","Optional || A link to the product\'s video || Start with x://xxx.xxx/xxx?xxx=xxx with the verified domain name and make sure can be opened successfully, x can be any length or characters, like can started with http, https.","Required || The product\'s brand name || Character limit: 150; We strongly recommend you to provide a correct value instead of a meaningless one. ","Optional || Additional image links for the product || Rules: 1.No more than 10 images; 2.Use a comma to separate each link.","Optional || The age group that each product is for || Accepted values: Newborn, Infant, Toddler, Kids, Adult","Optional || The color of each product || Character limit: 100","Optional || The gender that each product is for || Accepted values: Male, Female, Unisex","Optional || The shared attribute that groups product variants have. Also known as the SPU. || Submit correct characters, it\'s a must for you if you have TikTok shop. ","Optional || A preset value from Google\'s product taxonomy || 1.Submit correct and full category of the product in google category if has. This can help improve your ad delivery performance; 2.Please refer to the Google website: https://support.google.com/merchants/answer/6324436?hl=en","Optional || The composition of each product || Character limit: 200","Optional || The pattern of each product || Character limit: 100","Optional || The category of each product || Rules: 1.Submit correct and full category of the product, such as Home > Women > Dresses > Maxi Dresses instead of just Dresses. This can help improve your ad delivery performance; 2.Better use or same with google category if u have it; 3.Only get first three level. ","Optional || The discounted price for each product || Rules: price & currency need match with the price from your landing page and checkout page; 2.Can only be the sale price for one sku, and make sure set correct sale price for discount ed products.","Optional || The time period that the product will be on sale for || Rules：1. Submit the date with format like ""2017-12-01 T0:00/2017-12-31 T0:00""; 2.Use together with sale price, if you has not use together, the sale price will always applies; 3.Start date need before the end date.","Optional || The shipping cost for each product || Recommend written as: COUNTRY:STATE:SHIPPING_TYPE:PRICE:SERVICE. Use "":"" to separate different regions, use "";"" to separate different shipping costs; Example: US:CA:Ground:9.99 USD:Standard","Optional || The shipping weight for each product || Rules: 1.Format: ""number + unit"" (whether there is a space in the middle or not), such as ""0.00kg""; 2.The unit can be one of ""LB"", ""Oz"", ""kg"", ""g"". ","Optional || The global trade ID number","Optional || The manufacturer part number","Optional || The size of each product","Optional || The cost of tax for each product","Optional || The URL of each iOS app || Submit correct iOS url and make sure can be opened successfully if you want to delivery iOS app","Optional || The iOS app store ID || Rules: 1.Submit correct and effective ios app store id which can be searched; 2.App store id and the ios url should direct to the same app .","Optional || The name of each iOS app || Submit correct ios app name, matched the ios app store id and direct to the same app.","Optional | The URL of each iPhone app","Optional | The iPhone app store ID","Optional | The name of each iPhone app","Optional | The URL of each iPad app","Optional | The iPad app store ID","Optional | The name of each iPad app","Optional || The URL of each Android app || Submit correct ios url and make sure can be opened successfully if you want to delivery ios app","Optional || The Android app store ID || Rules: 1.Submit correct and effective andriod package which can be downloaded; 2.andriod package and the andriod url should direct to the same app.","Optional || The name of each Android app || Submit correct android app name, matched the android package and direct to the same app.","Optional | A custom label for each product","Optional | A custom label for each product","Optional | A custom label for each product","Optional | A custom label for each product","Optional | A custom label for each product"';

    // Row 17: Column headers
    const columnsRow = 'columns,sku_id,title,description,availability,condition,price,link,image_link,video_link,brand,additional_image_link,age_group,color,gender,item_group_id,google_product_category,material,pattern,product_type,sale_price,sale_price_effective_date,shipping,shipping_weight,gtin,mpn,size,tax,ios_url,ios_app_store_id,ios_app_name,iPhone_url,iPhone_app_store_id,iPhone_app_name,iPad_url,iPad_app_store_id,iPad_app_name,android_url,android_package,android_app_name,custom_label_0,custom_label_1,custom_label_2,custom_label_3,custom_label_4';

    // Generate product rows (Row 18+)
    const productRows = products?.map((product: any, index: number) => {
      const categoryName = product.categories?.name || '';
      // TikTok requires exact lowercase format for availability
      const availability = (product.stock_quantity || 0) > 0 ? 'In stock' : 'Out of stock';
      const productUrl = `https://${storeDomain}/product/${product.slug}`;
      const mainImage = product.images?.[0] || '';
      const additionalImages = product.images?.slice(1, 10).join(',') || '';
      
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

      // All 45 columns - most are optional/empty
      const row = [
        index === 0 ? 'example' : '', // First data row has "example", rest empty
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
        additionalImages ? `"${additionalImages}"` : '', // additional_image_link
        '', // age_group
        '', // color
        '', // gender
        '', // item_group_id
        getGoogleCategory(categoryName), // google_product_category
        '', // material
        '', // pattern
        categoryName, // product_type
        '', // sale_price
        '', // sale_price_effective_date
        `PK::Standard:${product.shipping_cost} ${currency}`, // shipping
        product.weight_kg ? `${product.weight_kg}kg` : '', // shipping_weight
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

      return row.join(',');
    }) || [];

    // Combine all rows in exact TikTok format
    const csvContent = [
      guidanceRow1,
      guidanceRow2,
      contextRow,
      columnsRow,
      ...productRows
    ].join('\n');

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
