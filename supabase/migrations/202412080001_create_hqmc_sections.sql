-- create table
CREATE TABLE hqmc_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('MM', 'MP', 'FM')),
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create index
CREATE INDEX idx_hqmc_sections_type ON hqmc_sections(type);
CREATE INDEX idx_hqmc_sections_name ON hqmc_sections(name);

-- grant permissions
GRANT SELECT ON hqmc_sections TO anon;
GRANT ALL PRIVILEGES ON hqmc_sections TO authenticated;