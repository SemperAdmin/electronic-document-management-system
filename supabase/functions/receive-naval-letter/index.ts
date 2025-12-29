/**
 * Supabase Edge Function: receive-naval-letter
 *
 * Receives naval letter JSON data from the Naval Letter Formatter (NLF)
 * and stores it as a document attached to the specified EDMS request.
 *
 * This function:
 * 1. Validates the user's auth token
 * 2. Verifies the user has access to the specified request
 * 3. Stores the letter JSON in Supabase Storage (edms-docs bucket)
 * 4. Creates a document record in edms_documents
 * 5. Updates the request with SSIC and subject from the letter
 * 6. Calculates retention based on SSIC
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, getCorsHeaders, jsonResponse, errorResponse } from '../_shared/cors.ts';

// ============================================================================
// Types
// ============================================================================

interface NLFPayload {
  attachment: {
    version: string;
    createdAt: string;
    edmsId: string;
    ssic: string;
    ssicTitle: string;
    subject: string;
    from: string;
    to: string;
    via: string[];
    paragraphs: any[];
    enclosures: any[];
    letterType: string;
    headerType: string;
  };
  filename: string;
  recordUpdates: {
    ssic: string;
    subject: string;
  };
}

interface RetentionResult {
  retentionPeriod: string | null;
  cutoffTrigger: string | null;
  disposalAction: string | null;
  disposalDate: string | null;
}

// Storage bucket name - use existing edms-docs bucket
const STORAGE_BUCKET = 'edms-docs';

// ============================================================================
// Retention Calculation
// ============================================================================

/**
 * Calculate retention based on SSIC.
 * Looks up the SSIC in the crosswalk data and calculates disposal date.
 */
