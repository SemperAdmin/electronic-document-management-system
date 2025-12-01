ALTER TABLE public.edms_requests
  ADD CONSTRAINT edms_requests_uploaded_by_fk
  FOREIGN KEY (uploaded_by_id)
  REFERENCES public.edms_users(id)
  ON DELETE CASCADE;

ALTER TABLE public.edms_requests
  ADD CONSTRAINT edms_requests_submit_for_fk
  FOREIGN KEY (submit_for_user_id)
  REFERENCES public.edms_users(id)
  ON DELETE CASCADE;

ALTER TABLE public.edms_documents
  ADD CONSTRAINT edms_documents_request_fk
  FOREIGN KEY (request_id)
  REFERENCES public.edms_requests(id)
  ON DELETE CASCADE;
