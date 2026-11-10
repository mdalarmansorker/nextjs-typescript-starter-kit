import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// `server-only` throws when imported outside a React Server Component bundle. Tests run server modules
// directly, so it is replaced with an empty module here.
vi.mock('server-only', () => ({}));

// Testing Library only unmounts rendered trees on its own when Vitest globals are on; they are off here.
afterEach(() => {
  cleanup();
});
