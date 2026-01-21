# Repository Guidelines

## Project Structure & Module Organization

- `src/` holds the application code. Key areas include `src/pages/` (route-driven pages), `src/components/`,
  `src/layouts/`, `src/assets/`, `src/styles/`, `src/lib/`, and `src/stores/`.
- `public/` contains static assets served as-is.
- `prisma/` contains the Prisma schema, migrations, and data scripts.
- `dist/` is the production build output (generated).

## Build, Test, and Development Commands

Use the scripts in `package.json` (run with `pnpm` or `npm`):

- `pnpm dev` / `npm run dev`: start the Astro dev server.
- `pnpm build` / `npm run build`: generate the production build in `dist/`.
- `pnpm preview` / `npm run preview`: preview the production build locally.
- `pnpm astro ...` / `npm run astro ...`: run Astro CLI tasks.

## Coding Style & Naming Conventions

- TypeScript + Astro project with React integration; keep components in `src/components/` and pages in `src/pages/`.
- Follow existing formatting (4-space indentation in config files, semicolons, single quotes in JS/TS).
- Tailwind is configured; prefer utility classes in `src/styles/` or component markup when appropriate.
- Path aliases are available (e.g., `@/`, `@components/`, `@assets/`, `@layouts/`) via `tsconfig.json`.

## Testing Guidelines

- No automated test framework or scripts are currently defined.
- If you add tests, include a `test` script in `package.json` and document the framework and conventions here.

## Commit & Pull Request Guidelines

- Commit messages follow Conventional Commits with scopes, e.g., `feat(ui): add preview capability` or
  `refactor(ui): streamline DynamicView`.
- PRs should include: a concise summary, linked issues (if applicable), and screenshots or GIFs for UI changes.

## Security & Configuration Tips

- Keep secrets in local environment files; never commit credentials.