-- create table
CREATE TABLE section_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES hqmc_sections(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_review')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    submitted_by UUID NOT NULL REFERENCES auth.users(id),
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create index
CREATE INDEX idx_section_requests_section_id ON section_requests(section_id);
CREATE INDEX idx_section_requests_status ON section_requests(status);
CREATE INDEX idx_section_requests_priority ON section_requests(priority);
CREATE INDEX idx_section_requests_submission_date ON section_requests(submission_date DESC);

-- grant permissions
GRANT SELECT ON section_requests TO anon;
GRANT ALL PRIVILEGES ON section_requests TO authenticated;