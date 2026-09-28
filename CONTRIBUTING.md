# Contributing to inkwell

Thanks for contributing. This project enforces a research-backed, design-system-driven build process.

## Before you build
1. Read `AGENTS.md` and `DESIGN.md`.
2. Check `docs/PROJECT_BRIEF.md` for goals / scope.

## Process
- All UI must use design tokens from `css/tokens.css` / `DESIGN.md`. No hardcoded colors or sizes.
- Consult the design skills (impeccable, design-taste-frontend, make-interfaces-feel-better) before major UI work.
- Keep JS progressive - the page must render without it.
- Run `docs/PREFLIGHT.md` before opening a PR.

## PR checklist
- [ ] Follows `DESIGN.md` tokens
- [ ] Passes `docs/PREFLIGHT.md`
- [ ] No lorem ipsum - real content
- [ ] Respects `prefers-reduced-motion`
