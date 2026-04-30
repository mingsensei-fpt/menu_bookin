-- 1. Roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'super_admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Anyone authenticated can view roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 2. Sealed flag on bookings
ALTER TABLE public.bookings
ADD COLUMN is_sealed boolean NOT NULL DEFAULT false,
ADD COLUMN sealed_at timestamptz,
ADD COLUMN sealed_by uuid;

-- 3. Replace booking RLS to respect sealed + super_admin permanent delete
DROP POLICY IF EXISTS "Authenticated users can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can delete bookings" ON public.bookings;

CREATE POLICY "Authenticated can update non-sealed; super_admin always"
ON public.bookings FOR UPDATE
TO authenticated
USING (is_sealed = false OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (is_sealed = false OR public.has_role(auth.uid(), 'super_admin'));

-- Only super_admin can hard-delete
CREATE POLICY "Super admins can permanently delete bookings"
ON public.bookings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- 4. Allow super_admin to delete history rows
CREATE POLICY "Super admins can delete history"
ON public.booking_delete_history FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));