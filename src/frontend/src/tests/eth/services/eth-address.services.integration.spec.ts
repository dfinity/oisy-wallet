import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// These tests are done with real addresses from our test wallets
describe('eth-address.services integration', () => {
	type EnvCheck = (c: {
		PROD: boolean;
		BETA: boolean;
		STAGING: boolean;
		TEST_FE: boolean;
		AUDIT: boolean;
	}) => boolean;
	type EnvName =
		| 'ic'
		| 'beta'
		| 'staging'
		| 'audit'
		| 'test_fe_any'
		| 'test_fe_1'
		| 'test_fe_2'
		| 'test_fe_3'
		| 'test_fe_4'
		| 'test_fe_5'
		| 'test_fe_6';
	const prodEnvs: ReadonlyArray<{ env: EnvName; checkEnv: EnvCheck }> = [
		{ env: 'ic', checkEnv: (c) => c.PROD },
		{ env: 'beta', checkEnv: (c) => c.BETA }
	];
	const stagingEnvs: ReadonlyArray<{ env: EnvName; checkEnv: EnvCheck }> = [
		{ env: 'staging', checkEnv: (c) => c.STAGING },
		{ env: 'audit', checkEnv: (c) => c.STAGING && c.AUDIT },
		{ env: 'test_fe_any', checkEnv: (c) => c.STAGING && c.TEST_FE },
		...Array.from({ length: 6 }, (_, i) => ({
			env: `test_fe_${i + 1}` as EnvName,
			checkEnv: ((c) => c.STAGING && c.TEST_FE) as EnvCheck
		}))
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	describe('getEthAddress', () => {
		const testCases = [
			// Test wallet 2774700
			{
				principal: 'oo32k-e35z2-7kq33-gsl4w-oqrbw-hil6w-ybnw5-7uy27-rbxta-e4cuh-jqe',
				expected: '0x377846fcb05a2aF0B27A3964D102967594Ad0112',
				envs: prodEnvs
			},
			{
				principal: '4c4gf-nxcvu-igyqf-fquho-y3jeg-3b7ka-izqgr-6aczp-hgt5c-jmdti-oqe',
				expected: '0xf2E508D5B8f44f08bD81c7d19e9f1f5277e31f95',
				envs: stagingEnvs
			},

			// Test wallet 2663584
			{
				principal: 'v2smi-hhewl-kr7al-mrhkv-ubkqe-px4w7-c5qj7-vosjk-iwjkj-b55qg-5ae',
				expected: '0x2Eb29A5553bBc0066bA3ce9Ad4e95C10ab040806',
				envs: prodEnvs
			},
			{
				principal: 'ejrt7-mhyue-6oq2j-63k56-qvvae-3uep4-dh34y-zbtzw-7ulf6-2ohv7-dqe',
				expected: '0x186Bac0e255EFC93A807b8a54a7BE91946909d51',
				envs: stagingEnvs
			}
		];

		describe.each(testCases)('for principal $principal', ({ principal, expected, envs }) => {
			const identity = {
				getPrincipal: () => Principal.fromText(principal)
			} as unknown as Identity;

			it.each(envs)(
				'should return the correct derived address in $env env',
				async ({ env, checkEnv }) => {
					vi.stubEnv('VITE_DFX_NETWORK', env);
					vi.stubGlobal('VITE_DFX_NETWORK', env);

					vi.resetModules();

					const addressEnv = await import('$env/address.env');

					vi.spyOn(addressEnv, 'FRONTEND_DERIVATION_ENABLED', 'get').mockImplementation(() => true);

					const constants = await import('$lib/constants/app.constants');
					const { getEthAddress } = await import('$eth/services/eth-address.services');

					const check = checkEnv(constants);

					expect(check).toBeTruthy();

					await expect(getEthAddress(identity)).resolves.toBe(expected);

					vi.unstubAllGlobals();
					vi.unstubAllEnvs();
				}
			);
		});
	});
});
