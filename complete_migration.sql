-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  images TEXT[] DEFAULT '{}',
  stock_quantity INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_zip TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create cart_items table
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for categories (public read, admin write)
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for products (public read, admin write)
CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for order_items
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order items" ON public.order_items
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for cart_items
CREATE POLICY "Users can view own cart" ON public.cart_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cart" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, slug, description) VALUES
  ('Home Décor', 'home-decor', 'Premium home decoration items'),
  ('Men''s Wallets', 'mens-wallets', 'Luxury wallets for men'),
  ('Women''s Wallets', 'womens-wallets', 'Elegant wallets for women');

-- Add banners table for dynamic homepage banners
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add product_images table for multiple product images
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add SKU to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE;

-- Update orders table for guest checkout
ALTER TABLE public.orders 
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Enable RLS for banners
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Banners policies
CREATE POLICY "Anyone can view active banners"
  ON public.banners FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage banners"
  ON public.banners FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Enable RLS for product_images
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Product images policies
CREATE POLICY "Anyone can view product images"
  ON public.product_images FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage product images"
  ON public.product_images FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Add trigger for banners updated_at
CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert dummy categories
INSERT INTO public.categories (name, slug, description, image_url) VALUES
  ('Home Décor', 'home-decor', 'Premium home decoration items', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800'),
  ('Men''s Wallets', 'mens-wallets', 'Luxury leather wallets for men', 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800'),
  ('Women''s Wallets', 'womens-wallets', 'Elegant wallets for women', 'https://images.unsplash.com/photo-1591561954555-607968c989ab?w=800')
ON CONFLICT (slug) DO NOTHING;

-- Insert dummy products
INSERT INTO public.products (name, slug, description, price, stock_quantity, category_id, is_featured, sku, images) 
SELECT 
  'Premium Leather Wallet',
  'premium-leather-wallet',
  'Handcrafted genuine leather wallet with multiple card slots',
  89.99,
  25,
  c.id,
  true,
  'PLW-001',
  ARRAY['https://images.unsplash.com/photo-1627123424574-724758594e93?w=800']
FROM public.categories c WHERE c.slug = 'mens-wallets'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (name, slug, description, price, stock_quantity, category_id, is_featured, sku, images)
SELECT 
  'Elegant Wall Mirror',
  'elegant-wall-mirror',
  'Gold-framed decorative mirror perfect for living spaces',
  149.99,
  15,
  c.id,
  true,
  'EWM-001',
  ARRAY['https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800']
FROM public.categories c WHERE c.slug = 'home-decor'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (name, slug, description, price, stock_quantity, category_id, is_featured, sku, images)
SELECT 
  'Designer Clutch',
  'designer-clutch',
  'Sophisticated leather clutch with premium finish',
  119.99,
  20,
  c.id,
  true,
  'DC-001',
  ARRAY['https://images.unsplash.com/photo-1591561954555-607968c989ab?w=800']
FROM public.categories c WHERE c.slug = 'womens-wallets'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (name, slug, description, price, stock_quantity, category_id, sku, images)
SELECT 
  'Modern Table Lamp',
  'modern-table-lamp',
  'Elegant brass table lamp with warm lighting',
  79.99,
  30,
  c.id,
  'MTL-001',
  ARRAY['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800']
FROM public.categories c WHERE c.slug = 'home-decor'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (name, slug, description, price, stock_quantity, category_id, sku, images)
SELECT 
  'Executive Wallet',
  'executive-wallet',
  'Professional bifold wallet with RFID protection',
  99.99,
  18,
  c.id,
  'EW-001',
  ARRAY['https://images.unsplash.com/photo-1627123424574-724758594e93?w=800']
FROM public.categories c WHERE c.slug = 'mens-wallets'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (name, slug, description, price, stock_quantity, category_id, sku, images)
SELECT 
  'Luxury Card Holder',
  'luxury-card-holder',
  'Slim leather card holder with metallic accents',
  69.99,
  35,
  c.id,
  'LCH-001',
  ARRAY['https://images.unsplash.com/photo-1591561954555-607968c989ab?w=800']
FROM public.categories c WHERE c.slug = 'womens-wallets'
ON CONFLICT (slug) DO NOTHING;

-- Insert dummy banners
INSERT INTO public.banners (title, subtitle, image_url, link_url, active, sort_order) VALUES
  ('Elevate Your Lifestyle', 'Discover premium home décor and luxury leather accessories', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1920', '/shop', true, 1),
  ('New Collection', 'Handcrafted leather goods for the discerning customer', 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=1920', '/shop?category=mens-wallets', true, 2)
ON CONFLICT DO NOTHING;

-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create storage bucket for store images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-images',
  'store-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- Allow public read access to images
CREATE POLICY "Public can view store images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'store-images');

-- Allow admins to upload images
CREATE POLICY "Admins can upload store images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update images
CREATE POLICY "Admins can update store images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete images
CREATE POLICY "Admins can delete store images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow guest users to create orders (user_id can be null for guest orders)
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create guest orders"
ON public.orders
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) OR (user_id IS NULL)
);

-- Allow guest users to view their own orders by email
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view orders"
ON public.orders
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  (user_id IS NULL)
);

-- Allow guest users to create order items
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
CREATE POLICY "Users can create order items"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM orders
    WHERE (orders.id = order_items.order_id) 
    AND ((orders.user_id = auth.uid()) OR (orders.user_id IS NULL))
  )
);

