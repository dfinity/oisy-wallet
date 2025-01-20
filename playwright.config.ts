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

const MATRIX_OS = process.env.MATRIX_OS ?? '';
const isMac = MATRIX_OS.includes('macos') ?? process.platform === 'darwin';
//temporary hotfix for scrolling issue
const DESKTOP_SCREEN = { width: 1920, height: 1080 };
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };

const appleProjects = [
	{
		name: 'Safari',
		use: {
			...devices['Desktop Safari'],
			screen: DESKTOP_SCREEN,
			viewport: DESKTOP_VIEWPORT
		}
	},
	{
		name: 'iPhone SE',
		use: {
			...devices['iPhone SE'],
			screen: { width: 320, height: 568 },
			viewport: { width: 320, height: 568 }
		}
	}
];

const nonAppleProjects = [
	{
		name: 'Google Chrome',
		use: {
			...devices['Desktop Chrome'],
			channel: 'chrome',
			screen: DESKTOP_SCREEN,
			viewport: DESKTOP_VIEWPORT
		}
	},
	{
		name: 'Firefox',
		use: {
			...devices['Desktop Firefox'],
			screen: DESKTOP_SCREEN,
			viewport: DESKTOP_VIEWPORT
		}
	},
	{
		name: 'Pixel 7',
		use: {
			...devices['Pixel 7'],
			screen: { width: 412, height: 915 },
			viewport: { width: 412, height: 915 }
		}
	}
];

const TIMEOUT = 5 * 60 * 1000;

export default defineConfig({
	retries: 3,
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
	projects: isMac ? appleProjects : nonAppleProjects
});
