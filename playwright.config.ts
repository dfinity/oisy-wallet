import { defineConfig, devices } from '@playwright/test';
import dotenv, { type DotenvPopulateInput } from 'dotenv';
import { join } from 'node:path';
import { readCanisterIds } from './env.utils';

dotenv.config({
	path: join(process.cwd(), '.env.e2e')
});

dotenv.populate(
	process.env as DotenvPopulateInput,
	readCanisterIds({
		filePath: join(process.cwd(), 'canister_e2e_ids.json'),
		prefix: 'E2E_'
	})
);

const DEV = (process.env.NODE_ENV ?? 'production') === 'development';

const TIMEOUT = 5 * 60 * 1000;

export default defineConfig({
	timeout: TIMEOUT,
	workers: DEV ? 5 : 2,
	expect: {
		toHaveScreenshot: {
			// disable any animations caught by playwright for better screenshots and less flaky tests.
			animations: 'disabled',
			// hide caret for cleaner snapshots.
			caret: 'hide'
		}
	},
	webServer: {
		command: DEV ? 'npm run dev' : 'npm run build && npm run preview',
		reuseExistingServer: true,
		port: DEV ? 5173 : 4173,
		timeout: TIMEOUT
	},
	testDir: 'e2e',
	testMatch: ['**/*.e2e.ts', '**/*.spec.ts'],
	use: {
		testIdAttribute: 'data-tid',
		trace: 'on',
		actionTimeout: TIMEOUT,
		navigationTimeout: TIMEOUT,
		...(DEV && { headless: false })
	},
	projects: [
		/* Test against desktop browsers. */
		{
			name: 'Google Chrome',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
