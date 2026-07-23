# JALVORO Full-Workspace Icon Migration

Status: active across the complete Next.js workspace  
Implementation mode: generated compatibility module with native Turbopack alias

## Outcome

Every application import from `lucide-react` is resolved by Next.js to a generated first-party JALVORO module. Existing call sites remain unchanged, so this migration does not alter icon sizing, color inheritance, CSS classes, hover states, active states, animation classes, accessibility labels, or surrounding layout.

Before install, development, and production build, the generator scans the repository's actual Lucide imports and emits static named JALVORO exports. Common product icons use explicit semantic mappings. New or uncommon names are resolved through ordered semantic rules, with a first-party JALVORO fallback rather than a third-party SVG.

## Why the compatibility layer exists

The repository contains icon imports across dashboard, business, authentication, settings, analytics, reports, forms, errors, loading states, and shared UI primitives. Rewriting every call site at once would create unnecessary visual-regression risk and merge conflicts with active feature branches.

The generated compatibility module provides an atomic workspace switch while preserving every caller-controlled prop:

```tsx
<Search size={18} strokeWidth={2.1} className="text-brand" />
```

continues to receive exactly those values, but the rendered component is JALVORO.

## Resolution flow

1. `postinstall`, `predev`, and `prebuild` run `scripts/generate-jalvoro-lucide-runtime.mjs`.
2. The generator scans actual imports and writes `components/icons/jalvoro/lucide-runtime.generated.tsx`.
3. `next.config.ts` maps `lucide-react` to that generated module using native `turbopack.resolveAlias`; a webpack alias is retained only as a supported fallback.
4. Exact semantic mappings resolve common product icons.
5. Ordered semantic rules resolve long-tail names.
6. Static named exports prevent missing or undefined runtime components.
7. The resulting JALVORO component receives the original props and ref unchanged.
8. Every rendered icon receives `data-jalvoro-source-name` for debugging and visual QA.

## Color and size contract

The compatibility module never sets a numeric `size`, `strokeWidth`, or hard-coded color.

- `size` from the existing call site is preserved.
- explicit `width` and `height` are preserved.
- `strokeWidth` is preserved.
- `className` is preserved.
- `color` is preserved.
- inherited CSS color continues through `currentColor`.
- existing fill props are forwarded.
- existing animation and transform classes are forwarded.

The only Lucide-specific prop intentionally removed is `absoluteStrokeWidth`, because JALVORO uses its own stable vector grid and caller-provided stroke value.

## Future customization

To change one common semantic mapping, edit `exact` in `scripts/generate-jalvoro-lucide-runtime.mjs`.

To change a family of less-common icon names, edit the ordered `rules` list in the same generator.

To change the actual vector design, edit the relevant definition under `components/icons/jalvoro/definitions/`. All direct and compatibility-routed workspace usages update automatically.

To change the global JALVORO stroke hierarchy, edit `tokens.ts`. Existing call sites with explicit `strokeWidth` remain unchanged; call sites using defaults inherit the new token.

New Lucide-style imports added by a future agent are discovered automatically the next time dependencies install, development starts, or a production build runs.

## Dependency boundary

`lucide-react` remains installed temporarily for TypeScript declaration compatibility while legacy import statements are present. It is not used to render workspace icons because the bundler resolves the package to the generated JALVORO module.

A later source-cleanup phase may mechanically replace legacy import specifiers and move or remove the type dependency. That cleanup is not required for visual migration and must not alter rendered output.

## Validation

The repository contract test verifies:

- the generated module exists;
- install, development, and build lifecycle generation is configured;
- Turbopack and webpack aliases point to the generated module;
- size, stroke, class, and color remain caller-controlled;
- representative workspace semantics map to first-party icons;
- no `lucide-react/*` subpath bypass exists.

The normal CI pipeline then runs dependency audit, lint, TypeScript, security tests, the complete test suite, and a production Turbopack build.
