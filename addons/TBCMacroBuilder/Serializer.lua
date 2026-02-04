TBCMacroBuilderSerializer = {}

local function escape(value)
  value = value:gsub('\\', '\\\\')
  value = value:gsub('"', '\\"')
  value = value:gsub('\n', '\\n')
  return value
end

local function unescape(value)
  value = value:gsub('\\n', '\n')
  value = value:gsub('\\"', '"')
  value = value:gsub('\\\\', '\\')
  return value
end

function TBCMacroBuilderSerializer:Encode(payload)
  local tags = payload.tags or {}
  local encodedTags = {}
  for _, tag in ipairs(tags) do
    table.insert(encodedTags, '"' .. escape(tag) .. '"')
  end
  local body = escape(payload.body or '')
  local title = escape(payload.title or '')
  local className = escape(payload.class or '')

  local json = string.format(
    '{"title":"%s","class":"%s","tags":[%s],"body":"%s"}',
    title,
    className,
    table.concat(encodedTags, ','),
    body
  )
  return 'TBCMB1|' .. json
end

function TBCMacroBuilderSerializer:Decode(text)
  if not text or text == '' then return nil end
  local prefix = 'TBCMB1|'
  if string.sub(text, 1, #prefix) ~= prefix then return nil end
  local json = string.sub(text, #prefix + 1)

  local title = json:match('"title"%s*:%s*"(.-)"') or ''
  local className = json:match('"class"%s*:%s*"(.-)"') or ''
  local body = json:match('"body"%s*:%s*"(.-)"') or ''

  local tagsRaw = json:match('"tags"%s*:%s*%[(.-)%]') or ''
  local tags = {}
  for tag in tagsRaw:gmatch('"(.-)"') do
    table.insert(tags, unescape(tag))
  end

  return {
    title = unescape(title),
    class = unescape(className),
    tags = tags,
    body = unescape(body)
  }
end
