import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

// These tests exercise the real frontend master-key derivation branch
// (FRONTEND_DERIVATION_ENABLED), which the unit tests bypass by mocking the
// signer. Unlike Solana, XRP is mainnet-only and not yet deployed, so no
// independently-known on-chain address exists for these wallets to pin as a
// golden value; we therefore assert the derivation yields a valid, stable
// XRPL classic address for known principals across the prod and staging envs.
describe('xrp-address.services integration', () => {
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

	describe('getXrpAddressMainnet', () => {
		const testCases = [
			// Test wallet 2774700
			{
				principal: 'oo32k-e35z2-7kq33-gsl4w-oqrbw-hil6w-ybnw5-7uy27-rbxta-e4cuh-jqe',
				envs: prodEnvs
			},
			{
				principal: '4c4gf-nxcvu-igyqf-fquho-y3jeg-3b7ka-izqgr-6aczp-hgt5c-jmdti-oqe',
				envs: stagingEnvs
			},

			// Test wallet 2663584
			{
				principal: 'v2smi-hhewl-kr7al-mrhkv-ubkqe-px4w7-c5qj7-vosjk-iwjkj-b55qg-5ae',
				envs: prodEnvs
			},
			{
				principal: 'ejrt7-mhyue-6oq2j-63k56-qvvae-3uep4-dh34y-zbtzw-7ulf6-2ohv7-dqe',
				envs: stagingEnvs
			}
		];

		describe.each(testCases)('for principal $principal', ({ principal, envs }) => {
			const identity = {
				getPrincipal: () => Principal.fromText(principal)
			} as unknown as Identity;

			it.each(envs)(
				'derives a valid, deterministic XRPL classic address in $env env',
				async ({ env, checkEnv }) => {
					vi.stubEnv('VITE_DFX_NETWORK', env);
					vi.stubGlobal('VITE_DFX_NETWORK', env);

					vi.resetModules();

					const addressEnv = await import('$env/address.env');

					vi.spyOn(addressEnv, 'FRONTEND_DERIVATION_ENABLED', 'get').mockImplementation(() => true);

					const constants = await import('$lib/constants/app.constants');
					const { getXrpAddressMainnet } = await import('$xrp/services/xrp-address.services');
					const { isXrpAddress } = await import('$xrp/utils/xrp-address.utils');

					const check = checkEnv(constants);

					expect(check).toBeTruthy();

					const address = await getXrpAddressMainnet(identity);

					// The derivation ran through the local master-key path, not the signer.
					expect(isXrpAddress(address)).toBeTruthy();

					// The derivation is pure in (principal, env, master key): a second call
					// must return the exact same address.
					await expect(getXrpAddressMainnet(identity)).resolves.toBe(address);

					vi.unstubAllGlobals();
					vi.unstubAllEnvs();
				}
			);
		});

		it('derives distinct addresses for distinct principals in the same env', async () => {
			vi.stubEnv('VITE_DFX_NETWORK', 'staging');
			vi.stubGlobal('VITE_DFX_NETWORK', 'staging');

			vi.resetModules();

			const addressEnv = await import('$env/address.env');

			vi.spyOn(addressEnv, 'FRONTEND_DERIVATION_ENABLED', 'get').mockImplementation(() => true);

			const { getXrpAddressMainnet } = await import('$xrp/services/xrp-address.services');

			const addressA = await getXrpAddressMainnet({
				getPrincipal: () =>
					Principal.fromText('4c4gf-nxcvu-igyqf-fquho-y3jeg-3b7ka-izqgr-6aczp-hgt5c-jmdti-oqe')
			} as unknown as Identity);
			const addressB = await getXrpAddressMainnet({
				getPrincipal: () =>
					Principal.fromText('ejrt7-mhyue-6oq2j-63k56-qvvae-3uep4-dh34y-zbtzw-7ulf6-2ohv7-dqe')
			} as unknown as Identity);

			expect(addressA).not.toBe(addressB);

			vi.unstubAllGlobals();
			vi.unstubAllEnvs();
		});
	});
});
