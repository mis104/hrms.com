import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)[1].trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

const SHEET_ID = '1WTT8ZQhtf1yeSChNn2uJeW5Tz2TvYjQLrxhTx5l4Fgw';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=FMS`;

const parseDateValue = (cell) => {
  if (!cell) return '';
  if (cell.f) return cell.f;
  const val = String(cell.v || '').trim();
  const m = val.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/i);
  if (m) {
    const y = m[1];
    const mo = String(Number(m[2]) + 1).padStart(2, '0');
    const d = String(m[3]).padStart(2, '0');
    if (m[4] !== undefined) {
      const h = String(m[4]).padStart(2, '0');
      const min = String(m[5] || 0).padStart(2, '0');
      const s = String(m[6] || 0).padStart(2, '0');
      return `${d}/${mo}/${y} ${h}:${min}:${s}`;
    }
    return `${d}/${mo}/${y}`;
  }
  return val;
};

const parseNum = (cell) => {
  if (!cell) return 0;
  const n = Number(String(cell.v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const parseStr = (cell) => {
  if (!cell) return '';
  return String(cell.v ?? cell.f ?? '').trim();
};

async function sync() {
  console.log('Fetching Google Sheet FMS data...');
  const res = await fetch(SHEET_URL);
  const text = await res.text();
  const json = JSON.parse(text.substring(47).slice(0, -2));
  const rawRows = json.table.rows;

  const records = [];
  const seenSerials = new Set();

  for (let i = 0; i < rawRows.length; i++) {
    const c = rawRows[i].c;
    if (!c) continue;
    const serial = parseStr(c[1]);
    const name = parseStr(c[2]);

    if (!serial || !name || !serial.startsWith('TI-')) continue;
    if (seenSerials.has(serial)) continue;
    seenSerials.add(serial);

    records.push({
      timestamp: parseDateValue(c[0]),
      serial_no: serial,
      person_name: name,
      from_location: parseStr(c[3]),
      to_location: parseStr(c[4]),
      in_vehicle_type: parseStr(c[5]),
      in_vehicle_mtr_number: parseStr(c[6]),
      total_running_km: parseNum(c[7]),
      in_vehicle_mtr_pic: parseStr(c[8]),
      date: parseDateValue(c[9]),
      in_remarks: parseStr(c[10]),
      in_vehicle_amount: parseNum(c[11]),
      planned: parseDateValue(c[12]),
      actual: parseDateValue(c[13]),
      time_delay: parseStr(c[14]),
      return_date: parseDateValue(c[15]),
      out_vehicle_type: parseStr(c[16]),
      out_vehicle_mtr_number: parseStr(c[17]),
      vehical_mtr_pic: parseStr(c[18]),
      remarks: parseStr(c[19]),
      vehicle_amount: parseNum(c[20]),
      gmail_id: parseStr(c[21]),
      db: parseStr(c[22])
    });
  }

  console.log(`Parsed ${records.length} unique Travel IN/OUT records.`);

  // Test table existence
  const { error: testErr } = await supabase.from('travel_in_out').select('id').limit(1);
  if (testErr) {
    console.error('Table travel_in_out does not exist yet or error:', testErr.message);
    console.log('Please execute the SQL in Supabase SQL Editor first!');
    return;
  }

  console.log('Pushing to Supabase table travel_in_out in batches...');
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('travel_in_out').upsert(chunk, { onConflict: 'serial_no' });
    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} error:`, error.message);
    } else {
      inserted += chunk.length;
      console.log(`Pushed ${inserted} / ${records.length} rows...`);
    }
  }

  console.log(`✅ Successfully synced ${inserted} records into travel_in_out!`);
}

sync().catch(console.error);
