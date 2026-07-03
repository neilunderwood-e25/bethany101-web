---
name: e25-style-gen
description: Translate a Figma style guide into a Tailwind v4 style guide inside a Next.js project. Parses the Figma file's color, typography, font, button, logo, and icon sections and generates a split CSS token system under app/styles/ (globals.css + lib/_colors, _fonts, _typography, _buttons, _icons, _utility), wires fonts (next/font/google when available, guided custom-font upload + @font-face otherwise), exports logos to public/assets/images and icons to public/assets/icons, and builds a /style-guide preview route. Invoked when the user types `/e25-style-gen`, or asks to "translate this Figma style guide to Tailwind", "generate a style guide from Figma", "set up brand tokens/fonts/buttons from a Figma design system", or similar.
---

# e25-style-gen

Invoked via `/e25-style-gen` (or matching natural-language requests). Translates a design-team Figma **style guide** into a Tailwind v4 style guide inside an existing Next.js project: color tokens, type scale + typography classes, fonts, buttons (with hover states), logos, and icons — plus a `/style-guide` preview page for visual QA.

This skill reads FROM Figma into code. It uses the Figma MCP design-to-code tools (`get_metadata`, `get_variable_defs`, `get_design_context`, `get_screenshot`). No Figma write tools are used.

## Prerequisites

- An existing Next.js project using **Tailwind v4** (`@tailwindcss/postcss`, `@import "tailwindcss"` in CSS). The `/e25-contentful-base` scaffold satisfies this.
- The Figma MCP server connected (design-to-code tools available). If the tools are missing, stop and tell the user to connect the Figma MCP server.

## What it produces

- **`app/styles/globals.css`** — entrypoint: `@import "tailwindcss"`, imports the partials in dependency order, and declares non-color `@theme` tokens (font families, font sizes, line-heights, optional spacing/radius/transitions/breakpoints) + `body` defaults.
- **`app/styles/lib/_colors.css`** — `@theme inline` `--color-*` tokens, one per Figma swatch (→ `bg-*`/`text-*`/`border-*` utilities).
- **`app/styles/lib/_fonts.css`** — `@font-face` for **custom** fonts only (Google fonts go through `next/font/google`).
- **`app/styles/lib/_typography.css`** — `.title-*`/`.body-*`/`.tag-*`/`.button-text` component classes + `h1..h6`/`p` base mapping.
- **`app/styles/lib/_buttons.css`** — `.btn` + `.btn-<variant>` classes with `:hover`/`:active` states (**CSS classes only — no React component**).
- **`app/styles/lib/_icons.css`** — per-icon utilities referencing exported SVGs.
- **`app/styles/lib/_utility.css`** — gradient/effect helpers.
- **`public/assets/images/`** — exported logos + favicon.
- **`public/assets/icons/`** — exported icons (desktop + mobile).
- **`app/style-guide/page.tsx`** — preview route rendering all of the above.
- Updates **`app/layout.tsx`** (font wiring + import the new `app/styles/globals.css`).

The skill **moves styling into `app/styles/globals.css`** and removes the flat `app/globals.css` that `create-next-app` generated (its layout import is repointed).

## Path conventions — use absolute paths everywhere, never `cd`

Bash calls share a working directory, so a `cd` in one step bleeds into the next. Capture two absolute paths up front and substitute them into every command:

- **`${SKILL_DIR}`** — the directory containing this `SKILL.md`. The template lives at `${SKILL_DIR}/template/`.
- **`${PROJECT_DIR}`** — the Next.js project root (the directory containing `package.json` / `app/`). Compute it once from `${SKILL_DIR}` by going up three levels (`e25-style-gen → skills → .claude → its parent`), unless the user names a different project directory in Gate 1. Confirm `${PROJECT_DIR}/package.json` exists before proceeding.

## Invocation — do exactly the following in order

### Step 1 — Gate 1: inputs

Ask the user (a single message is fine) for:

1. **Figma style-guide URL** — required. Must be a `/design/` file URL with a `node-id` pointing at the style-guide frame. Extract `fileKey` and `nodeId` from it (convert the `node-id` `1133-1637` form to `1133:1637`). If the URL has no `node-id`, ask for a node-specific link.
2. **Target project directory** — default `${PROJECT_DIR}` (in place). Only ask if it's ambiguous.

Do not proceed without a Figma URL. Verify the Figma MCP tools are available; if not, stop.

