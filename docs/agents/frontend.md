# Frontend Guide — React, TypeScript, Tailwind

Read [`AGENTS.md`](../../AGENTS.md) first. This guide adds frontend-specific rules.

## 1. Stack and layout

React 19 · TypeScript 5 (`strict`, `noUnusedLocals`, `noUnusedParameters`) · Vite 6 ·
Tailwind CSS 4 · TanStack Query 5 · React Router 7. Path alias `@/*` → `src/*`.

```
src/
  app/                 # App shell, router, providers
  pages/               # route-level screens (one folder per page once it grows)
  features/            # domain UI: booking-wizard, fleet, provider-panel
    <feature>/
      components/      # feature-only components
      hooks/           # feature-only hooks
      api.ts           # feature API calls + query keys
      types.ts         # feature DTOs
  components/          # shared, domain-agnostic UI (Button, Field, Modal)
  services/            # apiClient, shared HTTP helpers
  hooks/               # shared hooks
  lib/                 # pure helpers (formatting, validation)
  styles/              # global CSS / Tailwind entry
  types/               # cross-feature API types
```

Feature-first, not type-first: put code next to the feature that owns it. Promote to
`components/`/`lib/` only when a second feature needs it.

## 2. Component rules

- One component per file, file name = component name (`VehicleCard.tsx`). One default
  export component; named exports for hooks/helpers.
- **Size goal:** aim for ≤ 300 lines per file (target 120–200). Split by responsibility
  when it improves clarity — a page with five sections is usually five components.
- **Presentational vs. container:** screens/hooks own data fetching and state; leaf
  components receive typed props and render. No `fetch` in presentational components.
- Props are explicit `type Props = {...}`; never `React.FC`, never `any`, never
  `React.PropsWithChildren` noise — declare `children?: ReactNode` when needed.
- Composition over boolean explosions: prefer `children`/slots to `isX && isY` prop piles.
- Keep components pure. Side effects belong in `useEffect` (with cleanup) or event handlers.
- No derived state duplicated in `useState`; compute during render.
- Keys: stable domain IDs, never array index for reorderable lists.
- Forms: controlled inputs, validation on submit, disable while pending, show field-level
  errors from the API (`422` mapping), never rely on `alert()`.
- **Preserve user input after an API error.** Keep field values and completed wizard steps,
  display the error, and never reset the form unless the user explicitly asks. Re-submitting
  must not force the user to retype a multi-step booking.

## 3. Data and state

- **Server state:** TanStack Query only. One `queryKey` factory per feature
  (`bookingKeys.list(filters)`), query functions live in `features/<x>/api.ts`.
- **Local UI state:** `useState`/`useReducer`. Do not reach for a global store unless the
  state is genuinely cross-feature; the MVP needs none.
- All HTTP goes through `services/apiClient.ts` (base URL `/api/v1`, JSON, auth header,
  error normalization). No raw `fetch` in components or pages.
- Types mirror the backend contract (`snake_case` fields). Do not rename API fields in the
  client — map only inside a feature adapter if the UI truly needs another shape.
- Loading, empty and error states are mandatory for every async view. No spinner-only
  screens without an error path.
- Mutations: invalidate the affected query keys; optimistic updates only when rollback is
  implemented.
- **Never compute the final price or availability on the client.** Show server-provided
  values; client-side estimates must be labelled as estimates and re-confirmed by the API.

## 4. TypeScript rules

- `strict` stays on; do not weaken `tsconfig.json`. No `any`, no `@ts-ignore` (use
  `@ts-expect-error` with a reason if unavoidable). Avoid `as unknown as`; when there is no
  clean alternative, isolate the cast at an API boundary and explain it in a comment.
- Prefer `type` for API DTOs as a convention; `interface` is fine when it reads better.
  This is style, not a correctness rule.
- Discriminated unions for state machines (`{ status: 'idle' } | { status: 'error'; message: string }`).
- Validate external input (query params, localStorage) at the edge; trust internal types.
- Prefer `unknown` + narrowing over `any`; use `satisfies` for config objects.

## 5. Styling (Tailwind)

- Utility classes inline; extract repeated class sets when it clearly improves clarity.
  Three similar fragments are not automatically a shared component.
- Use design tokens/consistent scales (spacing 2/4/6/8, rounded-xl/2xl, slate/blue palette).
  No arbitrary values unless matching a real design need.
- Mobile-first responsive: base styles for small screens, `sm:`/`md:`/`lg:` upward.
- Every interactive element has hover, focus-visible, disabled and active states.
- No inline `style` except for truly dynamic values (map coordinates, progress width).
- Global CSS only for resets/Tailwind entry; no component-specific selectors.

## 6. Accessibility and UX

- Semantic HTML first (`button`, `nav`, `main`, `form`, `label`), ARIA only when needed.
- Every input has a `<label>`; errors are linked with `aria-describedby`.
- Keyboard: focus order is logical, modals trap focus and close on `Esc`, no keyboard traps.
- Images have meaningful `alt` (or empty `alt` for decoration); icon-only buttons need
  `aria-label`.
- Minimum contrast 4.5:1 for text; never encode status by colour alone (add text/icon).
- Copy is English, concise and action-oriented ("Book a van", not "Submit").

## 7. Performance

- Route-level code splitting with `React.lazy` + `Suspense` for non-landing pages.
- Memoize only measured hot paths (`useMemo`/`useCallback`/`memo`); no blanket memoization.
- Keep the initial bundle lean: no icon/animation/UI library without a size justification.
- Images: correct dimensions, `loading="lazy"` below the fold, SVG for illustrations.
- Avoid waterfalls: parallelize independent queries; prefetch the next wizard step only
  when it is certain to be visited.
- Leaflet/map code loads only on pages that need it.

## 8. Testing and verification

- `docker compose build frontend` must pass before reporting done — the image build runs
  `tsc --noEmit` and the Vite production build. For a local fast loop use `npm run typecheck`.
- Business logic in `lib/` and hooks gets unit tests (Vitest) once the test runner is added;
  critical flows (wizard validation, price display) get component tests.
- Manual smoke test in the browser at desktop and mobile widths for every UI stage.
- No `console.log` in committed code; use a single dev-only logger if needed.

## 9. Frontend checklist

- [ ] Size goals considered; components split by responsibility.
- [ ] No `any`, no unused locals/params, no ignored type errors.
- [ ] Data via TanStack Query + `apiClient`; loading/empty/error states present.
- [ ] Forms keep user input and completed steps after API errors.
- [ ] Server remains the source of price and availability.
- [ ] Responsive, keyboard-accessible, labelled inputs, visible focus.
- [ ] English copy, consistent Tailwind tokens, no dead components or styles.
- [ ] `docker compose build frontend` passes (typecheck + production build).
