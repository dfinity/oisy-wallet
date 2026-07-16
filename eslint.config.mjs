import { default as svelteConfig } from '@dfinity/eslint-config-oisy-wallet/svelte';
import { default as vitestConfig } from '@dfinity/eslint-config-oisy-wallet/vitest';

const ZERO_BIGINT_RESTRICTION = {
	selector: "Literal[raw='0n']",
	message: 'Use the shared constant `ZERO` instead of `0n`.'
};

// `!nonNullish(x)` and `!isNullish(x)` are double negatives that read backwards;
// each has a direct, positive counterpart in `@dfinity/utils`.
const NULLISH_NEGATION_RESTRICTIONS = [
	{
		selector: "UnaryExpression[operator='!'] > CallExpression[callee.name='nonNullish']",
		message: 'Use `isNullish(x)` instead of `!nonNullish(x)`.'
	},
	{
		selector: "UnaryExpression[operator='!'] > CallExpression[callee.name='isNullish']",
		message: 'Use `nonNullish(x)` instead of `!isNullish(x)`.'
	}
];

export default [
	...vitestConfig,
	...svelteConfig,

	{
		rules: {
			'local-rules/use-option-type-wrapper': 'error',
			// TODO: re-enable this rule when it includes `expect` statements nested in callable functions.
			'vitest/expect-expect': ['off'],
			// TODO: re-enable this rule once typescript-eslint stops flagging assertions
			// that are required for compilation (e.g. on mocked values whose receiver type
			// is wider than what TypeScript actually infers without the assertion).
			'@typescript-eslint/no-unnecessary-type-assertion': 'off'
		}
	},

	{
		// eslint 10's `no-useless-assignment` misreads Svelte 5 runes — e.g. `$bindable()`
		// defaults in `$props()` destructuring and `$state` reassigned in an `$effect` — as
		// dead assignments. Disable it for components; it still applies to plain .ts files.
		files: ['**/*.svelte'],
		rules: {
			'no-useless-assignment': 'off'
		}
	},

	{
		files: ['src/frontend/src/**/*'],
		rules: {
			'local-rules/no-relative-imports': 'error'
		}
	},

	{
		rules: {
			'no-restricted-syntax': ['error', ZERO_BIGINT_RESTRICTION, ...NULLISH_NEGATION_RESTRICTIONS]
		}
	},

	{
		files: ['src/frontend/src/**/*'],
		ignores: ['src/frontend/src/lib/utils/console.utils.ts', 'src/frontend/src/tests/**/*'],
		rules: {
			'no-restricted-syntax': [
				'error',
				ZERO_BIGINT_RESTRICTION,
				...NULLISH_NEGATION_RESTRICTIONS,
				{
					selector: "MemberExpression[object.name='console'][property.name='error']",
					message:
						'Use `consoleError` from `$lib/utils/console.utils` instead of `console.error` to format IC canister errors.'
				},
				{
					selector: "MemberExpression[object.name='console'][property.name='warn']",
					message:
						'Use `consoleWarn` from `$lib/utils/console.utils` instead of `console.warn` to format IC canister errors.'
				}
			]
		}
	},

	// TODO: re-enable this rule when we fix all the warnings that it causes.
	{
		rules: {
			'svelte/no-navigation-without-resolve': 'off',
			'vitest/no-conditional-expect': 'off',
			'vitest/no-disabled-tests': 'off',
			'vitest/no-standalone-expect': 'off'
		}
	},

	{
		ignores: [
			'**/.DS_Store',
			'**/node_modules',
			'.claude',
			'build',
			'.dfx',
			'.svelte-kit',
			'package',
			'**/.env',
			'**/.env.*',
			'!**/.env.example',
			'**/pnpm-lock.yaml',
			'**/package-lock.json',
			'**/yarn.lock',
			'src/declarations/**/*',
			'src/frontend/src/env/tokens/tokens.sns.json',
			'**/playwright-report',
			'**/coverage',
			'**/.vitest-reports'
		]
	}
];
