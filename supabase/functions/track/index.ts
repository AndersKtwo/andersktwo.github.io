import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MAX_EVENTS_PER_IP_PER_DAY = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// cf-connecting-ip / x-real-ip are set by the edge platform and can't be spoofed by the client.
function getClientIp(req: Request): string | null {
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip');
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { visitor_id, path, referrer } = await req.json();

    if (!visitor_id || typeof visitor_id !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid visitor_id' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Per-IP rate limit (rolling 24h): caps page_views writes per network.
    // Over-limit and no-IP-header requests are dropped silently — the client
    // never needs to know, and analytics must not break the site.
    const clientIp = getClientIp(req);
    const ipKey = clientIp ? `track:ip:${await sha256Hex(clientIp)}` : 'track:noip';
    const { data: count, error: rlError } = await supabase.rpc('bump_rate_limit', {
      p_key: ipKey,
      p_window: '24 hours',
    });
    if (rlError || typeof count !== 'number' || count > MAX_EVENTS_PER_IP_PER_DAY) {
      if (rlError) console.error('bump_rate_limit rpc error:', rlError.message);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Get country from Cloudflare headers (Supabase edge functions run on Deno Deploy)
    const country = req.headers.get('cf-ipcountry') ||
                    req.headers.get('x-country') ||
                    'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    // Don't track bots
    const botPattern = /bot|crawl|spider|slurp|baidu|yandex|duckduck/i;
    if (botPattern.test(userAgent)) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('page_views').insert({
      visitor_id: visitor_id.substring(0, 64),
      path: (path || '/').substring(0, 200),
      referrer: referrer ? referrer.substring(0, 500) : null,
      country,
      user_agent: userAgent.substring(0, 500),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Track error:', err);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
