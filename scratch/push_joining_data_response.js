import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
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

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

function formatToDDMMYYYY(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // Case 1: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}:\d{1,2}(?::\d{1,2})?))?/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    const time = ymdMatch[4] ? ` ${ymdMatch[4]}` : '';
    return `${d}-${m}-${y}${time}`;
  }

  // Case 2: DD-MM-YYYY HH:MM:SS or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}:\d{1,2}(?::\d{1,2})?))?/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    const time = dmyMatch[4] ? ` ${dmyMatch[4]}` : '';
    return `${d}-${m}-${y}${time}`;
  }

  return trimmed;
}

// Robust CSV parser handling quoted multiline strings
function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentField.trim());
      currentField = '';
      if (row.length > 0 && row.some(cell => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
    } else {
      currentField += char;
    }
  }
  if (currentField.length > 0 || row.length > 0) {
    row.push(currentField.trim());
    lines.push(row);
  }
  return lines;
}

async function run() {
  const csvPath = path.resolve('_HR-JOINING FMS NEW - DATA RESPONSE.csv');
  console.log(`Reading CSV from ${csvPath}...`);
  const content = fs.readFileSync(csvPath, 'utf-8');

  const rows = parseCSV(content);
  if (rows.length < 2) {
    console.error("CSV has no data rows");
    return;
  }

  const headers = rows[0].map(h => h.trim());
  console.log("Headers:", headers);

  const colIdx = {
    uniqueId: headers.findIndex(h => /unique\s*id/i.test(h)),
    stepCode: headers.findIndex(h => /step\s*code/i.test(h)),
    timestamp: headers.findIndex(h => /timestamp/i.test(h)),
    status: headers.findIndex(h => /status/i.test(h)),
    attachment: headers.findIndex(h => /^attachment/i.test(h)),
    checklist: headers.findIndex(h => /^checklist/i.test(h)),
    laptop: headers.findIndex(h => /laptop/i.test(h)),
    mobile: headers.findIndex(h => /mobile/i.test(h)),
    gmail: headers.findIndex(h => /gmail/i.test(h)),
    assets: headers.findIndex(h => /assest|asset/i.test(h))
  };

  console.log("Column Index Map:", colIdx);

  const rowsToInsert = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const uniqueId = colIdx.uniqueId >= 0 ? r[colIdx.uniqueId] : '';
    const stepCode = colIdx.stepCode >= 0 ? r[colIdx.stepCode] : '';

    if (!uniqueId && !stepCode) continue;

    const rawTimestamp = colIdx.timestamp >= 0 ? r[colIdx.timestamp] : '';
    const formattedTimestamp = formatToDDMMYYYY(rawTimestamp);

    const rowObj = {
      unique_id: uniqueId || '',
      step_code: stepCode || '',
      timestamp: formattedTimestamp || '',
      status: colIdx.status >= 0 ? (r[colIdx.status] || '') : '',
      attachment: colIdx.attachment >= 0 ? (r[colIdx.attachment] || '') : '',
      checklist: colIdx.checklist >= 0 ? (r[colIdx.checklist] || '') : '',
      laptop_brand_model: colIdx.laptop >= 0 ? (r[colIdx.laptop] || '') : '',
      mobile_brand_sim: colIdx.mobile >= 0 ? (r[colIdx.mobile] || '') : '',
      gmail_id: colIdx.gmail >= 0 ? (r[colIdx.gmail] || '') : '',
      assets: colIdx.assets >= 0 ? (r[colIdx.assets] || '') : ''
    };

    rowsToInsert.push(rowObj);
  }

  console.log(`Total valid rows to insert: ${rowsToInsert.length}`);
  console.log("Sample row 1:", rowsToInsert[0]);
  console.log("Sample row 2:", rowsToInsert[1]);

  const batchSize = 50;
  let successCount = 0;

  for (let i = 0; i < rowsToInsert.length; i += batchSize) {
    const batch = rowsToInsert.slice(i, i + batchSize);
    const { data, error } = await supabase.from('data_response').insert(batch);
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
    } else {
      successCount += batch.length;
      console.log(`Successfully inserted batch ${i / batchSize + 1} (${batch.length} rows).`);
    }
  }

  console.log(`\nAll done! Total inserted rows: ${successCount} / ${rowsToInsert.length}`);
}

run().catch(console.error);
