import { last } from '$lib/utils/array.utils';
import { fetchSignatures } from '$sol/api/solana.api';
import { resolveSolSignatures } from '$sol/services/sol-resolve-signatures.services';
import { getSolSignatures } from '$sol/services/sol-signatures.services';
import { fetchSolTransactionsForSignature } from '$sol/services/sol-transactions.services';
import { SolanaNetworks } from '$sol/types/network';
import type { SolSignaturesCursor } from '$sol/types/sol-api';
import type { SolResolvedTransaction, SolTransactionUi } from '$sol/types/sol-transaction';
import {
	fixtureSolAddresses,
	fixtureSolAtaAddresses
} from '$tests/fixtures/solana/addresses.fixture';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { isNullish, nonNullish } from '@dfinity/utils';
import * as solProgramToken from '@solana-program/token';
import { signature, address as solAddress, type ProgramDerivedAddressBump } from '@solana/kit';

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

	// The per-token loader the network loader replaced: one source paged to the end on its own, and
	// each of its signatures derived with that source as the only token account of the user.
	const loadTokenHistory = async ({
		source,
		before
	}: {
		source: string;
		before?: string;
	}): Promise<SolTransactionUi[]> => {
		const signatures = await fetchSignatures({
			wallet: solAddress(source),
			network,
			before: nonNullish(before) ? signature(before) : undefined,
			limit
		});

		if (signatures.length === 0) {
			return [];
		}

		const transactions = await Promise.all(
			signatures.map((solSignature) =>
				fetchSolTransactionsForSignature({
					signature: solSignature,
					network,
					address: wallet,
					ownedTokenAccounts: source === wallet ? [] : [source]
				})
			)
		);

		return [
			...transactions.flat(),
			...(await loadTokenHistory({ source, before: last(signatures)?.signature }))
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

		const sources = [wallet, ...walletAtas.map(({ ataAddress }) => ataAddress)];

		for (const source of sources) {
			const today = await loadTokenHistory({ source });

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
