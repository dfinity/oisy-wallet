import { defineConfig, devices } from '@playwright/test';

const DEV = (process.env.NODE_ENV ?? 'production') === 'development';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	},
	testDir: 'e2e',
	testMatch: ['**/*.e2e.ts', '**/*.spec.ts'],
	use: {
		testIdAttribute: 'data-tid',
		trace: 'on'
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
