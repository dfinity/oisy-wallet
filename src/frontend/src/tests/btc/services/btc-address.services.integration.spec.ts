import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { Principal } from '@dfinity/principal';

// These tests are done with real addresses from our test wallets
describe('btc-address.services integration', () => {
	type EnvCheck = (c: { PROD: boolean; BETA: boolean }) => boolean;
	const prodEnvs: ReadonlyArray<{ env: 'ic' | 'beta'; checkEnv: EnvCheck }> = [
		{ env: 'ic', checkEnv: (c) => c.PROD },
		{ env: 'beta', checkEnv: (c) => c.BETA }
	];

	beforeEach(() => {
		vi.clearAllMocks();

		vi.stubEnv('VITE_FRONTEND_DERIVATION_ENABLED', 'true');
	});

	afterEach(() => {
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
				// Test wallet 2663584
				{
					principal: 'v2smi-hhewl-kr7al-mrhkv-ubkqe-px4w7-c5qj7-vosjk-iwjkj-b55qg-5ae',
					expected: 'bc1q53c0j85fwe5rxwd6s0xwsyc9mc9qhm6pg56re5',
					envs: prodEnvs
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
				// Test wallet 2663584
				{
					principal: 'v2smi-hhewl-kr7al-mrhkv-ubkqe-px4w7-c5qj7-vosjk-iwjkj-b55qg-5ae',
					expected: 'tb1q53c0j85fwe5rxwd6s0xwsyc9mc9qhm6pzjpsz8',
					envs: prodEnvs
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
