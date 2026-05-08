-- Add push_token to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
