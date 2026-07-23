# JALVORO Icons

Production icon system for the JALVORO workspace.

- 82 original icons across 8 categories
- 24×24 source grid
- thin-by-default rounded outline language
- one primary object, never more than two related objects
- optional `wave`, `zigzag`, or `subtle` micro-accent
- `currentColor` only; no hard-coded brand color
- central registry, typed name API, context stroke tokens, and metadata
- complete workspace routing through the JALVORO compatibility runtime

## Use

```tsx
import { JalvoroIcon } from "@/components/icons/jalvoro";
import { JalvoroSearchIcon } from "@/components/icons/jalvoro/components/actions";

<JalvoroIcon name="search" size={20} />
<JalvoroSearchIcon context="heading" accent="wave" />
```

## Full-workspace routing

Legacy imports from `lucide-react` are intercepted by the webpack alias in `next.config.ts` and rendered through `lucide-runtime.cjs`. This preserves every existing caller-controlled `size`, `width`, `height`, `strokeWidth`, `className`, color, fill, accessibility prop, and ref while replacing the SVG implementation with JALVORO.

New first-party code should prefer direct category imports. The compatibility runtime exists to make the existing workspace atomic and regression-safe while long-tail source imports are cleaned up over time.

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

1. Open `lucide-runtime.cjs`.
2. Use `EXACT` for a specific semantic name.
3. Use ordered `RULES` for a related long-tail family.
4. Never set a fixed size, stroke, class, or color in the compatibility layer.
5. Run the complete CI pipeline because the runtime covers every application surface.

## Add one icon

1. Add a definition in the correct category file.
2. Export a component in the matching file under `components/`.
3. Add the name to `manifest.ts`.
4. Register the component and definition in `registry.ts`.
5. Add migration documentation if it replaces an existing icon.

The registry test intentionally fails when these files drift apart.

## Bundle guidance

Use category imports for ordinary new UI so only the required category is loaded. Use the name-based `JalvoroIcon` registry for icon pickers, documentation, or genuinely dynamic icon names. Existing legacy imports are bundled through the compatibility runtime until the final source-cleanup phase.
