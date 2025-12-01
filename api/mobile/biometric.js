import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    switch (action) {
      case 'register':
        return await registerBiometric(req, res);
      case 'authenticate':
        return await authenticateBiometric(req, res);
      case 'verify':
        return await verifyBiometric(req, res);
      case 'delete':
        return await deleteBiometric(req, res);
      case 'list':
        return await listBiometric(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Biometric API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function registerBiometric(req, res) {
  const { user_id, device_id, biometric_type, biometric_data, public_key } = req.body;

  if (!user_id || !device_id || !biometric_type || !biometric_data || !public_key) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if biometric auth already exists for this user/device/type
    const { data: existing } = await supabase
      .from('biometric_auth')
      .select('id')
      .eq('user_id', user_id)
      .eq('device_id', device_id)
      .eq('biometric_type', biometric_type)
      .single();

    const biometricData = {
      user_id,
      device_id,
      biometric_type,
      biometric_data_hash: hashBiometricData(biometric_data),
      public_key,
      is_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result;
    if (existing) {
      // Update existing biometric auth
      const { data, error } = await supabase
        .from('biometric_auth')
        .update(biometricData)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Create new biometric auth
      const { data, error } = await supabase
        .from('biometric_auth')
        .insert(biometricData)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Biometric authentication registered successfully'
    });
  } catch (error) {
    console.error('Register biometric error:', error);
    return res.status(500).json({ error: 'Failed to register biometric authentication' });
  }
}

async function authenticateBiometric(req, res) {
  const { user_id, device_id, biometric_type, biometric_data } = req.body;

  if (!user_id || !device_id || !biometric_type || !biometric_data) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get stored biometric data
    const { data: storedBiometric, error: fetchError } = await supabase
      .from('biometric_auth')
      .select('*')
      .eq('user_id', user_id)
      .eq('device_id', device_id)
      .eq('biometric_type', biometric_type)
      .eq('is_enabled', true)
      .single();

    if (fetchError || !storedBiometric) {
      return res.status(404).json({ error: 'Biometric authentication not found' });
    }

    // Check if biometric is locked
    if (storedBiometric.locked_until && new Date(storedBiometric.locked_until) > new Date()) {
      return res.status(423).json({ 
        error: 'Biometric authentication temporarily locked',
        locked_until: storedBiometric.locked_until 
      });
    }

    // Verify biometric data (simplified - in real implementation, use proper biometric verification)
    const isValid = verifyBiometricData(biometric_data, storedBiometric.biometric_data_hash);

    if (isValid) {
      // Reset failed attempts and update last used
      await supabase
        .from('biometric_auth')
        .update({
          failed_attempts: 0,
          last_used_at: new Date().toISOString(),
          locked_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', storedBiometric.id);

      return res.status(200).json({
        success: true,
        authenticated: true,
        message: 'Biometric authentication successful'
      });
    } else {
      // Increment failed attempts
      const newFailedAttempts = (storedBiometric.failed_attempts || 0) + 1;
      const maxAttempts = 5;
      
      let lockedUntil = null;
      if (newFailedAttempts >= maxAttempts) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // Lock for 15 minutes
      }

      await supabase
        .from('biometric_auth')
        .update({
          failed_attempts: newFailedAttempts,
          locked_until: lockedUntil,
          updated_at: new Date().toISOString()
        })
        .eq('id', storedBiometric.id);

      return res.status(401).json({
        error: 'Biometric authentication failed',
        attempts_remaining: Math.max(0, maxAttempts - newFailedAttempts),
        locked_until: lockedUntil
      });
    }
  } catch (error) {
    console.error('Authenticate biometric error:', error);
    return res.status(500).json({ error: 'Failed to authenticate biometric data' });
  }
}

async function verifyBiometric(req, res) {
  const { user_id, device_id, biometric_type } = req.body;

  if (!user_id || !device_id || !biometric_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('biometric_auth')
      .select('id, biometric_type, is_enabled, last_used_at, failed_attempts, locked_until')
      .eq('user_id', user_id)
      .eq('device_id', device_id)
      .eq('biometric_type', biometric_type)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Biometric authentication not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        is_registered: true,
        is_enabled: data.is_enabled,
        last_used_at: data.last_used_at,
        failed_attempts: data.failed_attempts,
        is_locked: data.locked_until && new Date(data.locked_until) > new Date(),
        locked_until: data.locked_until
      }
    });
  } catch (error) {
    console.error('Verify biometric error:', error);
    return res.status(500).json({ error: 'Failed to verify biometric authentication' });
  }
}

async function deleteBiometric(req, res) {
  const { user_id, device_id, biometric_type } = req.body;

  if (!user_id || !device_id || !biometric_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { error } = await supabase
      .from('biometric_auth')
      .delete()
      .eq('user_id', user_id)
      .eq('device_id', device_id)
      .eq('biometric_type', biometric_type);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Biometric authentication deleted successfully'
    });
  } catch (error) {
    console.error('Delete biometric error:', error);
    return res.status(500).json({ error: 'Failed to delete biometric authentication' });
  }
}

async function listBiometric(req, res) {
  const { user_id, device_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id parameter' });
  }

  try {
    let query = supabase
      .from('biometric_auth')
      .select('id, biometric_type, is_enabled, last_used_at, created_at, updated_at')
      .eq('user_id', user_id);

    if (device_id) {
      query = query.eq('device_id', device_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('List biometric error:', error);
    return res.status(500).json({ error: 'Failed to list biometric authentications' });
  }
}

// Helper functions (simplified implementations)
function hashBiometricData(data) {
  // In a real implementation, use proper cryptographic hashing
  // This is a simplified version for demonstration
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function verifyBiometricData(inputData, storedHash) {
  // In a real implementation, use proper biometric verification
  // This is a simplified version for demonstration
  const inputHash = hashBiometricData(inputData);
  return inputHash === storedHash;
}