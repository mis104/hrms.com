const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nmfnppmhguvcmaagqgzp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZm5wcG1oZ3V2Y21hYWdxZ3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNTIwOTcsImV4cCI6MjEwNjkyODA5N30.dQPM3gdU-eO_GDBB1oDhWEfcHMCN3dfQwsC5IRzge7Y';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i+1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseSalary(val) {
  if (!val) return 0;
  const str = String(val).trim().toLowerCase();
  if (!str) return 0;

  if (str.includes('lpa')) {
    const num = parseFloat(str.replace('lpa', '').trim());
    return isNaN(num) ? 0 : Math.round(num * 100000);
  }
  if (str.endsWith('k')) {
    const num = parseFloat(str.replace('k', '').trim());
    return isNaN(num) ? 0 : Math.round(num * 1000);
  }
  const clean = str.replace(/[^0-9.]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

async function uploadFinalSelection() {
  const filePath = 'HR - RECRUITMENT NEW FMS  - Final selection .csv';
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);

  console.log(`Total CSV Lines: ${lines.length}`);
  const header = parseCSVLine(lines[0]);
  console.log('Header:', header);

  const rows = [];
  const seenIds = new Set();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const rawId = cols[0] || '';
    const name = cols[1] || '';
    const rawSalary = cols[2] || '';
    const dp = cols[3] || '';

    if (!rawId && !name) continue;

    const indentMatch = rawId.match(/^IN-\d+/i);
    const indentNo = indentMatch ? indentMatch[0].toUpperCase() : '';

    // Ensure unique ID if duplicates exist
    let uniqueId = rawId;
    if (seenIds.has(uniqueId)) {
      uniqueId = `${rawId}_${name.replace(/\s+/g, '_')}`;
    }
    seenIds.add(uniqueId);

    const salaryNum = parseSalary(rawSalary);

    rows.push({
      id: uniqueId,
      name: name,
      salary: salaryNum,
      dp: dp || (rawId.includes('_') ? rawId.split('_').slice(1).join('_') : ''),
      indent_no: indentNo,
      candidate_id: `${indentNo}_${name}`,
      status: 'Selected',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  console.log(`Parsed ${rows.length} rows to insert.`);
  console.log('Sample row:', rows[0]);

  // Insert in batches
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('final_selection')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Error uploading batch ${i}-${i + batchSize}:`, error);
    } else {
      console.log(`Uploaded batch ${i + 1} to ${Math.min(i + batchSize, rows.length)} successfully.`);
    }
  }

  console.log('Syncing selected candidate names with FMS table...');
  let fmsUpdatedCount = 0;
  for (const row of rows) {
    if (row.indent_no && row.name) {
      const { error } = await supabase
        .from('fms')
        .update({
          selected_candidate_name: row.name,
          updated_at: new Date().toISOString()
        })
        .eq('indent_no', row.indent_no);

      if (!error) {
        fmsUpdatedCount++;
      }
    }
  }

  console.log(`FMS records updated with selected candidate names: ${fmsUpdatedCount}`);
  console.log('All data upload & sync completed successfully!');
}

uploadFinalSelection();
