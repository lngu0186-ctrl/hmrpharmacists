
-- 1) Extend enquiry_status enum
ALTER TYPE enquiry_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE enquiry_status ADD VALUE IF NOT EXISTS 'declined';

-- 2) New columns on enquiries
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS reference_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS decline_reason text,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;

-- 3) Reference code generator (HMR-XXXXXX, base32-ish from random)
CREATE OR REPLACE FUNCTION public.generate_enquiry_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate text;
  attempts int := 0;
BEGIN
  IF NEW.reference_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  LOOP
    candidate := 'HMR-' || upper(substr(translate(encode(gen_random_bytes(6), 'base64'), '+/=OIl01', 'ABCDEFGH'), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.enquiries WHERE reference_code = candidate);
    attempts := attempts + 1;
    IF attempts > 5 THEN
      candidate := 'HMR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      EXIT;
    END IF;
  END LOOP;
  NEW.reference_code := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enquiries_reference ON public.enquiries;
CREATE TRIGGER trg_enquiries_reference
BEFORE INSERT ON public.enquiries
FOR EACH ROW EXECUTE FUNCTION public.generate_enquiry_reference();

-- Backfill any existing rows missing a reference code
UPDATE public.enquiries
SET reference_code = 'HMR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
WHERE reference_code IS NULL;

-- 4) Audit trigger for status transitions
CREATE OR REPLACE FUNCTION public.log_enquiry_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.enquiry_audit_events (enquiry_id, actor_id, event_type, metadata)
    VALUES (NEW.id, NULL, 'created',
      jsonb_build_object('status', NEW.status, 'sender_type', NEW.sender_type));
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.enquiry_audit_events (enquiry_id, actor_id, event_type, metadata)
    VALUES (NEW.id, auth.uid(), 'status_changed',
      jsonb_build_object(
        'from', OLD.status,
        'to', NEW.status,
        'decline_reason', NEW.decline_reason
      ));
    NEW.status_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enquiries_audit_insert ON public.enquiries;
CREATE TRIGGER trg_enquiries_audit_insert
AFTER INSERT ON public.enquiries
FOR EACH ROW EXECUTE FUNCTION public.log_enquiry_status_change();

DROP TRIGGER IF EXISTS trg_enquiries_audit_update ON public.enquiries;
CREATE TRIGGER trg_enquiries_audit_update
BEFORE UPDATE ON public.enquiries
FOR EACH ROW EXECUTE FUNCTION public.log_enquiry_status_change();

-- 5) Allow pharmacist owner to read audit events for their own enquiries
DROP POLICY IF EXISTS "Owner reads enquiry audit" ON public.enquiry_audit_events;
CREATE POLICY "Owner reads enquiry audit"
ON public.enquiry_audit_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enquiries e
    WHERE e.id = enquiry_audit_events.enquiry_id
      AND public.is_pharmacist_owner(e.pharmacist_id, auth.uid())
  )
);

-- 6) Helpful index
CREATE INDEX IF NOT EXISTS idx_enquiry_audit_enquiry ON public.enquiry_audit_events(enquiry_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_pharmacist_status ON public.enquiries(pharmacist_id, status, created_at DESC);
