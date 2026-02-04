import fs from 'node:fs';
import path from 'node:path';

const dataRoot = path.resolve(process.cwd(), 'packages/data/data');
const inputPath = path.join(dataRoot, 'consumables.source.json');
const outputPath = path.join(dataRoot, 'consumables.json');

if (!fs.existsSync(inputPath)) {
  throw new Error(`Missing ${inputPath}`);
}

const consumables = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const normalized = consumables.map((item) => ({
  ...item,
  wowheadUrl: `https://tbc.wowhead.com/item=${item.itemId}`
}));

fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2));
console.log(`Wrote ${normalized.length} consumables to ${outputPath}`);
