-- Update business_update_requests status check to include 'acknowledged'
ALTER TABLE business_update_requests DROP CONSTRAINT IF EXISTS business_update_requests_status_check;
ALTER TABLE business_update_requests ADD CONSTRAINT business_update_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'acknowledged'));
