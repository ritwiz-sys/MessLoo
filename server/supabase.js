const { createClient } = require('@supabase/supabase-js')

// This server is the trust boundary — every request is already authenticated
// via Clerk's JWT (see middleware/auth.js) before it ever touches Supabase.
// Supabase's own row-level security has no concept of the Clerk user (there's
// no auth.uid()), so using the anon key here causes writes to silently affect
// 0 rows whenever RLS is enabled without a matching anon policy. The service
// role key bypasses RLS and lets our own auth checks be the only gate.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
)

module.exports = supabase