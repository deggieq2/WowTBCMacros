local classes = {
  'Warrior',
  'Paladin',
  'Hunter',
  'Rogue',
  'Priest',
  'Shaman',
  'Mage',
  'Warlock',
  'Druid'
}

local function buildCondition(target, mod, flags)
  local parts = {}
  if target and target ~= '' then table.insert(parts, 'target=' .. target) end
  if mod and mod ~= '' then table.insert(parts, 'mod:' .. mod) end
  for key, enabled in pairs(flags) do
    if enabled then table.insert(parts, key) end
  end
  if #parts == 0 then return '' end
  return '[' .. table.concat(parts, ',') .. '] '
end

function TBCMacroBuilder:InitUI()
  if self.frame then return end

  local frame = CreateFrame('Frame', 'TBCMacroBuilderFrame', UIParent, 'BackdropTemplate')
  frame:SetSize(780, 700)
  frame:SetPoint('CENTER')
  frame:SetBackdrop({
    bgFile = 'Interface/Tooltips/UI-Tooltip-Background',
    edgeFile = 'Interface/Tooltips/UI-Tooltip-Border',
    tile = true,
    tileSize = 16,
    edgeSize = 16,
    insets = { left = 4, right = 4, top = 4, bottom = 4 }
  })
  frame:SetBackdropColor(0.1, 0.1, 0.1, 0.9)
  frame:Hide()

  local title = frame:CreateFontString(nil, 'OVERLAY', 'GameFontNormalLarge')
  title:SetPoint('TOPLEFT', 16, -16)
  title:SetText('TBC Macro Builder')

  local close = CreateFrame('Button', nil, frame, 'UIPanelCloseButton')
  close:SetPoint('TOPRIGHT', -6, -6)

  local nameLabel = frame:CreateFontString(nil, 'OVERLAY', 'GameFontNormal')
  nameLabel:SetPoint('TOPLEFT', 16, -48)
  nameLabel:SetText('Macro Name')

  local nameBox = CreateFrame('EditBox', nil, frame, 'InputBoxTemplate')
  nameBox:SetSize(200, 24)
  nameBox:SetPoint('TOPLEFT', 16, -66)
  nameBox:SetAutoFocus(false)

  local bodyLabel = frame:CreateFontString(nil, 'OVERLAY', 'GameFontNormal')
  bodyLabel:SetPoint('TOPLEFT', 16, -100)
  bodyLabel:SetText('Macro Body')

  local scrollFrame = CreateFrame('ScrollFrame', 'TBCMacroBuilderScroll', frame, 'UIPanelScrollFrameTemplate')
  scrollFrame:SetPoint('TOPLEFT', 16, -120)
  scrollFrame:SetSize(360, 200)

  local bodyBox = CreateFrame('EditBox', nil, scrollFrame)
  bodyBox:SetMultiLine(true)
  bodyBox:SetFontObject('ChatFontNormal')
  bodyBox:SetWidth(340)
  bodyBox:SetAutoFocus(false)
  scrollFrame:SetScrollChild(bodyBox)

  local charCheck = CreateFrame('CheckButton', nil, frame, 'ChatConfigCheckButtonTemplate')
  charCheck:SetPoint('TOPLEFT', 16, -330)
  charCheck:SetChecked(false)
  charCheck.Text:SetText('Character-specific macro')

  local saveButton = CreateFrame('Button', nil, frame, 'UIPanelButtonTemplate')
  saveButton:SetSize(120, 24)
  saveButton:SetPoint('TOPLEFT', 16, -360)
  saveButton:SetText('Save Draft')
  saveButton:SetScript('OnClick', function()
    TBCMacroBuilder:SaveDraft(nameBox:GetText(), bodyBox:GetText())
  end)

  local pushButton = CreateFrame('Button', nil, frame, 'UIPanelButtonTemplate')
  pushButton:SetSize(120, 24)
  pushButton:SetPoint('LEFT', saveButton, 'RIGHT', 8, 0)
  pushButton:SetText('Push to Macro')
  pushButton:SetScript('OnClick', function()
    TBCMacroBuilder:CreateOrUpdateMacro(nameBox:GetText(), bodyBox:GetText(), charCheck:GetChecked())
  end)

  local exportButton = CreateFrame('Button', nil, frame, 'UIPanelButtonTemplate')
  exportButton:SetSize(120, 24)
  exportButton:SetPoint('LEFT', pushButton, 'RIGHT', 8, 0)
  exportButton:SetText('Export')
  exportButton:SetScript('OnClick', function()
    local payload = {
      title = nameBox:GetText(),
      class = self.selectedClass or '',
      tags = {},
      body = bodyBox:GetText()
    }
    local encoded = TBCMacroBuilderSerializer:Encode(payload)
    bodyBox:SetText(encoded)
  end)

  local importButton = CreateFrame('Button', nil, frame, 'UIPanelButtonTemplate')
  importButton:SetSize(120, 24)
  importButton:SetPoint('LEFT', exportButton, 'RIGHT', 8, 0)
  importButton:SetText('Import')
  importButton:SetScript('OnClick', function()
    local decoded = TBCMacroBuilderSerializer:Decode(bodyBox:GetText())
    if decoded then
      nameBox:SetText(decoded.title or '')
      bodyBox:SetText(decoded.body or '')
    end
  end)

  local templateLabel = frame:CreateFontString(nil, 'OVERLAY', 'GameFontNormal')
  templateLabel:SetPoint('TOPLEFT', 16, -400)
  templateLabel:SetText('Templates')

  local function applyTemplate(body)
    bodyBox:SetText(body)
  end

  local templateButtons = {}
  for i, template in ipairs(TBCMacroBuilderTemplates or {}) do
    local btn = CreateFrame('Button', nil, frame, 'UIPanelButtonTemplate')
    btn:SetSize(160, 22)
    btn:SetPoint('TOPLEFT', 16, -420 - (i - 1) * 24)
    btn:SetText(template.name)
    btn:SetScript('OnClick', function()
      applyTemplate(template.body)
    end)
    table.insert(templateButtons, btn)
  end

  local druidLabel = frame:CreateFontString(nil, 'OVERLAY', 'GameFontNormal')
  druidLabel:SetPoint('TOPLEFT', 200, -400)
  local dmhStatus = (DruidMacroHelper and 'DMH detected') or 'DMH not loaded'
  druidLabel:SetText('Druid Helper (' .. dmhStatus .. ')')

  local druidButtons = {}
  for i, template in ipairs(TBCMacroBuilderDruidTemplates or {}) do
    local btn = CreateFrame('Button', nil, frame, 'UIPanelButtonTemplate')
    btn:SetSize(160, 22)
    btn:SetPoint('TOPLEFT', 200, -420 - (i - 1) * 24)
    btn:SetText(template.name)
    btn:SetScript('OnClick', function()
      applyTemplate(template.body)
    end)
    table.insert(druidButtons, btn)
  end

  local dmhLabel = frame:CreateFontString(nil, 'OVERLAY', 'GameFontNormal')
  dmhLabel:SetPoint('TOPLEFT', 16, -520)
  if DruidMacroHelper then
    dmhLabel:SetText('DMH Templates')
  else
    dmhLabel:SetText('DMH Templates (install DruidMacroHelper)')
  end

  if DruidMacroHelper then
    local dmhButtons = {}
    for i, template in ipairs(TBCMacroBuilderDruidDMHTemplates or {}) do
      local btn = CreateFrame('Button', nil, frame, 'UIPanelButtonTemplate')
      btn:SetSize(200, 22)
      btn:SetPoint('TOPLEFT', 16, -540 - (i - 1) * 24)
      btn:SetText(template.name)
      btn:SetScript('OnClick', function()
        applyTemplate(template.body)
      end)
      table.insert(dmhButtons, btn)
    end
  end

  local builderLabel = frame:CreateFontString(nil, 'OVERLAY', 'GameFontNormal')
  builderLabel:SetPoint('TOPLEFT', 420, -48)
  builderLabel:SetText('Line Builder')

  local commandBox = CreateFrame('EditBox', nil, frame, 'InputBoxTemplate')
  commandBox:SetSize(120, 24)
  commandBox:SetPoint('TOPLEFT', 420, -70)
  commandBox:SetAutoFocus(false)
  commandBox:SetText('cast')

  local argBox = CreateFrame('EditBox', nil, frame, 'InputBoxTemplate')
  argBox:SetSize(200, 24)
  argBox:SetPoint('LEFT', commandBox, 'RIGHT', 8, 0)
  argBox:SetAutoFocus(false)

  local targetBox = CreateFrame('EditBox', nil, frame, 'InputBoxTemplate')
  targetBox:SetSize(120, 24)
  targetBox:SetPoint('TOPLEFT', 420, -100)
  targetBox:SetAutoFocus(false)
  targetBox:SetText('')

  local modBox = CreateFrame('EditBox', nil, frame, 'InputBoxTemplate')
  modBox:SetSize(120, 24)
  modBox:SetPoint('LEFT', targetBox, 'RIGHT', 8, 0)
  modBox:SetAutoFocus(false)
  modBox:SetText('')

  local flagNames = { 'help', 'harm', 'combat', 'nocombat', 'exists', 'nodead' }
  local flagChecks = {}
  for i, flag in ipairs(flagNames) do
    local check = CreateFrame('CheckButton', nil, frame, 'ChatConfigCheckButtonTemplate')
    check:SetPoint('TOPLEFT', 420 + ((i - 1) % 3) * 120, -140 - math.floor((i - 1) / 3) * 24)
    check.Text:SetText(flag)
    flagChecks[flag] = check
  end

  local insertButton = CreateFrame('Button', nil, frame, 'UIPanelButtonTemplate')
  insertButton:SetSize(120, 24)
  insertButton:SetPoint('TOPLEFT', 420, -200)
  insertButton:SetText('Insert Line')
  insertButton:SetScript('OnClick', function()
    local flags = {}
    for _, flag in ipairs(flagNames) do
      flags[flag] = flagChecks[flag]:GetChecked()
    end
    local condition = buildCondition(targetBox:GetText(), modBox:GetText(), flags)
    local line = '/' .. commandBox:GetText() .. ' ' .. condition .. argBox:GetText()
    local current = bodyBox:GetText()
    if current ~= '' then
      current = current .. '\n'
    end
    bodyBox:SetText(current .. line)
  end)

  local spellLabel = frame:CreateFontString(nil, 'OVERLAY', 'GameFontNormal')
  spellLabel:SetPoint('TOPLEFT', 420, -240)
  spellLabel:SetText('Spells')

  local searchBox = CreateFrame('EditBox', nil, frame, 'InputBoxTemplate')
  searchBox:SetSize(200, 24)
  searchBox:SetPoint('TOPLEFT', 420, -260)
  searchBox:SetAutoFocus(false)

  local classDrop = CreateFrame('Frame', 'TBCMacroBuilderClassDrop', frame, 'UIDropDownMenuTemplate')
  classDrop:SetPoint('TOPLEFT', 620, -252)

  local listFrame = CreateFrame('Frame', nil, frame)
  listFrame:SetPoint('TOPLEFT', 420, -290)
  listFrame:SetSize(320, 220)

  local spellButtons = {}
  local displayCount = 10
  for i = 1, displayCount do
    local btn = CreateFrame('Button', nil, listFrame, 'UIPanelButtonTemplate')
    btn:SetSize(300, 20)
    btn:SetPoint('TOPLEFT', 0, -((i - 1) * 22))
    btn:SetText('')
    btn:SetScript('OnClick', function()
      local itemName = btn:GetText()
      if TBCMacroBuilder.libraryMode == 'consumables' then
        commandBox:SetText('use')
      end
      argBox:SetText(itemName)
    end)
    spellButtons[i] = btn
  end

  local page = 0

  local function getFilteredItems()
    local results = {}
    local search = searchBox:GetText():lower()
    if TBCMacroBuilder.libraryMode == 'consumables' then
      for _, item in ipairs(TBCMacroBuilderData.consumables or {}) do
        if search == '' or item.name:lower():find(search, 1, true) then
          table.insert(results, item)
        end
      end
      return results
    end

    for _, spell in ipairs(TBCMacroBuilderData.spells or {}) do
      if spell.class == (TBCMacroBuilder.selectedClass or 'Mage') then
        if search == '' or spell.name:lower():find(search, 1, true) then
          table.insert(results, spell)
        end
      end
    end
    return results
  end

  local function updateSpellButtons()
    local results = getFilteredItems()
    local startIndex = page * displayCount + 1
    for i = 1, displayCount do
      local spell = results[startIndex + i - 1]
      if spell then
        spellButtons[i]:SetText(spell.name)
        spellButtons[i]:Show()
      else
        spellButtons[i]:SetText('')
        spellButtons[i]:Hide()
      end
    end
  end

  local prevButton = CreateFrame('Button', nil, frame, 'UIPanelButtonTemplate')
  prevButton:SetSize(60, 20)
  prevButton:SetPoint('TOPLEFT', 420, -520)
  prevButton:SetText('Prev')
  prevButton:SetScript('OnClick', function()
    if page > 0 then
      page = page - 1
      updateSpellButtons()
    end
  end)

  local nextButton = CreateFrame('Button', nil, frame, 'UIPanelButtonTemplate')
  nextButton:SetSize(60, 20)
  nextButton:SetPoint('LEFT', prevButton, 'RIGHT', 8, 0)
  nextButton:SetText('Next')
  nextButton:SetScript('OnClick', function()
    page = page + 1
    updateSpellButtons()
  end)

  UIDropDownMenu_SetWidth(classDrop, 100)
  UIDropDownMenu_Initialize(classDrop, function(self, level)
    for _, className in ipairs(classes) do
      local info = UIDropDownMenu_CreateInfo()
      info.text = className
      info.func = function()
        TBCMacroBuilder.selectedClass = className
        UIDropDownMenu_SetSelectedName(classDrop, className)
        page = 0
        updateSpellButtons()
      end
      UIDropDownMenu_AddButton(info, level)
    end
  end)
  UIDropDownMenu_SetSelectedName(classDrop, classes[7])
  TBCMacroBuilder.selectedClass = classes[7]

  TBCMacroBuilder.libraryMode = 'spells'

  local modeSpellButton = CreateFrame('Button', nil, frame, 'UIPanelButtonTemplate')
  modeSpellButton:SetSize(80, 20)
  modeSpellButton:SetPoint('TOPLEFT', 420, -540)
  modeSpellButton:SetText('Spells')
  modeSpellButton:SetScript('OnClick', function()
    TBCMacroBuilder.libraryMode = 'spells'
    page = 0
    updateSpellButtons()
  end)

  local modeConsumableButton = CreateFrame('Button', nil, frame, 'UIPanelButtonTemplate')
  modeConsumableButton:SetSize(100, 20)
  modeConsumableButton:SetPoint('LEFT', modeSpellButton, 'RIGHT', 8, 0)
  modeConsumableButton:SetText('Consumables')
  modeConsumableButton:SetScript('OnClick', function()
    TBCMacroBuilder.libraryMode = 'consumables'
    page = 0
    updateSpellButtons()
  end)

  searchBox:SetScript('OnTextChanged', function()
    page = 0
    updateSpellButtons()
  end)

  updateSpellButtons()

  self.frame = frame
end
