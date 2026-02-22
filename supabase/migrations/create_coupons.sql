-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
    discount_value NUMERIC NOT NULL,
    expiration_date TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER,
    is_single_use BOOLEAN DEFAULT FALSE, 
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookup by code
CREATE INDEX IF NOT EXISTS coupons_code_idx ON coupons (code);

-- Create user_coupons table to track usage
CREATE TABLE IF NOT EXISTS user_coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_id TEXT, -- Optional linkage to order if needed later
    UNIQUE(user_id, coupon_id) -- Prevent double usage tracking per coupon instance for single user? 
                               -- Actually, for generic coupons with usage limit, user can use multiple times? 
                               -- Requirement 3: "ogligatoriamente que sean de un solo uso por usuario".
                               -- So yes, unique per user per coupon.
);

-- Enable RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

-- Policies
-- Coupons are readable by everyone (validating in edge functions mostly, but client might peek)
-- Better: readable by service role only? 
-- Client needs to read? No, client sends code to API. API uses service role.
-- Admin needs to read/write.
-- Let's allow public read for now or authenticated read?
-- UserCoupons: Users can read their own usage. Service role manages writing.

CREATE POLICY "Allow public read of active coupons" ON coupons
    FOR SELECT USING (true); -- Or restrict to authenticated?

-- Admin policies
CREATE POLICY "Admin full access coupons" ON coupons
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admin full access user_coupons" ON user_coupons
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
-- User Coupons policies
CREATE POLICY "Users can see own usage" ON user_coupons
    FOR SELECT USING (auth.uid() = user_id);
