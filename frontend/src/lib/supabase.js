import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nyzxtbgssenqycmdtorq.supabase.co';
const supabaseKey = 'sb_publishable_Tay3mPeLdx33xMzY8WtddQ_INV-MP8D';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

export const CHECKIN_BUCKET = 'checkin-images';
