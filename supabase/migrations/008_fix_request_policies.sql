-- Fix RLS policies for business_update_requests to allow owners to register and acknowledge rejections

-- 0) Make business_id nullable and update status enum
ALTER TABLE business_update_requests ALTER COLUMN business_id DROP NOT NULL;

-- If it's an enum, add the value. If it's text, the constraint was already updated in 007.
DO $$ 
BEGIN 
  ALTER TYPE business_update_request_status ADD VALUE 'acknowledged';
EXCEPTION 
  WHEN others THEN NULL; 
END $$;

-- 1) Update INSERT policy to allow null business_id (for new registrations)
DROP POLICY IF EXISTS "Owners can create update requests for own business" ON business_update_requests;
CREATE POLICY "Owners can create update requests" ON business_update_requests
FOR INSERT
WITH CHECK (
  auth.uid() = requested_by
  AND (
    business_id IS NULL 
    OR 
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_id
        AND b.owner_id = auth.uid()
    )
  )
);

-- 2) Add UPDATE policy to allow owners to acknowledge rejections
DROP POLICY IF EXISTS "Only admins can review requests" ON business_update_requests;
CREATE POLICY "Admins and owners can update requests" ON business_update_requests
FOR UPDATE
USING (
  is_admin(auth.uid())
  OR auth.uid() = requested_by
)
WITH CHECK (
  is_admin(auth.uid())
  OR (
    auth.uid() = requested_by 
    AND status = 'acknowledged'
  )
);
