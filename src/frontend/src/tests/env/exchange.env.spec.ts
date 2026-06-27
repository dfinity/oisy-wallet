interface AppEnvironment {
	local: boolean;
	staging: boolean;
	beta?: boolean;
	prod?: boolean;
}

const loadExchangeEnv = async ({ local, staging, beta = false, prod = false }: AppEnvironment) => {
	vi.resetModules();
	vi.doMock('$lib/constants/app.constants', () => ({
		LOCAL: local,
		STAGING: staging,
		BETA: beta,
		PROD: prod
	}));

	return await import('$env/exchange.env');
};

describe('exchange.env', () => {
	afterEach(() => {
		vi.doUnmock('$lib/constants/app.constants');
	});

	it.each([
		{ name: 'local', environment: { local: true, staging: false } },
		{ name: 'staging', environment: { local: false, staging: true } }
	])('enables backend exchange mode for $name builds', async ({ environment }) => {
		const { BACKEND_EXCHANGE_ENABLED } = await loadExchangeEnv(environment);

		expect(BACKEND_EXCHANGE_ENABLED).toBeTruthy();
	});

	it.each([
		{ name: 'beta', environment: { local: false, staging: false, beta: true } },
		{ name: 'production', environment: { local: false, staging: false, prod: true } }
	])('disables backend exchange mode for $name builds', async ({ environment }) => {
		const { BACKEND_EXCHANGE_ENABLED } = await loadExchangeEnv(environment);

		expect(BACKEND_EXCHANGE_ENABLED).toBeFalsy();
	});
});
