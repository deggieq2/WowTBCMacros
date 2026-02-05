import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const dataRoot = path.resolve(process.cwd(), 'packages/data/data');
const configPath = path.join(dataRoot, 'wowhead-spell-urls.json');
const outputPath = path.join(dataRoot, 'spells.json');
const localDir = process.env.WOWHEAD_HTML_DIR || '';

if (!fs.existsSync(configPath)) {
  throw new Error(`Missing ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
if (!Array.isArray(config)) {
  throw new Error('wowhead-spell-urls.json must be an array');
}

function extractListviewData(html) {
  const listviewMatches = html.matchAll(/new Listview\((\{[\s\S]*?\})\);/g);
  for (const match of listviewMatches) {
    const block = match[1];
    if (!block.includes('template') || !block.includes('spell')) continue;
    const dataMatch = block.match(/data\s*:\s*(\[[\s\S]*?\])\s*(,|\})/);
    if (!dataMatch) continue;
    const dataString = dataMatch[1];
    try {
      const result = vm.runInNewContext(dataString, {}, { timeout: 1000 });
      if (Array.isArray(result)) return result;
    } catch (error) {
      continue;
    }
  }
  const listviewItemsMatch = html.match(/listviewitems\s*=\s*(\[[\s\S]*?\]);/);
  if (listviewItemsMatch) {
    try {
      const result = vm.runInNewContext(listviewItemsMatch[1], {}, { timeout: 1000 });
      if (Array.isArray(result)) return result;
    } catch (error) {
      // ignore
    }
  }
  return [];
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

const combined = new Map();

for (const entry of config) {
  const { url, file, class: className, isPet, petType } = entry;
  if (!url || !className) {
    continue;
  }
  let html = '';
  if (file) {
    html = fs.readFileSync(path.resolve(dataRoot, file), 'utf8');
  } else if (localDir) {
    const localPath = path.join(localDir, `${className}.html`);
    if (fs.existsSync(localPath)) {
      html = fs.readFileSync(localPath, 'utf8');
    }
  }
  if (!html) {
    console.log(`Fetching ${className} from ${url}`);
    html = await fetchHtml(url);
  }
  const list = extractListviewData(html);
  for (const item of list) {
    if (!item.id || !item.name) continue;
    const existing = combined.get(item.id) || {};
    combined.set(item.id, {
      id: item.id,
      name: item.name,
      class: className,
      isBase: true,
      isTalent: false,
      isPet: Boolean(isPet),
      petType: petType ?? null,
      icon: item.icon || existing.icon || 'inv_misc_questionmark',
      wowheadUrl: `https://tbc.wowhead.com/spell=${item.id}`
    });
  }
}

const result = Array.from(combined.values());
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`Wrote ${result.length} spells to ${outputPath}`);
