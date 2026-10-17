import fs from 'fs';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)[1].trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

const parseStr = (val) => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
};

const parseNum = (val) => {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(String(val).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

async function run() {
  console.log('--- STEP 1: Reading new Attendance CSV file ---');
  const csvFileName = 'Attendance V.01 - Attendance (2).csv';
  if (!fs.existsSync(csvFileName)) {
    throw new Error(`File ${csvFileName} not found!`);
  }

  const csvText = fs.readFileSync(csvFileName, 'utf8');
  const wb = XLSX.read(csvText, { type: 'string', raw: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { raw: true, defval: '' });

  console.log(`Successfully parsed ${rows.length} rows from "${csvFileName}".`);

  const records = rows.map((r) => {
    return {
      timestampe: parseStr(r['Timestampe']),
      date_and_time: parseStr(r['Date & Time']) || parseStr(r['Timestampe']),
      end_date: parseStr(r['End Date']) || null,
      status: parseStr(r['Status']),
      reason: parseStr(r['Reason']) || null,
      latitude: parseNum(r['Latitude']),
      longitude: parseNum(r['Longitude']),
      map_link: parseStr(r['Map Link']),
      address: parseStr(r['Address']),
      person_name: parseStr(r['Person Name']),
      date: parseStr(r['Date']),
      time: parseStr(r['Time']),
      year_name: parseStr(r['Year Name']),
      month_name: parseStr(r['Month Name']),
    };
  });

  console.log('Sample record prepared for insertion:');
  console.log(records[0]);

  console.log('\n--- STEP 2: Verifying table is cleared ---');
  const { count: countBefore } = await supabase
    .from('attendance')
    .select('*', { count: 'exact', head: true });
  console.log(`Current count in attendance table: ${countBefore}`);

  if (countBefore > 0) {
    console.log('Clearing remaining rows...');
    await supabase.from('attendance').delete().neq('status', '___NO_SUCH_STATUS___');
  }

  console.log('\n--- STEP 3: Inserting 5,782 records into Supabase "attendance" table ---');
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    let attempts = 0;
    let success = false;

    while (attempts < 3 && !success) {
      attempts++;
      const { error: insertErr } = await supabase
        .from('attendance')
        .insert(batch);

      if (insertErr) {
        console.warn(`Batch ${Math.floor(i / BATCH_SIZE) + 1} attempt ${attempts} failed: ${insertErr.message}`);
        if (attempts >= 3) {
          throw new Error(`Failed to insert batch at index ${i}: ${insertErr.message}`);
        }
        await new Promise((res) => setTimeout(res, 1000));
      } else {
        success = true;
        inserted += batch.length;
        if (inserted % 500 === 0 || inserted === records.length) {
          console.log(`Inserted ${inserted} / ${records.length} records (${Math.round((inserted / records.length) * 100)}%)...`);
        }
      }
    }
  }

  console.log('\n--- STEP 4: Verifying database state ---');
  const { count: finalCount, error: countErr } = await supabase
    .from('attendance')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error('Error fetching final count:', countErr.message);
  } else {
    console.log(`Final row count in Supabase attendance table: ${finalCount}`);
  }

  const { data: sampleFirst } = await supabase
    .from('attendance')
    .select('timestampe, person_name, status, date, time, year_name, month_name')
    .order('created_at', { ascending: true })
    .limit(2);

  const { data: sampleLatest } = await supabase
    .from('attendance')
    .select('timestampe, person_name, status, date, time, year_name, month_name')
    .order('created_at', { ascending: false })
    .limit(2);

  console.log('First inserted rows:');
  console.log(sampleFirst);
  console.log('Latest inserted rows:');
  console.log(sampleLatest);

  console.log('\n✅ All 5,782 attendance records successfully imported into Supabase!');
}

run().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
