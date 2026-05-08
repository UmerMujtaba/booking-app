-- Add new business fields for registration and profile updates
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS cnic_front_image TEXT,
  ADD COLUMN IF NOT EXISTS cnic_back_image TEXT,
  ADD COLUMN IF NOT EXISTS opening_time TIME,
  ADD COLUMN IF NOT EXISTS closing_time TIME;

ALTER TABLE business_update_requests
  ADD COLUMN IF NOT EXISTS proposed_address TEXT,
  ADD COLUMN IF NOT EXISTS proposed_cnic_front_image TEXT,
  ADD COLUMN IF NOT EXISTS proposed_cnic_back_image TEXT,
  ADD COLUMN IF NOT EXISTS proposed_opening_time TIME,
  ADD COLUMN IF NOT EXISTS proposed_closing_time TIME;
