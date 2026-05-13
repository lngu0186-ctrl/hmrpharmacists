
-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin manages notifications" ON public.notifications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Trigger: notify pharmacist on new enquiry
CREATE OR REPLACE FUNCTION public.notify_pharmacist_on_enquiry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ph_user UUID;
  ph_name TEXT;
BEGIN
  SELECT user_id, full_name INTO ph_user, ph_name FROM public.pharmacists WHERE id = NEW.pharmacist_id;
  IF ph_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (
      ph_user,
      'enquiry.new',
      'New referral enquiry',
      COALESCE(NEW.sender_name, 'Someone') || ' sent you a new enquiry',
      '/dashboard',
      jsonb_build_object('enquiry_id', NEW.id, 'sender_type', NEW.sender_type)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_enquiry ON public.enquiries;
CREATE TRIGGER trg_notify_enquiry
  AFTER INSERT ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.notify_pharmacist_on_enquiry();

-- Backfill lat/lng for major AU suburbs already used in seed data
UPDATE public.pharmacists SET latitude = -37.8136, longitude = 144.9631 WHERE suburb ILIKE 'Melbourne%' AND latitude IS NULL;
UPDATE public.pharmacists SET latitude = -37.8167, longitude = 144.9667 WHERE suburb ILIKE 'Carlton%' AND latitude IS NULL;
UPDATE public.pharmacists SET latitude = -37.8068, longitude = 144.9889 WHERE suburb ILIKE 'Fitzroy%' AND latitude IS NULL;
UPDATE public.pharmacists SET latitude = -37.8467, longitude = 144.9931 WHERE suburb ILIKE 'Richmond%' AND latitude IS NULL;
UPDATE public.pharmacists SET latitude = -37.8467, longitude = 145.0019 WHERE suburb ILIKE 'Hawthorn%' AND latitude IS NULL;
UPDATE public.pharmacists SET latitude = -37.8779, longitude = 145.0428 WHERE suburb ILIKE 'Camberwell%' AND latitude IS NULL;
UPDATE public.pharmacists SET latitude = -37.8233, longitude = 145.0451 WHERE suburb ILIKE 'Box Hill%' AND latitude IS NULL;
UPDATE public.pharmacists SET latitude = -37.7170, longitude = 145.0470 WHERE suburb ILIKE 'Preston%' AND latitude IS NULL;
UPDATE public.pharmacists SET latitude = -37.7593, longitude = 145.3392 WHERE suburb ILIKE 'Lilydale%' AND latitude IS NULL;
UPDATE public.pharmacists SET latitude = -38.1499, longitude = 144.3617 WHERE suburb ILIKE 'Geelong%' AND latitude IS NULL;
UPDATE public.pharmacists SET latitude = -36.7570, longitude = 144.2794 WHERE suburb ILIKE 'Bendigo%' AND latitude IS NULL;
UPDATE public.pharmacists SET latitude = -37.5622, longitude = 143.8503 WHERE suburb ILIKE 'Ballarat%' AND latitude IS NULL;
UPDATE public.pharmacists SET latitude = -38.3308, longitude = 144.7297 WHERE suburb ILIKE 'Mornington%' AND latitude IS NULL;
UPDATE public.pharmacists SET latitude = -37.8770, longitude = 144.9786 WHERE suburb ILIKE 'South Yarra%' AND latitude IS NULL;
UPDATE public.pharmacists SET latitude = -37.8569, longitude = 144.9806 WHERE suburb ILIKE 'St Kilda%' AND latitude IS NULL;
