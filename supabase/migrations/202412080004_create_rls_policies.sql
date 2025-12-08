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
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() AND is_hqmc_admin = true
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