import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// These tests are done with real addresses from out test wallets
describe('eth-address.services integration', () => {
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

	describe('getEthAddress', () => {
		const testCases = [
			// Test wallet 2774700
			{
				principal: 'oo32k-e35z2-7kq33-gsl4w-oqrbw-hil6w-ybnw5-7uy27-rbxta-e4cuh-jqe',
				expected: '0x377846fcb05a2aF0B27A3964D102967594Ad0112',
				envs: prodEnvs
			},
			// Test wallet 2663584
			{
				principal: 'v2smi-hhewl-kr7al-mrhkv-ubkqe-px4w7-c5qj7-vosjk-iwjkj-b55qg-5ae',
				expected: '0x2Eb29A5553bBc0066bA3ce9Ad4e95C10ab040806',
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
