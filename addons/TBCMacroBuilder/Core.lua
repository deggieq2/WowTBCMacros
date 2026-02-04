TBCMacroBuilder = TBCMacroBuilder or {}
TBCMacroBuilderDB = TBCMacroBuilderDB or {}

local ADDON_NAME = ...

local function ensureDB()
  TBCMacroBuilderDB.drafts = TBCMacroBuilderDB.drafts or {}
  TBCMacroBuilderDB.templates = TBCMacroBuilderDB.templates or {}
  TBCMacroBuilderDB.exports = TBCMacroBuilderDB.exports or {}
end

function TBCMacroBuilder:SaveDraft(name, body)
  if not name or name == '' then return end
  TBCMacroBuilderDB.drafts[name] = body
end

function TBCMacroBuilder:CreateOrUpdateMacro(name, body, isCharacter)
  if not name or name == '' then return false end
  local index = GetMacroIndexByName(name)
  if index == 0 then
    local maxGlobal, maxChar = GetNumMacros()
    if isCharacter and maxChar >= 18 then return false end
    if not isCharacter and maxGlobal >= 120 then return false end
    CreateMacro(name, 'INV_MISC_QUESTIONMARK', body, isCharacter)
    return true
  end
  EditMacro(index, name, nil, body)
  return true
end

function TBCMacroBuilder:Toggle()
  if not self.frame then return end
  if self.frame:IsShown() then
    self.frame:Hide()
  else
    self.frame:Show()
  end
end

local eventFrame = CreateFrame('Frame')
eventFrame:RegisterEvent('ADDON_LOADED')
eventFrame:SetScript('OnEvent', function(_, event, name)
  if event == 'ADDON_LOADED' and name == ADDON_NAME then
    ensureDB()
    if TBCMacroBuilder.InitUI then
      TBCMacroBuilder:InitUI()
    end
  end
end)

SLASH_TBCMACROBUILDER1 = '/tbcmb'
SlashCmdList.TBCMACROBUILDER = function()
  TBCMacroBuilder:Toggle()
end
