-- create table
CREATE TABLE section_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    section_id UUID NOT NULL REFERENCES hqmc_sections(id),
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'manager', 'admin')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, section_id)
);

-- create index
CREATE INDEX idx_section_members_user_id ON section_members(user_id);
CREATE INDEX idx_section_members_section_id ON section_members(section_id);

-- grant permissions
GRANT SELECT ON section_members TO anon;
GRANT ALL PRIVILEGES ON section_members TO authenticated;