import { defineConfig, devices } from '@playwright/test';
import dotenv, { type DotenvPopulateInput } from 'dotenv';
import { join } from 'node:path';
import { readCanisterIds } from './env.utils';

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
		{
			name: 'Google Chrome',
			use: { ...devices['Desktop Chrome'], channel: 'chrome' }
		}
	]
});
