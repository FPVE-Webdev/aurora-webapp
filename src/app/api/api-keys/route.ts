/**
 * API Keys Management API
 *
 * GET /api/api-keys - List organization's API keys
 * POST /api/api-keys - Create new API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/api-keys
 *
 * List API keys for organization
 * Query params:
 * - organization_id: Filter by organization
 * - environment: Filter by environment (test|production)
 * - status: Filter by status (active|revoked|expired)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const environment = searchParams.get('environment');
    const status = searchParams.get('status');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('api_keys')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (environment) {
      query = query.eq('environment', environment);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch API keys', details: error.message },
        { status: 400 }
      );
    }

    // Hide full key, only show prefix
    const sanitizedData = data.map((key) => ({
      ...key,
      key: undefined, // Remove full key
      key_hash: undefined, // Remove hash
    }));

    return NextResponse.json(sanitizedData);
  } catch (error) {
    console.error('[API] Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/api-keys
 *
 * Create new API key for organization
 * Body:
 * - organization_id: UUID (required)
 * - name: string (required)
 * - description: string (optional)
 * - environment: 'test' | 'production' (default: 'production')
 * - rate_limit_tier: 'demo' | 'basic' | 'premium' (default: 'basic')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_id,
      name,
      description,
      environment = 'production',
      rate_limit_tier = 'basic',
    } = body;

    // Validate required fields
    if (!organization_id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: organization_id, name' },
        { status: 400 }
      );
    }

    // Verify organization exists
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, status')
      .eq('id', organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (org.status === 'suspended' || org.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot create API key for suspended/cancelled organization' },
        { status: 403 }
      );
    }

    // Generate API key using database function
    const { data: apiKeyData, error: keyError } = await supabase.rpc('generate_api_key', {
      p_organization_id: organization_id,
      p_name: name,
      p_environment: environment,
    });

    if (keyError || !apiKeyData || apiKeyData.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate API key', details: keyError?.message },
        { status: 400 }
      );
    }

    const generatedKey = apiKeyData[0];

    // Update with additional fields (description, rate_limit_tier)
    const { data: updatedKey, error: updateError } = await supabase
      .from('api_keys')
      .update({
        description,
        rate_limit_tier,
        rate_limit_per_hour: getRateLimitForTier(rate_limit_tier),
      })
      .eq('id', generatedKey.id)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error updating API key:', updateError);
    }

    // Create notification
    await supabase.rpc('create_notification_for_org', {
      p_organization_id: organization_id,
      p_type: 'api_key_created',
      p_title: 'New API Key Created',
      p_message: `A new API key "${name}" was created for your organization.`,
      p_priority: 'info',
      p_action_url: '/dashboard/api-keys',
      p_action_label: 'View API Keys',
    });

    return NextResponse.json(
      {
        id: generatedKey.id,
        key: generatedKey.key, // Only returned once at creation!
        key_prefix: generatedKey.key_prefix,
        name,
        description,
        environment,
        rate_limit_tier,
        rate_limit_per_hour: getRateLimitForTier(rate_limit_tier),
        status: 'active',
        created_at: updatedKey?.created_at,
        warning: 'This is the only time you will see the full API key. Store it securely!',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error in POST /api/api-keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper: Get rate limit based on tier
 */
function getRateLimitForTier(tier: string): number {
  switch (tier) {
    case 'demo':
      return 100;
    case 'basic':
      return 10000;
    case 'premium':
      return 50000;
    case 'premium_plus':
      return 100000;
    default:
      return 10000;
  }
}
