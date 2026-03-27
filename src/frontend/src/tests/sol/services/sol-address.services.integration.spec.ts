import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

// These tests are done with real addresses from our test wallets
describe('sol-address.services integration', () => {
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

	describe('getSolAddressMainnet', () => {
		const testCases = [
			// Test wallet 2774700
			{
				principal: 'oo32k-e35z2-7kq33-gsl4w-oqrbw-hil6w-ybnw5-7uy27-rbxta-e4cuh-jqe',
				expected: 'EAQ6MUJMEEd42u9xHZ8XHrwabG5NNVhndKnTgBzZcMtt',
				envs: prodEnvs
			},
			{
				principal: '4c4gf-nxcvu-igyqf-fquho-y3jeg-3b7ka-izqgr-6aczp-hgt5c-jmdti-oqe',
				expected: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				envs: stagingEnvs
			},

			// Test wallet 2663584
			{
				principal: 'v2smi-hhewl-kr7al-mrhkv-ubkqe-px4w7-c5qj7-vosjk-iwjkj-b55qg-5ae',
				expected: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
				envs: prodEnvs
			},
			{
				principal: 'ejrt7-mhyue-6oq2j-63k56-qvvae-3uep4-dh34y-zbtzw-7ulf6-2ohv7-dqe',
				expected: 'GZvi7ndzTYkTrbvfiwfz9ZequdCMacHCzCtadruT3e5f',
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
					const { getSolAddressMainnet } = await import('$sol/services/sol-address.services');

					const check = checkEnv(constants);

					expect(check).toBeTruthy();

					await expect(getSolAddressMainnet(identity)).resolves.toBe(expected);

					vi.unstubAllGlobals();
					vi.unstubAllEnvs();
				}
			);
		});
	});

	describe('getSolAddressDevnet', () => {
		const testCases = [
			// Test wallet 2774700
			{
				principal: 'oo32k-e35z2-7kq33-gsl4w-oqrbw-hil6w-ybnw5-7uy27-rbxta-e4cuh-jqe',
				expected: 'DB4V37NFELrskG2f2EHBHknr5H7wyhG8jaEkQoX3J2ou',
				envs: prodEnvs
			},
			{
				principal: '4c4gf-nxcvu-igyqf-fquho-y3jeg-3b7ka-izqgr-6aczp-hgt5c-jmdti-oqe',
				expected: '62YzGX3LnBfMvwvHyJyWGUtMu5mKgpEUpFLsyjEPAWqH',
				envs: stagingEnvs
			},
			// Test wallet 2663584
			{
				principal: 'v2smi-hhewl-kr7al-mrhkv-ubkqe-px4w7-c5qj7-vosjk-iwjkj-b55qg-5ae',
				expected: 'Eu5eKbpDLECKyMQNhp9vnKXQVCJ7g6TGcConL5tHBggv',
				envs: prodEnvs
			},
			{
				principal: 'ejrt7-mhyue-6oq2j-63k56-qvvae-3uep4-dh34y-zbtzw-7ulf6-2ohv7-dqe',
				expected: '2JXM15J4bQWs3D1XYpNyozB3GS87cgxXDFPrYpLsozGd',
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
					const { getSolAddressDevnet } = await import('$sol/services/sol-address.services');

					const check = checkEnv(constants);

					expect(check).toBeTruthy();

					await expect(getSolAddressDevnet(identity)).resolves.toBe(expected);

					vi.unstubAllGlobals();
					vi.unstubAllEnvs();
				}
			);
		});
	});
});
