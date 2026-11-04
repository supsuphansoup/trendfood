# shadcn/ui ecosystem & React component libraries for TrendFood (as of 2026-11-04)

Method note: GitHub stars / last push / latest release were pulled live via `gh api` and `npm view` on 2026-11-04 (raw numbers below). Facts recalled from training data but not re-verified this session are marked **[unverified]**.

Snapshot of key package versions (npm, 2026-11-04): `shadcn` 4.23.0 (2026-10-27), `tailwindcss` 4.3.4, `next` 16.4.5, `react` 19.3.1, `@base-ui/react` 1.9.0 (2026-10-09), `motion` 14.9.0 (2026-10-30), `sonner` 2.0.8 (2026-08-09), `vaul` 1.1.2 (2024-12-14), `cmdk` 1.1.1, `embla-carousel-react` 8.6.0, `@tanstack/react-table` 9.3.1 (2026-10-12), `recharts` 3.10.1, `@heroui/react` 3.2.7, `@mantine/core` 9.7.4, `@chakra-ui/react` 3.38.0, `@tremor/react` 3.18.7 (2025-01-13) — source: npm registry (`npm view <pkg> version time.modified`), https://www.npmjs.com/

## 1. shadcn/ui current state (2025–2026), registries, security

### Takeaway
shadcn/ui is now a multi-primitive, registry-driven distribution system: CLI v4 (`shadcn@4.23.0`), Tailwind v4, React 19, **Base UI is the default primitive since July 2026** (Radix still supported, React Aria added as a third option), an official MCP server, and a namespaced registry ecosystem. Registries are "copy code into your repo" — powerful but a real supply-chain surface.

