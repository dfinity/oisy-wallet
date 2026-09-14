import { last } from '$lib/utils/array.utils';
import { resolveSolSignatures } from '$sol/services/sol-resolve-signatures.services';
import { getSolSignatures, getSolTransactions } from '$sol/services/sol-signatures.services';
import { SolanaNetworks } from '$sol/types/network';
import type { SolSignaturesCursor } from '$sol/types/sol-api';
import type { SolResolvedTransaction, SolTransactionUi } from '$sol/types/sol-transaction';
import {
	fixtureSolAddresses,
	fixtureSolAtaAddresses
} from '$tests/fixtures/solana/addresses.fixture';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { isNullish } from '@dfinity/utils';
import * as solProgramToken from '@solana-program/token';
import { address as solAddress, type ProgramDerivedAddressBump } from '@solana/kit';

const { getTransactionCalls } = vi.hoisted(() => ({ getTransactionCalls: [] as string[] }));

// Everything above the RPC boundary runs for real; only the boundary itself is served from
// recorded fixtures, and every `getTransaction` that reaches it is counted.
vi.mock('$sol/providers/sol-rpc.providers', async () => {
	const { mockSolanaHttpRpcFromFixtures } = await import('$tests/utils/sol-rpc-fixture.test-utils');

	return {
		solanaHttpRpc: (network: Parameters<typeof mockSolanaHttpRpcFromFixtures>[0]) => {
			const rpc = mockSolanaHttpRpcFromFixtures(network);

			return new Proxy(rpc, {
				// The Proxy trap signature is fixed by the language.
				// eslint-disable-next-line local-rules/prefer-object-params
				get: (target, property, receiver) => {
					const method = Reflect.get(target, property, receiver);

					if (property !== 'getTransaction') {
						return method;
					}

					return (...params: [string, ...unknown[]]) => {
						getTransactionCalls.push(params[0]);

						return method(...params);
					};
				}
			});
		},
		solanaWebSocketRpc: vi.fn()
	};
});

vi.mock('@solana-program/token', () => ({
	findAssociatedTokenPda: vi.fn()
}));

describe('sol-resolve-signatures.services integration', () => {
	const [wallet] = fixtureSolAddresses;

	const walletAtas = fixtureSolAtaAddresses.filter(({ address }) => address === wallet);

	const tokens = walletAtas.map(({ token }) => token);

	const network = SolanaNetworks.mainnet;

	const limit = 10;

	// Pages the merged list to the end and resolves each page as it comes, as the loader will.
	const resolveToEnd = async ({
		cursor,
		known = new Set()
	}: {
		cursor?: SolSignaturesCursor;
		known?: Set<string>;
	} = {}): Promise<{ records: SolResolvedTransaction[]; signatures: string[] }> => {
		const page = await getSolSignatures({
			address: wallet,
			network,
			tokensList: tokens,
			limit,
			cursor
		});

		const records = await resolveSolSignatures({
			address: wallet,
			network,
			tokens,
			signatures: page.signatures,
			known
		});

		const signatures = page.signatures.map(({ signature }) => signature);

		if (isNullish(page.cursor)) {
			return { records, signatures };
		}

		const next = await resolveToEnd({
			cursor: page.cursor,
			known: new Set([...known, ...signatures])
		});

		return {
			records: [...records, ...next.records],
			signatures: [...signatures, ...next.signatures]
		};
	};

	// Today's per-token loader, paged to the end the way the token's worker and pager page it.
	const loadTokenHistory = async ({
		tokenAddress,
		tokenOwnerAddress,
		before
	}: {
		tokenAddress?: string;
		tokenOwnerAddress?: string;
		before?: string;
	}): Promise<SolTransactionUi[]> => {
		const transactions = await getSolTransactions({
			identity: mockIdentity,
			address: wallet,
			network,
			tokenAddress,
			tokenOwnerAddress,
			before,
			limit
		});

		if (transactions.length === 0) {
			return transactions;
		}

		return [
			...transactions,
			...(await loadTokenHistory({
				tokenAddress,
				tokenOwnerAddress,
				before: last(transactions)?.signature
			}))
		];
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		vi.spyOn(solProgramToken, 'findAssociatedTokenPda').mockImplementation(({ mint }) => {
			const { ataAddress } = walletAtas.find(({ token }) => token.address === mint) ?? {};

			return Promise.resolve([solAddress(ataAddress ?? ''), 123 as ProgramDerivedAddressBump]);
		});
	});

	it("should fetch each signature once and give every token the same history as today's per-token loader", async () => {
		const { records, signatures } = await resolveToEnd();

		const uniqueSignatures = new Set(signatures);

		// The recorded histories of the wallet and its token accounts hold 169 unique signatures.
		expect(uniqueSignatures.size).toBe(169);
		expect(signatures).toHaveLength(uniqueSignatures.size);

		// The detail cache of this file starts empty, so every signature reaches the RPC once, and
		// only once however many sources returned it.
		expect([...getTransactionCalls].sort()).toStrictEqual([...uniqueSignatures].sort());

		const recordSignatures = records.map(({ transaction: { signature } }) => signature);

		expect(recordSignatures).toHaveLength(new Set(recordSignatures).size);

		const sources = [
			{ source: wallet, tokenAddress: undefined, tokenOwnerAddress: undefined },
			...walletAtas.map(({ ataAddress, token: { address, owner } }) => ({
				source: ataAddress,
				tokenAddress: address,
				tokenOwnerAddress: owner
			}))
		];

		for (const { source, tokenAddress, tokenOwnerAddress } of sources) {
			const today = await loadTokenHistory({ tokenAddress, tokenOwnerAddress });

			const resolved = records
				.filter(({ sources: recordSources }) => recordSources.includes(source))
				.map(({ transaction: { signature } }) => signature);

			expect(resolved.length).toBeGreaterThan(0);

			expect({ source, signatures: [...new Set(resolved)].sort() }).toStrictEqual({
				source,
				signatures: [...new Set(today.map(({ signature }) => signature))].sort()
			});
		}
	}, 600000);
});
