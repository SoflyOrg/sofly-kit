# @sofly/kit

Configs y workflows compartidos de los sistemas de SOFLY: ESLint, Prettier,
tsconfig, commitlint, lint-staged, CI y deploy por SSH.

> **No se edita acá si estás mirando `SoflyOrg/sofly-kit`.** Ese repo es un
> espejo público que se genera solo. La fuente es la carpeta `kit/` del repo
> privado `SoflyOrg/sofly-standards`; cada push a su `main` que toque `kit/` lo
> republica (workflow «Publicar kit»).

## Qué trae

| Import | Qué es |
| --- | --- |
| `@sofly/kit/eslint` | `full.base / full.next / full.react({ scope })`: familia de reina y one (any prohibido, export nombrado, orden de imports). `baseline()`: familia de TLP, calystenwicz, gestyfit y cook. |
| `@sofly/kit/prettier` | default: los valores fijos de SOFLY. `prettierConfig({ jsxSingleQuote, tailwindStylesheet })` para lo propio de cada repo. El plugin de Tailwind viene adentro. |
| `@sofly/kit/tsconfig/*.json` | `base`, `next`, `node`, `react` (familia full) y `baseline`. |
| `@sofly/kit/commitlint` | conventional commits, sin tope de largo en cuerpo y pie. |
| `@sofly/kit/lint-staged` | ESLint sobre `.ts/.tsx` de `apps/` y `packages/` + Prettier sobre todo, en orden. |
| `.github/workflows/ci.yml` | CI reutilizable: verify (format, lint, typecheck, test, build) + E2E opcional, con Postgres/Redis opcionales. |
| `.github/workflows/deploy-vps.yml` | Deploy reutilizable: SSH al VPS, `git pull --ff-only` y el script de deploy del sistema. |

## Cómo lo usa un sistema

**Configs.** Una sola dependencia, en `packages/config/package.json`:

```json
"dependencies": { "@sofly/kit": "github:SoflyOrg/sofly-kit#semver:^1.0.0" }
```

Los archivos de `packages/config` quedan de una línea, con lo propio del repo:

```js
// packages/config/eslint/next.js
import { full } from '@sofly/kit/eslint'
export const nextConfig = full.next({ scope: '@rr' })
export default nextConfig
```

```json
// packages/config/tsconfig/next.json
{ "extends": "@sofly/kit/tsconfig/next.json" }
```

Y en la raíz: `commitlint.config.mjs` y `lint-staged.config.mjs` re-exportan
`@<scope>/config/commitlint` y `@<scope>/config/lint-staged`. Las apps no se
enteran: siguen importando `@<scope>/config/...`.

El repo es público a propósito: así `pnpm install` lo baja sin tokens en el
build de Docker del VPS, en CI y en los repos de cuentas personales. No hay
nada sensible acá; lo sensible queda en `sofly-standards`.

**CI.** El `ci.yml` del sistema conserva su `on:` y llama al reutilizable:

```yaml
jobs:
  ci:
    uses: SoflyOrg/sofly-kit/.github/workflows/ci.yml@v1
    with:
      runs-on: '["self-hosted","sofly-vps"]'
      database: true
      db-user: rr
      db-name: reina-reech
      migrate: pnpm --filter @rr/db db:migrate
```

No declares `concurrency` en el que llama: el reutilizable ya la tiene y con
el mismo grupo se trabarían.

**Deploy.** Ver la cabecera de `.github/workflows/deploy-vps.yml`.

## Versiones

- `kit/package.json` manda. Para publicar una versión: subir `version` en el
  mismo commit que el cambio y pushear `sofly-standards` a `main`. El workflow
  crea el tag `vX.Y.Z` y mueve el tag mayor (`v1`).
- **Workflows** (`@v1`): los sistemas toman la versión nueva en su próxima
  corrida, sin tocar nada.
- **Configs** (`semver:^1.0.0`): el lockfile de cada sistema fija el commit, a
  propósito, para que un cambio del kit no rompa un deploy sin que nadie lo
  pruebe. Para tomarlo, `bash sofly-standards/scripts/actualizar-kit.sh`
  actualiza el kit en todos los sistemas y corre su check.
- Un cambio que rompe (una regla nueva que da errores en algún sistema) es
  versión mayor: `v2`. Cada sistema la adopta cuando está listo.