async function calculateRetention(
  supabase: any,
  ssic: string
): Promise<RetentionResult> {
  const defaultResult: RetentionResult = {
    retentionPeriod: 'Unknown',
    cutoffTrigger: 'Unknown',
    disposalAction: 'Review Required',
    disposalDate: null,
  };

  if (!ssic) {
    return defaultResult;
  }

  try {
    const { data: ssicRecord } = await supabase
      .from('ssic_crosswalk')
      .select('retention_years, retention_period, cutoff_trigger, disposal_action')
      .eq('ssic', ssic)
      .single();

    if (!ssicRecord) {
      return defaultResult;
    }

    let disposalDate: string | null = null;
    const now = new Date();

    if (ssicRecord.retention_years && ssicRecord.cutoff_trigger === 'CY') {
      const cutoffYear = now.getFullYear();
      disposalDate = new Date(cutoffYear + ssicRecord.retention_years, 11, 31).toISOString();
    } else if (ssicRecord.retention_years && ssicRecord.cutoff_trigger === 'FY') {
      const fy = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
      disposalDate = new Date(fy + ssicRecord.retention_years, 8, 30).toISOString();
    }

    return {
      retentionPeriod: ssicRecord.retention_period || null,
      cutoffTrigger: ssicRecord.cutoff_trigger || null,
      disposalAction: ssicRecord.disposal_action || null,
      disposalDate,
    };
  } catch (error) {
    console.log('SSIC crosswalk lookup failed (table may not exist):', error);
    return defaultResult;
  }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('Origin');

  // Only accept POST requests
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, origin);
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Missing or invalid authorization header', 401, origin);
    }

    const token = authHeader.substring(7);

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return errorResponse('Server configuration error', 500, origin);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return errorResponse('Invalid or expired token', 401, origin);
    }

    // Parse request body
    let body: NLFPayload;
    try {
      body = await req.json();
    } catch (parseError) {
      return errorResponse('Invalid JSON payload', 400, origin);
    }

    // Validate required fields
    if (!body.attachment?.edmsId) {
      return errorResponse('Missing edmsId in attachment', 400, origin);
    }

    if (!body.filename) {
      return errorResponse('Missing filename', 400, origin);
    }

    const requestId = body.attachment.edmsId;

    // Verify user has access to this request
    const { data: request, error: requestError } = await supabase
      .from('edms_requests')
      .select('id, uploaded_by_id, unit_uic')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('Request lookup error:', requestError);
      return errorResponse('Request not found', 404, origin);
    }

    // Check if user owns the request or has appropriate access
    if (request.uploaded_by_id !== user.id) {
      const { data: userRecord } = await supabase
        .from('edms_users')
        .select('unit_uic, is_unit_admin, is_installation_admin, is_app_admin')
        .eq('id', user.id)
        .single();

      const hasAccess =
        userRecord?.is_app_admin ||
        userRecord?.is_installation_admin ||
        userRecord?.is_unit_admin ||
        userRecord?.unit_uic === request.unit_uic;

      if (!hasAccess) {
        return errorResponse('Access denied to this request', 403, origin);
      }
    }

    // Build storage path using existing pattern: {unitUic}/{requestId}/{timestamp}-{filename}
    const unitUic = request.unit_uic || 'N-A';
    const timestamp = Date.now();
    const storagePath = `${unitUic}/${requestId}/${timestamp}-0-${body.filename}`;

    // Store JSON file in Supabase Storage
    const fileContent = JSON.stringify(body.attachment, null, 2);
    const fileBlob = new Blob([fileContent], { type: 'application/json' });

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBlob, {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);

      if (uploadError.message?.includes('already exists')) {
        const { error: upsertError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, fileBlob, {
            contentType: 'application/json',
            upsert: true,
          });

        if (upsertError) {
          console.error('Storage upsert error:', upsertError);
          return errorResponse('Failed to store attachment', 500, origin);
        }
      } else {
        return errorResponse('Failed to store attachment', 500, origin);
      }
    }

    // Get public URL for the file
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const fileUrl = urlData?.publicUrl || '';

    // Create document record in edms_documents
    const { data: document, error: documentError } = await supabase
      .from('edms_documents')
      .insert({
        name: body.filename,
        type: 'application/json',
        size: fileBlob.size,
        uploaded_at: new Date().toISOString(),
        category: 'naval-letter',
        tags: ['naval-letter', body.attachment.letterType || 'letter'].filter(Boolean),
        unit_uic: unitUic,
        subject: body.attachment.subject || '',
        uploaded_by_id: user.id,
        request_id: requestId,
        file_url: fileUrl,
        source: 'naval-letter-formatter',
      })
      .select('id')
      .single();

    if (documentError) {
      console.error('Document insert error:', documentError);
      // Try to clean up the uploaded file
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return errorResponse('Failed to create document record', 500, origin);
    }

    // Calculate retention based on SSIC
    const retention = await calculateRetention(supabase, body.recordUpdates?.ssic);

    // Update the request with SSIC, subject, and retention info
    const updateData: Record<string, any> = {};

    if (body.recordUpdates?.ssic) {
      updateData.ssic = body.recordUpdates.ssic;
    }
    if (body.recordUpdates?.subject) {
      updateData.subject = body.recordUpdates.subject;
    }
    if (body.attachment?.ssicTitle) {
      updateData.ssic_nomenclature = body.attachment.ssicTitle;
    }
    if (retention.retentionPeriod) {
      updateData.retention_period = retention.retentionPeriod;
    }
    if (retention.cutoffTrigger) {
      updateData.cutoff_trigger = retention.cutoffTrigger;
    }
    if (retention.disposalAction) {
      updateData.disposal_action = retention.disposalAction;
    }

    // Update document_ids array on the request
    const { data: currentRequest } = await supabase
      .from('edms_requests')
      .select('document_ids')
      .eq('id', requestId)
      .single();

    const currentDocIds = currentRequest?.document_ids || [];
    if (!currentDocIds.includes(document.id)) {
      updateData.document_ids = [...currentDocIds, document.id];
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('edms_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) {
        console.error('Request update error:', updateError);
      }
    }

    // Return success response
    return jsonResponse(
      {
        success: true,
        documentId: document.id,
        fileUrl: fileUrl,
        retention: retention,
      },
      200,
      origin
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('Internal server error', 500, origin);
  }
});
