import * as tailwind from 'prettier-plugin-tailwindcss'

/**
 * Prettier de SOFLY: valores fijos, no se discuten en PRs.
 *
 * El plugin de Tailwind va como objeto (no por nombre) para que se resuelva
 * desde el kit y no dependa de que cada repo lo tenga instalado.
 *
 * @param {object} [options]
 * @param {boolean} [options.jsxSingleQuote=true] TLP usa comillas dobles en JSX.
 * @param {string} [options.tailwindStylesheet] Tailwind v4: la hoja de entrada,
 *   relativa a la raíz del repo, para que el orden de clases sea el mismo en
 *   local y en CI.
 * @returns {import('prettier').Config}
 */
export function prettierConfig({ jsxSingleQuote = true, tailwindStylesheet } = {}) {
	return {
		useTabs: true,
		tabWidth: 2,
		semi: false,
		singleQuote: true,
		jsxSingleQuote,
		printWidth: 80,
		trailingComma: 'none',
		arrowParens: 'avoid',
		bracketSpacing: true,
		bracketSameLine: false,
		plugins: [tailwind],
		...(tailwindStylesheet ? { tailwindStylesheet } : {})
	}
}

export default prettierConfig()
