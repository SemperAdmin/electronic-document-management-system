-- Create a separate table to track admin users
CREATE TABLE hqmc_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Grant permissions
GRANT SELECT ON hqmc_admins TO anon;
GRANT ALL PRIVILEGES ON hqmc_admins TO authenticated;

-- Users can view sections they are members of
CREATE POLICY "Members can view assigned sections" ON hqmc_sections
    FOR SELECT USING (
        id IN (
            SELECT section_id FROM section_members 
            WHERE user_id = auth.uid()
        )
    );

-- Admins can view all sections
CREATE POLICY "Admins can view all sections" ON hqmc_sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM hqmc_admins 
            WHERE user_id = auth.uid()
        )
    );

-- Section members can view requests in their section
CREATE POLICY "Members can view section requests" ON section_requests
    FOR SELECT USING (
        section_id IN (
            SELECT section_id FROM section_members 
            WHERE user_id = auth.uid()
        )
    );

-- Users can create requests in their section
CREATE POLICY "Members can create section requests" ON section_requests
    FOR INSERT WITH CHECK (
        section_id IN (
            SELECT section_id FROM section_members 
            WHERE user_id = auth.uid()
        )
    );