-- Allow guest users to view their order items
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view order items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM orders
    WHERE (orders.id = order_items.order_id) 
    AND ((orders.user_id = auth.uid()) OR (orders.user_id IS NULL))
  )
);

-- Add shipping cost column to products table
ALTER TABLE public.products
ADD COLUMN shipping_cost numeric DEFAULT 0 NOT NULL;

-- Create sales table for individual product sales and global sales
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  discount_percentage NUMERIC NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT product_or_global CHECK (
    (is_global = true AND product_id IS NULL) OR 
    (is_global = false AND product_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage sales" 
ON public.sales 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active sales" 
ON public.sales 
FOR SELECT 
USING (is_active = true AND end_date > now());

-- Create trigger for timestamps
CREATE TRIGGER update_sales_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_sales_product_id ON public.sales(product_id);
CREATE INDEX idx_sales_active ON public.sales(is_active, end_date);
CREATE INDEX idx_sales_global ON public.sales(is_global) WHERE is_global = true;

-- Add show_text_overlay column to banners table
ALTER TABLE public.banners 
ADD COLUMN show_text_overlay boolean NOT NULL DEFAULT true;

-- Add video_url column to products table
ALTER TABLE public.products 
ADD COLUMN video_url text;

-- Update storage bucket to allow video uploads
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/ogg'],
  file_size_limit = 52428800  -- 50MB in bytes
WHERE id = 'store-images';

-- Add SEO fields to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS focus_keywords TEXT[];

-- Add SEO fields to categories table
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS focus_keywords TEXT[];

-- Create blogs table for content marketing
CREATE TABLE IF NOT EXISTS public.blogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  meta_title TEXT,
  meta_description TEXT,
  focus_keywords TEXT[],
  featured_image_url TEXT,
  author TEXT DEFAULT 'The Shopping Cart',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on blogs
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Anyone can view published blogs
CREATE POLICY "Anyone can view published blogs"
ON public.blogs
FOR SELECT
USING (published = true);

-- Admins can manage blogs
CREATE POLICY "Admins can manage blogs"
ON public.blogs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for blogs updated_at
CREATE TRIGGER update_blogs_updated_at
BEFORE UPDATE ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample blog posts
INSERT INTO public.blogs (title, slug, content, excerpt, meta_title, meta_description, focus_keywords, published, featured_image_url) VALUES
(
  'Top 10 Home Decor Trends in Pakistan 2025',
  'top-10-home-decor-trends-pakistan-2025',
  '<h2>Transform Your Space with Latest Home Decor Trends</h2><p>Discover the hottest home decor trends sweeping across Pakistan in 2025. From minimalist aesthetics to bold statement pieces, we''re exploring what''s making Pakistani homes beautiful this year.</p><h3>1. Sustainable Materials</h3><p>Eco-friendly furniture and decor made from sustainable materials are gaining popularity...</p><h3>2. Bold Color Palettes</h3><p>Pakistani homeowners are embracing vibrant colors and patterns...</p><h3>3. Multifunctional Furniture</h3><p>Space-saving designs that serve multiple purposes...</p>',
  'Explore the top 10 home decor trends in Pakistan for 2025. Find inspiration for your home with our expert guide to furniture, accessories, and design.',
  'Top 10 Home Decor Trends in Pakistan 2025 | The Shopping Cart',
  'Discover the hottest home decor trends in Pakistan for 2025. From sustainable furniture to bold colors - transform your space with The Shopping Cart.',
  ARRAY['home decor', 'Pakistan', 'interior design', 'furniture trends', 'home accessories', '2025 trends'],
  true,
  '/placeholder.svg'
),
(
  'Best Wallets for Men & Women – 2025 Complete Guide',
  'best-wallets-men-women-2025-guide',
  '<h2>Find Your Perfect Wallet</h2><p>Choosing the right wallet is more than just style - it''s about functionality, durability, and personal expression. Our 2025 guide covers everything you need to know.</p><h3>Men''s Wallets</h3><p>From classic bifolds to modern minimalist designs, explore the best men''s wallets available online in Pakistan...</p><h3>Women''s Wallets</h3><p>Elegant, practical, and stylish - find women''s wallets that complement any outfit...</p><h3>Materials Matter</h3><p>Genuine leather vs synthetic - what''s best for you?</p>',
  'Complete guide to choosing the best wallets for men and women in 2025. Compare styles, materials, and find your perfect wallet at The Shopping Cart.',
  'Best Wallets for Men & Women – 2025 Guide | The Shopping Cart',
  'Expert guide to the best wallets for men and women in 2025. Shop premium leather wallets online in Pakistan with fast delivery at TheShoppingCart.shop.',
  ARRAY['wallets', 'men wallets', 'women wallets', 'leather wallets', 'buy wallets online', 'Pakistan'],
  true,
  '/placeholder.svg'
),
(
  'Affordable Furniture & Garden Decorations Online in Pakistan',
  'affordable-furniture-garden-decorations-pakistan',
  '<h2>Shop Premium Yet Affordable Home & Garden Items</h2><p>Looking for quality furniture and garden decorations without breaking the bank? The Shopping Cart brings you the best deals on premium home and outdoor decor.</p><h3>Furniture for Every Room</h3><p>From bedroom sets to living room sofas, find affordable furniture that doesn''t compromise on quality...</p><h3>Garden & Outdoor Decor</h3><p>Transform your outdoor spaces with beautiful garden decorations, planters, and accessories...</p><h3>Why Shop Online?</h3><p>Convenience, better prices, and delivery to your doorstep across Pakistan.</p>',
  'Shop affordable furniture and garden decorations online in Pakistan. Quality home decor and outdoor accessories delivered fast. TheShoppingCart.shop',
  'Affordable Furniture & Garden Decorations | The Shopping Cart',
  'Buy affordable furniture and garden decorations online in Pakistan. Premium quality, fast delivery across Pakistan. Shop now at TheShoppingCart.shop.',
  ARRAY['affordable furniture', 'garden decorations', 'online shopping Pakistan', 'home decor', 'outdoor accessories', 'furniture online'],
  true,
  '/placeholder.svg'
);

-- Create reviews table
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  reviewer_avatar text,
  is_verified boolean NOT NULL DEFAULT false,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_title text NOT NULL,
  review_text text NOT NULL,
  review_images text[] DEFAULT '{}',
  review_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view reviews"
  ON public.reviews
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage reviews"
  ON public.reviews
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);

-- Make shipping_state and shipping_zip nullable since they're no longer required
ALTER TABLE public.orders 
  ALTER COLUMN shipping_state DROP NOT NULL,
  ALTER COLUMN shipping_zip DROP NOT NULL;

-- Create product_variations table
CREATE TABLE product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view product variations"
ON product_variations FOR SELECT
USING (true);

CREATE POLICY "Admins can manage product variations"
ON product_variations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for better performance
CREATE INDEX idx_product_variations_product_id ON product_variations(product_id);

-- Add trigger for updated_at
CREATE TRIGGER update_product_variations_updated_at
BEFORE UPDATE ON product_variations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add variation tracking to cart_items
ALTER TABLE cart_items
ADD COLUMN variation_id UUID REFERENCES product_variations(id) ON DELETE SET NULL,
ADD COLUMN variation_name TEXT,
ADD COLUMN variation_price NUMERIC;

-- Add variation tracking to order_items
ALTER TABLE order_items
ADD COLUMN variation_id UUID REFERENCES product_variations(id) ON DELETE SET NULL,
ADD COLUMN variation_name TEXT,
ADD COLUMN variation_price NUMERIC;

-- Add apply_sale column to product_variations table
ALTER TABLE public.product_variations 
ADD COLUMN apply_sale boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.product_variations.apply_sale IS 'Whether to apply product/global sales to this variation';

-- Add admin_notes column to orders table for admin to add notes
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS admin_notes text;

-- Add new fields to orders table
ALTER TABLE public.orders 
ADD COLUMN customer_confirmation text,
ADD COLUMN courier_company text;

-- Add weight_kg column to products table
ALTER TABLE public.products 
ADD COLUMN weight_kg numeric(10,2) NULL;

-- Add quantity column to product_variations table
ALTER TABLE public.product_variations
ADD COLUMN quantity integer NOT NULL DEFAULT 0;

-- Create product_colors table
CREATE TABLE public.product_colors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  color_code text NOT NULL,
  price numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  apply_sale boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on product_colors
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;

-- Create policies for product_colors
CREATE POLICY "Anyone can view product colors"
ON public.product_colors
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage product colors"
ON public.product_colors
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_product_colors_updated_at
BEFORE UPDATE ON public.product_colors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add color columns to cart_items table
ALTER TABLE public.cart_items
ADD COLUMN color_id uuid REFERENCES public.product_colors(id) ON DELETE SET NULL,
ADD COLUMN color_name text,
ADD COLUMN color_code text,
ADD COLUMN color_price numeric;

-- Make price column nullable in product_colors table
ALTER TABLE public.product_colors 
ALTER COLUMN price DROP NOT NULL;

-- Add color columns to order_items table
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS color_id uuid,
ADD COLUMN IF NOT EXISTS color_name text,
ADD COLUMN IF NOT EXISTS color_code text,
ADD COLUMN IF NOT EXISTS color_price numeric;

-- Add RLS policies for admins to manage order items
CREATE POLICY "Admins can update order items"
ON public.order_items
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete order items"
ON public.order_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create promotional_bars table for rotating top bar messages
CREATE TABLE IF NOT EXISTS public.promotional_bars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  background_color TEXT NOT NULL DEFAULT 'hsl(var(--destructive))',
  text_color TEXT NOT NULL DEFAULT 'hsl(var(--destructive-foreground))',
  icon TEXT DEFAULT '🔥',
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_countdown BOOLEAN NOT NULL DEFAULT false,
  end_date TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotional_bars ENABLE ROW LEVEL SECURITY;

-- Anyone can view active promotional bars
CREATE POLICY "Anyone can view active promotional bars"
  ON public.promotional_bars
  FOR SELECT
  USING (is_active = true);

-- Admins can manage promotional bars
CREATE POLICY "Admins can manage promotional bars"
  ON public.promotional_bars
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_promotional_bars_updated_at
  BEFORE UPDATE ON public.promotional_bars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create analytics_events table for tracking user behavior
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  page_path TEXT,
  user_id UUID,
  session_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_events_page_path ON public.analytics_events(page_path);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert analytics events
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events
FOR INSERT
WITH CHECK (true);

-- Only admins can view analytics
CREATE POLICY "Admins can view analytics"
ON public.analytics_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add sort_order column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Create an index for better performance when ordering
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);

