import fs from 'fs';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const xlsx = XLSX.default || XLSX;

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    if (key && !key.startsWith('#')) {
      env[key] = val;
    }
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatToDDMMYYYY(val) {
  if (!val) return '';
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined' || str === 'EMPTY') return '';

  // 1. Check if it's an Excel numeric serial date (e.g. 46062.5035...)
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    // Excel epoch: Dec 30 1899
    const utc_days = Math.floor(num - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const day = String(date_info.getUTCDate()).padStart(2, '0');
    const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const year = date_info.getUTCFullYear();
    return `${day}-${month}-${year}`;
  }

  // 2. Check if it's already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // 3. Check DD/MM/YYYY or DD/MM/YYYY HH:MM:SS or D/M/YYYY
  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${day}-${month}-${year}`;
  }

  // 4. Check YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }

  // 5. Try standard Date parse
  const d = new Date(str);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return str;
}

// Test cases
console.log('46062.503587962965 ->', formatToDDMMYYYY('46062.503587962965'));
console.log('46062.45775462963 ->', formatToDDMMYYYY('46062.45775462963'));
console.log('46063.47025462963 ->', formatToDDMMYYYY('46063.47025462963'));
console.log('28/07/2026 07:32:00 ->', formatToDDMMYYYY('28/07/2026 07:32:00'));
console.log('14/12/2025 ->', formatToDDMMYYYY('14/12/2025'));
console.log('2026-07-28T10:00:00Z ->', formatToDDMMYYYY('2026-07-28T10:00:00Z'));
console.log('01/01/2000 ->', formatToDDMMYYYY('01/01/2000'));
