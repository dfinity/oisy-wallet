import { default as svelteConfig } from '@dfinity/eslint-config-oisy-wallet/svelte';
import { default as vitestConfig } from '@dfinity/eslint-config-oisy-wallet/vitest';

const ZERO_BIGINT_RESTRICTION = {
	selector: "Literal[raw='0n']",
	message: 'Use the shared constant `ZERO` instead of `0n`.'
};

export default [
	...vitestConfig,
	...svelteConfig,

	{
		rules: {
			'local-rules/use-option-type-wrapper': 'error',
			// TODO: re-enable this rule when it includes `expect` statements nested in callable functions.
			'vitest/expect-expect': ['off']
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
			'no-restricted-syntax': ['error', ZERO_BIGINT_RESTRICTION]
		}
	},

	{
		files: ['src/frontend/src/**/*'],
		ignores: ['src/frontend/src/lib/utils/console.utils.ts', 'src/frontend/src/tests/**/*'],
		rules: {
			'no-restricted-syntax': [
				'error',
				ZERO_BIGINT_RESTRICTION,
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
			'vitest/no-conditional-expect': 'off',
			'vitest/no-disabled-tests': 'off',
			'vitest/no-standalone-expect': 'off'
		}
	},

	{
		ignores: [
			'**/.DS_Store',
			'**/node_modules',
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
