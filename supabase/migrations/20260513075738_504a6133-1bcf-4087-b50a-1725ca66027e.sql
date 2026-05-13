
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'pharmacist', 'user');
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'needs_review', 'rejected', 'expired');
CREATE TYPE public.enquiry_sender_type AS ENUM ('patient', 'gp', 'clinic', 'pharmacy');
CREATE TYPE public.enquiry_status AS ENUM ('new', 'acknowledged', 'responded', 'closed');

-- Profiles (general user info)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles updatable by owner" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles insertable by owner" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles (separate table — security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Pharmacists
CREATE TABLE public.pharmacists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  photo_url TEXT,
  years_experience INTEGER,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  telehealth BOOLEAN NOT NULL DEFAULT false,
  home_visits BOOLEAN NOT NULL DEFAULT true,
  accepting_referrals BOOLEAN NOT NULL DEFAULT true,
  turnaround_days INTEGER,
  ahpra_number TEXT,
  credentialing_body TEXT,
  contact_preference TEXT,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pharmacists_state ON public.pharmacists(state);
CREATE INDEX idx_pharmacists_postcode ON public.pharmacists(postcode);
CREATE INDEX idx_pharmacists_published ON public.pharmacists(is_published, verification_status);
ALTER TABLE public.pharmacists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view approved pharmacists" ON public.pharmacists FOR SELECT
  USING (is_published = true AND verification_status = 'verified');
CREATE POLICY "Pharmacist can view own record" ON public.pharmacists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Pharmacist can update own record" ON public.pharmacists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Pharmacist can insert own record" ON public.pharmacists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins full access pharmacists" ON public.pharmacists FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper: is pharmacist visible publicly
CREATE OR REPLACE FUNCTION public.pharmacist_is_public(_pharmacist_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.pharmacists WHERE id = _pharmacist_id AND is_published = true AND verification_status = 'verified');
$$;

CREATE OR REPLACE FUNCTION public.is_pharmacist_owner(_pharmacist_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.pharmacists WHERE id = _pharmacist_id AND user_id = _user_id);
$$;

-- Service areas
CREATE TABLE public.pharmacist_service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacist_id UUID NOT NULL REFERENCES public.pharmacists(id) ON DELETE CASCADE,
  suburb TEXT NOT NULL,
  state TEXT,
  postcode TEXT,
  radius_km INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_areas_pharmacist ON public.pharmacist_service_areas(pharmacist_id);
CREATE INDEX idx_service_areas_postcode ON public.pharmacist_service_areas(postcode);
ALTER TABLE public.pharmacist_service_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read service areas of public pharmacists" ON public.pharmacist_service_areas FOR SELECT USING (public.pharmacist_is_public(pharmacist_id));
CREATE POLICY "Owner manages service areas" ON public.pharmacist_service_areas FOR ALL
  USING (public.is_pharmacist_owner(pharmacist_id, auth.uid())) WITH CHECK (public.is_pharmacist_owner(pharmacist_id, auth.uid()));
CREATE POLICY "Admin manages service areas" ON public.pharmacist_service_areas FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Languages
CREATE TABLE public.pharmacist_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacist_id UUID NOT NULL REFERENCES public.pharmacists(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pharmacist_id, language)
);
ALTER TABLE public.pharmacist_languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read languages of public pharmacists" ON public.pharmacist_languages FOR SELECT USING (public.pharmacist_is_public(pharmacist_id));
CREATE POLICY "Owner manages languages" ON public.pharmacist_languages FOR ALL
  USING (public.is_pharmacist_owner(pharmacist_id, auth.uid())) WITH CHECK (public.is_pharmacist_owner(pharmacist_id, auth.uid()));
