# JALVORO Icons

Production icon system for the JALVORO workspace.

- 82 original icons across 8 categories
- 24×24 source grid
- thin-by-default rounded outline language
- one primary object, never more than two related objects
- optional `wave`, `zigzag`, or `subtle` micro-accent
- `currentColor` only; no hard-coded brand color
- central registry, typed name API, context stroke tokens, and metadata

## Use

```tsx
import { JalvoroIcon } from "@/components/icons/jalvoro";
import { JalvoroSearchIcon } from "@/components/icons/jalvoro/components/actions";

<JalvoroIcon name="search" size={20} />
<JalvoroSearchIcon context="heading" accent="wave" />
```

## Context weights

- `compact`: 1.45
- `content`: 1.55 (default)
- `heading`: 1.70
- `hero`: 1.85

Explicit `strokeWidth` always overrides the context token for compatibility with existing call sites.

## Change one icon

1. Open its category file under `definitions/`.
2. Edit only its `body`, `accent`, or metadata.
3. Keep the 24×24 coordinate system and `currentColor` contract.
4. Run `npm test` and `npm run typecheck`.

## Add one icon

1. Add a definition in the correct category file.
2. Export a component in the matching file under `components/`.
3. Add the name to `manifest.ts`.
4. Register the component and definition in `registry.ts`.
5. Add migration documentation if it replaces an existing icon.

The registry test intentionally fails when these files drift apart.

## Bundle guidance

Use category imports for ordinary UI so only the required category is loaded. Use the name-based `JalvoroIcon` registry for icon pickers, documentation, or genuinely dynamic icon names.
