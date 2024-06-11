import { defineConfig, devices } from '@playwright/test';

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
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		...(!DEV
			? [
					{
						name: 'firefox',
						use: { ...devices['Desktop Firefox'] }
					},
					{
						name: 'webkit',
						use: { ...devices['Desktop Safari'] }
					},
					{
						name: 'iphone',
						use: { ...devices['iPhone 14'] }
					},
					{
						name: 'android',
						use: { ...devices['Galaxy S9+'] }
					}
				]
			: [])
	]
});
