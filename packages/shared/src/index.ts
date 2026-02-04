export type ClassName =
  | 'Warrior'
  | 'Paladin'
  | 'Hunter'
  | 'Rogue'
  | 'Priest'
  | 'Shaman'
  | 'Mage'
  | 'Warlock'
  | 'Druid';

export type Condition = {
  target?: string;
  help?: boolean;
  harm?: boolean;
  combat?: boolean;
  nocombat?: boolean;
  mod?: 'shift' | 'ctrl' | 'alt';
  exists?: boolean;
  dead?: boolean;
  nodead?: boolean;
};

export type MacroLine = {
  command: string;
  argument: string;
  condition?: Condition;
};

export type MacroConfig = {
  name: string;
  showTooltip?: string;
  lines: MacroLine[];
};

export const TBC_CONDITION_KEYS = [
  'target',
  'help',
  'harm',
  'combat',
  'nocombat',
  'mod',
  'exists',
  'dead',
  'nodead'
] as const;

export const TARGET_UNITS = [
  'player',
  'target',
  'mouseover',
  'focus',
  'pet',
  'targettarget',
  'party1',
  'party2',
  'party3',
  'party4'
];

export function buildCondition(condition?: Condition): string {
  if (!condition) return '';
  const parts: string[] = [];
  if (condition.target) parts.push(`target=${condition.target}`);
  if (condition.help) parts.push('help');
  if (condition.harm) parts.push('harm');
  if (condition.combat) parts.push('combat');
  if (condition.nocombat) parts.push('nocombat');
  if (condition.mod) parts.push(`mod:${condition.mod}`);
  if (condition.exists) parts.push('exists');
  if (condition.dead) parts.push('dead');
  if (condition.nodead) parts.push('nodead');
  return parts.length ? `[${parts.join(',')}] ` : '';
}

export function buildMacro(config: MacroConfig): string {
  const lines: string[] = [];
  if (config.showTooltip) {
    lines.push(`#showtooltip ${config.showTooltip}`);
  }
  for (const line of config.lines) {
    const condition = buildCondition(line.condition);
    lines.push(`/${line.command} ${condition}${line.argument}`.trim());
  }
  return lines.join('\n');
}

export function explainLine(line: MacroLine): string {
  const condition = buildCondition(line.condition).trim();
  const conditionText = condition ? `Condition: ${condition}` : 'No condition';
  return `${line.command} ${line.argument} (${conditionText})`;
}

export function validateMacro(config: MacroConfig): string[] {
  const errors: string[] = [];
  if (!config.name.trim()) errors.push('Macro name is required.');
  if (!config.lines.length) errors.push('At least one macro line is required.');
  const noArgCommands = new Set(['startattack', 'stopattack', 'stopcasting', 'cancelform']);
  for (const line of config.lines) {
    if (!line.command.trim()) errors.push('Macro command cannot be empty.');
    if (!line.argument.trim() && !noArgCommands.has(line.command.trim())) {
      errors.push('Macro argument cannot be empty.');
    }
  }
  return errors;
}
