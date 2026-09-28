# Architecture - inkwell

> How the pieces fit. For agents and contributors. Keep this in sync with the actual code.

## Overview
_(1–3 sentences: what this is and the one job it does. Fill from `docs/PROJECT_BRIEF.md`.)_

## System Architecture (Awwwards-Tier Pipeline)

### Layer 1: Design Tokens (`css/tokens.css`)
**The single source of truth for all visual values.**
- Primitives: raw colors, font families, base sizes
- Semantic: purpose-named aliases (--bg, --fg, --brand, --space-*, --radius*, --shadow*, --dur*, --ease*)
- Component tokens: mesh gradients, magnetic, cursor, parallax, etc.
- Theme scoping: `[data-theme="light"]` | `[data-theme="dark"]`
- **Rule:** No raw values in any other CSS file.

### Layer 2: Base (`css/base.css`)
**Reset, typography, layout primitives, background patterns.**
- CSS reset + box-sizing
- Typography scale from tokens
- `.wrap`, `.section`, `.prose` utilities
- Background pattern utilities (dots, lines, crosshatch, geometric, mesh, noise)
- Hero, site-head, site-foot base styles
- Skip link for accessibility

### Layer 3: Components (`css/components.css`)
**Reusable UI components: token-only, premium quality.**
- Buttons: solid, ghost, outline, magnetic, sizes
- Cards: base, feature, wide, 3D tilt
- Work grid: responsive bento
- Form float labels
- Counter, Progress Ring
- Marquee, Nav Morph
- Gallery Masonry + Lightbox
- Cookie Consent
- Text Scramble
- **All states: hover, focus, active, disabled, in both themes**

### Layer 4: Sections (`css/sections.css`)
**Page-level layout families: each section = different family.**
- A: Asymmetric Split (hero alternative)
- B: Bento Grid (work showcase)
- C: Numbered Principles (process)
- D: Centered CTA Band (conversion)
- E: Prose Block (about/story)
- F: Stats/Metrics Row (proof)
- G: Testimonials (social proof)
- H: Image Gallery (portfolio)
- I: Pricing (plans)
- J: FAQ/Accordion
- K: Team (people)
- L: Logos Bar (clients)
- M: Newsletter (lead capture)
- N: Footer Link Groups

### Layer 5: Motion (`css/motion.css`)
**Progressive enhancement: gated by `.motion-ready` + `prefers-reduced-motion`.**
- Reveal animations (fade, slide, scale, rotate, blur)
- Stagger containers (up to 12 children)
- Direction variants (left, right, scale, fade)
- Hover interactions (concentric radius)
- Text scramble
- Marquee, Logos scroll
- Progress ring, Nav morph, Form float
- Gallery, Pricing, Team, Testimonial, FAQ
- Cookie consent, Theme switch, Page transitions
- Skeleton loading

### Layer 6: Behavior (`js/main.js` + `js/modules/`)
**Vanilla ES modules, progressive enhancement.**
- `main.js`: orchestrates all component initializations
- `js/modules/`: one file per premium component
- Each module: `initX()`, `destroyX()` for SPA cleanup
- IntersectionObserver for scroll reveals
- requestAnimationFrame for cursor/parallax/tilt
- localStorage for theme persistence
- CustomEvent for cross-component communication

### Layer 7: Assets (`assets/`)
**Self-contained, versioned, optimized.**
- `components/`: 15+ premium components (CSS + JS + HTML + MD)
- `textures/`: noise.svg, grain.png, paper-texture.svg
- `gradients/`: mesh-1/2/3.svg, noise-gradient.svg, aurora-gradient.svg
- `patterns/`: dots.svg, lines.svg, crosshatch.svg, geometric-1.svg
- `shaders/`: mesh-gradient.glsl, noise.glsl, displacement.glsl
- `fonts/`: woff2 subsets, self-hosted

---