### Step 2 — Parse the Figma style guide

Build a structured model of the guide before writing any files. Work top-down:

1. **`get_metadata`** on the style-guide node → map the section frames by their text labels (e.g. "Colors - Primary", "Colors - Secondary", "Fonts", "Typography", "Buttons / Tags & Links", "Logos & Fav Icon", "Desktop Icons", "Mobile Icons"). The section labels and per-swatch labels/hex/RGB are often present directly in the metadata text nodes — harvest what you can here to minimize round-trips.
2. **`get_variable_defs`** on the node → exact color and type variable values where the file uses Figma variables. Cross-check against the metadata text.
3. **Typography**: the design team frequently embeds the CSS spec as literal text in each type cell (`font-family`, `font-weight`, `font-size`, `line-height`). Read those strings directly. Otherwise pull specs from `get_design_context` on the typography frame.
4. **Buttons**: `get_design_context` (and `get_screenshot` if needed) on BOTH the default-state and hover-state columns so you capture color/bg, border, radius, padding, type, and the hover treatment (color swap, translate, expanding-fill, arrow shift).
5. **Logos & icons**: identify the logo/favicon nodes and each icon node. Plan to export them as SVG in Step 7.

Summarize the parsed model back to the user (palette, type scale, font families + Google-availability, button variants, count of logos/icons) before generating. This is the one confirmation gate — keep it brief.

### Step 3 — Scaffold the styles structure

Copy the template skeletons in with absolute paths (no `cd`):

```bash
cp -R ${SKILL_DIR}/template/app/. ${PROJECT_DIR}/app/
```

This adds `app/styles/` (with the `lib/` partials) and `app/style-guide/page.tsx`. They contain `TODO(e25-style-gen)` markers you replace in the following steps. It does not touch existing files except by adding these new ones.

### Step 4 — Colors → `_colors.css`

For every swatch in the Colors sections, emit one `--color-<family>-<n>: #RRGGBB;` token inside the `@theme inline` block, preserving the design team's family names (primary, gray, secondary, accent, …). Add a trailing `/* source label */` comment per token. Emit gradients as `--gradient-*` tokens (here or in `globals.css`) and a matching `.gradient-*` utility in `_utility.css`.

**Gradients: read the exact `linear-gradient(...)` from Figma — do NOT assume a direction.** Pull each gradient's real angle and stop positions via `get_design_context` on the swatch node (the angle, e.g. `73deg` vs `100deg`, and stop %s differ per gradient, and a gradient may have 3+ stops with a `via` color). Copying the CSS verbatim is correct; defaulting everything to `135deg`/`0%→100%` is wrong.

### Step 5 — Typography → `globals.css` tokens + `_typography.css`

1. In `globals.css` `@theme`, add `--text-*` (font size) and `--leading-*` (line-height) tokens for each step in the type scale (convert `px → rem`, `% → unitless`).
2. In `_typography.css`, define one **`@utility`** per Figma type style (`title-1`…`title-n`, `body-small/regular/large`, `tag-1`, `button-text`) using the family/weight/size/line-height from the spec, referencing the tokens. **Use `@utility name { … }`, not `@layer components { .name { … } }`** — in Tailwind v4 only `@utility` (and built-in) classes are valid `@apply` targets, so a component-layer class breaks the base mapping in step 3 with `Cannot apply unknown utility class`. (`@utility` classes are also usable directly in markup.)
3. In `@layer base`, map `h1..h6` and `p` onto the type styles via `@apply <utility>` so authored content inherits the scale.

### Step 6 — Fonts

For each font family in the guide:

1. **Check Google Fonts availability** deterministically — request the Google CSS API and inspect the status:

   ```bash
   # 200 = available on Google Fonts; 400 = not available
   curl -s -o /dev/null -w "%{http_code}" \
     "https://fonts.googleapis.com/css2?family=$(printf '%s' 'Instrument Sans' | sed 's/ /+/g')"
   ```

