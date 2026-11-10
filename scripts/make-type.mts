/**
 * Creates `types/<name>.ts` with an interface stub and exports it from `types/index.ts`.
 *
 * Usage: npm run make:type <name>
 */
import { appendExport, assertFilesDoNotExist, normalizeModuleName, tidy, writeFile } from './utils.mts';

const name = process.argv[2];

if (!name) {
  console.error('❌ Please provide a type name, e.g. npm run make:type category');
  process.exit(1);
}

const { pascal, snakePlural } = normalizeModuleName(name);

const typeFile = `types/${snakePlural}.ts`;
const typeIndex = 'types/index.ts';

assertFilesDoNotExist([typeFile]);

writeFile(
  typeFile,
  `export interface ${pascal} {
  id: string;
}
`,
);
appendExport(typeIndex, `export * from './${snakePlural}';`);

tidy([typeFile, typeIndex]);

console.log(`✅ Created ${typeFile} and exported ${pascal} from ${typeIndex}`);
