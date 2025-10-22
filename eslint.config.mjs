import { default as svelteConfig } from '@dfinity/eslint-config-oisy-wallet/svelte';
import { default as vitestConfig } from '@dfinity/eslint-config-oisy-wallet/vitest';

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
			'no-restricted-syntax': [
				'error',
				{
					selector: "Literal[raw='0n']",
					message: 'Use the shared constant `ZERO` instead of `0n`.'
				}
			]
		}
	},

	// TODO: re-enable this rule when we fix all the warnings that it causes.
	{
		rules: {
			'svelte/no-navigation-without-resolve': 'off'
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
