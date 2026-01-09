/**
 * Organizations API
 *
 * GET /api/organizations - List organizations (admin only)
 * POST /api/organizations - Create new organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

function getBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/**
 * GET /api/organizations
 *
 * List all organizations (admin only) or get current user's organization
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    // Validate token with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Fetch the user row to determine organization
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('auth_id', authData.user.id)
      .single();

    if (userError || !userRow) {
      return NextResponse.json({ error: 'User not linked to organization' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userRow.organization_id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Organization not found', details: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations
 *
 * Create a new organization with trial subscription
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('auth_id', authData.user.id)
      .single();

    if (userError || !userRow || !['owner', 'admin'].includes(userRow.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, domain, phone, address, city, postal_code, country } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        email,
        domain,
        phone,
        address,
        city,
        postal_code,
        country: country || 'NO',
        status: 'trial',
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (orgError) {
      console.error('[API] Error creating organization:', orgError);
      return NextResponse.json(
        { error: 'Failed to create organization', details: orgError.message },
        { status: 400 }
      );
    }

    // Create trial subscription
    const { error: subError } = await supabase.rpc('create_trial_subscription', {
      p_organization_id: organization.id,
    });

    if (subError) {
      console.error('[API] Error creating subscription:', subError);
      // Organization created but subscription failed
      // Could rollback here, but for now just log
    }

    // Create owner user (placeholder - will be created via auth)
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        organization_id: organization.id,
        email,
        name: name,
        role: 'owner',
        status: 'invited',
      })
      .select()
      .single();

    if (userError) {
      console.error('[API] Error creating user:', userError);
    }

    // Generate test API key
    const { data: apiKeyData, error: keyError } = await supabase.rpc('generate_api_key', {
      p_organization_id: organization.id,
      p_name: 'Test API Key',
      p_environment: 'test',
    });

    if (keyError) {
      console.error('[API] Error generating API key:', keyError);
    }

    return NextResponse.json(
      {
        organization,
        user,
        api_key: apiKeyData?.[0],
        message: 'Organization created successfully with 30-day trial',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error in POST /api/organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
