/**
 * Supabase Edge Function: receive-naval-letter
 *
 * Receives naval letter JSON data from the Naval Letter Formatter (NLF)
 * and stores it as an attachment to the specified EDMS request.
 *
 * This function:
 * 1. Validates the user's auth token
 * 2. Verifies the user has access to the specified request
 * 3. Stores the letter JSON in Supabase Storage
 * 4. Creates an attachment record in the database
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
  // Look up SSIC in the request's retention fields or SSIC reference data
  // For now, we'll use a simplified calculation based on common patterns
  // In production, this should query an SSIC crosswalk table

  // Default retention for unknown SSIC
  const defaultResult: RetentionResult = {
    retentionPeriod: 'Unknown',
    cutoffTrigger: 'Unknown',
    disposalAction: 'Review Required',
    disposalDate: null,
  };

  if (!ssic) {
    return defaultResult;
  }

  // Try to look up SSIC in a crosswalk table if it exists
  try {
    const { data: ssicRecord } = await supabase
      .from('ssic_crosswalk')
      .select('retention_years, retention_period, cutoff_trigger, disposal_action')
      .eq('ssic', ssic)
      .single();

    if (!ssicRecord) {
      // SSIC not found in crosswalk, return default
      return defaultResult;
    }

    // Calculate disposal date based on cutoff trigger
    let disposalDate: string | null = null;
    const now = new Date();

    if (ssicRecord.retention_years && ssicRecord.cutoff_trigger === 'CY') {
      // Calendar year cutoff
      const cutoffYear = now.getFullYear();
      disposalDate = new Date(cutoffYear + ssicRecord.retention_years, 11, 31).toISOString();
    } else if (ssicRecord.retention_years && ssicRecord.cutoff_trigger === 'FY') {
      // Fiscal year cutoff (ends Sep 30)
      const fy = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
      disposalDate = new Date(fy + ssicRecord.retention_years, 8, 30).toISOString();
    }
    // Event-based cutoffs don't get automatic dates

    return {
      retentionPeriod: ssicRecord.retention_period || null,
      cutoffTrigger: ssicRecord.cutoff_trigger || null,
      disposalAction: ssicRecord.disposal_action || null,
      disposalDate,
    };
  } catch (error) {
    // Table might not exist or other error, return default
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
    // For now, we'll allow the request owner to add attachments
    if (request.uploaded_by_id !== user.id) {
      // Check if user is in the same unit or has admin access
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

    // Store JSON file in Supabase Storage
    const storagePath = `${requestId}/${body.filename}`;
    const fileContent = JSON.stringify(body.attachment, null, 2);
    const fileBlob = new Blob([fileContent], { type: 'application/json' });

    const { error: uploadError } = await supabase.storage
      .from('naval-letters')
      .upload(storagePath, fileBlob, {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);

      // If file already exists, try with upsert
      if (uploadError.message?.includes('already exists')) {
        const { error: upsertError } = await supabase.storage
          .from('naval-letters')
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

    // Create attachment record
    const { data: attachment, error: attachmentError } = await supabase
      .from('naval_letter_attachments')
      .insert({
        request_id: requestId,
        filename: body.filename,
        storage_path: storagePath,
        content_type: 'application/json',
        source: 'naval-letter-formatter',
        file_size: fileBlob.size,
        ssic: body.attachment.ssic || null,
        subject: body.attachment.subject || null,
        letter_type: body.attachment.letterType || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (attachmentError) {
      console.error('Attachment insert error:', attachmentError);
      // Try to clean up the uploaded file
      await supabase.storage.from('naval-letters').remove([storagePath]);
      return errorResponse('Failed to create attachment record', 500, origin);
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

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('edms_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) {
        console.error('Request update error:', updateError);
        // Don't fail the whole request for this, just log it
      }
    }

    // Return success response
    return jsonResponse(
      {
        success: true,
        attachmentId: attachment.id,
        storagePath: storagePath,
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
