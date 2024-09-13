module.exports = {
	root: true,
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:svelte/recommended',
		'prettier'
	],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'eslint-plugin-local-rules', 'import'],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
		extraFileExtensions: ['.svelte'],
		project: ['./tsconfig.eslint.json']
	},
	env: {
		browser: true,
		es2017: true,
		node: true
	},
	overrides: [
		{
			files: ['*.svelte'],
			parser: 'svelte-eslint-parser',
			parserOptions: {
				parser: '@typescript-eslint/parser'
			}
		},
		{
			files: ['scripts/**/*.mjs', 'scripts/**/*.ts'],
			rules: {
				'no-console': 'off'
			}
		},
		{
			files: ['*.svelte'],
			rules: {
				'import/order': [
					'error',
					{
						alphabetize: { order: 'asc' }
					}
				]
			}
		}
	],
	rules: {
		'@typescript-eslint/no-inferrable-types': 'error',
		'@typescript-eslint/no-unnecessary-type-assertion': 'error',
		'@typescript-eslint/no-unused-vars': [
			'warn',
			{
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_'
			}
		],
		'@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-reduce-type-parameter': 'error',
		'arrow-body-style': ['warn', 'as-needed'],
		curly: 'error',
		'local-rules/no-svelte-store-in-api': 'error',
		'local-rules/use-option-type-wrapper': 'warn',
		'import/no-duplicates': ['error', { 'prefer-inline': true }],
		'no-console': ['error', { allow: ['error', 'warn'] }],
		'no-continue': 'warn',
		'no-delete-var': 'error',
		'no-else-return': ['warn', { allowElseIf: false }],
		'no-unused-vars': 'off',
		'prefer-template': 'error'
	},
	globals: {
		NodeJS: true
	}
};
