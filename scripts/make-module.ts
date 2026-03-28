#!/usr/bin/env ts-node

import fs from 'fs-extra'

import { normalizeModuleName } from './utils'

// Get the module name from command line arguments
const moduleName = process.argv[2]

if (!moduleName) {
  console.error('❌ Please provide a module name')
  process.exit(1)
}

const { lower, pascal, snake, kebab, constant, lowerPlural, pascalPlural, snakePlural, kebabPlural, constantPlural } =
  normalizeModuleName(moduleName)

// Paths
const paths = {
  page: `app/${kebabPlural}/page.tsx`,
  view: `views/${kebabPlural}/${pascalPlural}.tsx`,
  constFile: `constants/api/${snakePlural}_api.ts`,
  constIndex: `constants/api/index.ts`,
  typeFile: `types/${snakePlural}.d.ts`,
  typeIndex: `types/index.d.ts`,
  service: `services/api/${snakePlural}.service.ts`
}

// Templates
const pageTemplate = `
    export default function ${pascalPlural}Page() {
    return <div>${pascalPlural} Page</div>;
    }
    `.trim()

const viewTemplate = `
    export default function ${pascalPlural}() {
    return <div>${pascalPlural} View</div>;
    }
    `.trim()

const constTemplate = `export const ${constantPlural}: string = '';`.trim()

const typeTemplate = `
    export interface ${pascal} {
    id: string;
    }
    `.trim()

const serviceTemplate = `
    export default class ${pascal}Service {
    static index = async () => {};
    static store = async () => {};
    static show = async () => {};
    static update = async () => {};
    static destroy = async () => {};
    }
    `.trim()

// Create files
fs.outputFileSync(paths.page, pageTemplate)
console.log(`✅ "${pascal}" Page created successfully!`)

fs.outputFileSync(paths.view, viewTemplate)
console.log(`✅ "${pascal}" View created successfully!`)

fs.outputFileSync(paths.constFile, constTemplate)
console.log(`✅ "${constant}" API Constants created successfully!`)

fs.outputFileSync(paths.typeFile, typeTemplate)
console.log(`✅ "${pascal}" Types created successfully!`)

fs.outputFileSync(paths.service, serviceTemplate)
console.log(`✅ "${pascal}" API Service created successfully!`)

// Append exports
fs.appendFileSync(paths.constIndex, `\nexport * from './${snakePlural}_api';`)
console.log(`✅ "${constant}" API Constants export added successfully!`)

fs.appendFileSync(paths.typeIndex, `\nexport * from './${snakePlural}';`)
console.log(`✅ "${pascal}" Types export added successfully!`)
console.log(`----------------------------------------------------------------------------`)
console.log(`✅ Module "${pascal}" created successfully!`)
