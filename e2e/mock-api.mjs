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

const server = createServer(async (request, response) => {
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
