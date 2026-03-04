-- ==========================================
-- Production Supabase Schema for DND Purchase
-- Optimized for Large Entries & High Traffic
-- ==========================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fast text searching if needed later

-- 2. CREATE TABLES

-- Buyers Table
CREATE TABLE IF NOT EXISTS public.buyers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password TEXT NOT NULL,
  company TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company', 'individual')),
  aadhaar_number TEXT,
  aadhaar_document_path TEXT,
  gstin TEXT,
  gst_certificate_path TEXT,
  display_name TEXT,
  verified BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sellers Table
CREATE TABLE IF NOT EXISTS public.sellers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password TEXT NOT NULL,
  company TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company', 'individual')),
  gstin TEXT,
  gst_certificate_path TEXT,
  aadhaar_number TEXT,
  aadhaar_document_path TEXT,
  display_name TEXT,
  verified BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inquiries Table
CREATE TABLE IF NOT EXISTS public.inquiries (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'bidding', 'closed')),
  bidding_deadline TIMESTAMP WITH TIME ZONE,
  delivery_address TEXT,
  district TEXT,
  state TEXT,
  pin_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS public.products (
  product_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inquiry Items Table
CREATE TABLE IF NOT EXISTS public.inquiry_items (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  product TEXT NOT NULL REFERENCES public.products(name),
  payment_terms TEXT NOT NULL,
  options JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offers Table
CREATE TABLE IF NOT EXISTS public.offers (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  inquiry_item_id TEXT NOT NULL REFERENCES public.inquiry_items(id) ON DELETE CASCADE,
  seller_id TEXT NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  seller_name TEXT NOT NULL,
  price_per_ton NUMERIC NOT NULL,
  comments TEXT,
  pdf_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'disqualified')),
  rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Makers Table
CREATE TABLE IF NOT EXISTS public.product_makers (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
  maker_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Options Table
CREATE TABLE IF NOT EXISTS public.product_options (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  option_type TEXT NOT NULL CHECK (option_type IN ('text', 'number', 'dropdown', 'checkbox')),
  dropdown_values TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, option_name, option_type)
);

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  options TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. ADVANCED INDEXING FOR LARGE DATASETS
-- ==========================================

-- Standard lookups
CREATE INDEX IF NOT EXISTS idx_buyers_email ON public.buyers(email);
CREATE INDEX IF NOT EXISTS idx_sellers_email ON public.sellers(email);

-- Compound indexes for large inquiries tables queries (Sorting & Filtering)
-- 1. Buyer Dashboard: Load buyer's queries sorted by newest
CREATE INDEX IF NOT EXISTS idx_inquiries_buyer_created ON public.inquiries(buyer_id, created_at DESC);
-- 2. Seller Dashboard: Load active open inquiries fast
CREATE INDEX IF NOT EXISTS idx_inquiries_status_created ON public.inquiries(status, created_at DESC);

-- Foreign key lookups (Required for fast JOINs and ON DELETE CASCADE)
CREATE INDEX IF NOT EXISTS idx_inquiry_items_inquiry_id ON public.inquiry_items(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_offers_inquiry_id ON public.offers(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_offers_inquiry_item_id ON public.offers(inquiry_item_id);

-- Compound indexes for large offers tables queries
-- 1. Identify winning offers (Low price first per item)
CREATE INDEX IF NOT EXISTS idx_offers_item_price ON public.offers(inquiry_item_id, price_per_ton ASC);
-- 2. Seller Dashboard: Fast load of a seller's submitted offers
CREATE INDEX IF NOT EXISTS idx_offers_seller_created ON public.offers(seller_id, created_at DESC);
-- 3. Analytics / Filtering: Fast lookup by status
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);

-- GIN Index for JSONB (High performance searching inside JSON fields)
-- Crucial for handling thousands of dynamic "options" permutations
CREATE INDEX IF NOT EXISTS idx_inquiry_items_options ON public.inquiry_items USING GIN (options);


-- ==========================================
-- 4. OPTIMIZED FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_accepted_offers_for_buyer(buyer_id TEXT)
RETURNS TABLE(
  id TEXT,
  inquiry_id TEXT,
  inquiry_item_id TEXT,
  seller_id TEXT,
  seller_name TEXT,
  price_per_ton NUMERIC,
  comments TEXT,
  pdf_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT,
  rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.inquiry_id, o.inquiry_item_id, o.seller_id, o.seller_name,
         o.price_per_ton, o.comments, o.pdf_url, o.contact_email, o.contact_phone,
         o.status, o.rank, o.created_at, o.updated_at
  FROM public.offers o
  INNER JOIN public.inquiries i ON o.inquiry_id = i.id
  WHERE i.buyer_id = $1 AND o.status = 'accepted'
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE; -- Marked as STABLE for query optimizer caching


-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_makers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Default permissive policies for existing application API architecture
-- NOTE: For strict production, map these explicitly to auth.uid() if using Supabase Auth
CREATE POLICY "Enable all for buyers" ON public.buyers FOR ALL USING (true);
CREATE POLICY "Enable all for sellers" ON public.sellers FOR ALL USING (true);
CREATE POLICY "Enable all for inquiries" ON public.inquiries FOR ALL USING (true);
CREATE POLICY "Enable all for inquiry_items" ON public.inquiry_items FOR ALL USING (true);
CREATE POLICY "Enable all for offers" ON public.offers FOR ALL USING (true);
CREATE POLICY "Enable all for products" ON public.products FOR ALL USING (true);
CREATE POLICY "Enable all for product_makers" ON public.product_makers FOR ALL USING (true);
CREATE POLICY "Enable all for product_options" ON public.product_options FOR ALL USING (true);
CREATE POLICY "Enable all for categories" ON public.categories FOR ALL USING (true);
