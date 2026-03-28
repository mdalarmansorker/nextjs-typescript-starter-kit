#!/usr/bin/env ts-node

import fs from 'fs-extra'

import { normalizeModuleName } from './utils'

// Get the module name from command line arguments
const moduleName = process.argv[2]

if (!moduleName) {
  console.error('❌ Please provide a module name')
  process.exit(1)
}

const { pascal, snakePlural } = normalizeModuleName(moduleName)

// Paths
const typeFile = `types/${snakePlural}.d.ts`
const typeIndex = `types/index.d.ts`

// Template
const typeTemplate = `
export interface ${pascal} {
  id: string;
}
`.trim()

// Guard: don't overwrite an existing file
if (fs.existsSync(typeFile)) {
  console.error(`❌ Type file already exists: ${typeFile}`)
  process.exit(1)
}

fs.outputFileSync(typeFile, typeTemplate)
console.log(`✅ "${pascal}" Types created at ${typeFile}`)

fs.appendFileSync(typeIndex, `\nexport * from './${snakePlural}';`)
console.log(`✅ "${pascal}" Types export added to ${typeIndex}`)
console.log(`----------------------------------------------------------------------------`)
console.log(`✅ Type "${pascal}" created successfully!`)