## Data Flow
```
User Interaction
      │
      ▼
┌─────────────────┐
│  HTML (SSR)     │ ──▶ Works without JS (byte-identical static)
└────────┬────────┘
         │ JS Loads
         ▼
┌─────────────────┐
│  main.js        │ ──▶ Adds .motion-ready
│  + modules      │ ──▶ Initializes all components
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CSS Tokens     │ ──▶ All visual changes via token updates
│  + Motion.css   │
└─────────────────┘
```

- No framework by default. HTML is source of truth; CSS tokens enforce consistency; JS enhances.
- If a backend/API is added later, document the boundary here.

---

## Component Communication
| Event | Publisher | Subscribers |
|-------|-----------|-------------|
| `themechange` | Theme Switch | Hero Mesh, Cursor Glow, all themed components |
| `scroll` | Window | Image Parallax, Card 3D Tilt, Scroll Reveal |
| `mousemove` | Window | Hero Mesh, Magnetic Buttons, Cursor Glow |
| `resize` | Window | All responsive components |

---

## Design Governance
- Direction set by design skills (impeccable dice) → recorded in `DESIGN.md` + `DESIGN_READ.md`
- Every UI change must honor `DESIGN.md` tokens and pass `docs/PREFLIGHT.md`
- Loop engine: Build → Score (Rubric) → Critique (Vision) → Patch → Repeat (≥10×)
- Rubric threshold: ≥ 90/100 for SHIP

---

## Decisions Log
| Date | Decision | Why |
|------|----------|-----|
| 2026-09-28 | Scaffold created via web-project-scaffold v3 | Awwwards-tier pipeline with loop engineering |

---

## Skill Integration Points
| Skill | Integration |
|-------|-------------|
| `impeccable` | `detect.mjs` verification, craft floor, experience mode |
| `design-taste-frontend` | Dice rolls in `DESIGN_READ.md`, dial-driven decisions |
| `ui-ux-pro-max` | Palette/font search for tokens, UX guidelines in PREFLIGHT |
| `web-motion-design` | Motion tokens, GSAP patterns, scroll-driven animations |
| `design-system` | Token architecture, component specs, theming |
| `brand` / `brand-voice` | Voice in copy, visual identity in tokens |
| `web-copywriting` / `personal-humaniser` | All copy humanized |
| `browser-qa` / `render-verification` | Playwright screenshots, DOM probes |
| `production-audit` | Performance, accessibility, SEO |
| `security-review` | XSS, CSRF, headers, CSP |
| `verification-loop` | Build → type-check → lint → test |

---

## File Structure
```
inkwell/
├── AGENTS.md                 # Agent context (this project)
├── DESIGN.md                 # Design system spec (tokens + philosophy)
├── SKILLS_MANIFEST.md        # Skill enforcement tracker, THE LAW
├── QUALITY_REPORT.md         # Pipeline proof, filled during build
├── README.md                 # Human overview + quick start
├── CONTRIBUTING.md           # How to contribute
├── LICENSE
├── .gitignore
├── index.html                # Semantic page skeleton
├── css/
│   ├── tokens.css            # Layer 1: primitives + semantic
│   ├── base.css              # Layer 2: reset, type, layout
│   ├── components.css        # Layer 3: premium UI components
│   ├── sections.css          # Layer 4: section families
│   └── motion.css            # Layer 5: gated animations
├── js/
│   ├── main.js               # Layer 6: orchestrator
│   └── modules/              # Premium component modules
├── assets/
│   ├── components/           # 15+ premium components
│   ├── textures/             # Noise, grain, paper
│   ├── gradients/            # Mesh gradients
│   ├── patterns/             # Dots, lines, crosshatch
│   ├── shaders/              # WebGL shaders
│   └── fonts/                # Self-hosted woff2
├── docs/
│   ├── PREFLIGHT.md          # Awwwards-tier checklist
│   ├── PROJECT_BRIEF.md      # Research + product truth
│   ├── DESIGN_READ.md        # Dice rolls + dials + component plan
│   └── ARCHITECTURE.md       # This file
└── iterations/               # Loop engine artifacts (auto-generated)
    ├── 01/
    │   ├── screenshots/
    │   ├── rubric-score.json
    │   ├── critique.md
    │   └── patches-applied.md
    └── ...
```