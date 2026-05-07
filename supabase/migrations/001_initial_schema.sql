-- Run this in your Supabase SQL Editor to set up the database schema

-- Enums
CREATE TYPE user_role AS ENUM ('customer', 'owner');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'customer',
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Businesses
CREATE TABLE businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  latitude DECIMAL,
  longitude DECIMAL,
  bio TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Businesses are viewable by all" ON businesses FOR SELECT USING (true);
CREATE POLICY "Owners can insert businesses" ON businesses FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own business" ON businesses FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete own business" ON businesses FOR DELETE USING (auth.uid() = owner_id);

-- Services
CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services are viewable by all" ON services FOR SELECT USING (true);
CREATE POLICY "Business owners can manage services" ON services FOR ALL USING (
  auth.uid() = (SELECT owner_id FROM businesses WHERE id = business_id)
);

-- Appointments
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Customers can see their own appointments; owners can see appointments for their business
CREATE POLICY "Customers see own appointments" ON appointments FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Owners see business appointments" ON appointments FOR SELECT USING (
  auth.uid() = (SELECT owner_id FROM businesses WHERE id = business_id)
);
CREATE POLICY "Customers can create appointments" ON appointments FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Owners can update appointment status" ON appointments FOR UPDATE USING (
  auth.uid() = (SELECT owner_id FROM businesses WHERE id = business_id)
);
CREATE POLICY "Customers can cancel pending appointments" ON appointments FOR UPDATE USING (
  auth.uid() = customer_id
);

-- Trigger: auto-create profile after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
