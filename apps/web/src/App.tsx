import React, { useMemo, useState, useEffect } from 'react';
import spells from '@data/spells.json';
import consumables from '@data/consumables.json';
import curatedMacros from '@content/macros.json';
import {
  buildMacro,
  explainLine,
  validateMacro,
  TARGET_UNITS,
  type Condition,
  type MacroLine
} from '@shared/index';

type Spell = {
  id: number;
  name: string;
  class: string;
  isBase: boolean;
  isTalent: boolean;
  isPet: boolean;
  petType: string | null;
  icon: string;
  wowheadUrl: string;
};

type Consumable = {
  id: string;
  itemId: number;
  name: string;
  type: string;
  icon: string;
  wowheadUrl: string;
};

type MacroDraft = {
  name: string;
  showTooltip?: string;
  lines: MacroLine[];
};

type CuratedMacro = {
  id: string;
  title: string;
  class: string;
  tags: string[];
  macro?: string;
  macro_text?: string;
  description: string;
};

const CLASS_OPTIONS = [
  'Warrior',
  'Paladin',
  'Hunter',
  'Rogue',
  'Priest',
  'Shaman',
  'Mage',
  'Warlock',
  'Druid'
];

const COMMANDS = [
  'cast',
  'use',
  'castsequence',
  'startattack',
  'petattack',
  'stopcasting',
  'cancelform',
  'dmh'
];

const INITIAL_LINE: MacroLine = { command: 'cast', argument: '', condition: {} };

function loadWowheadTooltips() {
  if (document.getElementById('wowhead-tooltip')) return;
  const script = document.createElement('script');
  script.id = 'wowhead-tooltip';
  script.src = 'https://wow.zamimg.com/widgets/power.js';
  script.async = true;
  document.body.appendChild(script);
}

function applyAtAlias(macroText: string, useAtAlias: boolean): string {
  if (!useAtAlias) return macroText;
  return macroText.replace(/\btarget=([a-zA-Z0-9]+)/g, '@$1');
}

