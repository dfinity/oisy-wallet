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

export default defineConfig({
	webServer: {
		command: DEV ? 'npm run dev' : 'npm run build && npm run preview',
		reuseExistingServer: true,
		port: DEV ? 5173 : 4173
	},
	testDir: 'e2e',
	testMatch: ['**/*.e2e.ts', '**/*.spec.ts'],
	use: {
		testIdAttribute: 'data-tid',
		trace: 'on',
		...(DEV && { headless: false })
	},
	projects: [
		/* Test against desktop browsers. */
		{
			name: 'Google Chrome',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'Safari',
			use: { ...devices['Desktop Safari'] },
		},
		{
			name: 'Edge',
			use: { ...devices['Desktop Edge'] },
		},
		{
			name: 'Firefox',
			use: { ...devices['Desktop Firefox'] },
		},
		/* Test against mobile viewports. */
		{
			name: 'iPad Mini',
			use: { ...devices['iPad Mini'] },
		},
		{
			name: 'iPad Pro',
			use: { ...devices['iPad Pro 11'] },
		},
		{
			name: 'iPhone 15 Pro Max',
			use: { ...devices['iPhone 15 Pro Max'] },
		},
		{
			name: 'iPhone SE',
			use: { ...devices['iPhone SE'] },
		},
		{
			name: 'Pixel 7',
			use: { ...devices['Pixel 7'] },
		},
		{
			name: 'Galaxy S9+',
			use: { ...devices['Galaxy S9+'] },
		},
		/*Test against branded browsers. */
		{
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
	]
});
