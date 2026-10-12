import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = trimmed.replace('VITE_SUPABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
    }
    if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = trimmed.replace('VITE_SUPABASE_ANON_KEY=', '').trim().replace(/^["']|["']$/g, '');
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data, error } = await supabase.from('data_response').select('*').limit(1);
  if (error) {
    console.error("Select error:", error);
  } else {
    console.log("Existing columns:", data && data.length > 0 ? Object.keys(data[0]) : "Table empty, checking insert trial");
  }
}

inspect().catch(console.error);
