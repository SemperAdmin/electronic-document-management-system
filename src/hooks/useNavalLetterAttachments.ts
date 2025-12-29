import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase';
import {
  NavalLetterAttachment,
  NavalLetterAttachmentRow,
  fromNavalLetterAttachmentRow,
} from '@/types/nlf';

const STORAGE_BUCKET = 'naval-letters';

export interface UseNavalLetterAttachmentsResult {
  /** List of naval letter attachments for the request */
  attachments: NavalLetterAttachment[];
  /** Whether the attachments are currently loading */
  loading: boolean;
  /** Error message if the fetch failed */
  error: string | null;
  /** Refetch the attachments */
  refetch: () => Promise<void>;
  /** Download an attachment as a file */
  downloadAttachment: (attachment: NavalLetterAttachment) => Promise<void>;
  /** Get the attachment content as JSON */
  getAttachmentContent: (attachment: NavalLetterAttachment) => Promise<Record<string, any> | null>;
}

/**
 * Hook to fetch and manage naval letter attachments for a request.
 */
export function useNavalLetterAttachments(requestId: string): UseNavalLetterAttachmentsResult {
  const [attachments, setAttachments] = useState<NavalLetterAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttachments = useCallback(async () => {
    if (!supabaseClient || !requestId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabaseClient
        .from('naval_letter_attachments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch naval letter attachments:', fetchError);
        setError(fetchError.message);
        setAttachments([]);
      } else {
        const rows = (data || []) as NavalLetterAttachmentRow[];
        setAttachments(rows.map(fromNavalLetterAttachmentRow));
      }
    } catch (err) {
      console.error('Unexpected error fetching attachments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch attachments');
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  // Initial fetch
  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  // Refetch when window gains focus (user returns from NLF)
  useEffect(() => {
    const handleFocus = () => {
      fetchAttachments();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchAttachments]);

  const downloadAttachment = useCallback(
    async (attachment: NavalLetterAttachment) => {
      if (!supabaseClient) {
        console.error('Supabase not configured');
        return;
      }

      try {
        const { data, error: downloadError } = await supabaseClient.storage
          .from(STORAGE_BUCKET)
          .download(attachment.storagePath);

        if (downloadError) {
          console.error('Download failed:', downloadError);
          return;
        }

        // Create download link
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to download attachment:', err);
      }
    },
    []
  );

  const getAttachmentContent = useCallback(
    async (attachment: NavalLetterAttachment): Promise<Record<string, any> | null> => {
      if (!supabaseClient) {
        console.error('Supabase not configured');
        return null;
      }

      try {
        const { data, error: downloadError } = await supabaseClient.storage
          .from(STORAGE_BUCKET)
          .download(attachment.storagePath);

        if (downloadError) {
          console.error('Failed to get attachment content:', downloadError);
          return null;
        }

        const text = await data.text();
        return JSON.parse(text);
      } catch (err) {
        console.error('Failed to parse attachment content:', err);
        return null;
      }
    },
    []
  );

  return {
    attachments,
    loading,
    error,
    refetch: fetchAttachments,
    downloadAttachment,
    getAttachmentContent,
  };
}

export default useNavalLetterAttachments;