export default function App() {
  const [selectedClass, setSelectedClass] = useState('Mage');
  const [includePets, setIncludePets] = useState(true);
  const [search, setSearch] = useState('');
  const [macroName, setMacroName] = useState('');
  const [showTooltip, setShowTooltip] = useState('');
  const [lines, setLines] = useState<MacroLine[]>([{ ...INITIAL_LINE }]);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [useAtAlias, setUseAtAlias] = useState(false);
  const [showExplain, setShowExplain] = useState(true);
  const [libraryMode, setLibraryMode] = useState<'spells' | 'consumables'>('spells');
  const [consumableType, setConsumableType] = useState('');
  const [druidHelper, setDruidHelper] = useState<'native' | 'dmh'>('native');
  const [view, setView] = useState<'builder' | 'curated' | 'community'>('builder');
  const [communityQuery, setCommunityQuery] = useState('');
  const [communityClass, setCommunityClass] = useState('');
  const [communityMacros, setCommunityMacros] = useState<CuratedMacro[]>([]);
  const [communityStatus, setCommunityStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [submission, setSubmission] = useState({
    title: '',
    class: '',
    tags: '',
    macro_text: '',
    description: '',
    turnstileToken: ''
  });
  const apiBase = (import.meta as { env: Record<string, string> }).env.VITE_API_BASE || '';

  useEffect(() => {
    loadWowheadTooltips();
  }, []);

  const spellList = useMemo(() => {
    const lower = search.toLowerCase();
    return (spells as Spell[])
      .filter((spell) => spell.class === selectedClass)
      .filter((spell) => (includePets ? true : !spell.isPet))
      .filter((spell) => (lower ? spell.name.toLowerCase().includes(lower) : true));
  }, [selectedClass, includePets, search]);

  const consumableTypes = useMemo(() => {
    return Array.from(
      new Set((consumables as Consumable[]).map((item) => item.type).filter(Boolean))
    );
  }, []);

  const consumableList = useMemo(() => {
    const lower = search.toLowerCase();
    return (consumables as Consumable[])
      .filter((item) => (consumableType ? item.type === consumableType : true))
      .filter((item) => (lower ? item.name.toLowerCase().includes(lower) : true));
  }, [consumableType, search]);

  const activeLine = lines[activeLineIndex] ?? lines[0];

  const macroDraft: MacroDraft = {
    name: macroName,
    showTooltip: showTooltip || undefined,
    lines
  };

  const rawMacro = buildMacro(macroDraft);
  const finalMacro = applyAtAlias(rawMacro, useAtAlias);
  const errors = validateMacro(macroDraft);

  async function fetchCommunity() {
    setCommunityStatus('loading');
    const params = new URLSearchParams();
    if (communityQuery) params.set('q', communityQuery);
    if (communityClass) params.set('class', communityClass);
    const response = await fetch(`${apiBase}/macros?${params.toString()}`);
    if (!response.ok) {
      setCommunityStatus('error');
      return;
    }
    const data = (await response.json()) as CuratedMacro[];
    setCommunityMacros(data);
    setCommunityStatus('idle');
  }

  async function submitMacro() {
    const payload = {
      title: submission.title,
      class: submission.class,
      tags: submission.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      macro_text: submission.macro_text,
      description: submission.description,
      turnstileToken: submission.turnstileToken
    };
    const response = await fetch(`${apiBase}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      alert('Submission failed');
      return;
    }
    alert('Submitted for approval');
    setSubmission({ title: '', class: '', tags: '', macro_text: '', description: '', turnstileToken: '' });
  }

  function updateLine(index: number, patch: Partial<MacroLine>) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
  }

  function updateCondition(index: number, patch: Partial<Condition>) {
    setLines((prev) =>
      prev.map((line, i) =>
        i === index ? { ...line, condition: { ...line.condition, ...patch } } : line
      )
    );
  }

  function addLine() {
    setLines((prev) => {
      const next = [...prev, { ...INITIAL_LINE }];
      setActiveLineIndex(next.length - 1);
      return next;
    });
  }

  function removeLine(index: number) {
    setLines((prev) => {
      if (prev.length <= 1) {
        return [{ ...INITIAL_LINE }];
      }
      return prev.filter((_, i) => i !== index);
    });
    setActiveLineIndex((prev) => (prev > 0 ? prev - 1 : 0));
  }

  function applyTemplate(
    type:
      | 'startattack'
      | 'petattack'
      | 'stopcasting'
      | 'druid-cat'
      | 'druid-bear'
      | 'druid-travel'
      | 'dmh-cat'
      | 'dmh-bear'
      | 'dmh-healpot'
      | 'dmh-manapot'
      | 'dmh-innervate'
  ) {
    if (type === 'startattack') {
      setLines([
        { command: 'startattack', argument: '', condition: {} },
        { command: 'cast', argument: '', condition: {} }
      ]);
      setActiveLineIndex(1);
    }
    if (type === 'petattack') {
      setLines([
        { command: 'petattack', argument: '', condition: { target: 'mouseover', harm: true } },
        { command: 'cast', argument: '', condition: { harm: true } }
      ]);
      setActiveLineIndex(1);
    }
    if (type === 'stopcasting') {
      setLines([
        { command: 'stopcasting', argument: '', condition: {} },
        { command: 'cast', argument: '', condition: {} }
      ]);
      setActiveLineIndex(1);
    }
    if (type === 'druid-cat') {
      setShowTooltip('Cat Form');
      setLines([
        { command: 'cancelform', argument: '', condition: { } },
        { command: 'cast', argument: 'Cat Form', condition: {} }
      ]);
      setActiveLineIndex(1);
    }
    if (type === 'druid-bear') {
      setShowTooltip('Bear Form');
      setLines([
        { command: 'cancelform', argument: '', condition: { } },
        { command: 'cast', argument: 'Bear Form', condition: {} }
      ]);
      setActiveLineIndex(1);
    }
    if (type === 'druid-travel') {
      setShowTooltip('Travel Form');
      setLines([
        { command: 'cancelform', argument: '', condition: { } },
        { command: 'cast', argument: 'Travel Form', condition: {} }
      ]);
      setActiveLineIndex(1);
    }
    if (type === 'dmh-cat') {
      setShowTooltip('Cat Form');
      setLines([
        { command: 'dmh', argument: 'start', condition: {} },
        { command: 'cast', argument: '!Cat Form', condition: {} },
        { command: 'dmh', argument: 'end', condition: {} }
      ]);
      setActiveLineIndex(1);
    }
    if (type === 'dmh-bear') {
      setShowTooltip('Dire Bear Form');
      setLines([
        { command: 'dmh', argument: 'start', condition: {} },
        { command: 'cast', argument: '!Dire Bear Form', condition: {} },
        { command: 'dmh', argument: 'end', condition: {} }
      ]);
      setActiveLineIndex(1);
    }
    if (type === 'dmh-healpot') {
      setShowTooltip('Super Healing Potion');
      setLines([
        { command: 'dmh', argument: 'start', condition: {} },
        { command: 'dmh', argument: 'cd pot', condition: {} },
        { command: 'use', argument: 'Super Healing Potion', condition: {} },
        { command: 'cast', argument: '!Dire Bear Form', condition: {} },
        { command: 'dmh', argument: 'end', condition: {} }
      ]);
      setActiveLineIndex(2);
    }
    if (type === 'dmh-manapot') {
      setShowTooltip('Super Mana Potion');
      setLines([
        { command: 'dmh', argument: 'stun gcd cd pot', condition: {} },
        { command: 'use', argument: 'Super Mana Potion', condition: {} },
        { command: 'cast', argument: '!Cat Form', condition: {} },
        { command: 'dmh', argument: 'end', condition: {} }
      ]);
      setActiveLineIndex(1);
    }
    if (type === 'dmh-innervate') {
      setShowTooltip('Innervate');
      setLines([
        { command: 'dmh', argument: 'innervate focus target player', condition: {} },
        { command: 'cast', argument: '[@focus,help,nodead] Innervate; Innervate', condition: {} },
        { command: 'dmh', argument: 'end', condition: {} }
      ]);
      setActiveLineIndex(1);
    }
  }

  function handleSpellSelect(spell: Spell) {
    const nextShow = showTooltip || spell.name;
    setShowTooltip(nextShow);
    updateLine(activeLineIndex, { argument: spell.name });
  }

  function handleConsumableSelect(item: Consumable) {
    const nextShow = showTooltip || item.name;
    setShowTooltip(nextShow);
    updateLine(activeLineIndex, { command: 'use', argument: item.name });
  }

  function handleCopy() {
    void navigator.clipboard.writeText(finalMacro);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>TBC Macro Builder</h1>
          <p>Build class, pet, and conditional macros with TBC-safe syntax.</p>
        </div>
        <div className="toggles">
          <div className="nav">
            <button
              className={view === 'builder' ? 'nav-active' : 'ghost'}
              onClick={() => setView('builder')}
            >
              Builder
            </button>
            <button
              className={view === 'curated' ? 'nav-active' : 'ghost'}
              onClick={() => setView('curated')}
            >
              Curated Macros
            </button>
            <button
              className={view === 'community' ? 'nav-active' : 'ghost'}
              onClick={() => setView('community')}
            >
              Community
            </button>
          </div>
          <label>
            <input
              type="checkbox"
              checked={useAtAlias}
              onChange={(event) => setUseAtAlias(event.target.checked)}
            />
            Use @target alias
          </label>
          <label>
            <input
              type="checkbox"
              checked={showExplain}
              onChange={(event) => setShowExplain(event.target.checked)}
            />
            Explain macro
          </label>
        </div>
      </header>

      {view === 'builder' && (
        <main className="layout">
          <section className="panel">
            <h2>Library</h2>
            <div className="field inline">
              <label>
                <input
                  type="radio"
                  checked={libraryMode === 'spells'}
                  onChange={() => setLibraryMode('spells')}
                />
                Spells
              </label>
              <label>
                <input
                  type="radio"
                  checked={libraryMode === 'consumables'}
                  onChange={() => setLibraryMode('consumables')}
                />
                Consumables
              </label>
            </div>
            <div className="field">
              <label>Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={libraryMode === 'consumables'}
              >
                {CLASS_OPTIONS.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
            {libraryMode === 'spells' ? (
              <div className="field inline">
                <label>
                  <input
                    type="checkbox"
                    checked={includePets}
                    onChange={(e) => setIncludePets(e.target.checked)}
                  />
                  Include pet abilities
                </label>
              </div>
            ) : (
              <div className="field">
                <label>Consumable type</label>
                <select value={consumableType} onChange={(e) => setConsumableType(e.target.value)}>
                  <option value="">(all)</option>
                  {consumableTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label>Search</label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="spell-list">
              {libraryMode === 'spells'
                ? spellList.map((spell) => (
                    <button
                      key={spell.id}
                      className="spell-card"
                      onClick={() => handleSpellSelect(spell)}
                    >
                      <span className="spell-name">
                        <a
                          href={spell.wowheadUrl}
                          data-wowhead={`spell=${spell.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {spell.name}
                        </a>
                      </span>
                      <span className="spell-meta">
                        {spell.isPet ? `Pet: ${spell.petType ?? 'Pet'}` : spell.isTalent ? 'Talent' : 'Base'}
                      </span>
                    </button>
                  ))
                : consumableList.map((item) => (
                    <button
                      key={item.id}
                      className="spell-card"
                      onClick={() => handleConsumableSelect(item)}
                    >
                      <span className="spell-name">
                        <a
                          href={item.wowheadUrl}
                          data-wowhead={`item=${item.itemId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.name}
                        </a>
                      </span>
                      <span className="spell-meta">{item.type}</span>
                    </button>
                  ))}
              {libraryMode === 'spells' && !spellList.length && <p className="muted">No spells found.</p>}
              {libraryMode === 'consumables' && !consumableList.length && (
                <p className="muted">No consumables found.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <h2>Macro Builder</h2>
            <div className="field">
              <label>Macro name</label>
              <input value={macroName} onChange={(e) => setMacroName(e.target.value)} />
            </div>
            <div className="field">
              <label>#showtooltip</label>
              <input value={showTooltip} onChange={(e) => setShowTooltip(e.target.value)} />
            </div>

            <div className="templates">
              <span>Templates</span>
              {selectedClass === 'Druid' && (
                <div className="field inline">
                  <label>
                    <input
                      type="radio"
                      checked={druidHelper === 'native'}
                      onChange={() => setDruidHelper('native')}
                    />
                    Native
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={druidHelper === 'dmh'}
                      onChange={() => setDruidHelper('dmh')}
                    />
                    DruidMacroHelper
                  </label>
                </div>
              )}
              <div className="template-buttons">
                <button onClick={() => applyTemplate('startattack')}>/startattack + /cast</button>
                <button onClick={() => applyTemplate('petattack')}>/petattack + /cast</button>
                <button onClick={() => applyTemplate('stopcasting')}>/stopcasting + /cast</button>
                {selectedClass === 'Druid' && druidHelper === 'native' && (
                  <>
                    <button onClick={() => applyTemplate('druid-cat')}>Powershift Cat</button>
                    <button onClick={() => applyTemplate('druid-bear')}>Powershift Bear</button>
                    <button onClick={() => applyTemplate('druid-travel')}>Powershift Travel</button>
                  </>
                )}
                {selectedClass === 'Druid' && druidHelper === 'dmh' && (
                  <>
                    <button onClick={() => applyTemplate('dmh-cat')}>DMH Cat Shift</button>
                    <button onClick={() => applyTemplate('dmh-bear')}>DMH Bear Shift</button>
                    <button onClick={() => applyTemplate('dmh-healpot')}>DMH Heal Pot</button>
                    <button onClick={() => applyTemplate('dmh-manapot')}>DMH Mana Pot</button>
                    <button onClick={() => applyTemplate('dmh-innervate')}>DMH Innervate</button>
                  </>
                )}
              </div>
              {selectedClass === 'Druid' && druidHelper === 'dmh' && (
                <p className="muted">
                  DruidMacroHelper mode uses /dmh start/end with optional checks like gcd, stun,
                  mana, and item cooldowns.
                </p>
              )}
            </div>

            <div className="lines">
              {lines.map((line, index) => (
                <div
                  key={`${line.command}-${index}`}
                  className={`line ${index === activeLineIndex ? 'active' : ''}`}
                  onClick={() => setActiveLineIndex(index)}
                >
                  <div className="line-row">
                    <select
                      value={line.command}
                      onChange={(e) => updateLine(index, { command: e.target.value })}
                    >
                      {COMMANDS.map((cmd) => (
                        <option key={cmd} value={cmd}>
                          /{cmd}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="Spell / Item / Args"
                      value={line.argument}
                      onChange={(e) => updateLine(index, { argument: e.target.value })}
                    />
                    <button className="ghost" onClick={() => removeLine(index)}>
                      Remove
                    </button>
                  </div>

                  <div className="condition-builder">
                    <div className="field">
                      <label>Target</label>
                      <select
                        value={line.condition?.target ?? ''}
                        onChange={(e) => updateCondition(index, { target: e.target.value || undefined })}
                      >
                        <option value="">(none)</option>
                        {TARGET_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Modifier</label>
                      <select
                        value={line.condition?.mod ?? ''}
                        onChange={(e) =>
                          updateCondition(index, {
                            mod: (e.target.value || undefined) as Condition['mod']
                          })
                        }
                      >
                        <option value="">(none)</option>
                        <option value="shift">Shift</option>
                        <option value="ctrl">Ctrl</option>
                        <option value="alt">Alt</option>
                      </select>
                    </div>
                    <div className="checkboxes">
                      {([
                        ['help', 'help'],
                        ['harm', 'harm'],
                        ['combat', 'combat'],
                        ['nocombat', 'nocombat'],
                        ['exists', 'exists'],
                        ['dead', 'dead'],
                        ['nodead', 'nodead']
                      ] as const).map(([key, label]) => (
                        <label key={key}>
                          <input
                            type="checkbox"
                            checked={Boolean(line.condition?.[key])}
                            onChange={(e) =>
                              updateCondition(index, { [key]: e.target.checked } as Partial<Condition>)
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="ghost" onClick={addLine}>
              Add line
            </button>
          </section>

          <section className="panel">
            <h2>Macro Output</h2>
            {errors.length > 0 && (
              <div className="errors">
                {errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            )}
            <textarea readOnly value={finalMacro} rows={12} />
            <button onClick={handleCopy}>Copy macro</button>

            {showExplain && (
              <div className="explain">
                <h3>Explain</h3>
                <ul>
                  {lines.map((line, index) => (
                    <li key={`${line.command}-${index}`}>{explainLine(line)}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </main>
      )}
      {view === 'curated' && (
        <main className="layout">
          <section className="panel">
            <h2>Curated Macros</h2>
            <div className="spell-list">
              {(curatedMacros as CuratedMacro[]).map((macro) => (
                <div key={macro.id} className="spell-card">
                  <strong>{macro.title}</strong>
                  <span className="spell-meta">{macro.class}</span>
                  <p className="muted">{macro.description}</p>
                  <textarea readOnly value={macro.macro ?? macro.macro_text ?? ''} rows={4} />
                </div>
              ))}
            </div>
          </section>
        </main>
      )}
      {view === 'community' && (
        <main className="layout">
          <section className="panel">
            <h2>Community Macros</h2>
            <div className="field">
              <label>Search</label>
              <input value={communityQuery} onChange={(e) => setCommunityQuery(e.target.value)} />
            </div>
            <div className="field">
              <label>Class</label>
              <select value={communityClass} onChange={(e) => setCommunityClass(e.target.value)}>
                <option value="">(any)</option>
                {CLASS_OPTIONS.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={fetchCommunity}>Search</button>
            {communityStatus === 'error' && <p className="muted">Failed to load macros.</p>}
            <div className="spell-list">
              {communityMacros.map((macro) => (
                <div key={macro.id} className="spell-card">
                  <strong>{macro.title}</strong>
                  <span className="spell-meta">{macro.class}</span>
                  <p className="muted">{macro.description}</p>
                  <textarea readOnly value={macro.macro ?? macro.macro_text ?? ''} rows={4} />
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <h2>Submit a Macro</h2>
            <div className="field">
              <label>Title</label>
              <input
                value={submission.title}
                onChange={(e) => setSubmission({ ...submission, title: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Class</label>
              <select
                value={submission.class}
                onChange={(e) => setSubmission({ ...submission, class: e.target.value })}
              >
                <option value="">Select class</option>
                {CLASS_OPTIONS.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Tags (comma-separated)</label>
              <input
                value={submission.tags}
                onChange={(e) => setSubmission({ ...submission, tags: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Description</label>
              <input
                value={submission.description}
                onChange={(e) => setSubmission({ ...submission, description: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Macro text</label>
              <textarea
                value={submission.macro_text}
                rows={6}
                onChange={(e) => setSubmission({ ...submission, macro_text: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Turnstile token</label>
              <input
                value={submission.turnstileToken}
                onChange={(e) => setSubmission({ ...submission, turnstileToken: e.target.value })}
              />
            </div>
            <button onClick={submitMacro}>Submit for approval</button>
          </section>
        </main>
      )}
    </div>
  );
}
