-- Create locations table for filtering
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert top locations
INSERT INTO locations (name) VALUES
  ('Allama Iqbal Town'),
  ('Model Town'),
  ('Johar Town'),
  ('Wapda Town'),
  ('Gulberg'),
  ('Walton'),
  ('DHA'),
  ('Bahria Town'),
  ('Cavalry Ground'),
  ('Garden Town')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view locations
CREATE POLICY "Locations are visible to everyone" ON locations
FOR SELECT USING (true);
