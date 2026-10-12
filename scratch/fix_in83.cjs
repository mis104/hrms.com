const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1]] = val;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixIn83() {
  console.log("Updating data_response for IN-83...");
  const { data: dr, error: drErr } = await supabase
    .from('data_response')
    .update({ status: 'Yes' })
    .eq('unique_id', 'IN-83')
    .eq('status', 'Pending');
  
  if (drErr) console.error("drErr:", drErr);
  else console.log("data_response updated successfully");

  console.log("Updating fms for IN-83...");
  const { data: fms, error: fmsErr } = await supabase
    .from('fms')
    .update({ stage1_status: 'Yes', stage2_status: 'Yes' })
    .eq('indent_no', 'IN-83');
  
  if (fmsErr) console.error("fmsErr:", fmsErr);
  else console.log("fms updated successfully");
}

fixIn83();
