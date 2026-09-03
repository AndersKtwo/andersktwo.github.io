import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Only this user may write site content
const ADMIN_USER_ID = '1394e3ba-59df-44d6-92b0-b8a07e3fa6d7';

// Keys never exposed on the public GET (admin/analytics internals)
const ADMIN_ONLY_KEYS = ['owner_devices', 'owner_visitor_ids'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // GET = public read (no auth needed); admin-only keys are excluded
    if (req.method === 'GET') {
      const sb = createClient(supabaseUrl, serviceKey);
      const { data, error } = await sb
        .from('site_content')
        .select('key, value');

      if (error) throw error;

      // Convert array of {key, value} to object
      const content: Record<string, any> = {};
      for (const row of data) {
        if (ADMIN_ONLY_KEYS.includes(row.key)) continue;
        content[row.key] = row.value;
      }

      return new Response(JSON.stringify(content), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    }

    // POST = authenticated write (admin only)
    if (req.method === 'POST') {
      // Verify JWT
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'No authorization header' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user || user.id !== ADMIN_USER_ID) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { key, value } = body;

      if (!key || value === undefined) {
        return new Response(JSON.stringify({ error: 'Missing key or value' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sb = createClient(supabaseUrl, serviceKey);
      const { error } = await sb
        .from('site_content')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
