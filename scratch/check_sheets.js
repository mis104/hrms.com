import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, '..', 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

const sheetTerms = [
  'VITE_GOOGLE_SHEET_URL',
  'VITE_LEAVING_SHEET_URL',
  'VITE_JOINING_SHEET_URL',
  'VITE_LEAVE_REQUEST_SHEET_URL',
  'VITE_OUTSTATION_SHEET_URL',
  'script.google.com',
  'googleSheetService'
];

const results = [];
const nonSheetPages = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  const matchedTerms = sheetTerms.filter(term => content.includes(term));
  const hasSupabase = content.includes('supabase');
  
  // also check if sheet name is specified in fetch or params
  const sheetParamMatches = [...content.matchAll(/sheet=([a-zA-Z0-9_\s%]+)/g)].map(m => m[1]);
  const sheetNameMatches = [...content.matchAll(/sheetName\s*:\s*["'`]?([^"'`,\n}]+)["'`]?/g)].map(m => m[1]);
  const appendSheetMatches = [...content.matchAll(/append\(['"]sheetName['"]\s*,\s*['"]([^'"]+)['"]/g)].map(m => m[1]);

  const sheetsReferenced = Array.from(new Set([...sheetParamMatches, ...sheetNameMatches, ...appendSheetMatches]))
    .map(s => s.trim().replace(/['"]/g, ''))
    .filter(s => s.length > 0 && !s.includes('const') && !s.includes('let'));

  if (matchedTerms.length > 0 || sheetsReferenced.length > 0) {
    results.push({
      file,
      matchedTerms,
      sheetsReferenced,
      hasSupabase
    });
  } else {
    nonSheetPages.push({
      file,
      hasSupabase
    });
  }
}

console.log('=== PAGES CONNECTED TO GOOGLE SHEETS ===');
console.log(JSON.stringify(results, null, 2));

console.log('=== PAGES NOT CONNECTED TO GOOGLE SHEETS (ONLY SUPABASE / STATIC) ===');
console.log(JSON.stringify(nonSheetPages, null, 2));
