import path from 'node:path'

/**
 * lint-staged de SOFLY para monorepos pnpm + turbo.
 *
 *  - ESLint sólo sobre `.ts`/`.tsx` dentro de `apps/` o `packages/`: cada
 *    paquete tiene su `eslint.config`, y un archivo suelto en la raíz no tiene
 *    config que lo cubra. `v10_config_lookup_from_file` hace que cada archivo
 *    use la config de su paquete (ESLint 9 flat en monorepo).
 *  - Prettier sobre todo lo que entiende (`--ignore-unknown`).
 *
 * Un solo glob con función, así los comandos corren en orden (primero ESLint,
 * después Prettier) y nunca dos herramientas escriben el mismo archivo a la vez.
 */
const quote = files => files.map(f => JSON.stringify(f)).join(' ')

const lintable = file => {
	const rel = path.relative(process.cwd(), file).split(path.sep).join('/')
	return /^(apps|packages)\/.+\.(ts|tsx)$/.test(rel)
}

export default {
	'*': files => {
		const commands = []
		const toLint = files.filter(lintable)
		if (toLint.length > 0) {
			commands.push(
				`eslint --fix --max-warnings=0 --no-warn-ignored --flag v10_config_lookup_from_file ${quote(toLint)}`
			)
		}
		commands.push(`prettier --write --ignore-unknown ${quote(files)}`)
		return commands
	}
}
