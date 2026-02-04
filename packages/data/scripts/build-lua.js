import fs from 'node:fs';
import path from 'node:path';

const dataRoot = path.resolve(process.cwd(), 'packages/data/data');
const inputPath = path.join(dataRoot, 'spells.normalized.json');
const outputPath = path.resolve(process.cwd(), 'addons/TBCMacroBuilder/Data.lua');
const consumablesPath = path.join(dataRoot, 'consumables.json');

function luaEscape(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

if (!fs.existsSync(inputPath)) {
  throw new Error('Run data build first: npm run data:build');
}

const spells = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const consumables = fs.existsSync(consumablesPath)
  ? JSON.parse(fs.readFileSync(consumablesPath, 'utf8'))
  : [];

const lines = [];
lines.push('-- Auto-generated from packages/data/data/spells.normalized.json');
lines.push('TBCMacroBuilderData = TBCMacroBuilderData or {}');
lines.push('TBCMacroBuilderData.spells = {');

for (const spell of spells) {
  const entry = `  {id=${spell.id}, name="${luaEscape(spell.name)}", class="${luaEscape(spell.class)}", isBase=${spell.isBase ? 'true' : 'false'}, isTalent=${spell.isTalent ? 'true' : 'false'}, isPet=${spell.isPet ? 'true' : 'false'}, petType=${spell.petType ? '"' + luaEscape(spell.petType) + '"' : 'nil'}, icon="${luaEscape(spell.icon)}", wowheadUrl="${luaEscape(spell.wowheadUrl)}"},`;
  lines.push(entry);
}

lines.push('}');
lines.push('');
lines.push('TBCMacroBuilderData.consumables = {');
for (const item of consumables) {
  const entry = `  {id=\"${luaEscape(String(item.id))}\", itemId=${item.itemId || 0}, name=\"${luaEscape(item.name)}\", type=\"${luaEscape(item.type)}\", icon=\"${luaEscape(item.icon)}\", wowheadUrl=\"${luaEscape(item.wowheadUrl)}\"},`;
  lines.push(entry);
}
lines.push('}');
lines.push('');

fs.writeFileSync(outputPath, lines.join('\n'));
console.log(`Wrote Lua data to ${outputPath}`);