2. **Available on Google** → wire it in `app/layout.tsx` via `next/font/google`, exposing a CSS variable (e.g. `--font-instrument-sans`), and reference that variable from `globals.css` `@theme` (`--font-sans`). Do NOT add an `@font-face` for it. (Body/sans families typically come from here.)
3. **Not on Google** (custom, e.g. Landour) → get the font files from the user. Either they give a **path to a file** they already have (e.g. `~/Downloads/Landour-VF.ttf`) — copy it into `${PROJECT_DIR}/public/assets/fonts/<family-kebab>/` — or, if they have nothing yet, **pause and instruct** them to drop files into that folder, then wait for confirmation and list the directory. Then generate `@font-face` in `_fonts.css` and reference the family via `--font-display` (or the appropriate token) in `globals.css`. Two cases:
   - **Static files** (one file per weight): one `@font-face` per weight/style, `src` order woff2 → woff → ttf, `font-weight: <n>`.
   - **Variable font** (a single `*-VF.ttf`/`*.woff2` carrying the weight axis — common): ONE `@font-face` with a `font-weight` RANGE covering the weights the guide uses (e.g. `font-weight: 300 700;`) and `format("truetype-variations")` (or `format("woff2")` for a variable woff2). Don't emit one block per weight for a VF.

   If the user truly can't supply files, set a clearly-commented system fallback in `--font-display` and flag it in the final report so it isn't mistaken for done.

Always update `app/layout.tsx` so the `<html>`/`<body>` carries the font CSS variable classes and imports `./styles/globals.css` (not the old `./globals.css`).

### Step 7 — Logos → `public/assets/images`, icons → `public/assets/icons`

1. Ensure the directories exist: `mkdir -p ${PROJECT_DIR}/public/assets/images ${PROJECT_DIR}/public/assets/icons`.
2. For logos/favicon and each icon node, use `get_design_context` to obtain the asset download URLs (SVG for vector logos/icons), then `curl` each into the right folder with a sensible kebab-case filename derived from the Figma layer name (e.g. `eight25-logo.svg`, `eight25-logo-white.svg`, `arrow-right.svg`).
3. In `_icons.css`, add one `@utility icon-<name>` per icon (inline-block, `bg-contain`, natural w/h, `bg-[url('/assets/icons/<name>.svg')]`) — or, if the guide is large, a sprite sheet with background-position utilities; note which approach you used.
4. Verify each downloaded file is non-empty and valid (`file`/byte-size check). Report any that failed to export rather than silently skipping.

### Step 8 — Preview page → `app/style-guide/page.tsx`

Populate the `COLORS`, `TYPE_SCALE`, and `BUTTON_VARIANTS` arrays in the copied preview page from the parsed model so the route renders every swatch (using the generated color utilities), every type style (using the generated classes), and every button variant (default + hover). Keep it class-driven so it exercises the real style guide.

**Make specimens actually exercise what they label.** A row labeled "… Medium" / "… Bold" must render in that weight (set `fontWeight`), and a row labeled with a font family must render in that family — don't render every weight row in one base class, or the weights won't be distinguishable. Gradient swatches must use the `.gradient-*` utilities (one source of truth), not a re-declared inline gradient. For variable fonts, requesting `font-weight: <n>` drives the `wght` axis (the `@font-face` weight range must cover it).

### Step 9 — Validate

Run and report each result. Do not skip.

- **Build**: `npm --prefix ${PROJECT_DIR} run build` — must exit 0 (type-check + lint + CSS compile). If it fails, surface the first error block and stop; do not paper over it.
- **Visual parity (optional but recommended)**: start dev, screenshot `/style-guide`, and compare against a `get_screenshot` of the Figma node; call out any obvious mismatches (colors, font rendering, button hover).
- Re-list `public/assets/images` and `public/assets/icons` and confirm counts match what was parsed.

### Step 10 — Report

Summarize: tokens generated (counts), type styles, font families and how each was wired (Google vs custom — and flag any custom font still awaiting upload), button variants, logos/icons exported, build result, and the `/style-guide` URL. Point the user at `app/styles/` as the source of truth and note the preview route is safe to delete.

## Idempotency / re-runs

Re-running against the same (or an updated) Figma should update tokens in place, not duplicate them. Treat `app/styles/lib/*` as generated: it is safe to overwrite. Preserve any hand-edits the user flags. Never delete `public/assets/*` that you didn't generate this run without asking.

## What this skill does NOT do

- Does not create section/page components — only the style layer. (Sections are a separate skill.)
- Does not invent values not present in the guide — if a token, weight, or hover detail is missing from Figma, ask rather than guess.
- Does not commit, push, or deploy.
- Does not pin Tailwind/Next versions — it adapts to whatever the project already uses (Tailwind v4 assumed).
- Does not download or embed non-Google font files automatically — custom fonts require the user to provide the files (licensing).
