import { supabaseClient } from '@/lib/supabase';
import { sanitizeFilename } from '@/lib/validation';

const STORAGE_BUCKET = 'edms-docs';

export interface UploadResult {
  url: string;
  error?: string;
}

export interface StorageOperations {
  uploadFile: (file: File, storagePath: string) => Promise<UploadResult>;
  deleteFile: (storagePath: string) => Promise<boolean>;
  deleteFolder: (folderPrefix: string) => Promise<boolean>;
  extractStoragePath: (url?: string) => string | null;
  buildStoragePath: (unitUic: string, requestId: string, filename: string, index: number) => string;
}

/**
 * Hook for Supabase storage operations
 */
export function useDocumentStorage(): StorageOperations {
  const uploadFile = async (file: File, storagePath: string): Promise<UploadResult> => {
    if (!supabaseClient) {
      return { url: '', error: 'Supabase not configured' };
    }

    try {
      const { error: uploadError } = await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, { upsert: true });

      if (uploadError) {
        return { url: '', error: uploadError.message };
      }

      const { data: urlData } = supabaseClient.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      return { url: urlData?.publicUrl || '' };
    } catch (e) {
      return { url: '', error: e instanceof Error ? e.message : 'Upload failed' };
    }
  };

  const deleteFile = async (storagePath: string): Promise<boolean> => {
    if (!supabaseClient || !storagePath) return false;

    try {
      await supabaseClient.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return true;
    } catch {
      return false;
    }
  };

  const deleteFolder = async (folderPrefix: string): Promise<boolean> => {
    if (!supabaseClient) return false;

    try {
      const { data: files } = await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .list(folderPrefix.replace(/\/$/, ''));

      if (files && files.length > 0) {
        const paths = files.map((f) => `${folderPrefix.replace(/\/$/, '')}/${f.name}`);
        await supabaseClient.storage.from(STORAGE_BUCKET).remove(paths);
      }
      return true;
    } catch {
      return false;
    }
  };

  const extractStoragePath = (url?: string): string | null => {
    if (!url) return null;
    try {
      // Supabase storage URLs look like: https://xxx.supabase.co/storage/v1/object/public/bucket/path/to/file
      const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
      if (match?.[1]) return decodeURIComponent(match[1]);
    } catch {}
    return null;
  };

  const buildStoragePath = (
    unitUic: string,
    requestId: string,
    filename: string,
    index: number
  ): string => {
    const now = Date.now();
    const safeUic = unitUic || 'N-A';
    return `${safeUic}/${requestId}/${now}-${index}-${sanitizeFilename(filename)}`;
  };

  return {
    uploadFile,
    deleteFile,
    deleteFolder,
    extractStoragePath,
    buildStoragePath,
  };
}
