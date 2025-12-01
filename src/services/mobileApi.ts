import { supabase } from '../lib/supabase';

export interface BiometricRegistrationData {
  user_id: string;
  device_id: string;
  biometric_type: 'fingerprint' | 'face' | 'iris' | 'voice';
  biometric_data: any;
  public_key: string;
}

export interface CameraUploadData {
  user_id: string;
  document_title?: string;
  document_type?: string;
  unit_id?: string;
  metadata?: Record<string, any>;
  offline_action?: boolean;
  device_id?: string;
  session_id?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

class MobileAPIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/mobile';
  }

  // Biometric Authentication Methods
  async registerBiometric(data: BiometricRegistrationData): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/biometric?action=register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Biometric registration error:', error);
      throw error;
    }
  }

  async authenticateBiometric(data: Partial<BiometricRegistrationData>): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/biometric?action=authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Biometric authentication error:', error);
      throw error;
    }
  }

  async verifyBiometric(user_id: string, device_id: string, biometric_type: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/biometric?action=verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id, device_id, biometric_type }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Biometric verification error:', error);
      throw error;
    }
  }

  async deleteBiometric(user_id: string, device_id: string, biometric_type: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/biometric?action=delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id, device_id, biometric_type }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Biometric deletion error:', error);
      throw error;
    }
  }

  async listBiometric(user_id: string, device_id?: string): Promise<any> {
    try {
      const params = new URLSearchParams({ user_id });
      if (device_id) {
        params.append('device_id', device_id);
      }

      const response = await fetch(`${this.baseUrl}/biometric?action=list&${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Biometric list error:', error);
      throw error;
    }
  }

  // Camera Upload Methods
  async uploadCameraFile(
    file: File,
    data: CameraUploadData,
    onProgress?: UploadProgressCallback
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', data.user_id);
      
      if (data.document_title) {
        formData.append('document_title', data.document_title);
      }
      
      if (data.document_type) {
        formData.append('document_type', data.document_type);
      }
      
      if (data.unit_id) {
        formData.append('unit_id', data.unit_id);
      }
      
      if (data.metadata) {
        formData.append('metadata', JSON.stringify(data.metadata));
      }
      
      if (data.offline_action) {
        formData.append('offline_action', 'true');
        if (data.device_id) {
          formData.append('device_id', data.device_id);
        }
        if (data.session_id) {
          formData.append('session_id', data.session_id);
        }
      }

      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100)
            };
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });

        xhr.open('POST', `${this.baseUrl}/camera-upload`);
        xhr.send(formData);
      });

    } catch (error) {
      console.error('Camera upload error:', error);
      throw error;
    }
  }

  // Mobile Session Management
  async createMobileSession(user_id: string, device_id: string, device_info: any): Promise<any> {
    try {
      const sessionData = {
        user_id,
        device_id,
        device_info,
        session_token: this.generateSessionToken(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        last_activity_at: new Date().toISOString(),
        is_active: true,
        biometric_enabled: false,
        offline_mode_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('mobile_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create mobile session error:', error);
      throw error;
    }
  }

  async updateMobileSession(session_id: string, updates: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('mobile_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', session_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update mobile session error:', error);
      throw error;
    }
  }

  async getMobileSession(session_id: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('mobile_sessions')
        .select('*')
        .eq('id', session_id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get mobile session error:', error);
      throw error;
    }
  }

  // Offline Actions Management
  async createOfflineAction(actionData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('offline_actions')
        .insert({
          ...actionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create offline action error:', error);
      throw error;
    }
  }

  async syncOfflineActions(user_id: string, device_id: string): Promise<any> {
    try {
      // Get pending offline actions
      const { data: pendingActions, error: fetchError } = await supabase
        .from('offline_actions')
        .select('*')
        .eq('user_id', user_id)
        .eq('device_id', device_id)
        .eq('sync_status', 'pending')
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      const syncedActions = [];
      const failedActions = [];

      // Process each pending action
      for (const action of pendingActions || []) {
        try {
          // Here you would implement the actual sync logic
          // For now, we'll just mark them as synced
          const { error: updateError } = await supabase
            .from('offline_actions')
            .update({
              sync_status: 'synced',
              synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', action.id);

          if (updateError) throw updateError;
          syncedActions.push(action);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          
          // Update retry count and status
          const newRetryCount = (action.retry_count || 0) + 1;
          const newStatus = newRetryCount >= (action.max_retries || 3) ? 'error' : 'pending';

          await supabase
            .from('offline_actions')
            .update({
              retry_count: newRetryCount,
              sync_status: newStatus,
              error_message: error.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', action.id);

          failedActions.push({ action, error: error.message });
        }
      }

      return {
        success: true,
        synced: syncedActions.length,
        failed: failedActions.length,
        synced_actions: syncedActions,
        failed_actions: failedActions
      };
    } catch (error) {
      console.error('Sync offline actions error:', error);
      throw error;
    }
  }

  // Utility Methods
  private generateSessionToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  // WebAuthn/Passkey Support (for future implementation)
  async registerWebAuthnCredential(credentialData: any): Promise<any> {
    // Implementation for WebAuthn credential registration
    throw new Error('WebAuthn support not implemented yet');
  }

  async authenticateWebAuthn(credentialData: any): Promise<any> {
    // Implementation for WebAuthn authentication
    throw new Error('WebAuthn support not implemented yet');
  }
}

export const mobileAPIService = new MobileAPIService();