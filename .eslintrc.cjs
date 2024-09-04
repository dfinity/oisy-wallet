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
			// TODO: slowly add all related folders, and ultimately remove this override and include the rule in the main rules
			files: [
				'src/frontend/src/eth/components/core/**/*.svelte',
				'src/frontend/src/eth/components/fee/**/*.svelte',
				'src/frontend/src/eth/components/receive/**/*.svelte'
			],
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
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': [
			'warn',
			{
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_'
			}
		],
		'no-console': ['error', { allow: ['error', 'warn'] }],
		'no-else-return': ['warn', { allowElseIf: false }],
		'local-rules/no-svelte-store-in-api': 'error',
		'@typescript-eslint/prefer-nullish-coalescing': 'error',
		'no-continue': 'warn',
		'@typescript-eslint/no-unnecessary-type-assertion': 'error',
		'no-delete-var': 'error',
		curly: 'error',
		'arrow-body-style': ['warn', 'as-needed'],
		'import/no-duplicates': ['error', { 'prefer-inline': true }],
		'@typescript-eslint/no-inferrable-types': 'error',
		'prefer-template': 'error'
	},
	globals: {
		NodeJS: true
	}
};
