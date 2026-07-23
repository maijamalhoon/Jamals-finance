# JALVORO Full-Workspace Icon Migration

Status: active across the complete Next.js workspace  
Implementation mode: compatibility-preserving runtime alias

## Outcome

Every application import from `lucide-react` is resolved by webpack to the first-party JALVORO icon runtime. Existing call sites remain unchanged, so this migration does not alter icon sizing, color inheritance, CSS classes, hover states, active states, animation classes, accessibility labels, or surrounding layout.

The runtime converts each requested semantic icon name to a JALVORO component. Common product icons use explicit mappings. New or uncommon names are resolved through ordered semantic rules, with a first-party JALVORO fallback rather than rendering a third-party SVG.

## Why the compatibility layer exists

The repository contains icon imports across dashboard, business, authentication, settings, analytics, reports, forms, errors, loading states, and shared UI primitives. Rewriting every call site at once would create unnecessary visual-regression risk and merge conflicts with active feature branches.

The compatibility runtime provides an atomic workspace switch while preserving every caller-controlled prop:

```tsx
<Search size={18} strokeWidth={2.1} className="text-brand" />
```

continues to receive exactly those values, but the rendered component is JALVORO.

## Resolution flow

1. `next.config.ts` aliases `lucide-react` to `components/icons/jalvoro/lucide-runtime.cjs`.
2. Development and production builds use webpack so the same alias is guaranteed locally and on Vercel.
3. The runtime checks exact semantic mappings first.
4. Ordered semantic rules resolve long-tail names.
5. The resulting JALVORO component receives the original props and ref unchanged.
6. Every rendered icon receives `data-jalvoro-source-name` for debugging and visual QA.

## Color and size contract

The compatibility runtime never sets a numeric `size`, `strokeWidth`, or hard-coded color.

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

To change one common semantic mapping, edit `EXACT` in `lucide-runtime.cjs`.

To change a family of less-common icon names, edit the ordered `RULES` list.

To change the actual vector design, edit the relevant definition under `components/icons/jalvoro/definitions/`. All mapped workspace usages update automatically.

To change the global JALVORO stroke hierarchy, edit `tokens.ts`. Existing call sites with explicit `strokeWidth` remain unchanged; call sites using defaults inherit the new token.

## Dependency boundary

`lucide-react` remains installed temporarily for TypeScript declaration compatibility while legacy import statements are present. It is not used to render workspace icons because webpack resolves the package to JALVORO.

A later source-cleanup phase may mechanically replace legacy import specifiers and move/remove the type dependency. That cleanup is not required for visual migration and must not alter rendered output.

## Validation

The repository contract test verifies:

- the webpack alias exists;
- development and production use webpack;
- size, stroke, class, and color are caller-controlled;
- representative workspace semantics map to first-party icons;
- no `lucide-react/*` subpath bypass exists.

The normal CI pipeline then runs dependency audit, lint, TypeScript, security tests, the full test suite, and a production build.
