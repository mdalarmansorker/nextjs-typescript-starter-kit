/**
 * Creates a feature module: page, view, API service, type and endpoint constant, and registers the
 * type and constant in their index files. Refuses to run when any of the files already exists.
 *
 * Usage: npm run make:module <name>
 */
import { appendExport, assertFilesDoNotExist, normalizeModuleName, tidy, writeFile } from './utils.mts';

const name = process.argv[2];

if (!name) {
  console.error('❌ Please provide a module name, e.g. npm run make:module blogPost');
  process.exit(1);
}

const { pascal, pascalPlural, snakePlural, kebabPlural, constantPlural } = normalizeModuleName(name);

const paths = {
  page: `app/${kebabPlural}/page.tsx`,
  view: `views/${kebabPlural}/${pascalPlural}.tsx`,
  service: `services/api/${snakePlural}.service.ts`,
  type: `types/${snakePlural}.ts`,
  constant: `constants/api/${snakePlural}.api.ts`,
};
const indexes = {
  type: 'types/index.ts',
  constant: 'constants/api/index.ts',
};

assertFilesDoNotExist(Object.values(paths));

writeFile(
  paths.page,
  `import ${pascalPlural} from '@/views/${kebabPlural}/${pascalPlural}';

export default function ${pascalPlural}Page() {
  return <${pascalPlural} />;
}
`,
);

writeFile(
  paths.view,
  `export default function ${pascalPlural}() {
  return <h1>${pascalPlural}</h1>;
}
`,
);

writeFile(
  paths.constant,
  `export const ${constantPlural} = '/${kebabPlural}';
`,
);

writeFile(
  paths.type,
  `export interface ${pascal} {
  id: string;
}
`,
);

writeFile(
  paths.service,
  `import 'server-only';

import type { ${pascal} } from '@/types';

import { ${constantPlural} } from '@/constants/api';

import { handleRequest } from './base.service';

type ${pascal}Payload = Omit<${pascal}, 'id'>;

/**
 * Server-only: call it from Server Components to read, and from server actions to write.
 * Add \`parse\` to check responses at runtime (see docs/api-layer.md).
 */
export default class ${pascal}Service {
  static index = () => handleRequest<${pascal}[]>(${constantPlural}, { requiresAuth: true });

  static show = (id: string) =>
    handleRequest<${pascal}>(\`\${${constantPlural}}/\${encodeURIComponent(id)}\`, { requiresAuth: true });

  static store = (payload: ${pascal}Payload) =>
    handleRequest<${pascal}>(${constantPlural}, { requiresAuth: true, method: 'POST', body: JSON.stringify(payload) });

  static update = (id: string, payload: Partial<${pascal}Payload>) =>
    handleRequest<${pascal}>(\`\${${constantPlural}}/\${encodeURIComponent(id)}\`, {
      requiresAuth: true,
      method: 'PUT',
      body: JSON.stringify(payload),
    });

  static destroy = (id: string) =>
    handleRequest<void>(\`\${${constantPlural}}/\${encodeURIComponent(id)}\`, { requiresAuth: true, method: 'DELETE' });
}
`,
);

appendExport(indexes.type, `export * from './${snakePlural}';`);
appendExport(indexes.constant, `export * from './${snakePlural}.api';`);

tidy([...Object.values(paths), ...Object.values(indexes)]);

console.log(`✅ Module "${pascal}" created:`);
for (const path of Object.values(paths)) console.log(`   ${path}`);
