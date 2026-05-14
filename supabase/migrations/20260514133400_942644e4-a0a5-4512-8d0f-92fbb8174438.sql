
-- Invitation status enum
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- Helper: is this user a verified, published HMR pharmacist?
CREATE OR REPLACE FUNCTION public.is_verified_pharmacist(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacists
    WHERE user_id = _user_id
      AND verification_status = 'verified'
  );
$$;

-- Invitations table
CREATE TABLE public.pharmacist_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_email text NOT NULL,
  invited_first_name text,
  invited_last_name text,
  invited_mobile text,
  invited_ahpra_number text,
  invited_accreditation_number text,
  invited_state text,
  invited_suburb text,
  invited_postcode text,
  personal_note text,
  invited_by uuid NOT NULL,
  invited_by_role text NOT NULL,
  fast_track_verification boolean NOT NULL DEFAULT false,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_user_id uuid,
  revoked_at timestamptz,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  send_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_email ON public.pharmacist_invitations (lower(invited_email));
CREATE INDEX idx_invitations_invited_by ON public.pharmacist_invitations (invited_by);
CREATE INDEX idx_invitations_status ON public.pharmacist_invitations (status);
CREATE INDEX idx_invitations_expires_at ON public.pharmacist_invitations (expires_at);
CREATE UNIQUE INDEX idx_invitations_token_hash ON public.pharmacist_invitations (token_hash);

ALTER TABLE public.pharmacist_invitations ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admin manages invitations"
  ON public.pharmacist_invitations
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Verified pharmacists: insert their own
CREATE POLICY "Verified pharmacist creates invitation"
  ON public.pharmacist_invitations
  FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by
    AND public.is_verified_pharmacist(auth.uid())
  );

-- Inviter: read own invitations
CREATE POLICY "Inviter reads own invitations"
  ON public.pharmacist_invitations
  FOR SELECT
  USING (auth.uid() = invited_by);

-- Inviter: update (resend / revoke) own pending invitations
CREATE POLICY "Inviter updates own invitations"
  ON public.pharmacist_invitations
  FOR UPDATE
  USING (auth.uid() = invited_by)
  WITH CHECK (auth.uid() = invited_by);

-- updated_at trigger
CREATE TRIGGER trg_invitations_updated_at
  BEFORE UPDATE ON public.pharmacist_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit log on inserts/updates
CREATE OR REPLACE FUNCTION public.log_invitation_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  evt text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    evt := 'invitation.created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      evt := 'invitation.status_' || NEW.status::text;
    ELSIF NEW.send_count IS DISTINCT FROM OLD.send_count THEN
      evt := 'invitation.resent';
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.admin_audit_logs (admin_id, action, target_table, target_id, metadata)
  VALUES (
    COALESCE(auth.uid(), NEW.invited_by),
    evt,
    'pharmacist_invitations',
    NEW.id,
    jsonb_build_object(
      'invited_email', NEW.invited_email,
      'status', NEW.status,
      'invited_by', NEW.invited_by
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invitations_audit
  AFTER INSERT OR UPDATE ON public.pharmacist_invitations
  FOR EACH ROW EXECUTE FUNCTION public.log_invitation_event();
