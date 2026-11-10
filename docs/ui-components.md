# UI Components

The kit uses [shadcn/ui](https://ui.shadcn.com) for UI components, on top of Tailwind CSS 4.

## How shadcn works

shadcn isn't a dependency you import from `node_modules`. Its CLI copies each component's source into `components/ui/`, and from then on the code is yours: change it like any other file in the project.

| Piece                           | What it is                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `components.json`               | CLI settings: style, colors, icon library, where components go                 |
| `components/ui/`                | The components the CLI added (`button`, `card`, `field`, `input`, `label`, …)  |
| `app/globals.css`               | The theme: color, radius and font variables for light and dark mode            |
| `lib/utils.ts`                  | `cn()`, which joins class names and resolves Tailwind conflicts (`cn` package) |
| `components/theme-provider.tsx` | Dark mode (`next-themes`), wrapped around the app in `app/layout.tsx`          |
| `components/theme-toggle.tsx`   | Light/dark switch button, used on the home page and dashboard                  |
| `@base-ui/react`                | The accessible, unstyled building blocks the components are made from          |

The setup is the `base-nova` style on [Base UI](https://base-ui.com), with `neutral` colors and [Lucide](https://lucide.dev) icons. `components.json` records it, so components you add later match.

## Adding components

```bash
npx shadcn@latest add dialog dropdown-menu
```

Browse the components at [ui.shadcn.com/docs/components](https://ui.shadcn.com/docs/components). The CLI writes them to `components/ui/` in its own code style (double quotes); the pre-commit hook reformats them when you commit, or run `npm run lint:fix && npm run format`.

Some components install others they depend on (`field` brings in `label` and `separator`). Review what was added before committing, as with any code.

## Using them

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Invoices</CardTitle>
  </CardHeader>
  <CardContent>
    <Button variant="outline">Export</Button>
  </CardContent>
</Card>;
```

To make a link look like a button, use `buttonVariants` on the `Link`, so it stays a real link:

```tsx
<Link href="/login" className={buttonVariants({ variant: 'outline' })}>
  Log in
</Link>
```

### Forms

Build forms from `Field`, `FieldLabel`, `Input` and `FieldError`. `views/login/LoginForm.tsx` is a complete example with a server action:

- Give the input an `id` and the label a matching `htmlFor`.
- Set `aria-invalid` on the input and `data-invalid` on the `Field` when it has an error, so both are styled.
- Give `FieldError` an `id` and point the input's `aria-describedby` at it, so screen readers read the error with the field.

`FieldError` has `role="alert"`, so it is announced when it appears. Don't show the same text again in a form-level alert, or it is read twice.

## Theme and colors

Colors are CSS variables in `app/globals.css` (`--primary`, `--muted-foreground`, `--destructive`, …), with a light set in `:root` and a dark set in `.dark`. Use the matching Tailwind classes so both modes work:

| Instead of                         | Use                     |
| ---------------------------------- | ----------------------- |
| `text-zinc-600 dark:text-zinc-400` | `text-muted-foreground` |
| `text-red-600`                     | `text-destructive`      |
| `border-zinc-300`                  | `border-border`         |
| `bg-white dark:bg-zinc-950`        | `bg-background`         |

To rebrand, change the variables in `app/globals.css`, or build a theme at [ui.shadcn.com/themes](https://ui.shadcn.com/themes) and paste its variables in. `--radius` sets the corner rounding of every component.

## Dark mode

`next-themes` adds the `dark` class to `<html>`. It follows the operating system until the user presses the toggle; the choice is then saved in `localStorage` and applied before the page paints, so there's no flash of the wrong theme. `suppressHydrationWarning` on `<html>` in `app/layout.tsx` is needed because the class is set before React loads.

Read or change the theme in a client component with `useTheme()` from `next-themes`. Use `resolvedTheme` (`'light'` or `'dark'`), not `theme`, which can be `'system'`.

To remove dark mode, delete the `.dark` block in `app/globals.css`, the `ThemeProvider` in `app/layout.tsx` and the toggle.

## Testing

`components/ui/` is excluded from coverage: test how your views use the components, not the components themselves. Test your own components in `components/` as usual (see `components/theme-toggle.test.tsx`, which mocks `next-themes`).

Base UI components render real elements with the right roles and labels, so Testing Library queries like `getByRole('button', { name: 'Log in' })` and `getByLabelText('Email')` work on them.

See [testing.md](testing.md).