CREATE POLICY "Admin manages languages" ON public.pharmacist_languages FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Specialties
CREATE TABLE public.pharmacist_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacist_id UUID NOT NULL REFERENCES public.pharmacists(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pharmacist_id, specialty)
);
CREATE INDEX idx_specialties_pharmacist ON public.pharmacist_specialties(pharmacist_id);
CREATE INDEX idx_specialties_name ON public.pharmacist_specialties(specialty);
ALTER TABLE public.pharmacist_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read specialties of public pharmacists" ON public.pharmacist_specialties FOR SELECT USING (public.pharmacist_is_public(pharmacist_id));
CREATE POLICY "Owner manages specialties" ON public.pharmacist_specialties FOR ALL
  USING (public.is_pharmacist_owner(pharmacist_id, auth.uid())) WITH CHECK (public.is_pharmacist_owner(pharmacist_id, auth.uid()));
CREATE POLICY "Admin manages specialties" ON public.pharmacist_specialties FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Affiliations
CREATE TABLE public.pharmacist_affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacist_id UUID NOT NULL REFERENCES public.pharmacists(id) ON DELETE CASCADE,
  organisation TEXT NOT NULL,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pharmacist_affiliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read affiliations of public pharmacists" ON public.pharmacist_affiliations FOR SELECT USING (public.pharmacist_is_public(pharmacist_id));
CREATE POLICY "Owner manages affiliations" ON public.pharmacist_affiliations FOR ALL
  USING (public.is_pharmacist_owner(pharmacist_id, auth.uid())) WITH CHECK (public.is_pharmacist_owner(pharmacist_id, auth.uid()));
CREATE POLICY "Admin manages affiliations" ON public.pharmacist_affiliations FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enquiries (privacy-safe)
CREATE TABLE public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacist_id UUID NOT NULL REFERENCES public.pharmacists(id) ON DELETE CASCADE,
  sender_type enquiry_sender_type NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT,
  organisation TEXT,
  patient_suburb TEXT,
  patient_postcode TEXT,
  message TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  status enquiry_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_enquiries_pharmacist ON public.enquiries(pharmacist_id);
CREATE INDEX idx_enquiries_status ON public.enquiries(status);
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
-- Anyone (including unauthenticated) can submit
CREATE POLICY "Anyone can submit enquiry" ON public.enquiries FOR INSERT WITH CHECK (consent_given = true);
CREATE POLICY "Pharmacist views own enquiries" ON public.enquiries FOR SELECT
  USING (public.is_pharmacist_owner(pharmacist_id, auth.uid()));
CREATE POLICY "Pharmacist updates own enquiries" ON public.enquiries FOR UPDATE
  USING (public.is_pharmacist_owner(pharmacist_id, auth.uid()));
CREATE POLICY "Admin full access enquiries" ON public.enquiries FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enquiry audit
CREATE TABLE public.enquiry_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.enquiry_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads enquiry audit" ON public.enquiry_audit_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts audit" ON public.enquiry_audit_events FOR INSERT WITH CHECK (true);

-- Verification records
CREATE TABLE public.verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacist_id UUID NOT NULL REFERENCES public.pharmacists(id) ON DELETE CASCADE,
  status verification_status NOT NULL DEFAULT 'pending',
  evidence_url TEXT,
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages verification" ON public.verification_records FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner views own verification summary" ON public.verification_records FOR SELECT
  USING (public.is_pharmacist_owner(pharmacist_id, auth.uid()));

-- Consent records
CREATE TABLE public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE SET NULL,
  consent_type TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  given_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT
);
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads consent" ON public.consent_records FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts consent" ON public.consent_records FOR INSERT WITH CHECK (true);

-- Admin audit logs
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads audit logs" ON public.admin_audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Content pages (CMS)
CREATE TABLE public.content_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body JSONB,
  is_published BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published pages" ON public.content_pages FOR SELECT USING (is_published = true);
CREATE POLICY "Admin manages pages" ON public.content_pages FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_pharmacists_updated BEFORE UPDATE ON public.pharmacists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_enquiries_updated BEFORE UPDATE ON public.enquiries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_content_pages_updated BEFORE UPDATE ON public.content_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
