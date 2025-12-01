import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Disable body parsing to handle multipart form data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err);
        return res.status(400).json({ error: 'Error parsing form data' });
      }

      try {
        const { user_id, document_title, document_type, unit_id, metadata } = fields;
        const uploadedFile = files.file;

        if (!user_id || !uploadedFile) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(uploadedFile.mimetype)) {
          return res.status(400).json({ error: 'Invalid file type. Only images and PDFs are allowed.' });
        }

        // Read file content
        const fileContent = fs.readFileSync(uploadedFile.filepath);
        const fileName = `${Date.now()}_${uploadedFile.originalFilename}`;
        const filePath = `mobile-uploads/${user_id}/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, fileContent, {
            contentType: uploadedFile.mimetype,
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        // Create document record
        const documentData = {
          user_id,
          title: document_title || 'Camera Upload',
          type: document_type || 'image',
          file_path: filePath,
          file_url: publicUrl,
          file_size: uploadedFile.size,
          file_mime_type: uploadedFile.mimetype,
          unit_id: unit_id || null,
          metadata: metadata ? JSON.parse(metadata) : {},
          source: 'mobile_camera',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: document, error: documentError } = await supabase
          .from('documents')
          .insert(documentData)
          .select()
          .single();

        if (documentError) {
          throw documentError;
        }

        // Create offline action record if in offline mode
        if (fields.offline_action === 'true') {
          const offlineActionData = {
            user_id,
            device_id: fields.device_id || 'unknown',
            session_id: fields.session_id || null,
            action_type: 'upload',
            document_id: document.id,
            action_data: {
              document_id: document.id,
              file_path: filePath,
              file_url: publicUrl,
              original_filename: uploadedFile.originalFilename,
              file_size: uploadedFile.size,
              mime_type: uploadedFile.mimetype
            },
            sync_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          await supabase.from('offline_actions').insert(offlineActionData);
        }

        // Clean up temporary file
        fs.unlinkSync(uploadedFile.filepath);

        // Process image if it's an image file (extract text, optimize, etc.)
        if (uploadedFile.mimetype.startsWith('image/')) {
          try {
            // Here you could add image processing logic:
            // - Extract text using OCR
            // - Optimize image size
            // - Generate thumbnails
            // - Auto-rotate based on EXIF data
            
            console.log('Image uploaded successfully:', publicUrl);
          } catch (processingError) {
            console.error('Image processing error:', processingError);
            // Don't fail the upload if processing fails
          }
        }

        return res.status(200).json({
          success: true,
          data: {
            document_id: document.id,
            file_url: publicUrl,
            file_path: filePath,
            file_size: uploadedFile.size,
            mime_type: uploadedFile.mimetype,
            title: documentData.title
          },
          message: 'File uploaded successfully'
        });

      } catch (error) {
        console.error('Upload processing error:', error);
        
        // Clean up temporary file if it exists
        if (uploadedFile && uploadedFile.filepath && fs.existsSync(uploadedFile.filepath)) {
          fs.unlinkSync(uploadedFile.filepath);
        }

        return res.status(500).json({ error: 'Failed to process upload' });
      }
    });

  } catch (error) {
    console.error('Camera upload error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to generate thumbnail (optional)
async function generateThumbnail(filePath, mimeType) {
  // This would require additional image processing libraries
  // For now, return null
  return null;
}

// Helper function to extract text from image using OCR (optional)
async function extractTextFromImage(filePath) {
  // This would require OCR libraries like Tesseract.js
  // For now, return null
  return null;
}