import { ZERO } from '$lib/constants/app.constants';
import * as solanaApi from '$sol/api/solana.api';
import { loadSolNetworkBalances } from '$sol/services/sol-balances.services';
import { SolanaNetworks } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';
import {
	fixtureSolAddresses,
	fixtureSolAtaAddresses
} from '$tests/fixtures/solana/addresses.fixture';
import { mockSolanaHttpRpcFromFixtures } from '$tests/utils/sol-rpc-fixture.test-utils';
import { address as solAddress } from '@solana/kit';

// Everything above the RPC boundary runs for real, ATA derivation included; only the boundary is
// served from recorded fixtures.
vi.mock('$sol/providers/sol-rpc.providers', async () => {
	const { mockSolanaHttpRpcFromFixtures } = await import('$tests/utils/sol-rpc-fixture.test-utils');

	return {
		solanaHttpRpc: mockSolanaHttpRpcFromFixtures,
		solanaWebSocketRpc: vi.fn()
	};
});

describe('sol-balances.services integration', () => {
	describe('loadSolNetworkBalances', () => {
		const network = SolanaNetworks.mainnet;

		const [wallet] = fixtureSolAddresses;

		const walletAtas = fixtureSolAtaAddresses.filter(({ address }) => address === wallet);

		const tokens = walletAtas.map(({ token: { address, owner } }) => ({ address, owner }));

		const addresses = [wallet, ...walletAtas.map(({ ataAddress }) => ataAddress)];

		beforeAll(() => {
			// jsdom does not flag itself as a secure context, which `@solana/kit` requires before it
			// derives a program address with WebCrypto.
			vi.stubGlobal('isSecureContext', true);
		});

		beforeEach(() => {
			vi.clearAllMocks();
		});

		afterAll(() => {
			vi.unstubAllGlobals();
		});

		it('should ask for the wallet and the ATA of every token in one call', async () => {
			const spy = vi.spyOn(solanaApi, 'getMultipleAccountsInfo');

			await loadSolNetworkBalances({ address: wallet, network, tokens });

			expect(spy).toHaveBeenCalledExactlyOnceWith({ addresses, network });
		});

		// The balance fixtures of the other specs were recorded at another time, so the expectation
		// is read from this recording itself: it checks the parsing, not the chain state.
		it('should read every balance from the recorded accounts', async () => {
			const { value } = await mockSolanaHttpRpcFromFixtures(network)
				.getMultipleAccounts(addresses.map(solAddress), { encoding: 'jsonParsed' })
				.send();

			const [walletAccount, ...ataAccounts] = value;

			const expectedSpl = tokens.reduce<Record<SplTokenAddress, bigint>>(
				(acc, { address }, index) => {
					const data = ataAccounts[index]?.data;

					const amount =
						data !== undefined && 'parsed' in data
							? (data.parsed.info as { tokenAmount: { amount: string } }).tokenAmount.amount
							: undefined;

					acc[address] = amount === undefined ? ZERO : BigInt(amount);

					return acc;
				},
				{}
			);

			await expect(
				loadSolNetworkBalances({ address: wallet, network, tokens })
			).resolves.toStrictEqual({
				sol: walletAccount === null ? ZERO : BigInt(walletAccount.lamports),
				spl: expectedSpl
			});
		});
	});
});
