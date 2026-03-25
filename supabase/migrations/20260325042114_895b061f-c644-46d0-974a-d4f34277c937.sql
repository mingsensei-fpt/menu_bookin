
-- Create locations table
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  table_prefix text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create restaurant_tables table
CREATE TABLE public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  table_name text NOT NULL,
  capacity integer NOT NULL DEFAULT 2,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(location_id, table_name)
);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- Public read for both
CREATE POLICY "Anyone can view locations" ON public.locations FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can view tables" ON public.restaurant_tables FOR SELECT TO public USING (true);

-- Add location_id to bookings
ALTER TABLE public.bookings ADD COLUMN location_id uuid REFERENCES public.locations(id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
