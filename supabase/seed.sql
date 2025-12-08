-- Insert initial HQMC sections
INSERT INTO hqmc_sections (name, type, config) VALUES 
  ('MM - Manpower & Reserve Affairs', 'MM', '{"description": "Manpower and Reserve Affairs section"}'),
  ('MP - Plans, Policies & Operations', 'MP', '{"description": "Plans, Policies and Operations section"}'),
  ('FM - Facilities & Services', 'FM', '{"description": "Facilities and Services section"}');

-- Insert sample requests for each section
INSERT INTO section_requests (section_id, title, description, status, priority, submitted_by) 
SELECT 
  s.id,
  CASE 
    WHEN s.type = 'MM' THEN 'Personnel File Review Request'
    WHEN s.type = 'MP' THEN 'Operational Policy Update'
    WHEN s.type = 'FM' THEN 'Facility Maintenance Request'
  END,
  CASE 
    WHEN s.type = 'MM' THEN 'Request for review of personnel files for upcoming promotion board'
    WHEN s.type = 'MP' THEN 'Update to operational policies based on recent command guidance'
    WHEN s.type = 'FM' THEN 'Maintenance request for HVAC system in Building 2100'
  END,
  'pending',
  'medium',
  (SELECT id FROM auth.users LIMIT 1)
FROM hqmc_sections s;

-- Insert another set of sample requests with different statuses
INSERT INTO section_requests (section_id, title, description, status, priority, submitted_by) 
SELECT 
  s.id,
  CASE 
    WHEN s.type = 'MM' THEN 'Reserve Unit Activation Orders'
    WHEN s.type = 'MP' THEN 'Training Exercise Planning Document'
    WHEN s.type = 'FM' THEN 'Grounds Maintenance Contract Review'
  END,
  CASE 
    WHEN s.type = 'MM' THEN 'Activation orders for reserve units supporting upcoming deployment'
    WHEN s.type = 'MP' THEN 'Planning document for upcoming joint training exercise'
    WHEN s.type = 'FM' THEN 'Review of grounds maintenance contract for HQMC facilities'
  END,
  CASE 
    WHEN s.type = 'MM' THEN 'approved'
    WHEN s.type = 'MP' THEN 'in_review'
    WHEN s.type = 'FM' THEN 'rejected'
  END,
  CASE 
    WHEN s.type = 'MM' THEN 'high'
    WHEN s.type = 'MP' THEN 'medium'
    WHEN s.type = 'FM' THEN 'low'
  END,
  (SELECT id FROM auth.users LIMIT 1)
FROM hqmc_sections s;