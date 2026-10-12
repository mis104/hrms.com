import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, '..', 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

const report = [];
const nonSheetPages = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  
  const envMatches = [];
  if (content.includes('VITE_GOOGLE_SHEET_URL')) envMatches.push('VITE_GOOGLE_SHEET_URL');
  if (content.includes('VITE_LEAVING_SHEET_URL')) envMatches.push('VITE_LEAVING_SHEET_URL');
  if (content.includes('VITE_JOINING_SHEET_URL')) envMatches.push('VITE_JOINING_SHEET_URL');
  if (content.includes('VITE_LEAVE_REQUEST_SHEET_URL')) envMatches.push('VITE_LEAVE_REQUEST_SHEET_URL');
  if (content.includes('VITE_OUTSTATION_SHEET_URL')) envMatches.push('VITE_OUTSTATION_SHEET_URL');
  if (content.includes('script.google.com')) envMatches.push('script.google.com');

  const usesSupabase = content.includes('supabase');

  // Sheet names:
  const sheets = new Set();
  const re1 = /sheet=([^&"'`\s]+)/g;
  let m;
  while ((m = re1.exec(content)) !== null) sheets.add(decodeURIComponent(m[1]));

  const re2 = /sheetName\s*:\s*["']([^"']+)["']/g;
  while ((m = re2.exec(content)) !== null) sheets.add(m[1]);

  const re3 = /append\(["']sheetName["'],\s*["']([^"']+)["']\)/g;
  while ((m = re3.exec(content)) !== null) sheets.add(m[1]);

  const re4 = /const\s+[A-Z_]*SHEET_NAME\s*=\s*["']([^"']+)["']/g;
  while ((m = re4.exec(content)) !== null) sheets.add(m[1]);

  // Check read vs write
  const hasPost = /method\s*:\s*["']POST["']/i.test(content) && envMatches.length > 0;
  const hasFetch = /fetch\s*\(/.test(content) && envMatches.length > 0;

  if (envMatches.length > 0 || sheets.size > 0) {
    report.push({
      page: file,
      envMatches,
      sheets: Array.from(sheets),
      usesSupabase,
      hasPost,
      hasFetch
    });
  } else {
    nonSheetPages.push({
      page: file,
      usesSupabase
    });
  }
}

console.log(`=== TOTAL PAGES CONNECTED TO GOOGLE SHEETS: ${report.length} ===\n`);
report.forEach((p, i) => {
  console.log(`${(i + 1).toString().padStart(2, ' ')}. Page: ${p.page}`);
  console.log(`    Sheets: ${p.sheets.join(', ') || 'N/A'}`);
  console.log(`    Env/API: ${p.envMatches.join(', ')}`);
  console.log(`    Read/Write: ${p.hasFetch ? 'Read (fetch)' : ''}${p.hasPost ? ' + Write (POST)' : ''}`);
  console.log(`    Supabase also used: ${p.usesSupabase ? 'YES (Hybrid)' : 'NO (Pure Sheet)'}`);
  console.log('');
});

console.log(`=== TOTAL PAGES NOT CONNECTED TO GOOGLE SHEETS: ${nonSheetPages.length} ===\n`);
nonSheetPages.forEach((p, i) => {
  console.log(`${(i + 1).toString().padStart(2, ' ')}. ${p.page} (Supabase: ${p.usesSupabase ? 'YES' : 'NO'})`);
});

