-- RBAC, admin-managed business onboarding, approval workflow, and activity logs

-- 1) Extend roles to include admin
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- 2) Business approval fields
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

UPDATE businesses
SET approved = true
WHERE approved IS DISTINCT FROM true;

-- 3) Approval requests for critical business profile changes
CREATE TABLE IF NOT EXISTS business_update_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  proposed_name TEXT NOT NULL,
  proposed_category TEXT NOT NULL,
  proposed_bio TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role user_role,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Shared helpers
CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = uid AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.log_activity(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID;
  v_role user_role;
BEGIN
  v_uid := auth.uid();
  SELECT role INTO v_role FROM profiles WHERE id = v_uid;

  INSERT INTO activity_logs (actor_id, actor_role, action, entity_type, entity_id, metadata)
  VALUES (v_uid, v_role, p_action, p_entity_type, p_entity_id, COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_activity(TEXT, TEXT, UUID, JSONB) TO authenticated;

-- Prevent privilege escalation during signup metadata ingestion
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role TEXT;
  safe_role user_role;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  safe_role := CASE WHEN requested_role IN ('customer', 'owner') THEN requested_role::user_role ELSE 'customer' END;

  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    safe_role,
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Businesses policies
DROP POLICY IF EXISTS "Businesses are viewable by all" ON businesses;
DROP POLICY IF EXISTS "Owners can insert businesses" ON businesses;
DROP POLICY IF EXISTS "Owners can update own business" ON businesses;
DROP POLICY IF EXISTS "Owners can delete own business" ON businesses;

CREATE POLICY "Approved businesses visible to all" ON businesses
FOR SELECT
USING (approved = true OR auth.uid() = owner_id OR is_admin(auth.uid()));

CREATE POLICY "Only admins can create businesses" ON businesses
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update businesses" ON businesses
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete businesses" ON businesses
FOR DELETE
USING (is_admin(auth.uid()));

-- 6) Services policies (owner can only manage own business services, admin can manage all)
DROP POLICY IF EXISTS "Business owners can manage services" ON services;

CREATE POLICY "Owners and admins can manage services" ON services
FOR ALL
USING (
  is_admin(auth.uid())
  OR auth.uid() = (SELECT b.owner_id FROM businesses b WHERE b.id = services.business_id)
)
WITH CHECK (
  is_admin(auth.uid())
  OR auth.uid() = (SELECT b.owner_id FROM businesses b WHERE b.id = services.business_id)
);

-- 7) Business update request policies
ALTER TABLE business_update_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can create update requests for own business" ON business_update_requests
FOR INSERT
WITH CHECK (
  auth.uid() = requested_by
  AND EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = business_id
      AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners can view own requests" ON business_update_requests
FOR SELECT
USING (
  auth.uid() = requested_by
  OR is_admin(auth.uid())
);

CREATE POLICY "Only admins can review requests" ON business_update_requests
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 8) Activity log policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all activity logs" ON activity_logs
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Users can read their own activity logs" ON activity_logs
FOR SELECT
USING (actor_id = auth.uid());

CREATE POLICY "Authenticated users can insert their own logs" ON activity_logs
FOR INSERT
WITH CHECK (actor_id = auth.uid());
