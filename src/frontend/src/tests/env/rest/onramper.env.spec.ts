const ONRAMPER_DEV_API_KEY = 'onramper-dev-api-key';
const ONRAMPER_PROD_API_KEY = 'onramper-prod-api-key';

interface AppEnvironment {
	local: boolean;
	staging: boolean;
}

const loadOnramperEnv = async ({ local, staging }: AppEnvironment) => {
	vi.resetModules();
	vi.doMock('$lib/constants/app.constants', () => ({
		LOCAL: local,
		STAGING: staging
	}));
	vi.stubEnv('VITE_ONRAMPER_API_KEY_DEV', ONRAMPER_DEV_API_KEY);
	vi.stubEnv('VITE_ONRAMPER_API_KEY_PROD', ONRAMPER_PROD_API_KEY);

	return await import('$env/rest/onramper.env');
};

describe('onramper.env', () => {
	afterEach(() => {
		vi.doUnmock('$lib/constants/app.constants');
		vi.unstubAllEnvs();
	});

	it.each([
		{ environment: 'local', local: true, staging: false },
		{ environment: 'staging', local: false, staging: true }
	])(
		'enables OnRamper and uses the dev widget config for $environment builds',
		async ({ local, staging }) => {
			const onramperEnv = await loadOnramperEnv({ local, staging });

			expect(onramperEnv.ONRAMPER_ENABLED).toBeTruthy();
			expect(onramperEnv.isOnRamperDev).toBeTruthy();
			expect(onramperEnv.ONRAMPER_BASE_URL).toBe('https://buy.onramper.dev');
			expect(onramperEnv.ONRAMPER_API_KEY).toBe(ONRAMPER_DEV_API_KEY);
		}
	);

	it.each([
		{ environment: 'beta', local: false, staging: false },
		{ environment: 'production', local: false, staging: false }
	])(
		'disables OnRamper and uses the prod widget config for $environment builds',
		async ({ local, staging }) => {
			const onramperEnv = await loadOnramperEnv({ local, staging });

			expect(onramperEnv.ONRAMPER_ENABLED).toBeFalsy();
			expect(onramperEnv.isOnRamperDev).toBeFalsy();
			expect(onramperEnv.ONRAMPER_BASE_URL).toBe('https://buy.onramper.com');
			expect(onramperEnv.ONRAMPER_API_KEY).toBe(ONRAMPER_PROD_API_KEY);
		}
	);
});
