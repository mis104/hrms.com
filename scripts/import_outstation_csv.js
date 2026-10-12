import fs from 'fs';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)[1].trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

const parseNum = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  const n = Number(String(val).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const parseStr = (val) => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
};

async function importOutstationData() {
  const filePath = 'Outstation Attendance V.01 - Travelling.csv';
  console.log(`Reading ${filePath}...`);

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const wb = XLSX.read(fileContent, { type: 'string', raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });

  console.log(`Parsed ${rows.length} rows from CSV.`);

  const records = [];

  rows.forEach((r, idx) => {
    const name = parseStr(r['name']);
    if (!name) return;

    // Serial No matching TA-001, TA-002, etc.
    const serialNo = `TA-${String(idx + 1).padStart(3, '0')}`;

    records.push({
      serial_no: serialNo,
      timestamp: parseStr(r['Timestamp']),
      name: name,
      from_location: parseStr(r['From Location']),
      to_location: parseStr(r['To Location']),
      vehicle_type: parseStr(r['Vehicle Type']),
      stay_date: parseStr(r['Stay Date']),
      accommadation_type: parseStr(r['Accomnadation type']),
      travel_date: parseStr(r['Travel date']),
      stay_bill: parseStr(r['Stay Bill']),
      fooding_date: parseStr(r['Fooding Date']),
      fooding_bill: parseStr(r['Fooding Bill']),
      travel_receipt: parseStr(r['Travel Receipt']),
      local_travel_type: parseStr(r['Local Travel type']),
      local_travel_receipt: parseStr(r['Local Travel Receipt']),
      return_date: parseStr(r['Return date']),
      return_ticket: parseStr(r['Return Ticket']),
      advance_amount: parseNum(r['Advance Amount']),
      status: 'Approved',
    });
  });

  console.log(`Prepared ${records.length} records to insert into outstation_traveling.`);

  // Insert in chunks of 50
  const CHUNK_SIZE = 50;
  let insertedCount = 0;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase.from('outstation_traveling').insert(chunk).select('id');

    if (error) {
      console.error(`Error inserting chunk starting at index ${i}:`, error.message);
      throw error;
    } else {
      insertedCount += (data ? data.length : chunk.length);
      console.log(`Inserted ${insertedCount} / ${records.length} rows...`);
    }
  }

  console.log(`\n🎉 Success! All ${insertedCount} rows inserted into outstation_traveling in Supabase!`);
}

importOutstationData().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
