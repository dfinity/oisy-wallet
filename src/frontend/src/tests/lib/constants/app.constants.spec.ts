vi.mock('@dfinity/principal', () => ({
	Principal: {
		fromText: vi.fn()
	}
}));

describe('app.constants', () => {
	const testEnvs = [
		'test_fe_1',
		'test_fe_2',
		'test_fe_3',
		'test_fe_4',
		'test_fe_5',
		'test_fe_6',
		'audit',
		'e2e'
	];

	const allEnvs = ['local', ...testEnvs, 'staging', 'beta', 'ic'];

	describe('BACKEND_CANISTER_ID', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.unstubAllGlobals();
			vi.resetModules();

			import.meta.env.VITE_LOCAL_BACKEND_CANISTER_ID = 'local-backend-canister-id';
			import.meta.env.VITE_TEST_FE_1_BACKEND_CANISTER_ID = 'test-fe-backend-canister-id';
			import.meta.env.VITE_TEST_FE_2_BACKEND_CANISTER_ID = 'test-fe-2-backend-canister-id';
			import.meta.env.VITE_TEST_FE_3_BACKEND_CANISTER_ID = 'test-fe-3-backend-canister-id';
			import.meta.env.VITE_TEST_FE_4_BACKEND_CANISTER_ID = 'test-fe-backend-canister-id';
			import.meta.env.VITE_TEST_FE_5_BACKEND_CANISTER_ID = 'test-fe-5-backend-canister-id';
			import.meta.env.VITE_TEST_FE_6_BACKEND_CANISTER_ID = 'test-fe-6-backend-canister-id';
			import.meta.env.VITE_E2E_BACKEND_CANISTER_ID = 'e2e-backend-canister-id';
			import.meta.env.VITE_AUDIT_BACKEND_CANISTER_ID = 'audit-backend-canister-id';
			import.meta.env.VITE_STAGING_BACKEND_CANISTER_ID = 'staging-backend-canister-id';
			import.meta.env.VITE_BETA_BACKEND_CANISTER_ID = 'beta-backend-canister-id';
			import.meta.env.VITE_IC_BACKEND_CANISTER_ID = 'ic-backend-canister-id';
		});

		it.each(allEnvs)('should resolve correctly for %s', async (mode) => {
			vi.stubGlobal('VITE_DFX_NETWORK', mode);
			const expectedCanisterId = import.meta.env[`VITE_${mode.toUpperCase()}_BACKEND_CANISTER_ID`];

			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.MODE).toBe(mode);
			expect(appConst.BACKEND_CANISTER_ID).toBe(expectedCanisterId);
		});

		it.each(testEnvs)(
			'should resolve correctly for %s if there is no env variable set',
			async (mode) => {
				import.meta.env.VITE_STAGING_BACKEND_CANISTER_ID = 'staging-backend-canister-id';
				delete import.meta.env[`VITE_${mode.toUpperCase()}_BACKEND_CANISTER_ID`];
				vi.stubGlobal('VITE_DFX_NETWORK', mode);

				const appConst = await import('$lib/constants/app.constants');

				expect(appConst.MODE).toBe(mode);
				expect(appConst.BACKEND_CANISTER_ID).toBe('staging-backend-canister-id');
			}
		);
	});
});
