import fs from 'fs';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)[1].trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

const parseNum = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  const n = Number(String(val).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const parseStr = (val) => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
};

async function pushData() {
  console.log('Reading travel in out.csv with UTF-8 encoding...');
  const csvText = fs.readFileSync('travel in out.csv', 'utf8');
  const wb = XLSX.read(csvText, { type: 'string', raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });

  console.log(`Read ${rows.length} rows from CSV.`);

  const records = [];
  const seenSerials = new Set();

  for (const r of rows) {
    const serial = parseStr(r['Serial No']);
    const name = parseStr(r['Person Name']);
    if (!serial || !name) continue;
    if (seenSerials.has(serial)) continue;
    seenSerials.add(serial);

    records.push({
      timestamp: parseStr(r['Timestamp']),
      serial_no: serial,
      person_name: name,
      from_location: parseStr(r['From']),
      to_location: parseStr(r['To']),
      in_vehicle_type: parseStr(r['IN Vehicle Type']),
      in_vehicle_mtr_number: parseStr(r['IN Vehicle Mtr Number']),
      total_running_km: parseNum(r['Total Running Km']),
      in_vehicle_mtr_pic: parseStr(r['IN Vehical Mtr Pic / Ticket pic']),
      date: parseStr(r['Date']),
      in_remarks: parseStr(r['IN Remarks']),
      in_vehicle_amount: parseNum(r['IN Vehicle Amount']),
      planned: parseStr(r['Planned']),
      actual: parseStr(r['Actual']),
      time_delay: parseStr(r['Time Delay']),
      return_date: parseStr(r['Return Date']),
      out_vehicle_type: parseStr(r['Out Vehicle Type']),
      out_vehicle_mtr_number: parseStr(r['Out Vehicle Mtr Number']),
      vehical_mtr_pic: parseStr(r['Vehical Mtr Pic']),
      remarks: parseStr(r['Remarks']),
      vehicle_amount: parseNum(r['Vehicle Amount']),
      gmail_id: parseStr(r['Gmail ID']),
      db: parseStr(r['DB']),
    });
  }

  console.log(`Prepared ${records.length} unique UTF-8 records to update in Supabase.`);

  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('travel_in_out').upsert(chunk, { onConflict: 'serial_no' });
    if (error) {
      console.error(`Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
    } else {
      inserted += chunk.length;
      console.log(`Updated ${inserted} / ${records.length} records...`);
    }
  }

  console.log(`✅ Finished! Total ${inserted} clean UTF-8 records updated in travel_in_out!`);
}

pushData().catch(console.error);
