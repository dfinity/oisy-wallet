import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// These tests are done with real addresses from our test wallets
describe('sol-address.services integration', () => {
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

	describe('getSolAddressMainnet', () => {
		const testCases = [
			// Test wallet 2774700
			{
				principal: 'oo32k-e35z2-7kq33-gsl4w-oqrbw-hil6w-ybnw5-7uy27-rbxta-e4cuh-jqe',
				expected: 'EAQ6MUJMEEd42u9xHZ8XHrwabG5NNVhndKnTgBzZcMtt',
				envs: prodEnvs
			},
			// Test wallet 2663584
			{
				principal: 'v2smi-hhewl-kr7al-mrhkv-ubkqe-px4w7-c5qj7-vosjk-iwjkj-b55qg-5ae',
				expected: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
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
			// Test wallet 2663584
			{
				principal: 'v2smi-hhewl-kr7al-mrhkv-ubkqe-px4w7-c5qj7-vosjk-iwjkj-b55qg-5ae',
				expected: 'Eu5eKbpDLECKyMQNhp9vnKXQVCJ7g6TGcConL5tHBggv',
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
