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

	// `$lib/oisy-trade/` implements what belongs in the oisy_trade canister and is
	// hosted here only until that canister can answer it. Keeping the dependency
	// arrow one-way is what makes the eventual migration a deletion rather than an
	// extraction, so the boundary is a build failure, not a convention. Only two
	// things are conceded: the module's own files, and the shared `ZERO` (the repo
	// bans the `0n` literal, so it is the only way to write zero).
	// See src/frontend/src/lib/oisy-trade/README.md.
	//
	// The patterns follow gitignore semantics, where a path cannot be re-included
	// once a parent directory is excluded. Hence `/**` rather than `/*`, and hence
	// the bare `!$lib/oisy-trade` and `!$lib/constants` alongside the specific
	// negations — without those directory re-inclusions the two allowed imports are
	// rejected as well. Verified by probe: `$lib/constants/app.constants` passes
	// while `$lib/constants/tokens.constants` is still refused.
	{
		files: ['src/frontend/src/lib/oisy-trade/**/*'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'$lib/**',
								'$btc/**',
								'$eth/**',
								'$evm/**',
								'$icp/**',
								'$sol/**',
								'$icp-eth/**',
								'$env/**',
								'$routes/**',
								'$app/**',
								'!$lib/oisy-trade',
								'!$lib/oisy-trade/**',
								'!$lib/constants',
								'!$lib/constants/app.constants'
							],
							message:
								'$lib/oisy-trade must not depend on wallet code — it speaks only the oisy_trade declarations. Allowed: $declarations/oisy_trade/*, @dfinity/*, and ZERO from $lib/constants/app.constants.'
						}
					]
				}
			]
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
