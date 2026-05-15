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

const port = DEV ? 5173 : 4173;

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

// Per-test wall-clock cap. Anything longer than this is almost always a hang
// rather than a slow test — fail fast so the retry (or the next shard) gets
// a chance to surface a useful trace.
const TEST_TIMEOUT = 60_000;

// Per-action cap (click, fill, etc.). 15s is generous for any single DOM
// interaction; if we need longer, we should `expect.poll` instead of letting
// the action retry silently.
const ACTION_TIMEOUT = 15_000;

// Per-navigation cap. Slightly more generous because login + Internet
// Identity popups can legitimately take a few seconds.
const NAVIGATION_TIMEOUT = 30_000;

// Web server boot can include `npm run build` (≈2 min on cold caches), so it
// gets the most generous budget — kept independent from the per-test cap.
const WEB_SERVER_TIMEOUT = 5 * 60 * 1000;

export default defineConfig({
	// One retry in any environment: that buys us the trace for the second run
	// without burning ×4 the wall-clock when a whole shard is genuinely broken.
	retries: 1,
	timeout: TEST_TIMEOUT,
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
		port,
		timeout: WEB_SERVER_TIMEOUT
	},
	testDir: 'e2e',
	testMatch: ['**/*.e2e.ts', '**/*.spec.ts'],
	snapshotDir: 'e2e/snapshots',
	use: {
		testIdAttribute: 'data-tid',
		// Skip trace recording for tests that pass on the first try. Keeps a
		// full trace for failures that survive a retry (when we actually want
		// one) at a fraction of the recording overhead and artifact size.
		trace: 'on-first-retry',
		actionTimeout: ACTION_TIMEOUT,
		navigationTimeout: NAVIGATION_TIMEOUT,
		...(DEV && { headless: false })
	},
	projects: [
		{
			name: 'warmup',
			testMatch: 'warmup.setup.ts',
			use: { baseURL: `http://localhost:${port}` }
		},
		...(isMac ? appleProjects : nonAppleProjects).map((project) => ({
			...project,
			dependencies: ['warmup']
		}))
	]
});
