
# Next.js Starter Kit

>A modern, full-featured starter kit for building robust web applications with Next.js, TypeScript, Redux Toolkit, Tailwind CSS, and more.


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

- `dev`         – Start the development server
- `build`       – Build for production
- `start`       – Start the production server
- `lint`        – Run ESLint
- `lint:fix`    – Fix ESLint issues
- `format`      – Format code with Prettier
- `stylelint`   – Run Stylelint
- `stylelint:fix` – Fix Stylelint issues

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

## Environment Variables

See `.env.example` for all available environment variables. Only variables prefixed with `NEXT_PUBLIC_` are exposed to the client.

## Linting & Formatting

- ESLint, Prettier, and Stylelint are preconfigured. Use the provided scripts to check and fix code style.

## Deployment

Deploy easily to [Vercel](https://vercel.com/) or your preferred platform. See Next.js docs for more info.

---

**Happy coding!**
