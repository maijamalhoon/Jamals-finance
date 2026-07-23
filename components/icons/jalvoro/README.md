# JALVORO Icons

Production icon system for the JALVORO workspace.

- 82 original icons across 8 categories
- 24×24 source grid
- thin-by-default rounded outline language
- one primary object, never more than two related objects
- optional `wave`, `zigzag`, or `subtle` micro-accent
- `currentColor` only; no hard-coded brand color
- central registry, typed name API, context stroke tokens, and metadata
- complete workspace source imports through a first-party JALVORO compatibility module

## Use

```tsx
import { JalvoroIcon } from "@/components/icons/jalvoro";
import { JalvoroSearchIcon } from "@/components/icons/jalvoro/components/actions";

<JalvoroIcon name="search" size={20} />
<JalvoroSearchIcon context="heading" accent="wave" />
```

## Full-workspace routing

All application source files now import first-party JALVORO modules directly. The `compat.tsx` surface retains familiar semantic component names while every SVG is rendered by JALVORO. Existing caller-controlled size, width, height, strokeWidth, className, color, fill, accessibility props, transform, animation class, and ref behavior remains unchanged. New product code should prefer direct category imports, while `compat.tsx` is reserved for stable legacy semantic names.

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

A vector change automatically reaches direct imports and all compatibility mappings that resolve to that icon.

## Change a compatibility mapping

1. Open `components/icons/jalvoro/compat.tsx`.
2. Change only the JALVORO component assigned to the semantic export.
3. Never set a fixed size, stroke, class, or color in the wrapper.
4. Run the complete CI pipeline because this surface covers the whole workspace.

## Add one icon

1. Add a definition in the correct category file.
2. Export a component in the matching file under `components/`.
3. Add the name to `manifest.ts`.
4. Register the component and definition in `registry.ts`.
5. Add or refine a generator mapping when it replaces a legacy semantic name.

The registry test intentionally fails when these files drift apart.

## Bundle guidance

Use category imports for ordinary new UI so only the required category is loaded. Use the name-based `JalvoroIcon` registry for icon pickers, documentation, or genuinely dynamic icon names. Existing semantic imports are first-party JALVORO source imports; no third-party icon runtime or resolver alias remains.
