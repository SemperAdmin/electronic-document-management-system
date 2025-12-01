CREATE TABLE IF NOT EXISTS public.edms_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  rank text,
  first_name text,
  last_name text,
  mi text,
  service text,
  role text,
  unit_uic text,
  unit text,
  company text,
  is_unit_admin boolean DEFAULT false,
  is_command_staff boolean DEFAULT false,
  edipi text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edms_requests (
  id text PRIMARY KEY,
  subject text NOT NULL,
  due_date text,
  notes text,
  unit_uic text,
  uploaded_by_id text NOT NULL,
  submit_for_user_id text,
  document_ids text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  current_stage text,
  activity jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.edms_documents (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text,
  size bigint,
  uploaded_at timestamptz,
  category text,
  tags text[] DEFAULT '{}',
  unit_uic text,
  subject text,
  due_date text,
  notes text,
  uploaded_by_id text,
  current_stage text,
  request_id text,
  file_url text
);

CREATE INDEX IF NOT EXISTS idx_edms_documents_request_id ON public.edms_documents(request_id);
CREATE INDEX IF NOT EXISTS idx_edms_documents_uploaded_by ON public.edms_documents(uploaded_by_id);
CREATE INDEX IF NOT EXISTS idx_edms_requests_uploaded_by ON public.edms_requests(uploaded_by_id);

ALTER TABLE public.edms_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.edms_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.edms_documents DISABLE ROW LEVEL SECURITY;
