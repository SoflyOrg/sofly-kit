import js from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import prettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * ESLint flat de SOFLY. Dos familias, las mismas que ya corren en los sistemas:
 *
 *  - `full`: la de reina y one. `any` prohibido, export nombrado (sin default
 *    salvo los archivos-contrato de Next) y orden de imports
 *    externos → paquetes del monorepo (`scope`) → alias de la app → relativos.
 *  - `baseline`: la de TLP, calystenwicz, gestyfit y cook. `any` prohibido y
 *    variables sin usar con prefijo `_`; sin reglas de imports ni de exports.
 *
 * Cada sistema lo consume desde su `packages/config` (una línea por archivo).
 */

const unusedVars = [
	'error',
	{
		argsIgnorePattern: '^_',
		varsIgnorePattern: '^_',
		caughtErrorsIgnorePattern: '^_'
	}
]

const reactRules = {
	...reactPlugin.configs.flat.recommended.rules,
	...reactHooks.configs.recommended.rules,
	'react/react-in-jsx-scope': 'off',
	'react/prop-types': 'off'
}

/**
 * @param {{ scope: string }} options `scope` es el prefijo de los paquetes del
 * monorepo, con o sin `@` (`@rr`, `@one`).
 */
function fullBase({ scope }) {
	const name = scope.replace(/^@/, '')
	return tseslint.config(
		{
			ignores: [
				'**/dist/**',
				'**/.next/**',
				'**/coverage/**',
				'**/node_modules/**',
				'**/*.config.*',
				'**/next-env.d.ts'
			]
		},
		js.configs.recommended,
		...tseslint.configs.recommended,
		{
			plugins: {
				'simple-import-sort': simpleImportSort,
				import: importPlugin
			},
			rules: {
				'@typescript-eslint/no-explicit-any': 'error',
				'@typescript-eslint/no-unused-vars': unusedVars,
				'import/no-default-export': 'error',
				'simple-import-sort/exports': 'error',
				'simple-import-sort/imports': [
					'error',
					{
						groups: [
							// 1) Externos: builtins de node, react, next y el resto. Excluye
							//    los paquetes del monorepo y los alias absolutos de la app.
							[
								'^node:',
								`^@(?!${name})\\w`,
								'^(?!app/|views/|features/|components/|config/|i18n/|utils/|assets/)\\w'
							],
							// 2) Paquetes del monorepo.
							[`^@${name}/`],
							// 3) Alias absolutos de la app (resueltos desde src).
							['^(app|views|features|components|config|i18n|utils|assets)(/|$)'],
							// 4) Relativos.
							['^\\.']
						]
					}
				]
			}
		},
		prettier
	)
}

/** Para la app Next.js (`apps/web`). */
function fullNext(options) {
	return [
		...fullBase(options),
		{
			files: ['**/*.{ts,tsx}'],
			plugins: {
				'@next/next': nextPlugin,
				react: reactPlugin,
				'react-hooks': reactHooks
			},
			settings: { react: { version: 'detect' } },
			rules: {
				...nextPlugin.configs.recommended.rules,
				...nextPlugin.configs['core-web-vitals'].rules,
				...reactRules
			}
		},
		{
			// Service worker de la PWA: corre en un worker, sus globales son
			// `self`, `caches` y `clients`, que el entorno de browser no conoce.
			files: ['public/sw.js'],
			languageOptions: {
				globals: {
					self: 'readonly',
					caches: 'readonly',
					clients: 'readonly',
					fetch: 'readonly',
					skipWaiting: 'readonly',
					registration: 'readonly'
				}
			}
		},
		{
			// Los archivos-contrato de Next exigen export default.
			files: [
				'src/app/**/page.tsx',
				'src/app/**/layout.tsx',
				'src/app/**/loading.tsx',
				'src/app/**/error.tsx',
				'src/app/**/global-error.tsx',
				'src/app/**/not-found.tsx',
				'src/app/**/template.tsx',
				'src/app/**/default.tsx',
				'src/app/**/route.ts',
				'src/app/**/sitemap.ts',
				'src/app/**/robots.ts',
				'src/app/**/manifest.ts',
				'src/middleware.ts',
				'src/i18n/request.ts',
				'e2e/globalSetup.ts'
			],
			rules: { 'import/no-default-export': 'off' }
		}
	]
}

/** Para librerías React (`packages/ui`). */
function fullReact(options) {
	return [
		...fullBase(options),
		{
			files: ['**/*.{ts,tsx}'],
			plugins: { react: reactPlugin, 'react-hooks': reactHooks },
			settings: { react: { version: 'detect' } },
			rules: reactRules
		}
	]
}

export const full = { base: fullBase, next: fullNext, react: fullReact }

/**
 * Opt-in para APIs NestJS (`apps/api`): lo que entra por `@Body`, `@Query` y
 * `@Param` se tipa `unknown` hasta parsearlo con zod, o lleva un pipe que lo
 * valide (`@Body(new ZodValidationPipe(schema))`, `@Param('id', UuidPipe)`).
 * Un `@Param('id') id: string` es un tipo que miente: nadie lo validó.
 * Ver `sofly-standards/estandares/seguridad.md` §0.7.
 *
 * Uso: `export default [...baseline(), ...nestInputs]` en `apps/api`.
 */
// `:has(> …)` relativo no matchea en el esquery de ESLint 9: se busca en todo
// el subárbol del parámetro (decoradores + tipo), que es chico.
const untrustedInput =
	'Identifier[decorators.length>0]' +
	':has(Decorator > CallExpression[callee.name=/^(Body|Query|Param)$/][arguments.length<2])' +
	':not(:has(NewExpression))' +
	':not(:has(TSTypeAnnotation > TSUnknownKeyword))'
export const nestInputs = [
	{
		files: ['**/*.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: untrustedInput,
					message:
						'Lo que llega del cliente es `unknown` hasta parsearlo con zod (o va con un pipe que lo valide). Ver seguridad.md §0.7.'
				}
			]
		}
	}
]

/**
 * Familia `baseline`. Cada sistema le suma encima lo propio (por ejemplo, el
 * plugin de Next en `apps/web`) desde el `eslint.config` de cada paquete.
 */
export function baseline() {
	return tseslint.config(
		{
			ignores: [
				'**/dist/**',
				'**/.next/**',
				'**/node_modules/**',
				'**/.turbo/**',
				'**/coverage/**',
				'**/drizzle/**'
			]
		},
		js.configs.recommended,
		...tseslint.configs.recommended,
		{
			languageOptions: {
				globals: { ...globals.node, ...globals.browser }
			},
			rules: {
				'@typescript-eslint/no-explicit-any': 'error',
				'@typescript-eslint/no-unused-vars': unusedVars
			}
		},
		prettier
	)
}
