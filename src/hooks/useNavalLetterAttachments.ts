import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { DocumentRecord, fromDocRow } from '@/lib/db';

const STORAGE_BUCKET = 'edms-docs';

export interface UseNavalLetterAttachmentsResult {
  /** List of naval letter documents for the request */
  documents: DocumentRecord[];
  /** Whether the documents are currently loading */
  loading: boolean;
  /** Error message if the fetch failed */
  error: string | null;
  /** Refetch the documents */
  refetch: () => Promise<void>;
  /** Download a document as a file */
  downloadDocument: (doc: DocumentRecord) => Promise<void>;
  /** Get the document content as JSON */
  getDocumentContent: (doc: DocumentRecord) => Promise<Record<string, unknown> | null>;
}

/**
 * Hook to fetch and manage naval letter documents for a request.
 * Queries edms_documents where source = 'naval-letter-formatter'
 */
export function useNavalLetterAttachments(requestId: string): UseNavalLetterAttachmentsResult {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!supabaseClient || !requestId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabaseClient
        .from('edms_documents')
        .select('*')
        .eq('request_id', requestId)
        .eq('source', 'naval-letter-formatter')
        .order('uploaded_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch naval letter documents:', fetchError);
        setError(fetchError.message);
        setDocuments([]);
      } else {
        const docs = (data || []).map((row: any) => fromDocRow(row));
        setDocuments(docs);
      }
    } catch (err) {
      console.error('Unexpected error fetching documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Refetch when window gains focus (user returns from NLF)
  useEffect(() => {
    const handleFocus = () => {
      fetchDocuments();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchDocuments]);

  const downloadDocument = useCallback(
    async (doc: DocumentRecord) => {
      if (!supabaseClient || !doc.fileUrl) {
        console.error('Cannot download: no file URL');
        return;
      }

      try {
        // Extract storage path from file URL
        const storagePath = extractStoragePath(doc.fileUrl);
        if (!storagePath) {
          // Fallback: direct download from URL
          window.open(doc.fileUrl, '_blank');
          return;
        }

        const { data, error: downloadError } = await supabaseClient.storage
          .from(STORAGE_BUCKET)
          .download(storagePath);

        if (downloadError) {
          console.error('Download failed:', downloadError);
          return;
        }

        // Create download link
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to download document:', err);
      }
    },
    []
  );

  const getDocumentContent = useCallback(
    async (doc: DocumentRecord): Promise<Record<string, unknown> | null> => {
      if (!supabaseClient || !doc.fileUrl) {
        console.error('Cannot get content: no file URL');
        return null;
      }

      try {
        const storagePath = extractStoragePath(doc.fileUrl);
        if (!storagePath) {
          // Try fetching directly from URL
          const response = await fetch(doc.fileUrl);
          if (!response.ok) return null;
          return await response.json();
        }

        const { data, error: downloadError } = await supabaseClient.storage
          .from(STORAGE_BUCKET)
          .download(storagePath);

        if (downloadError) {
          console.error('Failed to get document content:', downloadError);
          return null;
        }

        const text = await data.text();
        return JSON.parse(text);
      } catch (err) {
        console.error('Failed to parse document content:', err);
        return null;
      }
    },
    []
  );

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments,
    downloadDocument,
    getDocumentContent,
  };
}

/**
 * Extract storage path from Supabase storage URL
 */
function extractStoragePath(url: string): string | null {
  if (!url) return null;
  try {
    // Supabase storage URLs look like: https://xxx.supabase.co/storage/v1/object/public/bucket/path/to/file
    const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // ignore
  }
  return null;
}

export default useNavalLetterAttachments;
