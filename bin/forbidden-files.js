#!/usr/bin/env node
/**
 * Corta el commit (lint-staged) o el CI si entra un archivo que no puede
 * vivir en un repo: `.env` reales, comprimidos, planillas y volcados con datos,
 * llaves privadas. Así se colaron el `.env` de prod de one (en un `.zip`) y
 * los leads de reina (en un `.csv`). Ver `sofly-standards/estandares/seguridad.md` §0.8.
 *
 * Uso: `node forbidden-files.js <archivo> [<archivo>…]` — sale con 1 y la lista
 * si alguno está prohibido. Los fixtures de tests (`fixtures/`,
 * `__fixtures__/`) y los `.env*.example` pasan. Lo que un repo necesita a
 * propósito (un catálogo de productos, una plantilla de carga vacía) va en
 * `.sofly-allowed-files` en la raíz: un prefijo de ruta por línea, `#` comenta.
 * Nunca algo con datos de personas.
 */
import fs from 'node:fs'
import path from 'node:path'

const FORBIDDEN = [
	{ test: /(^|\/)\.env(\.[^/]*)?$/, why: '`.env` real (sólo `.env.example`)' },
	{ test: /\.(zip|tar|tgz|gz|7z|rar)$/i, why: 'comprimido (no se puede revisar qué lleva adentro)' },
	{ test: /\.(csv|tsv|xlsx?|ods)$/i, why: 'planilla (suele traer datos de personas)' },
	{ test: /\.(dump|bak|sqlite3?|db)$/i, why: 'volcado o base de datos' },
	{ test: /(^|\/)(dump|backup)[^/]*\.sql$/i, why: 'volcado de base' },
	{ test: /\.(pem|key|p12|pfx|jks|keystore)$/i, why: 'llave o certificado privado' },
	{ test: /(^|\/)id_(rsa|ed25519|ecdsa)$/, why: 'llave SSH privada' }
]

const ALLOWED = [/\.env(\.[^/]*)?\.example$/, /(^|\/)(__)?fixtures(__)?\//, /(^|\/)public\/.*\.(gz)$/]

const allowedPrefixes = (() => {
	try {
		return fs
			.readFileSync('.sofly-allowed-files', 'utf8')
			.split('\n')
			.map(line => line.replace(/#.*/, '').trim())
			.filter(Boolean)
	} catch {
		return []
	}
})()

const toRel = file => path.relative(process.cwd(), file).split(path.sep).join('/')

const hits = process.argv
	.slice(2)
	.map(toRel)
	.filter(file => !ALLOWED.some(re => re.test(file)))
	.filter(file => !allowedPrefixes.some(prefix => file.startsWith(prefix)))
	.flatMap(file => {
		const rule = FORBIDDEN.find(r => r.test.test(file))
		return rule ? [`  ${file} — ${rule.why}`] : []
	})

if (hits.length > 0) {
	console.error('Archivos que no pueden entrar al repo:\n' + hits.join('\n'))
	console.error('\nSacalos del commit (`git rm --cached <archivo>`) y sumalos al .gitignore.')
	process.exit(1)
}
