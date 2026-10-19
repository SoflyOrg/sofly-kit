/**
 * Commits convencionales. El cuerpo y el pie no tienen tope de largo de línea:
 * llevan detalle y URLs que no se cortan.
 */
export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'body-max-line-length': [0, 'always'],
		'footer-max-line-length': [0, 'always']
	}
}
