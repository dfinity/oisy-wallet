import { mockIdentity } from '$tests/mocks/identity.mock';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { getAddressDecoder } from '@solana/kit';

// These tests are done with real addresses from our test wallets.
//
// XRP is not deployed yet, so unlike Solana there is no on-chain history to read
// a golden address from. The pinned addresses below are therefore anchored on the
// signer result that already exists in the repository for the very same wallets:
// `deriveXrpAddress` and `deriveSolAddress` are the same derivation (same signer
// canister namespace, same `0xfe` schema byte, same principal encoding, same
// ed25519 master key) and differ only in the derivation path passed by the caller.
// Each wallet is therefore checked twice: once against its pinned XRPL classic
// address, and once against the signer-obtained Solana address from
// `sol-address.services.integration.spec.ts`, by feeding the Solana path through
// the XRP derivation. The second assertion is what makes the first non-circular —
// a wrong schema byte, namespace, principal encoding or master key breaks it.
//
// The classic-address encoding itself (`0xED` prefix, RIPEMD160(SHA256(·)),
// base58check) is pinned separately against the authoritative XRPL test vector in
// `xrp-address.utils.spec.ts`.
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
				expected: 'rJkHLRqmFWoMGPsBdP8ZPMK8PR7GtbxTWi',
				expectedSol: 'EAQ6MUJMEEd42u9xHZ8XHrwabG5NNVhndKnTgBzZcMtt',
				envs: prodEnvs
			},
			{
				principal: '4c4gf-nxcvu-igyqf-fquho-y3jeg-3b7ka-izqgr-6aczp-hgt5c-jmdti-oqe',
				expected: 'rETD6N4kWuW9tDE6ewyzZsXw2uqzDAPQwg',
				expectedSol: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				envs: stagingEnvs
			},

			// Test wallet 2663584
			{
				principal: 'v2smi-hhewl-kr7al-mrhkv-ubkqe-px4w7-c5qj7-vosjk-iwjkj-b55qg-5ae',
				expected: 'rBNLHADLTBV5WqQ8rDyLaTrGXMxrjfzoMi',
				expectedSol: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
				envs: prodEnvs
			},
			{
				principal: 'ejrt7-mhyue-6oq2j-63k56-qvvae-3uep4-dh34y-zbtzw-7ulf6-2ohv7-dqe',
				expected: 'rLWZvEEtQcoik1N1ps7Lab7XZt5oG4Yn5b',
				expectedSol: 'GZvi7ndzTYkTrbvfiwfz9ZequdCMacHCzCtadruT3e5f',
				envs: stagingEnvs
			}
		];

		describe.each(testCases)(
			'for principal $principal',
			({ principal, expected, expectedSol, envs }) => {
				// Spread from the shared mock, which is already an `Identity`, so overriding the one
				// member this test varies keeps the whole thing typed.
				const identity: Identity = {
					...mockIdentity,
					getPrincipal: () => Principal.fromText(principal)
				};

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
						const { getXrpAddressMainnet } = await import('$xrp/services/xrp-address.services');

						const check = checkEnv(constants);

						expect(check).toBeTruthy();

						await expect(getXrpAddressMainnet(identity)).resolves.toBe(expected);

						vi.unstubAllGlobals();
						vi.unstubAllEnvs();
					}
				);

				it.each(envs)(
					'should reproduce the signer-obtained Solana address through the XRP derivation in $env env',
					async ({ env, checkEnv }) => {
						vi.stubEnv('VITE_DFX_NETWORK', env);
						vi.stubGlobal('VITE_DFX_NETWORK', env);

						vi.resetModules();

						const constants = await import('$lib/constants/app.constants');
						const { SIGNER_MASTER_PUB_KEY } = await import('$lib/constants/signer.constants');
						const { deriveXrpAddress } = await import('$lib/ic-pub-key/src/cli');

						const check = checkEnv(constants);

						expect(check).toBeTruthy();
						expect(SIGNER_MASTER_PUB_KEY).not.toBeUndefined();

						const publicKey = deriveXrpAddress({
							user: principal,
							derivationPath: ['SOL', 'mainnet'],
							pubkey: SIGNER_MASTER_PUB_KEY?.schnorr.ed25519.pubkey ?? ''
						});

						expect(getAddressDecoder().decode(Uint8Array.from(Buffer.from(publicKey, 'hex')))).toBe(
							expectedSol
						);

						vi.unstubAllGlobals();
						vi.unstubAllEnvs();
					}
				);
			}
		);
	});
});
