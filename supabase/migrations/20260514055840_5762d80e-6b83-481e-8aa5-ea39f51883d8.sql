-- 1. Hide sensitive pharmacist columns from public/authenticated API roles
REVOKE SELECT (ahpra_number, credentialing_body, contact_preference) ON public.pharmacists FROM anon, authenticated;

-- 2. Prevent pharmacists from self-verifying or self-publishing
CREATE OR REPLACE FUNCTION public.guard_pharmacist_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    RAISE EXCEPTION 'Only admins may change verification_status';
  END IF;
  IF NEW.is_published IS DISTINCT FROM OLD.is_published AND NEW.is_published = true AND OLD.verification_status <> 'verified' THEN
    RAISE EXCEPTION 'Profile must be verified before it can be published';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_pharmacist_admin_fields ON public.pharmacists;
CREATE TRIGGER guard_pharmacist_admin_fields
BEFORE UPDATE ON public.pharmacists
FOR EACH ROW EXECUTE FUNCTION public.guard_pharmacist_admin_fields();

-- 3. Lock down system insert policies (server functions use service_role and bypass RLS)
DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;
DROP POLICY IF EXISTS "System inserts audit" ON public.enquiry_audit_events;
DROP POLICY IF EXISTS "System inserts consent" ON public.consent_records;
DROP POLICY IF EXISTS "System inserts email log" ON public.email_send_log;

-- Anonymous enquiry submission still needs to write a consent record. Tie it to the enquiry id.
CREATE POLICY "Consent insert tied to enquiry"
ON public.consent_records FOR INSERT
WITH CHECK (
  enquiry_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.enquiries e
    WHERE e.id = consent_records.enquiry_id
      AND e.consent_given = true
      AND e.created_at > now() - interval '5 minutes'
  )
);

-- 4. Storage: keep individual file reads public, drop bucket-wide listing
-- Photos are stored at deterministic paths so listing is not needed by the app.
DROP POLICY IF EXISTS "Public read pharmacist photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view pharmacist photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

CREATE POLICY "Read individual pharmacist photo"
ON storage.objects FOR SELECT
USING (bucket_id = 'pharmacist-photos');

-- (no LIST/INSERT WITH CHECK true policy)
CREATE POLICY "Pharmacist uploads own photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pharmacist-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Pharmacist updates own photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pharmacist-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Pharmacist deletes own photo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pharmacist-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);