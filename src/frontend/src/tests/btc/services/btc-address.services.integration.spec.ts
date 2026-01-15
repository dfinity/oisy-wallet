import type { BitcoinNetwork } from '@icp-sdk/canisters/ckbtc';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

// These tests are done with real addresses from our test wallets
describe('btc-address.services integration', () => {
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

	describe('getBtcAddress', () => {
		describe('in mainnet', () => {
			const network: BitcoinNetwork = 'mainnet';

			const testCases = [
				// Test wallet 2774700
				{
					principal: 'oo32k-e35z2-7kq33-gsl4w-oqrbw-hil6w-ybnw5-7uy27-rbxta-e4cuh-jqe',
					expected: 'bc1q0zs8e2pk5z6hwlcafvwmv27chxlgen67lklf45',
					envs: prodEnvs
				},
				{
					principal: '4c4gf-nxcvu-igyqf-fquho-y3jeg-3b7ka-izqgr-6aczp-hgt5c-jmdti-oqe',
					expected: 'bc1q44r2nattvp03mvcw986848l3s8squ88477rusl',
					envs: stagingEnvs
				},

				// Test wallet 2663584
				{
					principal: 'v2smi-hhewl-kr7al-mrhkv-ubkqe-px4w7-c5qj7-vosjk-iwjkj-b55qg-5ae',
					expected: 'bc1q53c0j85fwe5rxwd6s0xwsyc9mc9qhm6pg56re5',
					envs: prodEnvs
				},
				{
					principal: 'ejrt7-mhyue-6oq2j-63k56-qvvae-3uep4-dh34y-zbtzw-7ulf6-2ohv7-dqe',
					expected: 'bc1q0uy4sck2mp6cqst5lcxvpc4yfhmu274jaguasr',
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

						vi.spyOn(addressEnv, 'FRONTEND_DERIVATION_ENABLED', 'get').mockImplementation(
							() => true
						);

						const constants = await import('$lib/constants/app.constants');
						const { getBtcAddress } = await import('$btc/services/btc-address.services');

						const check = checkEnv(constants);

						expect(check).toBeTruthy();

						await expect(getBtcAddress({ identity, network })).resolves.toBe(expected);

						vi.unstubAllGlobals();
						vi.unstubAllEnvs();
					}
				);
			});
		});

		describe('in testnet', () => {
			const network: BitcoinNetwork = 'testnet';

			const testCases = [
				// Test wallet 2774700
				{
					principal: 'oo32k-e35z2-7kq33-gsl4w-oqrbw-hil6w-ybnw5-7uy27-rbxta-e4cuh-jqe',
					expected: 'tb1q0zs8e2pk5z6hwlcafvwmv27chxlgen674sy6w8',
					envs: prodEnvs
				},
				{
					principal: '4c4gf-nxcvu-igyqf-fquho-y3jeg-3b7ka-izqgr-6aczp-hgt5c-jmdti-oqe',
					expected: 'tb1q44r2nattvp03mvcw986848l3s8squ8845cc0tv',
					envs: stagingEnvs
				},
				// Test wallet 2663584
				{
					principal: 'v2smi-hhewl-kr7al-mrhkv-ubkqe-px4w7-c5qj7-vosjk-iwjkj-b55qg-5ae',
					expected: 'tb1q53c0j85fwe5rxwd6s0xwsyc9mc9qhm6pzjpsz8',
					envs: prodEnvs
				},
				{
					principal: 'ejrt7-mhyue-6oq2j-63k56-qvvae-3uep4-dh34y-zbtzw-7ulf6-2ohv7-dqe',
					expected: 'tb1q0uy4sck2mp6cqst5lcxvpc4yfhmu274jhw8wts',
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

						vi.spyOn(addressEnv, 'FRONTEND_DERIVATION_ENABLED', 'get').mockImplementation(
							() => true
						);

						const constants = await import('$lib/constants/app.constants');
						const { getBtcAddress } = await import('$btc/services/btc-address.services');

						const check = checkEnv(constants);

						expect(check).toBeTruthy();

						await expect(getBtcAddress({ identity, network })).resolves.toBe(expected);

						vi.unstubAllGlobals();
						vi.unstubAllEnvs();
					}
				);
			});
		});
	});
});
