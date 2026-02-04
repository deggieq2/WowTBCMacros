import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'packages/data/data');
const inputPath = path.join(root, 'spells.json');
const overridesPath = path.join(root, 'manual_overrides.json');
const outputPath = path.join(root, 'spells.normalized.json');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function applyOverrides(spells, overrides) {
  const byId = new Map(spells.map((spell) => [spell.id, spell]));
  for (const override of overrides) {
    if (!override.id || !byId.has(override.id)) {
      continue;
    }
    byId.set(override.id, { ...byId.get(override.id), ...override });
  }
  return Array.from(byId.values());
}

const spells = readJson(inputPath);
const overrides = readJson(overridesPath);
const normalized = applyOverrides(spells, overrides);

fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2));
console.log(`Wrote ${normalized.length} spells to ${outputPath}`);

// NOTE: Fetching from Wowhead is intentionally not implemented here.
// Add a dedicated fetcher once terms are confirmed and endpoints are selected.
