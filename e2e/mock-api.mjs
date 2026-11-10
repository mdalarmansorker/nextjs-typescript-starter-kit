/**
 * A tiny stand-in for the backend API, started by playwright.config.ts so the e2e tests can log in
 * without a real backend. Add endpoints here as your e2e tests need them.
 *
 * POST /api/auth/login  { email, password }  →  200 { token } for the password "correct-password",
 *                                                422 `{ message, errors }` validation error otherwise
 * POST /api/auth/logout  Bearer token          →  204, and remembers the token as revoked
 * POST /api/auth/refresh { refresh_token }     →  200 new tokens for a token starting with "valid-refresh",
 *                                                401 otherwise
 * GET  /revoked-tokens                         →  the tokens revoked so far, for assertions
 *
 * Projects (the example CRUD module), Laravel API resource style, Bearer token required:
 * GET    /api/projects?page=&per_page=         →  200 { data: [...], meta: { current_page, per_page, total, last_page } }
 * GET    /api/projects/:id                     →  200 { data } or 404
 * POST   /api/projects { name, description }   →  201 { data }, or 422 when the name is missing or taken
 * PUT    /api/projects/:id                     →  200 { data }, 404 or 422
 * DELETE /api/projects/:id                     →  204 or 404
 */
import { createServer } from 'node:http';

export const MOCK_API_PORT = Number(process.env.MOCK_API_PORT ?? 4010);
export const VALID_PASSWORD = 'correct-password';

const readJson = async request => {
  let body = '';

  for await (const chunk of request) body += chunk;

  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
};

const send = (response, status, data) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(data));
};

const revokedTokens = [];

// Newest first. Seeded with enough projects for three pages of ten.
let nextProjectId = 1;
const projects = [];

for (let i = 1; i <= 23; i++) {
  projects.unshift({ id: nextProjectId++, name: `Seeded project ${i}`, description: i % 2 ? `Example ${i}` : null });
}

const validateProject = (body, exceptId) => {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const errors = {};

  if (!name) errors.name = ['The name field is required.'];
  else if (projects.some(p => p.name === name && p.id !== exceptId)) errors.name = ['The name has already been taken.'];

  return Object.keys(errors).length
    ? { message: Object.values(errors)[0][0], errors }
    : { project: { name, description: typeof body.description === 'string' ? body.description : null } };
};

const handleProjects = async (request, response, url) => {
  if (!request.headers.authorization?.startsWith('Bearer '))
    return send(response, 401, { message: 'Unauthenticated.' });

  const id = url.pathname.match(/^\/api\/projects\/([^/]+)$/)?.[1];
  const project = id ? projects.find(p => String(p.id) === decodeURIComponent(id)) : undefined;

  if (!id && request.method === 'GET') {
    const perPage = Math.max(Number(url.searchParams.get('per_page')) || 15, 1);
    const page = Math.max(Number(url.searchParams.get('page')) || 1, 1);
    const data = projects.slice((page - 1) * perPage, page * perPage);

    return send(response, 200, {
      data,
      meta: {
        current_page: page,
        per_page: perPage,
        total: projects.length,
        last_page: Math.max(Math.ceil(projects.length / perPage), 1),
      },
    });
  }

  if (!id && request.method === 'POST') {
    const result = validateProject(await readJson(request));

    if (!result.project) return send(response, 422, result);

    const created = { id: nextProjectId++, ...result.project };

    projects.unshift(created);
    return send(response, 201, { data: created });
  }

  if (id && !project) return send(response, 404, { message: 'Project not found.' });

  if (request.method === 'GET') return send(response, 200, { data: project });

  if (request.method === 'PUT') {
    const result = validateProject(await readJson(request), project.id);

    if (!result.project) return send(response, 422, result);

    Object.assign(project, result.project);
    return send(response, 200, { data: project });
  }

  if (request.method === 'DELETE') {
    projects.splice(projects.indexOf(project), 1);
    response.writeHead(204);
    return response.end();
  }

  return send(response, 405, { message: 'Method not allowed.' });
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://mock');

  if (url.pathname === '/api/projects' || url.pathname.startsWith('/api/projects/')) {
    return handleProjects(request, response, url);
  }

  if (request.method === 'POST' && request.url === '/api/auth/logout') {
    const token = request.headers.authorization?.replace(/^Bearer /, '');

    if (!token) return send(response, 401, { message: 'Unauthenticated.' });

    revokedTokens.push(token);
    response.writeHead(204);
    return response.end();
  }

  if (request.method === 'POST' && request.url === '/api/auth/refresh') {
    const { refresh_token: refreshToken } = await readJson(request);

    if (typeof refreshToken === 'string' && refreshToken.startsWith('valid-refresh')) {
      return send(response, 200, {
        access_token: 'refreshed-access',
        refresh_token: `${refreshToken}-rotated`,
        expires_in: 3600,
      });
    }

    return send(response, 401, { message: 'Invalid refresh token.' });
  }

  if (request.url === '/revoked-tokens') return send(response, 200, revokedTokens);

  if (request.method === 'POST' && request.url === '/api/auth/login') {
    const { password } = await readJson(request);

    if (password === VALID_PASSWORD) {
      return send(response, 200, { token: 'e2e-token' });
    }

    return send(response, 422, {
      message: 'These credentials do not match our records.',
      errors: { email: ['These credentials do not match our records.'] },
    });
  }

  if (request.url === '/health') return send(response, 200, { ok: true });

  send(response, 404, { message: 'Not found' });
});

server.listen(MOCK_API_PORT, '127.0.0.1', () => {
  console.log(`Mock API listening on http://127.0.0.1:${MOCK_API_PORT}`);
});
