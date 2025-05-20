import { notEmptyString } from '@dfinity/utils';
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
const isMac = notEmptyString(MATRIX_OS)
	? MATRIX_OS.includes('macos')
	: process.platform === 'darwin';

const appleProjects = [
	{
		name: 'Safari',
		use: devices['Desktop Safari']
	},
	{
		name: 'Google Chrome',
		use: devices['Desktop Chrome']
	},
	{
		name: 'iPhone SE',
		use: {
			...devices['iPhone SE'],
			screen: { width: 375, height: 667 },
			viewport: { width: 375, height: 667 }
		}
	},
	{
		name: 'iPad Pro 11',
		use: {
			...devices['iPad Pro 11'],
			screen: { width: 633, height: 1194 },
			viewport: { width: 633, height: 1194 }
		}
	}
];

const nonAppleProjects = [
	{
		name: 'Google Chrome',
		use: devices['Desktop Chrome']
	},
	{
		name: 'Firefox',
		use: devices['Desktop Firefox']
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
	workers: 5,
	expect: {
		toHaveScreenshot: {
			threshold: 0.3,
			// disable any animations caught by playwright for better screenshots and less flaky tests
			animations: 'disabled',
			// hide caret for cleaner snapshots
			caret: 'hide',
			// apply masks to hide flaky elements
			stylePath: 'e2e/styles/masks.css'
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
	snapshotDir: 'e2e/snapshots',
	use: {
		testIdAttribute: 'data-tid',
		trace: 'on',
		actionTimeout: TIMEOUT,
		navigationTimeout: TIMEOUT,
		...(DEV && { headless: false })
	},
	projects: isMac ? appleProjects : nonAppleProjects
});
