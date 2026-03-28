
# Next.js Starter Kit

> A modern, full-featured starter kit for building robust web applications with Next.js, TypeScript, Redux Toolkit, Tailwind CSS, and more.

## Features

- **Next.js 16** with App Router and TypeScript
- **Redux Toolkit** for state management
- **Tailwind CSS** for utility-first styling
- **Prettier, ESLint, Stylelint** for code quality and formatting
- **CryptoJS** for encryption utilities
- **Lucide React** for icons
- **Environment variable support** (with `.env.example`)
- Modular folder structure for scalability

## Project Structure

```
├── app/                # Next.js app directory (pages, layout, etc.)
├── constants/          # API endpoints and constants
├── lib/                # Store, hooks, utilities, and features
├── public/             # Static assets
├── services/           # App-level services (cache, cookies)
├── types/              # TypeScript type definitions
├── utils/              # Utility functions (e.g., encryption)
├── styles/             # Global and component styles
├── .env.example        # Example environment variables
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── ...
```

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

2. **Copy and configure environment variables:**

   ```bash
   cp .env.example .env.local
   # Edit .env.local as needed
   ```

3. **Run the development server:**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser:**
   Visit [http://localhost:3000](http://localhost:3000)

## Scripts

- `dev` – Start the development server
- `build` – Build for production
- `start` – Start the production server
- `lint` – Run ESLint
- `lint:fix` – Fix ESLint issues
- `format` – Format code with Prettier
- `stylelint` – Run Stylelint
- `stylelint:fix` – Fix Stylelint issues
- `make:module <name>` – Scaffold a full module (page, view, service, types, constants)
- `make:type <name>` – Scaffold a type definition file only

### Code Generators

#### `make:module`

Generates all the boilerplate files for a new feature module in one command.

```bash
npm run make:module <moduleName>
```

**Example:**

```bash
npm run make:module blogPost
```

**Files created:**

| File                                 | Description                       |
| ------------------------------------ | --------------------------------- |
| `app/blog-posts/page.tsx`            | Next.js page route                |
| `views/blog-posts/BlogPosts.tsx`     | View/UI component                 |
| `services/api/blog_posts.service.ts` | API service class with CRUD stubs |
| `types/blog_posts.d.ts`              | TypeScript interface              |
| `constants/api/blog_posts_api.ts`    | API endpoint constants            |

Exports are automatically appended to `types/index.d.ts` and `constants/api/index.ts`.

The module name is accepted in any format — `camelCase`, `PascalCase`, `snake_case`, or `kebab-case` — and normalized automatically.

#### `make:type`

Generates a single TypeScript interface file and registers it in the type index.

```bash
npm run make:type <typeName>
```

**Example:**

```bash
npm run make:type category
```

**Files created:**

| File                    | Description                                 |
| ----------------------- | ------------------------------------------- |
| `types/categories.d.ts` | TypeScript interface with `id: string` stub |

The export is automatically appended to `types/index.d.ts`. Will not overwrite an existing type file.

## Key Technologies

- **Next.js**: React framework for server-side rendering and static site generation
- **TypeScript**: Strongly typed JavaScript
- **Redux Toolkit**: Simplified Redux state management
- **Tailwind CSS**: Utility-first CSS framework
- **CryptoJS**: Encryption and decryption utilities
- **Lucide React**: Icon library

## State Management Example

Redux Toolkit is set up in `lib/store.ts` and `lib/features/`. Use `useAppDispatch` and `useAppSelector` from `lib/hooks.ts` for typed hooks.

## Utilities

- `lib/utils.ts`: Utility helpers (e.g., `cn` for class merging)
- `utils/encryption.ts`: Secure encryption/decryption helpers

## Cookie Service

`services/app/cookie.service.ts` provides a unified, isomorphic cookie API that works on both client and server (Next.js App Router).

### Methods

| Method                                        | Description                   |
| --------------------------------------------- | ----------------------------- |
| `CookieService.store(name, value, options?)`  | Set a cookie                  |
| `CookieService.get(name)`                     | Get a cookie value            |
| `CookieService.update(name, value, options?)` | Overwrite an existing cookie  |
| `CookieService.delete(name, options?)`        | Remove a cookie               |
| `CookieService.clear()`                       | Remove all accessible cookies |

All methods are `async` and work on both server and client. Synchronous variants (`storeSync`, `getSync`, `deleteSync`, `clearSync`) are also available for **client-side only** use.

### Usage

**Client component / client-side code:**

```ts
import CookieService from '@/services/app/cookie.service'

// Set
await CookieService.store('token', 'abc123', { expires: 7 })

// Get
const token = await CookieService.get('token')

// Update
await CookieService.update('token', 'newValue')

// Delete
await CookieService.delete('token')

// Clear all
await CookieService.clear()
```

**Synchronous client-side shortcuts:**

```ts
CookieService.storeSync('theme', 'dark')
const theme = CookieService.getSync('theme')
CookieService.deleteSync('theme')
CookieService.clearSync()
```

> Sync methods throw an error if called on the server. Use the async methods in Server Components and Server Actions.

## Environment Variables

See `.env.example` for all available environment variables. Only variables prefixed with `NEXT_PUBLIC_` are exposed to the client.

## Linting & Formatting

- ESLint, Prettier, and Stylelint are preconfigured. Use the provided scripts to check and fix code style.

## Deployment

Deploy easily to [Vercel](https://vercel.com/) or your preferred platform. See Next.js docs for more info.

---

**Happy coding!**