-- Initialize sort_order values based on created_at (older products get higher numbers)
UPDATE products 
SET sort_order = subquery.row_num 
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num 
  FROM products
) AS subquery 
WHERE products.id = subquery.id;

-- Add user_id column to track who submitted the review
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Update RLS policy: Only show verified reviews to public
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view approved reviews" 
ON reviews FOR SELECT 
USING (is_verified = true);

-- New policy: Authenticated users can submit their own reviews
CREATE POLICY "Authenticated users can submit reviews" 
ON reviews FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_verified = false);

-- Allow authenticated users to upload review images
CREATE POLICY "Authenticated users can upload review images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-images' 
  AND (storage.foldername(name))[1] = 'reviews'
);

-- Allow anyone to view review images (bucket is public)
CREATE POLICY "Anyone can view review images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'store-images' 
  AND (storage.foldername(name))[1] = 'reviews'
);

-- Allow users to update their own review images
CREATE POLICY "Users can update review images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-images' 
  AND (storage.foldername(name))[1] = 'reviews'
);

-- Allow users to delete review images
CREATE POLICY "Users can delete review images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-images' 
  AND (storage.foldername(name))[1] = 'reviews'
);

-- Add premium_layout field to products table
ALTER TABLE products ADD COLUMN premium_layout BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX idx_products_premium_layout ON products(premium_layout) WHERE premium_layout = true;

-- Add banner_image field to products table for premium layout
ALTER TABLE products ADD COLUMN IF NOT EXISTS banner_image text;

-- Add index for faster queries on premium layout products
CREATE INDEX IF NOT EXISTS idx_products_premium_layout ON products(premium_layout) WHERE premium_layout = true;

-- Change banner_image from text to text array to support multiple banners
ALTER TABLE products 
ALTER COLUMN banner_image TYPE text[] 
USING CASE 
  WHEN banner_image IS NULL THEN NULL
  WHEN banner_image = '' THEN NULL
  ELSE ARRAY[banner_image]
END;

-- Update the column default
ALTER TABLE products 
ALTER COLUMN banner_image SET DEFAULT '{}'::text[];

