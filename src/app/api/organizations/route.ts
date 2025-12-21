/**
 * Organizations API
 *
 * GET /api/organizations - List organizations (admin only)
 * POST /api/organizations - Create new organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/organizations
 *
 * List all organizations (admin only) or get current user's organization
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Get user from auth token
    // For now, return demo organization
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', 'demo')
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
  try {
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
