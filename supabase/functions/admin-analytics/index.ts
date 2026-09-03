import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Only this user may access the admin dashboard
const ADMIN_USER_ID = '1394e3ba-59df-44d6-92b0-b8a07e3fa6d7';

// Haiku pricing per million tokens
const INPUT_COST_PER_M = 0.80;
const OUTPUT_COST_PER_M = 4.00;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Require a session belonging to the admin user specifically
  const authHeader = req.headers.get('Authorization') || '';
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user || user.id !== ADMIN_USER_ID) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get chat sessions
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    // Get page views summary
    const { data: allViews } = await supabase
      .from('page_views')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);

    // Get owner visitor IDs (flat array for filtering)
    const { data: ownerIdsRow } = await supabase
      .from('site_content')
      .select('value')
      .eq('key', 'owner_visitor_ids')
      .single();
    const ownerVisitorIds: string[] = ownerIdsRow?.value || [];

    // Get owner devices (rich objects with names)
    const { data: devicesRow } = await supabase
      .from('site_content')
      .select('value')
      .eq('key', 'owner_devices')
      .single();
    const ownerDevices = devicesRow?.value || [];

    const views = allViews || [];

    // Compute stats for all views and filtered views
    function computeStats(viewList: any[]) {
      const uniqueVisitors = new Set(viewList.map(v => v.visitor_id)).size;
      const totalViews = viewList.length;

      const viewsByDay: Record<string, { views: number; unique: Set<string> }> = {};
      viewList.forEach(v => {
        const day = v.created_at.substring(0, 10);
        if (!viewsByDay[day]) viewsByDay[day] = { views: 0, unique: new Set() };
        viewsByDay[day].views++;
        viewsByDay[day].unique.add(v.visitor_id);
      });
      const dailyStats = Object.entries(viewsByDay)
        .map(([date, d]) => ({ date, views: d.views, unique: d.unique.size }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30);

      const referrerCounts: Record<string, number> = {};
      viewList.forEach(v => {
        if (v.referrer) {
          try {
            const host = new URL(v.referrer).hostname;
            referrerCounts[host] = (referrerCounts[host] || 0) + 1;
          } catch {
            referrerCounts[v.referrer] = (referrerCounts[v.referrer] || 0) + 1;
          }
        }
      });
      const topReferrers = Object.entries(referrerCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const countryCounts: Record<string, number> = {};
      viewList.forEach(v => {
        if (v.country && v.country !== 'unknown') {
          countryCounts[v.country] = (countryCounts[v.country] || 0) + 1;
        }
      });
      const topCountries = Object.entries(countryCounts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return { totalViews, uniqueVisitors, dailyStats, topReferrers, topCountries };
    }

    const allStats = computeStats(views);
    const filteredViews = views.filter(v => !ownerVisitorIds.includes(v.visitor_id));
    const filteredStats = computeStats(filteredViews);
    const ownerViews = views.length - filteredViews.length;

    // Token costs
    const chatSessions = sessions || [];
    const totalInputTokens = chatSessions.reduce((s, c) => s + (c.total_input_tokens || 0), 0);
    const totalOutputTokens = chatSessions.reduce((s, c) => s + (c.total_output_tokens || 0), 0);
    const totalCost = (totalInputTokens / 1_000_000 * INPUT_COST_PER_M) + (totalOutputTokens / 1_000_000 * OUTPUT_COST_PER_M);

    return new Response(JSON.stringify({
      chatSessions,
      analytics: allStats,
      filteredAnalytics: filteredStats,
      ownerViews,
      ownerVisitorIds,
      ownerDevices,
      costs: {
        totalInputTokens,
        totalOutputTokens,
        totalCost: Math.round(totalCost * 10000) / 10000,
      },
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Admin analytics error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
