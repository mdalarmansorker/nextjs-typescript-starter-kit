/**
 * Normalize a module name into various case formats (singular + plural)
 */
export function normalizeModuleName(name: string) {
  const words = name
    .replace(/[-_]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // split camelCase
    .replace(/([A-Z]+)([A-Z][a-z0-9]+)/g, '$1 $2') // split ALLCAPS followed by CapitalWord
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.toLowerCase())

  const lower = words.join('')
  const pascal = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
  const snake = words.join('_')
  const kebab = words.join('-')
  const constant = words.join('_').toUpperCase()

  const pluralize = (str: string) => {
    if (str.endsWith('y')) return str.slice(0, -1) + 'ies'
    if (str.endsWith('s') || str.endsWith('x') || str.endsWith('ch') || str.endsWith('sh')) return str + 'es'

    return str + 's'
  }

  const lastWord = words[words.length - 1]
  const pluralWords = [...words.slice(0, -1), pluralize(lastWord)]

  const lowerPlural = pluralWords.join('')
  const pascalPlural = pluralWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
  const snakePlural = pluralWords.join('_')
  const kebabPlural = pluralWords.join('-')
  const constantPlural = pluralWords.join('_').toUpperCase()

  return { lower, pascal, snake, kebab, constant, lowerPlural, pascalPlural, snakePlural, kebabPlural, constantPlural }
}
