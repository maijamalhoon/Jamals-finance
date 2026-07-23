# JALVORO Icon System — Design and Engineering Standard

Status: Phase 1 production foundation  
Version: 1.0.0-alpha.1  
Initial catalog: 82 icons

## Non-negotiable design contract

1. One icon normally represents one object or concept.
2. A maximum of two directly related objects is allowed only when meaning requires it.
3. The primary silhouette must remain readable without the micro-accent.
4. Micro-accents are secondary: `wave`, `zigzag`, or `subtle` only.
5. Default strokes are thin; context tokens increase weight deliberately.
6. Rounded caps and joins are mandatory.
7. Icons use `currentColor`; brand colors belong to the consuming UI.
8. The source grid is always 24×24.
9. No decorative clutter, gradients, shadows, textures, or embedded raster data.
10. Existing product logic must never depend on icon geometry.

## Approved visual language

JALVORO icons are clean rounded outlines with a controlled hand-drawn character. Geometry is intentionally friendly rather than mechanically rigid, but paths remain production-clean and legible at 16, 20, 24, and 32 pixels.

The micro-accent is a signature detail, not a requirement. Icons with no safe internal space omit it. The system supports all three approved accent variants at runtime for definitions that provide an accent placement.

## Stroke contexts

| Context | Stroke | Intended use |
|---|---:|---|
| compact | 1.45 | tags, dense rows, secondary inline content |
| content | 1.55 | default buttons, cards, navigation, ordinary content |
| heading | 1.70 | section headings and emphasized controls |
| hero | 1.85 | large presentation and highlighted empty states |

A caller may provide an explicit `strokeWidth` when an existing component already controls weight. This keeps migration backward-compatible.

## Architecture

```text
components/icons/jalvoro/
├── JalvoroIcon.tsx          # typed name-based entry point
├── components/              # tree-shakeable named exports by category
├── core.tsx                 # SVG renderer and micro-accent geometry
├── manifest.ts              # names, category, phase, object count
├── registry.ts              # runtime component + definition registries
├── tokens.ts                # sizes, strokes, accent opacity
├── types.ts                 # public contracts
├── definitions/             # category-owned vector definitions
├── jalvoro-icons.test.tsx   # drift, color, accessibility, complexity QA
└── README.md                # contributor quick start
```

All vector geometry lives in data definitions. The renderer owns accessibility, stroke behavior, `currentColor`, sizing, and accent behavior. This separation lets a future agent alter one icon without rewriting components across the workspace.

## Public APIs

```tsx
<JalvoroIcon name="delete" />
<JalvoroIcon name="search" accent="zigzag" context="compact" />
<JalvoroPencilIcon size={32} context="heading" title="Edit" />
```

Decorative icons are automatically `aria-hidden`. A title, `aria-label`, or `aria-labelledby` makes the icon meaningful and sets image semantics.

## Category ownership

- navigation — route and workspace identity
- actions — direct user operations
- finance — money, banking, planning, and financial state
- objects — universal physical and digital objects
- identity — people and access actors
- communication — contact, messages, sending, and global presence
- interface — layout and movement controls
- status — state, warning, completion, and intelligence markers

## Migration strategy

Phase 1 introduces the architecture, catalog, QA, and replaces centralized dashboard navigation icons. Lucide remains installed temporarily because unrelated screens still depend on it. Removing it before the last migration would be unsafe and is explicitly deferred.

Later migration is mechanical:

1. choose or add the JALVORO definition;
2. replace the import;
3. preserve existing `size`, `strokeWidth`, class, and accessibility props;
4. visually verify 16/20/24/32 pixel use;
5. run typecheck and tests;
6. remove the old library only when repository search reports zero imports.

## Agent modification protocol

Every future agent must:

- modify the smallest relevant definition or token;
- avoid unrelated component rewrites;
- preserve names unless a deprecation entry is added;
- never hard-code a color in an icon;
- keep `objects` accurate and at most 2;
- keep body nodes at 8 or fewer unless a documented exception is approved;
- run the registry test before commit;
- document breaking geometry changes in the version history.

## Versioning

- patch: path cleanup with no semantic or dimensional change
- minor: new icons, aliases, categories, or non-breaking accent additions
- major: removed/renamed icons or changed public prop contracts

## Phase roadmap

- Phase 1: foundation, 12 navigation, 18 actions, 16 finance icons, centralized navigation migration
- Phase 2: universal objects, identity, communication, interface, and status catalog already seeded in the same registry
- Phase 3: replace remaining workspace Lucide imports category by category
- Phase 4: extract reusable `@jalvoro/icons` package and generate framework-neutral SVG assets
- Phase 5: expand long-tail world-object catalog using the same definition and QA contract

## Bundle policy

Application screens should import named components from `components/<category>` so the all-icon registry is not pulled into normal routes. The name-based `JalvoroIcon` component is reserved for dynamic icon pickers, catalogs, and metadata-driven surfaces.
