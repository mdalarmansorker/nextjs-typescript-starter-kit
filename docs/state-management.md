# State Management

Client state uses Redux Toolkit, set up the way the Redux docs recommend for the Next.js App Router.

## When to use it

Redux is for state that many client components share and change, such as the page title in a shared header. Don't use it for:

- **Server data** (lists, records from the API): fetch it in Server Components through `services/api`, so it isn't fetched twice or cached in two places.
- **State of one component or form**: use `useState`.
- **State that belongs in the URL** (filters, tabs, pagination): use search params, so it survives reloads and can be shared.

## Files

| File                                 | Contents                                                            |
| ------------------------------------ | ------------------------------------------------------------------- |
| `lib/store.ts`                       | `makeStore()` and the `RootState`, `AppDispatch`, `AppStore` types  |
| `lib/StoreProvider.tsx`              | Client component that creates one store per request and provides it |
| `lib/hooks.ts`                       | Typed `useAppDispatch`, `useAppSelector`, `useAppStore`             |
| `lib/features/<name>/<name>Slice.ts` | One slice per feature                                               |

The store is created per request (in `StoreProvider`) instead of once per module. A module-level store would be shared by every user the server renders for.

`StoreProvider` wraps the app in `app/layout.tsx`.

## Using the store

Always use the typed hooks from `lib/hooks.ts`:

```tsx
'use client';

import { setPageTitle } from '@/lib/features/pageTitle/pageTitleSlice';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';

export function PageHeader() {
  const title = useAppSelector(state => state.pageTitle.pageTitle);
  const dispatch = useAppDispatch();

  return (
    <header>
      <h1>{title}</h1>
      <button onClick={() => dispatch(setPageTitle('Reports'))}>Open reports</button>
    </header>
  );
}
```

Only client components can use the store.

## Adding a slice

1. Create `lib/features/cart/cartSlice.ts`:

   ```ts
   import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

   interface CartState {
     itemIds: string[];
   }

   const initialState: CartState = { itemIds: [] };

   export const cartSlice = createSlice({
     name: 'cart',
     initialState,
     reducers: {
       addItem: (state, action: PayloadAction<string>) => {
         state.itemIds.push(action.payload);
       },
     },
   });

   export const { addItem } = cartSlice.actions;
   export default cartSlice.reducer;
   ```

2. Register it in `lib/store.ts`:

   ```ts
   reducer: {
     pageTitle: pageTitleReducer,
     cart: cartReducer,
   },
   ```

   `RootState` picks it up automatically.

3. Test the reducer directly and the store wiring with `makeStore()`. See `lib/features/pageTitle/pageTitleSlice.test.ts`. To test a component that uses the store, wrap it in `<StoreProvider>` (see `lib/StoreProvider.test.tsx`).
