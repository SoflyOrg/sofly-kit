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
| `@sofly/kit/eslint` → `nestInputs` | Opt-in para `apps/api` (Nest): `@Body/@Query/@Param` tipados `unknown` o con pipe. `[...baseline(), ...nestInputs]`. |
| `@sofly/kit/lint-staged` | Corta el commit si entra un `.env`, comprimido, planilla, volcado o llave (`bin/forbidden-files.js`; excepciones del repo en `.sofly-allowed-files`), después ESLint sobre `.ts/.tsx` de `apps/` y `packages/` + Prettier sobre todo, en orden. |
| `.github/workflows/ci.yml` | CI reutilizable: `secrets` (gitleaks fijado con checksum + archivos prohibidos, sólo sobre los commits nuevos; `secret-scan: false` lo apaga), verify (format, lint, typecheck, test, build) + E2E opcional, con Postgres/Redis opcionales. Una key pública a propósito lleva `// gitleaks:allow` en su línea. Un falso positivo ya commiteado (un fixture de test) no se arregla con otro commit, porque el escaneo mira cada commit del push: su huella va a `.gitleaksignore` en la raíz, y el valor se cambia por uno que no parezca una key (`'test-only-'.padEnd(32, 'x')`). |
| `.github/workflows/deploy-vps.yml` | Deploy reutilizable: SSH al VPS, `git pull --ff-only` y el script de deploy del sistema. |

## Cómo lo usa un sistema

**Configs.** Una sola dependencia, en `packages/config/package.json`:

```json
"dependencies": {
  "@sofly/kit": "https://codeload.github.com/SoflyOrg/sofly-kit/tar.gz/refs/tags/v1.0.0"
}
```

Es el tarball del tag, no `github:...#semver:`: `pnpm deploy` (el que arma las
imágenes de Docker) vuelve a resolver sin lockfile, y con semver necesita
`git`, que la imagen no tiene. El tarball se baja sin git y sin token.

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
      runs-on: '"ubuntu-latest"'
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
- **Configs** (tarball de un tag fijo): cada sistema queda en una versión, a
  propósito, para que un cambio del kit no rompa un deploy sin que nadie lo
  pruebe. Para tomarlo, `bash sofly-standards/scripts/actualizar-kit.sh`
  (está en el repo privado) pasa todos los sistemas al último tag de la misma
  versión mayor y corre su check.
- Un cambio que rompe (una regla nueva que da errores en algún sistema) es
  versión mayor: `v2`. Cada sistema la adopta cuando está listo.
