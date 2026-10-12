const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nmfnppmhguvcmaagqgzp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZm5wcG1oZ3V2Y21hYWdxZ3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNTIwOTcsImV4cCI6MjEwNjkyODA5N30.dQPM3gdU-eO_GDBB1oDhWEfcHMCN3dfQwsC5IRzge7Y'
);

function formatToDDMMYYYY(val) {
  if (!val || val === 'EMPTY' || val === 'null' || val === 'undefined') return '';
  val = String(val).trim();
  if (!val) return '';

  // Already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val;

  // Excel serial number like 46062.50358... or 28921.000115...
  if (/^\d+(\.\d+)?$/.test(val)) {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 1000) {
      const utc_days = Math.floor(num - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      const d = String(date_info.getUTCDate()).padStart(2, '0');
      const m = String(date_info.getUTCMonth() + 1).padStart(2, '0');
      const y = date_info.getUTCFullYear();
      return `${d}-${m}-${y}`;
    }
  }

  // DD/MM/YYYY or DD/MM/YYYY HH:mm:ss
  const slashMatch = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const d = String(slashMatch[1]).padStart(2, '0');
    const m = String(slashMatch[2]).padStart(2, '0');
    const y = slashMatch[3];
    return `${d}-${m}-${y}`;
  }

  // YYYY-MM-DD or ISO string
  const isoMatch = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(isoMatch[2]).padStart(2, '0');
    const d = String(isoMatch[3]).padStart(2, '0');
    return `${d}-${m}-${y}`;
  }

  // Parse generic Date
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${d}-${m}-${y}`;
  }

  return val;
}

async function fixJoiningFms() {
  const { data, error } = await supabase.from('joining_fms').select('*');
  if (error) { console.error('Error fetching joining_fms:', error); return; }
  
  const dateFields = [
    'stage1_planned', 'stage1_actual',
    'stage2_planned', 'stage2_actual',
    'stage3_planned', 'stage3_actual',
    'stage4_planned', 'stage4_actual',
    'stage5_planned', 'stage5_actual',
    'date_of_joining', 'dob_as_per_aadhar'
  ];

  let count = 0;
  for (const row of data) {
    const updates = {};
    let needsUpdate = false;
    for (const f of dateFields) {
      if (row[f]) {
        const formatted = formatToDDMMYYYY(row[f]);
        if (formatted !== row[f]) {
          updates[f] = formatted;
          needsUpdate = true;
        }
      }
    }
    if (needsUpdate) {
      count++;
      console.log('Updating row id:', row.id, updates);
      await supabase.from('joining_fms').update(updates).eq('id', row.id);
    }
  }
  console.log(`joining_fms updated ${count} rows.`);
}

async function run() {
  await fixJoiningFms();
}

run();
