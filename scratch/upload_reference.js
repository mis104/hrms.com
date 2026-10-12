import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Date formatter to DD-MM-YYYY
function formatDate(val) {
  if (!val) return '';
  val = String(val).trim();
  if (!val) return '';

  if (/^\d{2}-\d{2}-\d{4}/.test(val)) return val;

  if (val.includes('/')) {
    const parts = val.split('/');
    if (parts.length === 3) {
      const m = parts[0].padStart(2, '0');
      const d = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${d}-${m}-${y}`;
    }
  }

  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return val;
}

async function upload() {
  console.log("Reading reference.csv...");
  const rawData = fs.readFileSync('reference.csv', 'utf8');
  const lines = rawData.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length < 2) {
    console.log("No data found in reference.csv");
    return;
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV parser supporting commas inside quotes if any
    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const matches = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      let val = match[1] || '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      matches.push(val.trim());
      if (regex.lastIndex >= line.length) break;
    }

    if (matches.length >= 3) {
      const dateVal = formatDate(matches[0]);
      const candidateName = matches[1] || '';
      const refPersonName = matches[2] || '';
      const number = matches[3] || '';

      if (candidateName || refPersonName || number) {
        rows.push({
          date: dateVal,
          candidate_name: candidateName,
          ref_person_name: refPersonName,
          number: number
        });
      }
    }
  }

  console.log(`Parsed ${rows.length} reference records.`);

  // Test if table exists
  const { error: testErr } = await supabase.from('reference').select('id').limit(1);
  if (testErr) {
    console.error("Table public.reference does not exist or has error:", testErr);
    console.log("\nPlease run this SQL in Supabase SQL Editor first:\n");
    console.log(`
CREATE TABLE IF NOT EXISTS public.reference (
    id SERIAL PRIMARY KEY,
    date VARCHAR(50),
    candidate_name VARCHAR(150),
    ref_person_name VARCHAR(150),
    number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reference ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access policy" ON public.reference FOR ALL USING (true) WITH CHECK (true);
    `);
    process.exit(1);
  }

  // Clear existing or insert in batches
  console.log("Inserting records into public.reference...");
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from('reference').insert(batch);
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`Batch ${i / batchSize + 1} (${batch.length} records) inserted successfully.`);
    }
  }

  console.log("All reference records processed successfully!");
}

upload();
