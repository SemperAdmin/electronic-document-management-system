-- Mobile Sessions Table
CREATE TABLE mobile_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_info JSONB DEFAULT '{}',
    session_token TEXT UNIQUE NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    biometric_enabled BOOLEAN DEFAULT FALSE,
    offline_mode_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offline Actions Table
CREATE TABLE offline_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    session_id UUID REFERENCES mobile_sessions(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'upload', 'review', 'approve', 'reject')),
    document_id UUID,
    action_data JSONB NOT NULL DEFAULT '{}',
    original_data JSONB DEFAULT '{}',
    conflict_resolution TEXT CHECK (conflict_resolution IN ('client_wins', 'server_wins', 'manual_merge')),
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error', 'conflict')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_sync_attempt TIMESTAMP WITH TIME ZONE,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cached Documents Table (for offline viewing)
CREATE TABLE cached_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    document_id UUID,
    document_data JSONB NOT NULL,
    file_content BYTEA,
    cache_version INTEGER DEFAULT 1,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_favorite BOOLEAN DEFAULT FALSE,
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, device_id, document_id)
);

-- Mobile Device Settings Table
CREATE TABLE mobile_device_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT,
    settings JSONB DEFAULT '{}',
    accessibility_settings JSONB DEFAULT '{}',
    offline_settings JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    biometric_settings JSONB DEFAULT '{}',
    is_primary_device BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

-- Biometric Authentication Table
CREATE TABLE biometric_auth (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    biometric_type TEXT NOT NULL CHECK (biometric_type IN ('fingerprint', 'face', 'iris', 'voice')),
    biometric_data_hash TEXT NOT NULL,
    public_key TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, device_id, biometric_type)
);

-- Create indexes for performance
CREATE INDEX idx_mobile_sessions_user_id ON mobile_sessions(user_id);
CREATE INDEX idx_mobile_sessions_device_id ON mobile_sessions(device_id);
CREATE INDEX idx_mobile_sessions_session_token ON mobile_sessions(session_token);
CREATE INDEX idx_mobile_sessions_expires_at ON mobile_sessions(expires_at);
CREATE INDEX idx_mobile_sessions_last_activity ON mobile_sessions(last_activity_at);
CREATE INDEX idx_mobile_sessions_is_active ON mobile_sessions(is_active);

CREATE INDEX idx_offline_actions_user_id ON offline_actions(user_id);
CREATE INDEX idx_offline_actions_device_id ON offline_actions(device_id);
CREATE INDEX idx_offline_actions_session_id ON offline_actions(session_id);
CREATE INDEX idx_offline_actions_document_id ON offline_actions(document_id);
CREATE INDEX idx_offline_actions_sync_status ON offline_actions(sync_status);
CREATE INDEX idx_offline_actions_created_at ON offline_actions(created_at);

CREATE INDEX idx_cached_documents_user_id ON cached_documents(user_id);
CREATE INDEX idx_cached_documents_device_id ON cached_documents(device_id);
CREATE INDEX idx_cached_documents_document_id ON cached_documents(document_id);
CREATE INDEX idx_cached_documents_expires_at ON cached_documents(expires_at);
CREATE INDEX idx_cached_documents_last_accessed ON cached_documents(last_accessed);

CREATE INDEX idx_mobile_device_settings_user_id ON mobile_device_settings(user_id);
CREATE INDEX idx_mobile_device_settings_device_id ON mobile_device_settings(device_id);

CREATE INDEX idx_biometric_auth_user_id ON biometric_auth(user_id);
CREATE INDEX idx_biometric_auth_device_id ON biometric_auth(device_id);
CREATE INDEX idx_biometric_auth_biometric_type ON biometric_auth(biometric_type);

-- RLS Policies for Mobile Sessions
ALTER TABLE mobile_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mobile sessions" ON mobile_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mobile sessions" ON mobile_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mobile sessions" ON mobile_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mobile sessions" ON mobile_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Offline Actions
ALTER TABLE offline_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own offline actions" ON offline_actions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own offline actions" ON offline_actions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own offline actions" ON offline_actions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own offline actions" ON offline_actions
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Cached Documents
ALTER TABLE cached_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cached documents" ON cached_documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cached documents" ON cached_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cached documents" ON cached_documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cached documents" ON cached_documents
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Mobile Device Settings
ALTER TABLE mobile_device_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own device settings" ON mobile_device_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device settings" ON mobile_device_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device settings" ON mobile_device_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device settings" ON mobile_device_settings
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Biometric Authentication
ALTER TABLE biometric_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own biometric auth" ON biometric_auth
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own biometric auth" ON biometric_auth
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own biometric auth" ON biometric_auth
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own biometric auth" ON biometric_auth
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON mobile_sessions TO anon, authenticated;
GRANT INSERT ON mobile_sessions TO anon, authenticated;
GRANT UPDATE ON mobile_sessions TO anon, authenticated;
GRANT DELETE ON mobile_sessions TO anon, authenticated;

GRANT SELECT ON offline_actions TO anon, authenticated;
GRANT INSERT ON offline_actions TO anon, authenticated;
GRANT UPDATE ON offline_actions TO anon, authenticated;
GRANT DELETE ON offline_actions TO anon, authenticated;

GRANT SELECT ON cached_documents TO anon, authenticated;
GRANT INSERT ON cached_documents TO anon, authenticated;
GRANT UPDATE ON cached_documents TO anon, authenticated;
GRANT DELETE ON cached_documents TO anon, authenticated;

GRANT SELECT ON mobile_device_settings TO anon, authenticated;
GRANT INSERT ON mobile_device_settings TO anon, authenticated;
GRANT UPDATE ON mobile_device_settings TO anon, authenticated;
GRANT DELETE ON mobile_device_settings TO anon, authenticated;

GRANT SELECT ON biometric_auth TO anon, authenticated;
GRANT INSERT ON biometric_auth TO anon, authenticated;
GRANT UPDATE ON biometric_auth TO anon, authenticated;
GRANT DELETE ON biometric_auth TO anon, authenticated;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_mobile_sessions_updated_at BEFORE UPDATE ON mobile_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offline_actions_updated_at BEFORE UPDATE ON offline_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cached_documents_updated_at BEFORE UPDATE ON cached_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mobile_device_settings_updated_at BEFORE UPDATE ON mobile_device_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_biometric_auth_updated_at BEFORE UPDATE ON biometric_auth
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();