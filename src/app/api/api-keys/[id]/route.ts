/**
 * API Key Detail API
 *
 * GET /api/api-keys/[id] - Get API key by ID
 * PATCH /api/api-keys/[id] - Update API key
 * DELETE /api/api-keys/[id] - Revoke API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/api-keys/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select(`
        *,
        organization:organizations(name, slug, status),
        created_by_user:users!created_by(name, email)
      `)
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Hide sensitive data
    const sanitizedData = {
      ...data,
      key: undefined,
      key_hash: undefined,
    };

    return NextResponse.json(sanitizedData);
  } catch (error) {
    console.error('[API] Error fetching API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/api-keys/[id]
 *
 * Update API key metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const allowedFields = [
      'name',
      'description',
      'allowed_origins',
      'ip_whitelist',
      'rate_limit_per_hour',
      'expires_at',
    ];

    const updates = Object.keys(body)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {} as Record<string, any>);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('api_keys')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update API key', details: error.message },
        { status: 400 }
      );
    }

    // Hide sensitive data
    const sanitizedData = {
      ...data,
      key: undefined,
      key_hash: undefined,
    };

    return NextResponse.json(sanitizedData);
  } catch (error) {
    console.error('[API] Error updating API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/api-keys/[id]
 *
 * Revoke API key (soft delete - sets status to 'revoked')
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get API key to get organization_id for notification
    const { data: apiKey, error: fetchError } = await supabase
      .from('api_keys')
      .select('id, name, organization_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Soft delete: update status to 'revoked'
    const { error } = await supabase
      .from('api_keys')
      .update({ status: 'revoked' })
      .eq('id', params.id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to revoke API key', details: error.message },
        { status: 400 }
      );
    }

    // Create notification
    await supabase.rpc('create_notification_for_org', {
      p_organization_id: apiKey.organization_id,
      p_type: 'api_key_revoked',
      p_title: 'API Key Revoked',
      p_message: `The API key "${apiKey.name}" has been revoked and is no longer valid.`,
      p_priority: 'warning',
      p_action_url: '/dashboard/api-keys',
      p_action_label: 'View API Keys',
    });

    return NextResponse.json(
      { message: 'API key revoked successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error revoking API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
