import { defineConfig } from 'oxlint';

export default defineConfig({
	plugins: ['typescript', 'unicorn', 'import', 'vitest'],
	rules: {
		'constructor-super': 'error',
		'for-direction': 'error',
		'getter-return': 'error',
		'no-async-promise-executor': 'error',
		'no-case-declarations': 'error',
		'no-class-assign': 'error',
		'no-compare-neg-zero': 'error',
		'no-cond-assign': 'error',
		'no-const-assign': 'error',
		'no-constant-binary-expression': 'error',
		'no-constant-condition': 'error',
		'no-control-regex': 'error',
		'no-debugger': 'error',
		'no-delete-var': 'error',
		'no-dupe-class-members': 'error',
		'no-dupe-else-if': 'error',
		'no-dupe-keys': 'error',
		'no-duplicate-case': 'error',
		'no-empty': 'error',
		'no-empty-character-class': 'error',
		'no-empty-pattern': 'error',
		'no-empty-static-block': 'error',
		'no-ex-assign': 'error',
		'no-extra-boolean-cast': 'error',
		'no-fallthrough': 'error',
		'no-func-assign': 'error',
		'no-global-assign': 'error',
		'no-import-assign': 'error',
		'no-invalid-regexp': 'error',
		'no-irregular-whitespace': 'error',
		'no-loss-of-precision': 'error',
		'no-misleading-character-class': 'error',
		'no-new-native-nonconstructor': 'error',
		'no-nonoctal-decimal-escape': 'error',
		'no-obj-calls': 'error',
		'no-prototype-builtins': 'error',
		'no-redeclare': 'error',
		'no-regex-spaces': 'error',
		'no-self-assign': 'error',
		'no-setter-return': 'error',
		'no-shadow-restricted-names': 'error',
		'no-sparse-arrays': 'error',
		'no-this-before-super': 'error',
		'no-undef': 'error',
		'no-unreachable': 'error',
		'no-unsafe-finally': 'error',
		'no-unsafe-negation': 'error',
		'no-unsafe-optional-chaining': 'error',
		'no-unused-labels': 'error',
		'no-unused-private-class-members': 'error',
		'no-unused-vars': [
			'warn',
			{
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_'
			}
		],
		'no-useless-backreference': 'error',
		'no-useless-catch': 'error',
		'no-useless-escape': 'error',
		'no-with': 'error',
		'require-yield': 'error',
		'use-isnan': 'error',
		'valid-typeof': 'error',
		'ban-ts-comment': 'error',
		'no-array-constructor': 'error',
		'no-duplicate-enum-values': 'error',
		'no-explicit-any': 'error',
		'no-extra-non-null-assertion': 'error',
		'no-misused-new': 'error',
		'eslint/no-namespace': 'error',
		'no-non-null-asserted-optional-chain': 'error',
		'no-this-alias': 'error',
		'no-unnecessary-type-constraint': 'error',
		'no-unsafe-declaration-merging': 'error',
		'no-unsafe-function-type': 'error',
		'no-wrapper-object-types': 'error',
		'prefer-as-const': 'error',
		'prefer-namespace-keyword': 'error',
		'triple-slash-reference': 'error',
		curly: 'error',
		'no-unnecessary-type-assertion': 'error',
		'consistent-type-definitions': 'error',
		'consistent-type-imports': 'error',
		'no-import-type-side-effects': 'error',
		'no-inferrable-types': 'error',
		'no-non-null-asserted-nullish-coalescing': 'error',
		'no-non-null-assertion': 'error',
		'prefer-nullish-coalescing': 'error',
		'prefer-reduce-type-parameter': 'error',
		'arrow-body-style': ['warn', 'as-needed'],
		'func-style': 'error',
		'no-relative-parent-imports': 'error',
		'prefer-destructuring': 'error',
		'no-console': [
			'error',
			{
				allow: ['error', 'warn']
			}
		],
		'no-continue': 'warn',
		'no-duplicate-imports': 'error',
		'no-else-return': [
			'warn',
			{
				allowElseIf: false
			}
		],
		'no-restricted-imports': [
			'error',
			{
				patterns: [
					{
						group: ['**/dist/**'],
						message:
							"Do not import directly from a package's /dist/ folder. Use the package's public entry point instead."
					}
				],
				paths: [
					{
						name: '@dfinity/ckbtc',
						message: 'Use @icp-sdk/canisters/ckbtc instead.'
					},
					{
						name: '@dfinity/cketh',
						message: 'Use @icp-sdk/canisters/cketh instead.'
					},
					{
						name: '@dfinity/cmc',
						message: 'Use @icp-sdk/canisters/cmc instead.'
					},
					{
						name: '@dfinity/ic-management',
						message: 'Use @icp-sdk/canisters/ic-management instead.'
					},
					{
						name: '@dfinity/ledger-icp',
						message: 'Use @icp-sdk/canisters/ledger/icp instead.'
					},
					{
						name: '@dfinity/ledger-icrc',
						message: 'Use @icp-sdk/canisters/ledger/icrc instead.'
					},
					{
						name: '@dfinity/nns',
						message: 'Use @icp-sdk/canisters/nns instead.'
					},
					{
						name: '@dfinity/sns',
						message: 'Use @icp-sdk/canisters/sns instead.'
					}
				]
			}
		],
		'no-useless-rename': 'error',
		'no-useless-return': 'error',
		'prefer-template': 'error',
		'require-await': 'error'
	},
	overrides: [
		{
			files: ['scripts/**/*.mjs', 'scripts/**/*.ts'],
			rules: {
				'no-console': 'off'
			}
		},
		{
			files: ['**/*.svelte'],
			rules: {
				'no-empty-object-type': 'error',
				'no-unused-expressions': 'error'
			}
		}
	],
	// TODO: check this settings. Are they needed? Are they in line with the scope?
	// settings: {
	// 	'jsx-a11y': {
	// 		polymorphicPropName: null,
	// 		components: {},
	// 		attributes: {}
	// 	},
	// 	next: {
	// 		rootDir: []
	// 	},
	// 	react: {
	// 		formComponents: [],
	// 		linkComponents: [],
	// 		version: null,
	// 		componentWrapperFunctions: []
	// 	},
	// 	jsdoc: {
	// 		ignorePrivate: false,
	// 		ignoreInternal: false,
	// 		ignoreReplacesDocs: true,
	// 		overrideReplacesDocs: true,
	// 		augmentsExtendsReplacesDocs: false,
	// 		implementsReplacesDocs: false,
	// 		exemptDestructuredRootsFromChecks: false,
	// 		tagNamePreference: {}
	// 	},
	// 	vitest: {
	// 		typecheck: false
	// 	}
	// },
	env: {
		builtin: true,
		es2020: true,
		browser: true,
		node: true
	},
	// TODO: Is there no better way than writing them one by one?
	globals: {
		NodeJS: 'writable',
		$derived: 'readonly',
		$effect: 'readonly',
		$props: 'readonly',
		$state: 'readonly',
		vi: 'readonly',
		describe: 'readonly',
		it: 'readonly',
		test: 'readonly',
		expect: 'readonly',
		beforeAll: 'readonly',
		beforeEach: 'readonly',
		afterAll: 'readonly',
		afterEach: 'readonly',
		assert: 'readonly'
	},
	ignorePatterns: ['src/declarations/**/*']
});
