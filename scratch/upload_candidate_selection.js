import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env manually
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

const csvFilePath = path.resolve('Canidate_Selection.csv');

// Helper to format any date string into DD-MM-YYYY
function formatDate(val) {
  if (!val || typeof val !== 'string') return '';
  val = val.trim();
  if (!val) return '';

  // Case 1: Already DD-MM-YYYY or DD-MM-YYYY HH:mm
  if (/^\d{1,2}-\d{1,2}-\d{4}/.test(val)) {
    const parts = val.split(/[\sT]+/);
    const datePart = parts[0];
    const timePart = parts[1] || '';
    const [d, m, y] = datePart.split('-');
    const formattedDate = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    return timePart ? `${formattedDate} ${timePart}` : formattedDate;
  }

  // Case 2: M/D/YYYY or D/M/YYYY or YYYY/M/D
  if (val.includes('/')) {
    const parts = val.split(/[\sT]+/);
    const datePart = parts[0];
    const timePart = parts[1] || '';
    const segs = datePart.split('/');
    if (segs.length === 3) {
      if (segs[0].length === 4) {
        // YYYY/M/D
        const formattedDate = `${segs[2].padStart(2, '0')}-${segs[1].padStart(2, '0')}-${segs[0]}`;
        return timePart ? `${formattedDate} ${timePart}` : formattedDate;
      } else {
        // M/D/YYYY or D/M/YYYY
        let p1 = parseInt(segs[0], 10);
        let p2 = parseInt(segs[1], 10);
        let year = segs[2].length === 2 ? `20${segs[2]}` : segs[2];
        if (p2 > 12) {
          // p2 is day, p1 is month
          const formattedDate = `${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}-${year}`;
          return timePart ? `${formattedDate} ${timePart}` : formattedDate;
        } else {
          // assume p1 is day or month (D-M-YYYY)
          const formattedDate = `${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}-${year}`;
          return timePart ? `${formattedDate} ${timePart}` : formattedDate;
        }
      }
    }
  }

  // Case 3: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(val)) {
    const parts = val.split(/[\sT]+/);
    const datePart = parts[0];
    const timePart = parts[1] || '';
    const [y, m, d] = datePart.split('-');
    const formattedDate = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    return timePart ? `${formattedDate} ${timePart}` : formattedDate;
  }

  return val;
}

// Robust CSV Line Parser that handles quotes and commas
function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentStr = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentStr += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentStr);
      currentStr = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentStr);
      currentStr = '';
      if (row.some(c => c.trim().length > 0)) {
        lines.push(row);
      }
      row = [];
    } else {
      currentStr += char;
    }
  }

  if (currentStr.length > 0 || row.length > 0) {
    row.push(currentStr);
    if (row.some(c => c.trim().length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

async function upload() {
  const content = fs.readFileSync(csvFilePath, 'utf8');
  const parsedRows = parseCSV(content);

  if (parsedRows.length < 2) {
    console.error("No data rows found in CSV");
    return;
  }

  const headerRow = parsedRows[0].map(h => h.trim());
  const dataRows = parsedRows.slice(1);

  console.log(`Found ${headerRow.length} headers and ${dataRows.length} data rows.`);

  const mappedData = dataRows.map((r) => {
    return {
      timestamp: formatDate(r[0]),
      candidate_id: (r[1] || '').trim(),
      open_position_department: (r[2] || '').trim(),
      designation: (r[3] || '').trim(),
      name_of_candidate: (r[4] || '').trim(),
      contact_no: (r[5] || '').trim(),
      mail_id: (r[6] || '').trim(),
      age: (r[7] || '').trim(),
      highest_qualification: (r[8] || '').trim(),
      native_place: (r[9] || '').trim(),
      current_working_location: (r[10] || '').trim(),
      current_employment_status: (r[11] || '').trim(),
      current_company: (r[12] || '').trim(),
      current_designation: (r[13] || '').trim(),
      tenure_with_current_company: (r[14] || '').trim(),
      total_work_experience: (r[15] || '').trim(),
      current_ctc: (r[16] || '').trim(),
      expected_ctc: (r[17] || '').trim(),
      notice_period: (r[18] || '').trim(),
      interview_date_with_hr_spoc: formatDate(r[19]),
      resume_url: (r[20] || '').trim(),

      // Stage 1
      stage1_planned: formatDate(r[21]),
      stage1_actual: formatDate(r[22]),
      stage1_status: (r[23] || '').trim() || 'Pending',
      stage1_time_delay: (r[24] || '').trim(),

      // Stage 2
      stage2_planned: formatDate(r[25]),
      stage2_actual: formatDate(r[26]),
      stage2_status: (r[27] || '').trim() || 'Pending',
      stage2_time_delay: (r[28] || '').trim(),

      // Stage 3
      stage3_planned: formatDate(r[29]),
      stage3_actual: formatDate(r[30]),
      stage3_status: (r[31] || '').trim() || 'Pending',
      finalized_salary: (r[32] || '').trim(),
      stage3_time_delay: (r[33] || '').trim(),

      // Stage 4
      stage4_planned: formatDate(r[34]),
      stage4_actual: formatDate(r[35]),
      stage4_status: (r[36] || '').trim() || 'Pending',
      joining_date: formatDate(r[37]),
      stage4_time_delay: (r[38] || '').trim(),

      // Lookup columns
      id_name: (r[39] || '').trim(),
      lookup_designation: (r[40] || '').trim(),
      indent_and_name: (r[41] || '').trim(),
      entry_by: (r[42] || '').trim(),
    };
  }).filter(item => item.candidate_id || item.name_of_candidate);

  console.log(`Prepared ${mappedData.length} valid records for insertion.`);

  const chunkSize = 50;
  let insertedTotal = 0;

  for (let i = 0; i < mappedData.length; i += chunkSize) {
    const chunk = mappedData.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('candidate_selection')
      .insert(chunk)
      .select();

    if (error) {
      console.error(`Error on chunk ${i / chunkSize + 1}:`, error);
      throw error;
    }

    insertedTotal += (data ? data.length : chunk.length);
    console.log(`Inserted ${insertedTotal}/${mappedData.length} rows...`);
  }

  console.log(`\n🎉 SUCCESS: All ${insertedTotal} candidate selection records uploaded to Supabase!`);
}

upload().catch(console.error);
