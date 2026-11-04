# Agent-driven UI tooling for TrendFood (Claude Code, Next.js App Router + Tailwind + shadcn/ui, Windows), as of 2026-11-04

Note on method: about 20 search and fetch calls. Primary sources (official docs and GitHub READMEs) were fetched for shadcn MCP, 21st.dev Magic MCP, v0 MCP, Chrome DevTools MCP, Playwright MCP, the Figma help center, vercel-labs/agent-skills, Playwright accessibility docs, and tweakcn. Pricing and install-count numbers mostly come from third-party aggregators and are flagged as such. Items marked **[unverified]** come from secondary sources or prior knowledge and were not confirmed against a primary page in this session.

## 1. MCP servers for UI work

### Takeaway
The highest-value, lowest-risk UI MCPs for this stack are the official shadcn MCP (free, no key, works with registries in components.json) and a browser MCP for visual checks: Chrome DevTools MCP for inspection and debugging, or Playwright MCP/CLI for driving pages and mobile emulation. Figma, 21st.dev Magic, v0, Stitch and Storybook MCPs are optional: each adds an account, a key or OAuth, and data egress.

### Cited Findings
**shadcn MCP (official)**
- It lets the agent browse, search and install components, blocks and templates from the default shadcn registry, third-party registries that follow the spec, private registries and namespaced registries (`@acme`) configured in `components.json`. — [shadcn docs: MCP](https://ui.shadcn.com/docs/mcp)
- Claude Code setup is `pnpm dlx shadcn@latest mcp init --client claude`, or a `.mcp.json` entry `{"command":"npx","args":["shadcn@latest","mcp"]}`. Restart Claude Code and confirm with `/mcp`. — [shadcn docs: MCP](https://ui.shadcn.com/docs/mcp)
- No key is needed for the public registry. Private registries use env vars (for example `REGISTRY_TOKEN` in `.env.local`) referenced in registry headers. The docs give no pricing, which is consistent with it being free and open source. — [shadcn docs: MCP](https://ui.shadcn.com/docs/mcp)
- The MCP searches only the registries listed in the project's components.json. — [Cult UI docs](https://cult-ui.com/docs/mcp-server)
- Lookalikes exist and should not be confused with the official server. shadcn.io is "not affiliated with official shadcn/ui" and sells a paid hosted MCP. Community npm packages include `shadcn-registry-mcp` and `@reuvenorg/shadcn-registry-manager`. — [shadcn.io](https://www.shadcn.io/mcp/claude-code); [glama listing](https://glama.ai/mcp/servers/Rachidhssin/shadcn-registry-mcp/tree); [playbooks listing](https://playbooks.com/mcp/shadcn-registry-manager)

**21st.dev Magic MCP (now "21st MCP")**
- It searches 10,000+ React/Tailwind components, generates new UI with AI, and publishes your own components from the editor. Hosted AI generation needs "AI access" on the account. Without it you can only search and fetch. — [GitHub 21st-dev/magic-mcp](https://github.com/21st-dev/magic-mcp)
- Setup: get a key at 21st.dev/mcp, then run `npx @21st-dev/cli@latest init --client claude`, or use `claude plugin marketplace add 21st-dev/magic-mcp` followed by `/plugin install 21st`. The remote URL is `https://21st.dev/api/mcp` with an `x-api-key` header. Magic API keys were reset, so old keys no longer work. — [GitHub 21st-dev/magic-mcp](https://github.com/21st-dev/magic-mcp)
- Pricing is **[unverified, aggregators conflict]**. One aggregator lists a free plan with about 10 credits/month and Pro "from $11/mo" (snapshot dated March 2026). Another says $11–14/mo. A $35/mo figure seems to belong to a different product (trymagic). — [aitoolsatlas pricing](https://aitoolsatlas.ai/tools/21st-dev/pricing); [aicoolies](https://aicoolies.com/pricing/magic-mcp); [linkgo FAQ](https://linkgo.dev/faq/pricing-options-magic-mcp-offer)

**Figma MCP**
- Official help: you need a Full or Dev seat, and "other seats may have usage limits". It works with Design, Make and FigJam files where you have edit or view permission. The remote server, used by pasting a layer or file link, is recommended. New tools let agents "make edits directly to Figma files", and existing remote users must reinstall to get them. — [Figma help](https://help.figma.com/hc/en-us/articles/35281350665623)
- In a forum reply (August 2026), Figma staff said the remote server (`https://mcp.figma.com/mcp`) works on all seats and plans. The desktop option was renamed "Connect to AI agent" at the end of July 2026. — [Figma forum thread](https://forum.figma.com/report-a-problem-6/the-same-use-figma-request-sometimes-requires-a-full-seat-and-sometimes-doesn-t-57311) (via search snippet, **[partly unverified]**)
- **[unverified]** A third-party guide says writing outside your drafts needs a Full seat, while a Dev seat gives draft writes and read-only access elsewhere. One user reported that the `use_figma` write call inconsistently demanded a Full seat on a Dev seat. — [Figma forum](https://forum.figma.com/report-a-problem-6/the-same-use-figma-request-sometimes-requires-a-full-seat-and-sometimes-doesn-t-57311); [lobehub guide](https://lobehub.com/es/mcp/figma-mcp-server-guide)

**Google Stitch**
- **[unverified, secondary blogs only]** A Stitch MCP connection lets Claude Code, Cursor or Gemini CLI pull Stitch designs. The config shown uses a *community* npm package, `@_davideast/stitch-mcp` (`proxy` arg), not an official Google package. Exporting DESIGN.md for design tokens is an alternative. One blog claims 350 free generations/month. — [pasqualepillitteri.it](https://pasqualepillitteri.it/en/news/647/google-stitch-mcp-export-claude-code-design-to-code); [MindStudio](https://www.mindstudio.ai/blog/google-stitch-mcp-coding-agents/)

**v0 MCP (Vercel)**
- It creates, imports and manages v0 chats, reads and edits source files, previews and deploys to Vercel, and shows usage summaries. The config is `npx mcp-remote https://v0.app/api/mcp`. Auth is OAuth only: "Do not put a v0 API key in your MCP client configuration." The docs cover Cursor, Claude Desktop and VS Code but not Claude Code specifically, and give no pricing. The page was updated on 2026-11-03. — [v0 docs: MCP](https://v0.app/docs/api/platform/mcp)

**Storybook MCP**
- `npx storybook add @storybook/addon-mcp` serves MCP at `localhost:6006/mcp`. It gives agents component docs, story generation and component tests. Tools include `stories-find-by-component` and `review-create`. The docs toolset needs a components manifest, which is off by default. AI features are "in preview" and React-only, and the project is experimental, so APIs may change. Storybook advises telling the agent in CLAUDE.md to query the MCP before UI work. — [Storybook docs: MCP](https://storybook.js.org/docs/ai/mcp/overview); [addon page](https://storybook.js.org/addons/@storybook/addon-mcp); [v11 alpha docs](https://storybook.js.org/docs/11/ai/mcp/overview)

**Playwright MCP (Microsoft)**
- Install: `claude mcp add playwright npx @playwright/mcp@latest`. It reads pages through accessibility snapshots by default, so no vision model is needed. `browser_take_screenshot` captures images, and coordinate mouse tools need `--caps=vision`. Mobile emulation uses `--device "iPhone 15"`, `--mobile`, or `--viewport-size`. — [GitHub microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- The README recommends that coding agents consider the **Playwright CLI + skills** instead, which is more token-efficient because it avoids large tool schemas and accessibility trees. MCP suits persistent-state exploratory work. — [GitHub microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- Windows: the persistent profile lives at `%USERPROFILE%\AppData\Local\ms-playwright\mcp-{channel}-{hash}`. Only one instance can use it at a time, so use `--isolated` for parallel sessions. — [GitHub microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)

**Chrome DevTools MCP (Google)**
- It takes screenshots, inspects network requests, reads console messages with source-mapped stacks, and records performance traces. Install via the `/plugin marketplace add ChromeDevTools/chrome-devtools-mcp` plugin plus `/plugin install chrome-devtools-mcp@chrome-devtools-plugins`, which adds the server and skills, or via `npx -y chrome-devtools-mcp@latest`. `--slim` gives a reduced tool set. Official support covers Chrome and Chrome for Testing only. — [GitHub ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- Framing from practitioners: DevTools MCP is for the agent to *observe and debug*, Playwright MCP is for the agent to *act and drive*. — [Steve Kinney](https://stevekinney.com/writing/driving-vs-debugging-the-browser)
- **[unverified]** A comparison site reports about 51.1k GitHub stars for Chrome DevTools MCP versus 36.8k for Playwright MCP. — [skillselion compare](https://skillselion.com/compare/mcp/ship/io.github.ChromeDevTools/chrome-devtools-mcp/vs/io.github.microsoft/playwright-mcp)

### Inferences
- For a Korean mobile-first app, the critical capability is rendering at a phone viewport and seeing the result. Playwright (`--device`) and Chrome DevTools MCP both do this, so design-source MCPs (Figma, Stitch) matter only if a designer actually produces files.
- 21st.dev and v0 *generate* UI from outside sources. That tends to import generic aesthetics and adds a paid or account dependency. They are more useful as an inspiration and search tool than as the main generator for a "distinctive" brand.
- Claude Code on this machine already has a Chrome browser extension (claude-in-chrome) available, which partly overlaps with Chrome DevTools MCP for ad hoc visual checks.

### Gaps
- No official 21st.dev pricing page was reachable. Free-tier credits and Pro price are unconfirmed.
- No official Google documentation for a Stitch MCP was found. An official server may exist, but this session saw only a community package.
- Exact Figma seat rules for write-to-canvas (Dev versus Full) are inconsistent across official help and forum posts.
- v0 MCP plan and credit requirements are not stated in the docs.

## 2. Claude Code skills and plugins for frontend design

### Takeaway
Anthropic's first-party `frontend-design` skill is the de facto standard and by far the most-installed frontend skill. It is a short design-thinking prompt about typography, color, motion and composition that pushes away from templated defaults. Pair it with Vercel's `web-design-guidelines` (a 100+ rule UI review) and `react-best-practices`. Community skills are numerous but small and carry supply-chain risk.

### Cited Findings
- `frontend-design` is a first-party Anthropic plugin in the `anthropics/claude-code` marketplace. You add the marketplace, then install `frontend-design@claude-code-plugins`. It auto-activates on frontend requests and covers typography, color, motion and composition, and it is about 400 tokens **[unverified size]**. — [claudelog](https://claudelog.com/faqs/what-is-frontend-design-skill-in-claude-code/); [claudemarketplaces](https://claudemarketplaces.com/skills/anthropics/claude-code/frontend-design)
- In this user's environment it is already installed as `frontend-design:frontend-design`, described as "distinctive, intentional visual design … making choices that don't read as templated defaults." (Observed in the local Claude Code skill list, 2026-11-04.)
- A lookalike, `sickn33/antigravity-awesome-skills/frontend-design`, is "Independent project, not affiliated with Anthropic". — [claudemarketplaces](https://claudemarketplaces.com/skills/sickn33/antigravity-awesome-skills/frontend-design)
- Install counts are **[aggregators, conflicting]**: frontend-design is about 716k installs and #1 in Frontend & Design, ahead of web-design-guidelines at about 498k. Another catalog says 563,791 (as of June 2026), and a third says 422K. The category totals 1,127 skills and 6.9M installs. — [skillselion best](https://skillselion.com/best/skills-for-frontend-design); [skillselion guide](https://skillselion.com/guides/frontend-design-skill-claude-code-guide); [browseract](https://skills.browseract.com/skills/c-frontend)
- `vercel-labs/agent-skills` (`npx skills add vercel-labs/agent-skills`) includes `web-design-guidelines`, which reviews UI code against 100+ rules on accessibility, performance, UX, forms, animation, typography, dark mode and i18n. It also includes `react-best-practices` (40+ rules in 8 categories), `composition-patterns`, `react-view-transitions` and `deploy-to-vercel`. — [GitHub vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
- The Vercel Claude Code plugin is already installed locally and exposes `vercel:shadcn` (CLI, registries, theming), `vercel:nextjs`, `vercel:react-best-practices` and `vercel:verification`. (Observed in the local skill list, 2026-11-04.)
- The Chrome DevTools MCP plugin ships its own skills alongside the server. — [GitHub ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)

### Inferences
- `frontend-design` sets the aesthetic direction, and `web-design-guidelines` acts as the reviewer or checklist pass. Together they form a cheap "design, then critique" loop without any MCP.
- Since `frontend-design` and `vercel:shadcn` are already installed, the marginal gain from installing `vercel-labs/agent-skills` is mainly `web-design-guidelines`.

### Gaps
- skills.sh itself was not fetched, so its install counts are aggregator-reported only.
- No independent evaluation was found that measures how much these skills improve output quality.

## 3. Visual verification loops practical for a solo developer

### Takeaway
For a solo developer, the practical loop is: the agent takes Playwright or DevTools screenshots at mobile viewports during work, Playwright `toHaveScreenshot()` baselines are committed for key pages, `@axe-core/playwright` runs in the same test run, and Lighthouse runs on demand or in CI. Chromatic is worthwhile only if Storybook is adopted, and its free tier covers Chrome only.

### Cited Findings
- Playwright visual comparison (`toHaveScreenshot()`) is built in and free, and baselines live in the repo. — [devtools-directory](https://devtools-directory.pages.dev/visual-regression-testing); [softwaretestpilot](https://softwaretestpilot.com/blog/automation-testing/visual-regression-testing-playwright-guide)
- Chromatic requires Storybook. The free tier is 5,000 snapshots/month on Chrome only, and multi-browser testing is paid. TurboSnap re-snapshots only stories affected by the git diff. Paid prices conflict across sources: Starter $179 / Pro $399, versus Pro $149 / Team $349 **[unverified, check chromatic.com/pricing]**. — [helpmetest](https://helpmetest.com/blog/screenshot-comparison-tools-compared/); [dev.to delta-qa](https://dev.to/delta-qa/free-visual-testing-tools-an-honest-comparison-2d4f); [aicoolies](https://aicoolies.com/pricing/chromatic)
- `@axe-core/playwright` usage is `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()` with `expect(results.violations).toEqual([])`. Snapshot a compact fingerprint of violations rather than the full array, and use `.exclude()` sparingly. Automated checks catch only some issues, so manual testing is still needed. — [Playwright docs: accessibility testing](https://playwright.dev/docs/accessibility-testing)
- Chrome DevTools MCP records performance traces. Its performance tools may send trace URLs to the Google CrUX API, which `--no-performance-crux` disables. — [GitHub chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- **[unverified, prior knowledge]** Lighthouse CI (`@lhci/cli`, `lhci autorun`) is open source and free, and can assert budgets in GitHub Actions. — [GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci)
- Storybook's MCP adds a `review-create` tool that pushes a review of current UI changes and returns a review URL. It is experimental. — [Storybook docs](https://storybook.js.org/docs/ai/mcp/overview)

### Inferences
- Pixel-diff baselines are brittle across operating systems because font rendering differs. Generating baselines on Windows and comparing them in Linux CI will fail. Pin baselines to one environment, for example a Playwright Docker image in CI only, or keep diffs local. This is a general Playwright practice and was not confirmed in a source this session.
- Korean typography (font fallback, line-breaking with `word-break: keep-all`) is exactly the kind of regression screenshots catch and DOM checks miss. That argues for a few mobile screenshot baselines (about 360–390px wide) of core screens.
- The agent's in-session screenshots, an inner loop, are distinct from committed regression tests, an outer loop. Do both, but keep the committed set small.

### Gaps
- Current Chromatic pricing was not verified on the vendor site.
- No source compared screenshot quality or token cost between Playwright MCP and DevTools MCP.

## 4. Design tokens and theming tools, and how agents consume them

### Takeaway
In this stack, tokens are CSS variables in `globals.css`: shadcn semantic tokens such as `--background`, `--primary` and `--radius`, mapped through Tailwind v4 `@theme inline`. Agents work best when the tokens are already in the repo as text. Use tweakcn (or shadcn/studio) visually to produce the CSS, paste or install it, then tell the agent in CLAUDE.md to use only semantic tokens.

### Cited Findings
- tweakcn is a visual theme editor for shadcn/ui and Tailwind (Apache-2.0, about 10.5k stars). It has presets and is tagged `tailwindcss-v4`, and its README does not mention MCP. — [GitHub jnsahaj/tweakcn](https://github.com/jnsahaj/tweakcn)
- It supports Tailwind v3 and v4, OKLCH and HSL, and generates ready-to-use CSS. Its listing says it launched on 2025-09-12. — [Product Hunt](https://www.producthunt.com/products/tweakcn-3/launches)
- **[unverified, prior knowledge]** tweakcn themes can be installed through the shadcn CLI with a registry URL (`npx shadcn@latest add https://tweakcn.com/r/themes/<theme>.json`). This was not confirmed in this session.
- shadcn/studio has an MCP server for crafting components, blocks and pages, and a theme generator compatible with Tailwind v4 (OKLCH, HSL, RGB, HEX). — [shadcn/studio docs via Algolia](https://docsearch.algolia.com/mcp/docs/repo/shadcnstudio/shadcn-studio)
- The `vercel:shadcn` skill, installed locally, covers "configuring themes" and custom registries, so the agent already has theming guidance. (Local skill list.)
- **[unverified, prior knowledge, not fetched]** Tailwind v4 defines tokens in CSS with `@theme { --color-*: …; --font-*: … }`, which generates utilities. shadcn's v4 setup uses `@theme inline` to map `--color-primary: var(--primary)`. — [Tailwind docs: theme](https://tailwindcss.com/docs/theme); [shadcn docs: Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- **[unverified, not fetched]** Radix Colors provides 12-step accessible scales with dark-mode pairs as CSS variables. Realtime Colors previews a five-color palette on a live page and exports CSS or Tailwind. — [Radix Colors](https://www.radix-ui.com/colors); [Realtime Colors](https://www.realtimecolors.com)
- Stitch can export a DESIGN.md of design tokens for agents **[unverified]**. — [pasqualepillitteri.it](https://pasqualepillitteri.it/en/news/647/google-stitch-mcp-export-claude-code-design-to-code)

### Inferences
- No theming tool here needs an MCP. The agent consumes tokens by reading `globals.css` and `components.json`. A short "design tokens" section in CLAUDE.md (palette roles, font stack such as Pretendard for Korean, radius, spacing rhythm, and a ban on raw hex values) is the highest-leverage integration.
- Use OKLCH tokens from tweakcn, and check contrast with axe in the verification loop.

### Gaps
- The Tailwind v4 `@theme`, Radix Colors and Realtime Colors pages were not fetched this session, so those statements are from prior knowledge.
- The existence of a tweakcn MCP is unconfirmed. None was found.

## 5. Security and supply-chain cautions for MCP servers and skill registries

### Takeaway
2026 saw real, repeated supply-chain attacks through MCP servers and skill registries: cloned servers, poisoned skills and delayed tool-description rewriting. Prefer first-party servers (shadcn, Microsoft, Google ChromeDevTools, Anthropic, Vercel), pin versions, read SKILL.md files before install, and keep secrets out of browser sessions the agent drives.

### Cited Findings
- ClawHavoc (late January 2026, OpenClaw's ClawHub): 341 malicious skills, about 12% of the registry, mostly delivering the AMOS macOS stealer. Other counts are 800+ and 1,184 **[counts conflict]**. — [mcpblog](https://mcpblog-dev.pages.dev/blog/2026-04-20-341-malicious-skills-zero-registry-checks); [Ido Levi blog](https://blog-ido-levi.pages.dev/posts/clawhub-supply-chain-attack)
- Snyk "ToxicSkills" (February 2026) scanned 3,984 skills from ClawHub **and skills.sh** and found 76 confirmed malicious skills with active payloads **[via secondary source]**. — [obot.ai](https://obot.ai/blog/mcp-security-agent-skills-supply-chain/)
- SmartLoader (February 2026): attackers cloned the Oura Ring MCP server, used fake GitHub accounts and stars to get it listed, and delivered an infostealer. — [Straiker](https://www.straiker.ai/blog/smartloader-clones-oura-ring-mcp-to-deploy-supply-chain-attack); [NHI Mgmt Group](https://nhimg.org/articles/mcp-supply-chain-poisoning-shows-how-trust-signals-can-be-faked/)
- Postmark MCP (September 2025): an unofficial server with about 1,500 weekly downloads was modified to exfiltrate data. — [UpGuard](https://upguard.com/blog/mcp-security-incidents)
- Check Point disclosed CVE-2025-59536 (CVSS 8.7, February 2026): malicious project config or MCP hooks in Claude Code could lead to code execution. — [heyuan110](https://www.heyuan110.com/posts/ai/2026-03-10-mcp-security-2026/) **[secondary]**
- "Deadbugz" (August 2026, Pillar Security): a server behaved normally for three calls, then rewrote its tool descriptions to hunt for SSH and AWS keys. — [mcpplaygroundonline](https://mcpplaygroundonline.com/blog/deadbugz-mcp-supply-chain-attack.md) **[secondary]**
- OWASP published an Agentic Skills Top 10 in late April 2026 **[secondary mention]**. — [dev.to bawbel](https://dev.to/bawbel/skill-files-are-the-new-supply-chain-attack-surface-your-ci-pipeline-does-not-know-that-yet-7i9)
- The Playwright MCP README says it is "not a security boundary". `browser_run_code_unsafe` is "RCE-equivalent", origin allow and block lists are not security controls, and file access is limited to workspace roots by default. — [GitHub microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- Chrome DevTools MCP exposes browser content to the client. Avoid sensitive data in the browser it controls, and CrUX lookups send URLs to Google. — [GitHub chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- v0 MCP uses OAuth, so no API key goes in config. Private shadcn registries should use env-var tokens. — [v0 docs](https://v0.app/docs/api/platform/mcp); [shadcn docs](https://ui.shadcn.com/docs/mcp)

### Inferences
- Practical rules: (1) Install only from first-party orgs and avoid name-squatted lookalikes such as shadcn.io and the antigravity frontend-design. (2) Pin `@x.y.z` instead of `@latest` in `.mcp.json` once stable. Note that the official READMEs recommend `@latest`, which trades safety for freshness. (3) Run browser MCPs with an isolated profile, not the user's logged-in Chrome. (4) Keep API keys (21st.dev) in user-scope env, not in the committed `.mcp.json`. (5) Review any `.mcp.json` or `.claude/` changes in PRs.

### Gaps
- Several incident numbers come from secondary blogs, and the primary reports (Snyk, Pillar, Check Point) were not fetched.

## 6. Recommended concrete setup for a solo developer (TrendFood)

### Takeaway
Use five tools, all free or open source and first-party: (1) the `frontend-design` skill (already installed), (2) the official shadcn MCP, (3) Playwright, as MCP or CLI, for mobile screenshots plus `toHaveScreenshot` and `@axe-core/playwright` tests, (4) Chrome DevTools MCP for console, network and performance debugging, with the slim option, (5) tweakcn for tokens, plus `web-design-guidelines` from vercel-labs/agent-skills as the review pass. 21st.dev, Figma, v0, Stitch and Storybook/Chromatic stay optional.

### Cited Findings
- shadcn MCP install: `pnpm dlx shadcn@latest mcp init --client claude`. — [shadcn docs](https://ui.shadcn.com/docs/mcp)
- Playwright MCP: `claude mcp add playwright npx @playwright/mcp@latest --device "iPhone 15"` (flags per the README). The README also suggests the CLI + skills route for token efficiency. — [playwright-mcp](https://github.com/microsoft/playwright-mcp)
- Chrome DevTools MCP plugin: `/plugin marketplace add ChromeDevTools/chrome-devtools-mcp`, then `/plugin install chrome-devtools-mcp@chrome-devtools-plugins`. — [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- Skills: `npx skills add vercel-labs/agent-skills` (choose `web-design-guidelines`). — [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
- axe in Playwright tests. — [Playwright a11y docs](https://playwright.dev/docs/accessibility-testing)
- Theming: tweakcn. — [tweakcn](https://github.com/jnsahaj/tweakcn)

### Inferences
Suggested loop, encoded in CLAUDE.md:
1. Set the direction with `frontend-design`: pick a distinct aesthetic, then write tokens to `globals.css` (from tweakcn, OKLCH) and document the token roles plus a Korean font stack.
2. Build with shadcn MCP and add components through the registry, never by hand-copying.
3. Check: the agent opens `localhost:3000` at 375–390px via Playwright, screenshots, and self-critiques against `web-design-guidelines`. Use DevTools MCP when there are console or hydration errors.
4. Lock in results: Playwright `toHaveScreenshot` for 3–5 core screens (home feed, recipe detail, cart) plus an axe WCAG AA scan, run as `npx playwright test` before declaring done. This fits the user's "done means verified" rule.
5. Optional later: 21st.dev Magic for inspiration (paid credits), Storybook MCP and Chromatic if the component count grows, Figma MCP if a designer joins.
- Windows: Playwright and DevTools MCP both run through `npx`. Use `--isolated` when running multiple Claude sessions at once, because of the single-profile lock.

### Gaps
- No head-to-head data on quality uplift from this exact combination. The recommendation is a judgment call based on cost, first-party provenance and overlap.
