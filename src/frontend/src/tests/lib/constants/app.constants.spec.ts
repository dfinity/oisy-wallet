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

	const nonTestEnvs = ['staging', 'beta', 'ic'];

	const allEnvs = ['local', ...testEnvs, ...nonTestEnvs];

	const nonLocalEnvs = allEnvs.filter((env) => env !== 'local');

	beforeEach(() => {
		vi.clearAllMocks();
		vi.unstubAllGlobals();
		vi.resetModules();

		Object.assign(import.meta.env, {
			VITE_LOCAL_BACKEND_CANISTER_ID: 'local-backend-canister-id',
			VITE_TEST_FE_1_BACKEND_CANISTER_ID: 'test-fe-backend-canister-id',
			VITE_TEST_FE_2_BACKEND_CANISTER_ID: 'test-fe-2-backend-canister-id',
			VITE_TEST_FE_3_BACKEND_CANISTER_ID: 'test-fe-3-backend-canister-id',
			VITE_TEST_FE_4_BACKEND_CANISTER_ID: 'test-fe-backend-canister-id',
			VITE_TEST_FE_5_BACKEND_CANISTER_ID: 'test-fe-5-backend-canister-id',
			VITE_TEST_FE_6_BACKEND_CANISTER_ID: 'test-fe-6-backend-canister-id',
			VITE_E2E_BACKEND_CANISTER_ID: 'e2e-backend-canister-id',
			VITE_AUDIT_BACKEND_CANISTER_ID: 'audit-backend-canister-id',
			VITE_STAGING_BACKEND_CANISTER_ID: 'staging-backend-canister-id',
			VITE_BETA_BACKEND_CANISTER_ID: 'beta-backend-canister-id',
			VITE_IC_BACKEND_CANISTER_ID: 'ic-backend-canister-id',
			VITE_LOCAL_INTERNET_IDENTITY_CANISTER_ID: 'local-ii-id',
			VITE_LOCAL_POUH_ISSUER_CANISTER_ID: 'local-pouh-id',
			VITE_STAGING_POUH_ISSUER_CANISTER_ID: 'staging-pouh-id',
			VITE_BETA_POUH_ISSUER_CANISTER_ID: 'beta-pouh-id',
			VITE_IC_POUH_ISSUER_CANISTER_ID: 'ic-pouh-id',
			VITE_LOCAL_REWARDS_CANISTER_ID: 'local-rewards-id',
			VITE_STAGING_REWARDS_CANISTER_ID: 'staging-rewards-id',
			VITE_BETA_REWARDS_CANISTER_ID: 'beta-rewards-id',
			VITE_IC_REWARDS_CANISTER_ID: 'ic-rewards-id',
			VITE_LOCAL_SIGNER_CANISTER_ID: 'local-signer-id',
			VITE_STAGING_SIGNER_CANISTER_ID: 'staging-signer-id',
			VITE_BETA_SIGNER_CANISTER_ID: 'beta-signer-id',
			VITE_IC_SIGNER_CANISTER_ID: 'ic-signer-id',
			VITE_LOCAL_KONG_BACKEND_CANISTER_ID: 'local-kong-id',
			VITE_STAGING_KONG_BACKEND_CANISTER_ID: 'staging-kong-id',
			VITE_BETA_KONG_BACKEND_CANISTER_ID: 'beta-kong-id',
			VITE_IC_KONG_BACKEND_CANISTER_ID: 'ic-kong-id',
			VITE_LOCAL_ICP_SWAP_FACTORY_CANISTER_ID: 'local-icp-swap-id',
			VITE_STAGING_ICP_SWAP_FACTORY_CANISTER_ID: 'staging-icp-swap-id',
			VITE_BETA_ICP_SWAP_FACTORY_CANISTER_ID: 'beta-icp-swap-id',
			VITE_IC_ICP_SWAP_FACTORY_CANISTER_ID: 'ic-icp-swap-id',
			VITE_LOCAL_XTC_LEDGER_CANISTER_ID: 'local-xtc-id',
			VITE_STAGING_XTC_LEDGER_CANISTER_ID: 'staging-xtc-id',
			VITE_BETA_XTC_LEDGER_CANISTER_ID: 'beta-xtc-id',
			VITE_IC_XTC_LEDGER_CANISTER_ID: 'ic-xtc-id',
			VITE_LOCAL_SOL_RPC_CANISTER_ID: 'local-sol-rpc-id',
			VITE_STAGING_SOL_RPC_CANISTER_ID: 'staging-sol-rpc-id',
			VITE_BETA_SOL_RPC_CANISTER_ID: 'beta-sol-rpc-id',
			VITE_IC_SOL_RPC_CANISTER_ID: 'ic-sol-rpc-id'
		});
	});

	describe('REPLICA_HOST', () => {
		it('should use localhost on local', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'local');
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.REPLICA_HOST).toBe('http://localhost:4943/');
		});

		it.each(nonLocalEnvs)('should use production for %s', async (mode) => {
			vi.stubGlobal('VITE_DFX_NETWORK', mode);
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.REPLICA_HOST).toBe('https://icp-api.io');
		});

		it('should use production for unknown env', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'unknown');
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.REPLICA_HOST).toBe('https://icp-api.io');
		});
	});

	describe('INTERNET_IDENTITY_CANISTER_ID', () => {
		it('should resolve for local', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'local');
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.INTERNET_IDENTITY_CANISTER_ID).toBe('local-ii-id');
		});

		it.each(nonLocalEnvs)('should be undefined for %s', async (mode) => {
			vi.stubGlobal('VITE_DFX_NETWORK', mode);
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.INTERNET_IDENTITY_CANISTER_ID).toBeUndefined();
		});

		it('should be undefined for unknown env', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'unknown');
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.INTERNET_IDENTITY_CANISTER_ID).toBeUndefined();
		});
	});

	describe('INTERNET_IDENTITY_ORIGIN', () => {
		it('should be local origin if local', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'local');
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.INTERNET_IDENTITY_ORIGIN).toBe('http://local-ii-id.localhost:4943');
		});

		it.each(nonLocalEnvs)('should be production if %s', async (mode) => {
			vi.stubGlobal('VITE_DFX_NETWORK', mode);
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.INTERNET_IDENTITY_ORIGIN).toBe('https://identity.internetcomputer.org');
		});

		it('should be production if unknown env', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'unknown');
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.INTERNET_IDENTITY_ORIGIN).toBe('https://identity.internetcomputer.org');
		});
	});

	describe('POUH_ISSUER_CANISTER_ID', () => {
		it.each(['local', ...nonTestEnvs])('should resolve for %s', async (mode) => {
			vi.stubGlobal('VITE_DFX_NETWORK', mode);
			const appConst = await import('$lib/constants/app.constants');
			const expected = import.meta.env[`VITE_${mode.toUpperCase()}_POUH_ISSUER_CANISTER_ID`];

			expect(appConst.POUH_ISSUER_CANISTER_ID).toBe(expected);
		});

		it.each(testEnvs)('should resolve to staging canister for %s', async (mode) => {
			vi.stubGlobal('VITE_DFX_NETWORK', mode);
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.POUH_ISSUER_CANISTER_ID).toBe('staging-pouh-id');
		});

		it('should be undefined for unknown env', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'unknown');
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.POUH_ISSUER_CANISTER_ID).toBeUndefined();
		});
	});

	describe('POUH_ISSUER_ORIGIN', () => {
		it('should be undefined if unknown env', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'unknown');
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.POUH_ISSUER_ORIGIN).toBeUndefined();
		});

		it('should resolve to local origin if LOCAL', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'local');
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.POUH_ISSUER_ORIGIN).toBe(`http://local-pouh-id.localhost:4943`);
		});

		it('should resolve to staging subdomain if STAGING', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'staging');
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.POUH_ISSUER_ORIGIN).toContain('https://staging-pouh-id.');
		});

		it.each(['beta', 'ic'])('should resolve to fixed domain for %s', async (mode) => {
			vi.stubGlobal('VITE_DFX_NETWORK', mode);
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.POUH_ISSUER_ORIGIN).toBe('https://id.decideai.xyz');
		});

		it.each(testEnvs)('should resolve to staging subdomain for %s', async (mode) => {
			vi.stubGlobal('VITE_DFX_NETWORK', mode);
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.POUH_ISSUER_ORIGIN).toContain('https://staging-pouh-id.');
		});
	});

	describe('BACKEND_CANISTER_ID', () => {
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

		it('should resolve to production for unknown env', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'unknown');
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.BACKEND_CANISTER_ID).toBe('ic-backend-canister-id');
		});
	});

	describe.each([
		['REWARDS_CANISTER_ID', 'rewards-id'],
		['SIGNER_CANISTER_ID', 'signer-id'],
		['KONG_BACKEND_CANISTER_ID', 'kong-id'],
		['ICP_SWAP_FACTORY_CANISTER_ID', 'icp-swap-id'],
		['XTC_LEDGER_CANISTER_ID', 'xtc-id'],
		['SOL_RPC_CANISTER_ID', 'sol-rpc-id']
		// eslint-disable-next-line local-rules/prefer-object-params -- Visually more readable
	])('%s', (constName, baseId) => {
		it.each(['local', ...nonTestEnvs])('should resolve correctly for %s', async (mode) => {
			vi.stubGlobal('VITE_DFX_NETWORK', mode);
			const appConst = (await import('$lib/constants/app.constants')) as Record<string, unknown>;
			const expected = import.meta.env[`VITE_${mode.toUpperCase()}_${constName}`];

			expect(appConst[constName]).toBe(expected);
		});

		it.each(testEnvs)('should resolve to staging canister for %s', async (mode) => {
			vi.stubGlobal('VITE_DFX_NETWORK', mode);
			const appConst = (await import('$lib/constants/app.constants')) as Record<string, unknown>;

			expect(appConst[constName]).toBe(`staging-${baseId}`);
		});

		it('should resolve to production canister for unknown env', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'unknown');
			const appConst = (await import('$lib/constants/app.constants')) as Record<string, unknown>;

			expect(appConst[constName]).toBe(`ic-${baseId}`);
		});
	});

	describe('AUTH_DERIVATION_ORIGIN', () => {
		it('should resolve correctly for staging', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'staging');
			const appConst2 = await import('$lib/constants/app.constants');

			expect(appConst2.AUTH_DERIVATION_ORIGIN).toBe('https://tewsx-xaaaa-aaaad-aadia-cai.icp0.io');
		});

		it('should resolve correctly for beta', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'beta');
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.AUTH_DERIVATION_ORIGIN).toBe('https://oisy.com');
		});

		it.each(['local', 'ic'])('should be undefined for %s', async (mode) => {
			vi.stubGlobal('VITE_DFX_NETWORK', mode);
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.AUTH_DERIVATION_ORIGIN).toBeUndefined();
		});

		it.each(testEnvs)('should resolve to staging origin for %s', async (mode) => {
			vi.stubGlobal('VITE_DFX_NETWORK', mode);
			const appConst = await import('$lib/constants/app.constants');

			expect(appConst.AUTH_DERIVATION_ORIGIN).toBe('https://tewsx-xaaaa-aaaad-aadia-cai.icp0.io');
		});
	});
});
