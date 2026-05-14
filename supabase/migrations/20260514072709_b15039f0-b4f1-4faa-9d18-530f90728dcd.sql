
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS sender_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_enquiries_sender_user_id
  ON public.enquiries(sender_user_id);

-- Allow authenticated senders to attach themselves on insert (in addition to existing public insert).
DROP POLICY IF EXISTS "Anyone can submit enquiry" ON public.enquiries;
CREATE POLICY "Anyone can submit enquiry"
  ON public.enquiries FOR INSERT
  WITH CHECK (
    consent_given = true
    AND (sender_user_id IS NULL OR sender_user_id = auth.uid())
  );

-- Senders can read their own enquiries.
DROP POLICY IF EXISTS "Sender views own enquiries" ON public.enquiries;
CREATE POLICY "Sender views own enquiries"
  ON public.enquiries FOR SELECT
  USING (sender_user_id IS NOT NULL AND sender_user_id = auth.uid());

-- Senders can read the audit timeline for their own enquiries.
DROP POLICY IF EXISTS "Sender reads enquiry audit" ON public.enquiry_audit_events;
CREATE POLICY "Sender reads enquiry audit"
  ON public.enquiry_audit_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.enquiries e
    WHERE e.id = enquiry_audit_events.enquiry_id
      AND e.sender_user_id = auth.uid()
  ));