### Cited Findings
Timeline (from changelog index) — [shadcn changelog](https://ui.shadcn.com/docs/changelog):
- Oct 2024: React 19 support + Sidebar; Feb 2025: Tailwind v4 + updated registry schema; Apr 2025: MCP; Jun 2025: `radix-ui` unified package migration + new Calendar; Aug 2025: **CLI 3.0 and MCP Server**; Sep 2025: Registry Index; Oct 2025: Registry Directory + new components; Dec 2025: `npx shadcn create`; Jan 2026: RTL support, Base UI docs; Feb 2026: Blocks for Radix and Base UI; Mar 2026: **shadcn/cli v4**; Apr 2026: `shadcn preset`/`apply`, "Sera" style; May 2026: `shadcn eject`, registry include/validate; Jun 2026: GitHub registries, chat components; **Jul 2026: Base UI as the Default, Toast, React Aria, @shadcn/helpers, shadcn/typeset**; Aug 2026: private GitHub registries, Questionnaire; Sep 2026: standalone `cn` package (`shadcn migrate cn` removes `clsx`+`tailwind-merge`); Oct 2026: Trace/Code Block + "AI Elements" (21 patterns) replacing AI SDK Elements — [changelog](https://ui.shadcn.com/docs/changelog)
- "Eight styles" exist across Base UI / React Aria / Radix (Oct 2026 entry) — [changelog](https://ui.shadcn.com/docs/changelog)
- **Base UI default (Jul 2026):** `npx shadcn init` selects Base UI unless told otherwise; docs open on Base UI tab; "Radix is not being deprecated"; new projects: Base UI recommended; keep Radix with `shadcn init -b radix`; migration is optional, progressive, agent-skill-driven (`pnpm dlx skills add shadcn/ui`), `asChild` → `render` — [Base UI as the Default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)
- **React Aria (Jul 2026)** available as a component base alongside Base UI and Radix, all eight styles, isolated deps — [React Aria changelog](https://ui.shadcn.com/docs/changelog/2026-07-react-aria)
- **CLI v4 (Mar 2026):** `init --preset`, `init --template` (Next.js, Vite, Laravel, React Router, Astro, TanStack Start), `--monorepo`, `--base` (Radix/Base UI), `info`, `docs <component>`, `add --dry-run/--diff/--view` to inspect registry payload before writing; `registry:base` (whole design system), `registry:font`; shadcn/skills for agents — [CLI v4](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)
- **MCP server:** `pnpm dlx shadcn@latest mcp init --client claude` (also Cursor, VS Code Copilot, Codex); lets assistants browse/search/install from configured registries; namespaced registries `@namespace/component` in `components.json`; auth via `headers` with `${REGISTRY_TOKEN}` from `.env.local` — [shadcn MCP docs](https://ui.shadcn.com/docs/mcp)
- Private GitHub registries (Aug 2026) use GitHub CLI creds or `GH_TOKEN`/`GITHUB_TOKEN` — [changelog](https://ui.shadcn.com/docs/changelog)
- Repo activity: shadcn-ui/ui 127,292 stars, pushed 2026-11-03, MIT, latest release `shadcn@4.23.0` 2026-10-27 — [GitHub](https://github.com/shadcn-ui/ui)
- Base UI (mui/base-ui): 11,294 stars, v1.9.0 on 2026-10-09, MIT — [GitHub](https://github.com/mui/base-ui)
- **Registry security:** PoC shows a third-party registry item can add dev dependencies and overwrite config files (e.g. `vite.config.ts`) so malicious code runs on dev-server start; advice: treat registries like npm packages — [DEV: registry injection risk](https://dev.to/ademkouki/the-risk-of-registry-injection-attacks-with-shadcn-4cjl)
- Socket/Snyk audits (Mar 2026) of shadcn agent skills: medium risk, no payloads; concerns: unpinned `latest` CLI, remote registry JSON, agents installing from arbitrary URLs (indirect prompt injection), auth headers possibly leaking tokens to untrusted endpoints — [skills.sh Socket audit](https://skills.sh/zaaakher/agent-skills/shadcn-registry/security/socket), [skills.sh Snyk audit](https://skills.sh/zaaakher/agent-skills/shadcn-registry/security/snyk)
- shadcn MCP docs contain no dedicated security section — [shadcn MCP docs](https://ui.shadcn.com/docs/mcp)

### Inferences
- For a greenfield Next.js 16 + Tailwind v4 app in Nov 2026, the default path is `shadcn init` with Base UI. Pick Radix only if you depend on Radix-only third-party registries; many third-party registries (Magic UI, Origin/coss, Kibo, etc.) were authored against Radix — check each item's `registry:base` / deps.
- Registry hygiene for TrendFood: pin the `shadcn` CLI version in scripts, always `add --dry-run`/`--diff` for third-party items, never `--overwrite` from untrusted sources, review `package.json` diffs in PR, and only put registry tokens on HTTPS endpoints you control.

### Gaps
- Exact text of the CLI 3.0/MCP (Aug 2025) and Tailwind v4 (Feb 2025) entries not fetched; details like `tw-animate-css` replacing `tailwindcss-animate` and OKLCH colors are **[unverified]** this session.
- No official shadcn guidance on registry signing/integrity found.

## 2. Third-party registries / libraries

### Takeaway
For a Tailwind/shadcn codebase, the best fits are copy-in shadcn registries (Origin UI→coss ui, Kibo UI, ReUI, Magic UI free, Animate UI, Motion Primitives). Full design-system libraries (HeroUI v3, Mantine 9, Chakra v3, Park UI) are either a different styling paradigm or overlap shadcn. Watch licenses: Animate UI is MIT + Commons Clause; Aceternity Pro / Magic UI Pro / Shadcnblocks are paid with no-resale terms. Tremor is effectively stagnant.

### Cited Findings (stars / last push / release via `gh api`, 2026-11-04)
| Library | Stars | Last push | Latest release | License | Source |
|---|---|---|---|---|---|
| Magic UI | 23,069 | 2026-11-04 | (no GH releases) | MIT | [GitHub](https://github.com/magicuidesign/magicui) |
| coss ui (ex-Origin UI) | 10,786 | 2026-10-31 | – | MIT ("Originally Copyright (c) 2025 Origin UI") | [GitHub](https://github.com/cosscom/ui) |
| Kibo UI (repo now under shadcnblocks/kibo) | 3,979 | 2026-05-04 | – | MIT | [GitHub](https://github.com/shadcnblocks/kibo) |
| Animate UI | 4,869 | 2026-11-02 | v2.4.2 (2026-11-02) | MIT + Commons Clause | [GitHub](https://github.com/imskyleen/animate-ui) |
| Motion Primitives | 6,891 | 2026-09-28 | – | MIT | [GitHub](https://github.com/ibelick/motion-primitives) |
| ReUI (Keenthemes) | 3,842 | 2026-10-16 | – | MIT | [GitHub](https://github.com/keenthemes/reui) |
| Tremor (Raw/copy-paste) | 3,687 | 2025-10-10 | – | Apache-2.0 | [GitHub](https://github.com/tremorlabs/tremor) |
| Tremor npm (`@tremor/react`) | 16,465 | 2025-01-13 | v3.18.7 (2025-01-13) | Apache-2.0 | [GitHub](https://github.com/tremorlabs/tremor-npm) |
| HeroUI | 31,086 | 2026-11-03 | v3.2.7 (2026-10-28) | Apache-2.0 | [GitHub](https://github.com/heroui-inc/heroui) |
| Park UI | 2,379 | 2026-04-10 | panda-preset 0.43.1 (2024-11-22) | MIT | [GitHub](https://github.com/chakra-ui/park-ui) |
| Mantine | 31,903 | 2026-11-02 | 9.7.4 (2026-10-25) | MIT | [GitHub](https://github.com/mantinedev/mantine) |
| Chakra UI | 40,709 | 2026-11-04 | 3.38.0 (2026-11-03) | MIT | [GitHub](https://github.com/chakra-ui/chakra-ui) |

- Animate UI license text: "MIT + Commons Clause … You may use this Software, including for any commercial purpose, so long as you do not sell or redistribute the components themselves in their original form" — [LICENSE](https://github.com/imskyleen/animate-ui/blob/main/LICENSE)
- Origin UI repo (origin-space/originui) now resolves to cosscom/ui; license credits Origin UI — [GitHub cosscom/ui](https://github.com/cosscom/ui)
- **Aceternity UI Pro**: commercial end products allowed ("may be sold, licensed, sub-licensed, or freely distributed"); cannot "re-distribute the Item as a stock image or its source files, regardless of modifications"; no marketplace resale / templates; page doesn't cover free-tier terms or attribution — [Aceternity licence](https://ui.aceternity.com/licence). Aceternity UI / Pro support shadcn CLI 3.0 registries — [Aceternity Pro changelog](https://pro.aceternity.com/changelog) (via search snippet)
- **Magic UI Pro**: products remain Magic UI IP; limited license, no ownership transfer — [Magic UI Pro license](https://pro.magicui.design/license); tiers: 1-developer commercial perpetual license + Teams — [Magic UI Pro pricing](https://pro.magicui.design/pricing). $199 one-time figure only from third-party review **[unverified]** — [designrevision](https://designrevision.com/alternatives/magic-ui)
- **Shadcnblocks**: paid all-access; restrictions around reselling components as-is — [shadcnblocks pro](https://www.shadcnblocks.com/pro). Price ($149 Pro / $299 Premium) and "2,000+ blocks" only from third-party roundups **[unverified]** — [thefrontkit roundup](https://thefrontkit.com/blogs/best-shadcn-templates-2026); 56 new blocks in Mar 2026 — [shadcnblocks changelog](https://www.shadcnblocks.com/changelog/new-blocks-mar-2026)
- **Tremor**: acquired by Vercel; all products incl. Tremor Blocks became free/open source; founders joined Vercel Design Engineering (Jan 2025) — [Vercel blog](https://vercel.com/blog/vercel-acquires-tremor). Combined with no npm release since 2025-01-13 → low maintenance.
- **HeroUI v3**: "built on Tailwind CSS v4 and React Aria Components", "Built for React 19 and Tailwind v4", Apache-2.0, tree-shaken — [HeroUI docs](https://www.heroui.com/docs/react/getting-started)
- Recharts (shadcn Charts' underlying lib) v3.10.1 released 2026-07-25 — [GitHub releases](https://github.com/recharts/recharts/releases)
- react-aria-components 1.22.0 (2026-10-09) — [GitHub](https://github.com/adobe/react-spectrum)

### Inferences (what each is good for on TrendFood)
- **Magic UI (free, MIT)**: marketing flourishes for hero (marquee, number ticker for rank/likes, animated gradients). Most components depend on `motion` → load only on hero, behind LazyMotion.
- **Aceternity UI**: flashy hero/landing effects (3D cards, spotlight, parallax); heavy motion and often canvas/WebGL → poor fit for AdSense content pages' LCP/INP. Use sparingly, if at all; Pro is paid.
- **coss ui / Origin UI**: largest set of practical form/input variants (star rating-ish inputs, steppers, search inputs, timeline) in shadcn style — good for review form and filters.
- **Kibo UI**: composable "functional" components (data table, kanban, gantt, dropzone, rating, etc.) — useful for admin. Repo now under shadcnblocks org; last push May 2026 → moderate maintenance.
- **ReUI (Keenthemes)**: data-grid / admin-oriented components on shadcn — candidate for admin tables (on TanStack Table).
- **Animate UI / Motion Primitives**: animated variants of shadcn primitives (tabs, accordions, text effects). Animate UI's Commons Clause is fine for use in a site but blocks reselling the components.
- **Tremor**: dashboards/charts, but stagnant since early 2025; prefer shadcn Charts (Recharts v3) for admin analytics.
- **HeroUI v3**: strong alternative if you want an npm-installed, React Aria-based Tailwind v4 library rather than copy-in code; mixing it with shadcn duplicates design tokens.
- **Mantine 9 / Chakra v3 / Park UI**: different styling systems (Mantine: own CSS/CSS modules **[unverified]**; Chakra v3: Emotion runtime CSS-in-JS + Ark UI/Zag **[unverified]**; Park UI: Ark UI + Panda CSS or Tailwind **[unverified]**). Runtime CSS-in-JS conflicts with RSC-first App Router and adds runtime cost; Park UI's last tagged release is 2024-11. Not recommended for a Tailwind/shadcn stack.

### Gaps
- No measured per-component bundle sizes for Magic UI/Aceternity components; inferred from their `motion` dependency.
- Accessibility audits of third-party registries not found; they inherit a11y from Radix/Base UI primitives only where they wrap them — decorative animated components generally have no a11y guarantees.
- Aceternity free-tier license text not located (only Pro license page).
- Kibo UI move to shadcnblocks org: inferred from GitHub redirect only; no announcement fetched.

## 3. Animation: Motion v12+ (now v14), bundle, LazyMotion, CSS alternatives, reduced motion

### Takeaway
`motion` (ex-framer-motion) is at v14.9.0 (2026-10-30). The full `motion` component is ~43 KB gz and not tree-shakeable; `LazyMotion` + `m` drops initial cost to ~5 KB, with features loaded (domAnimation +24 KB, domMax +38 KB). For content pages, prefer CSS/`tw-animate-css` and View Transitions, and reserve Motion for gestures (drag sheets) and layout animations.

### Cited Findings
- Full `motion` component ≈ 43 KB gz; `LazyMotion` + `m` ≈ 5 KB initial; `domAnimation` +≈24 KB (animations, variants, exit, tap/hover/focus); `domMax` +≈38 KB (adds pan/drag, layout animations); `useAnimate` mini ≈ 3.3 KB; `useReducedMotion` ≈ 1 KB — [Motion: reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size)
- `motion` npm latest 14.9.0 (2026-10-30); repo motiondivision/motion 34,863 stars, MIT, pushed 2026-11-03 — [npm](https://www.npmjs.com/package/motion), [GitHub](https://github.com/motiondivision/motion)
- `<MotionConfig reducedMotion="user">` follows OS setting and "automatically disable[s] transform and layout animations" while "preserving the animation of other values like opacity and backgroundColor"; `"always"`/`"never"` allow per-site override; `useReducedMotion` returns boolean for manual handling (e.g. disable autoplay video, parallax) — [Motion accessibility](https://motion.dev/docs/react-accessibility)

### Inferences
- Wrap app in `<LazyMotion features={() => import('./features').then(m=>m.domAnimation)} strict>` + `<MotionConfig reducedMotion="user">`; use `m.*` only in client components.
- CSS-only for card hover, badge pulse, skeletons, accordion (Tailwind v4 `motion-safe:`/`motion-reduce:` variants, `@starting-style`, View Transitions API in Next.js) — zero JS. **[unverified]** that Next 16 View Transitions are stable; check Next docs.
- Embedded social videos (YouTube/IG/TikTok) should respect reduced motion: no autoplay; use facade/lite-embed to protect LCP/INP.

### Gaps
- Motion v12→v14 breaking-change notes not fetched.
- Next.js 16 View Transition support status not verified.

## 4. Specific components

### Takeaway
Drawer: shadcn's Drawer now uses Base UI instead of Vaul; Vaul is not officially deprecated but has had no release since Dec 2024. Toast: shadcn added a Base UI Toast (Jul 2026); Sonner remains maintained (v2.0.8, Aug 2026). Carousel: Embla (v8.6.0, no release since Apr 2025 but repo active). Tables: TanStack Table v9. Command palette: cmdk is stale (last release 2025); shadcn's Command still uses it **[unverified]**.

### Cited Findings
- shadcn Drawer docs: "The drawer component now uses Base UI instead of Vaul." Docs list Base UI, React Aria, Radix options — [shadcn Drawer](https://ui.shadcn.com/docs/components/drawer)
- PR #10430 migrates base drawer from vaul to `@base-ui/react/drawer` (superseding #10292, Apr 18 2026) — [shadcn PR #10430](https://github.com/shadcn-ui/ui/pull/10430)
- Vaul: 8,680 stars, last push 2025-10-03, last release v1.1.2 2024-12-14, MIT; no official "unmaintained" notice found — [GitHub vaul](https://github.com/emilkowalski/vaul). Community Base UI port `vaul-base` exists — [socket.dev vaul-base](https://socket.dev/npm/package/vaul-base)
- shadcn Toast (Jul 2026): "A new Toast component built on Base UI primitives", supports actions, status types, promises, stacking, swipe dismissal; page doesn't mention Sonner — [Toast changelog](https://ui.shadcn.com/docs/changelog/2026-07-toast)
- Sonner: 13,136 stars, v2.0.8 2026-08-09, MIT — [GitHub sonner](https://github.com/emilkowalski/sonner)
- Embla Carousel: 8,463 stars, pushed 2026-11-01, last release v8.6.0 2025-04-04, MIT — [GitHub embla](https://github.com/davidjerleke/embla-carousel)
- cmdk: 13,061 stars, last push 2025-10-29, v1.1.1 — [GitHub cmdk](https://github.com/dip/cmdk)
- TanStack Table: 28,542 stars, `@tanstack/react-table` 9.3.1 (2026-10-12), MIT — [GitHub](https://github.com/TanStack/table)
- shadcn changelog lists "Dynamic Search" (Jul 2026) — [changelog](https://ui.shadcn.com/docs/changelog) (content not fetched)

### Inferences
- **Bottom sheet / mobile ingredient CTA**: use shadcn Drawer (Base UI) — no Vaul dependency; the sticky mobile CTA itself should be plain CSS (`position: sticky/fixed` + `env(safe-area-inset-bottom)`), not a drawer.
- **Toast**: on Base UI projects use shadcn Toast (one fewer dependency); Sonner still fine if on Radix.
- **Carousel**: shadcn Carousel (Embla) — lightweight, touch-friendly; acceptable despite 2025 last release.
- **Rating stars**: no core shadcn rating; build with radio group (accessible) or take from coss ui / Kibo registry.
- **Recipe step timer**: no library needed — custom hook with `requestAnimationFrame`/`setInterval` + `aria-live="polite"`; Wake Lock API to keep screen on **[suggestion]**.
- **Admin tables**: shadcn Data Table pattern + TanStack Table v9 (check v8→v9 API changes; shadcn examples may still target v8 **[unverified]**), or ReUI/Kibo data grid.
- **Command palette search**: shadcn Command (cmdk) or the new "Dynamic Search" entry — verify which the current docs use.

### Gaps
- TanStack Table v9 breaking changes vs shadcn's data-table example: not verified.
- Whether shadcn Command moved off cmdk: not verified.
- "Dynamic Search" changelog content not fetched.

## 5. Recommended stack for mobile-first content + commerce

### Takeaway
Next.js 16 App Router + Tailwind v4 + shadcn/ui (CLI v4, **Base UI** base) as the only component foundation; add third-party registry items selectively (coss ui for inputs/rating, Kibo/ReUI for admin), Motion via LazyMotion only where needed, CSS for everything else. Avoid Mantine/Chakra/HeroUI mixing, Aceternity heavy effects, and Tremor.

### Cited Findings
- Base UI is the recommended base for new shadcn projects (Jul 2026) — [Base UI default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)
- Drawer and Toast now have Base UI implementations in shadcn — [Drawer](https://ui.shadcn.com/docs/components/drawer), [Toast](https://ui.shadcn.com/docs/changelog/2026-07-toast)
- LazyMotion cuts Motion initial cost from ~43 KB to ~5 KB — [Motion docs](https://motion.dev/docs/react-reduce-bundle-size)
- Tremor stagnant since Jan 2025 — [GitHub tremor-npm](https://github.com/tremorlabs/tremor-npm)
- `add --dry-run/--diff` available for registry review — [CLI v4](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)

### Inferences — proposed stack
| Need | Choice | Why |
|---|---|---|
| Foundation | shadcn/ui CLI v4, Base UI base, Tailwind v4, `cn` package | default/recommended path; code ownership; RSC-friendly |
| Home cards/rank badges/sidebar filters | shadcn Card, Badge, Sidebar/Sheet, Checkbox, ToggleGroup | no extra deps; server-render cards, client only for filter state |
| Hero accent | 1–2 Magic UI free items (e.g. number ticker/marquee) via LazyMotion | MIT; keep off LCP element |
| Mobile filter / sheet | shadcn Drawer (Base UI) / Sheet | Vaul removed |
| Toast | shadcn Toast (Base UI) | first-party; Sonner OK alternative |
| Carousel | shadcn Carousel (Embla) | small, touch |
| Review form | shadcn Form + Field, coss ui rating/textarea variants | MIT, shadcn-style |
| Timer | custom hook | trivial; no dependency |
| Video embeds | lite facade components (click-to-load) | protect LCP/INP on AdSense pages |
| Admin tables | TanStack Table v9 + shadcn Data Table / ReUI data grid | headless, MIT |
| Admin charts | shadcn Charts (Recharts 3) | maintained vs Tremor |
| Animation | CSS + `motion-safe:`; Motion 14 via LazyMotion + `MotionConfig reducedMotion="user"` | bundle + a11y |
| Tooling | shadcn MCP + pinned CLI; `--dry-run` for every third-party registry | security |

- Korean-specific: pair with a Korean webfont (e.g., Pretendard) via `next/font/local` subset; `registry:font` could distribute it **[suggestion, not researched]**.

### Gaps
- No benchmark comparing Base UI vs Radix bundle size found.
- Korean IME behavior in cmdk/Base UI combobox not researched (known historical IME composition issues in React inputs — **[unverified]**).
