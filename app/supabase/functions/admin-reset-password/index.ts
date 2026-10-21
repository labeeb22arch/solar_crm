import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { makeHandler } from './handler.mjs';

// The service key stays in the Edge Function environment, never in the CRM bundle.
const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(makeHandler(client, {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}));
