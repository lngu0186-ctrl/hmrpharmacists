CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  subject text,
  status text NOT NULL,
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_send_log_created_at_idx ON public.email_send_log (created_at DESC);
CREATE INDEX IF NOT EXISTS email_send_log_template_idx ON public.email_send_log (template_name);
CREATE INDEX IF NOT EXISTS email_send_log_status_idx ON public.email_send_log (status);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads email log"
  ON public.email_send_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System inserts email log"
  ON public.email_send_log FOR INSERT
  WITH CHECK (true);
