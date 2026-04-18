-- 1. Add del_flg column to bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS del_flg BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_bookings_del_flg ON public.bookings(del_flg);

-- 2. Create booking_delete_history table
CREATE TABLE IF NOT EXISTS public.booking_delete_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  deleted_by_ip TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_delete_history_booking_id
  ON public.booking_delete_history(booking_id);

ALTER TABLE public.booking_delete_history ENABLE ROW LEVEL SECURITY;

-- Public can view history (matches existing booking visibility)
CREATE POLICY "Anyone can view delete history"
ON public.booking_delete_history
FOR SELECT
USING (true);

-- Authenticated users can insert history records
CREATE POLICY "Authenticated users can insert delete history"
ON public.booking_delete_history
FOR INSERT
TO authenticated
WITH CHECK (true);
