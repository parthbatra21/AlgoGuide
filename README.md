## Algo Guide Landing Page

This repo includes a responsive, accessible hero-style landing page built with React + Tailwind CSS.

### Swap the hero image
- Place your asset in `public/assets/`.
- Update the file to `public/assets/hero-algo-guide.png` to match the default prop used by `Hero`. Alternatively, pass a different `heroImageSrc` to `Hero` or change it in `src/pages/Landing.jsx`.
- A placeholder SVG is provided at `public/assets/hero-algo-guide.svg`.

### Change the CTA target
- All primary CTAs use the reusable `CTAButton` component and point to `/signin`.
- If your auth entry route differs, change the `href` prop where `CTAButton` is used (e.g., in `src/components/Hero.jsx`) or update the default prop in `CTAButton`.

### Notes
- There is no top navigation on the landing page by design.
- Keyboard focus styles and motion-safe animations are enabled. Users who prefer reduced motion will not see entrance animations.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
