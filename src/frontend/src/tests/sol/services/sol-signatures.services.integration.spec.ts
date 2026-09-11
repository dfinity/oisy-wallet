import { ZERO } from '$lib/constants/app.constants';
import { last } from '$lib/utils/array.utils';
import { fetchSignatures, fetchTransactionDetailForSignature } from '$sol/api/solana.api';
import { loadSolNetworkBalances } from '$sol/services/sol-balances.services';
import { resolveSolSignatures } from '$sol/services/sol-resolve-signatures.services';
import { getSolSignatures } from '$sol/services/sol-signatures.services';
import { extractFeePayer } from '$sol/services/sol-transactions.services';
import { SolanaNetworks } from '$sol/types/network';
import type { SolSignaturesCursor, SolSignaturesPage } from '$sol/types/sol-api';
import type { SolRpcTransaction, SolSignature, SolTransactionUi } from '$sol/types/sol-transaction';
import { isSolNetBalanceChangeSol } from '$sol/utils/sol-net-changes.utils';
import {
	fixtureSolAddresses,
	fixtureSolAtaAddresses
} from '$tests/fixtures/solana/addresses.fixture';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { isNullish, nonNullish } from '@dfinity/utils';
import * as solProgramToken from '@solana-program/token';
import {
	signature,
	address as solAddress,
	type ProgramDerivedAddressBump,
	type Signature
} from '@solana/kit';

// Everything above the RPC boundary runs for real; only the boundary itself is served from
// recorded fixtures. That is what makes this a meaningful check of our parsing and mapping.
vi.mock('$sol/providers/sol-rpc.providers', async () => {
	const { mockSolanaHttpRpcFromFixtures } = await import('$tests/utils/sol-rpc-fixture.test-utils');

	return {
		solanaHttpRpc: mockSolanaHttpRpcFromFixtures,
		solanaWebSocketRpc: vi.fn()
	};
});

vi.mock('@solana-program/token', () => ({
	findAssociatedTokenPda: vi.fn()
}));

describe('sol-signatures.services integration', () => {
	describe('getSolSignatures', () => {
		const [wallet] = fixtureSolAddresses;

		const walletAtas = fixtureSolAtaAddresses.filter(({ address }) => address === wallet);

		const loadSourceHistory = async ({
			source,
			before
		}: {
			source: string;
			before?: string;
		}): Promise<SolSignature[]> => {
			const signatures = await fetchSignatures({
				wallet: solAddress(source),
				network: SolanaNetworks.mainnet,
				before: nonNullish(before) ? signature(before) : undefined,
				limit: 10
			});

			if (signatures.length === 0) {
				return signatures;
			}

			return [
				...signatures,
				...(await loadSourceHistory({ source, before: last(signatures)?.signature }))
			];
		};

		const pageToEnd = async (cursor?: SolSignaturesCursor): Promise<SolSignaturesPage[]> => {
			const page = await getSolSignatures({
				address: wallet,
				network: SolanaNetworks.mainnet,
				tokensList: walletAtas.map(({ token }) => token),
				limit: 10,
				cursor
			});

			return [page, ...(isNullish(page.cursor) ? [] : await pageToEnd(page.cursor))];
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(solProgramToken, 'findAssociatedTokenPda').mockImplementation(({ mint }) => {
				const { ataAddress } = walletAtas.find(({ token }) => token.address === mint) ?? {};

				return Promise.resolve([solAddress(ataAddress ?? ''), 123 as ProgramDerivedAddressBump]);
			});
		});

		it('should page to the union of the histories of the wallet and its token accounts, newest first, each signature once and tagged with its sources', async () => {
			const sources = [wallet, ...walletAtas.map(({ ataAddress }) => ataAddress)];

			const histories = await Promise.all(
				sources.map(async (source) => ({
					source,
					signatures: await loadSourceHistory({ source })
				}))
			);

			const expectedSources = histories.reduce<Record<string, string[]>>(
				(acc, { source, signatures }) =>
					signatures.reduce<Record<string, string[]>>(
						(inner, { signature: solSignature }) => ({
							...inner,
							[solSignature]: [...(inner[solSignature] ?? []), source]
						}),
						acc
					),
				{}
			);

			const pages = await pageToEnd();

			const returned = pages.flatMap(({ signatures }) => signatures);

			// The recorded histories hold 169 unique signatures, far more than one page.
			expect(Object.keys(expectedSources)).toHaveLength(169);
			expect(pages.length).toBeGreaterThan(1);

			expect(returned).toHaveLength(Object.keys(expectedSources).length);

			expect(
				returned.reduce<Record<string, string[]>>(
					(acc, { signature: solSignature, sources: returnedSources }) => ({
						...acc,
						[solSignature]: [...returnedSources].sort()
					}),
					{}
				)
			).toEqual(
				Object.fromEntries(
					Object.entries(expectedSources).map(([key, value]) => [key, [...value].sort()])
				)
			);

			returned.slice(1).forEach(({ slot }, i) => {
				expect(slot).toBeLessThanOrEqual(returned[i].slot);
			});
		}, 600000);
	});

	describe('balance reconciliation', () => {
		// The enabled tokens of a fixture wallet: the network worker loads all their balances at once.
		const walletTokens = (wallet: string) =>
			fixtureSolAtaAddresses.filter(({ address }) => address === wallet).map(({ token }) => token);

		// The history of one token, loaded the way its own page loads it: the pager over the token's
		// source only, and each page resolved into the wallet's records.
		const loadSourceTransactions = async ({
			wallet,
			source,
			tokens,
			cursor
		}: {
			wallet: string;
			source: string;
			tokens: ReturnType<typeof walletTokens>;
			cursor?: SolSignaturesCursor;
		}): Promise<SolTransactionUi[]> => {
			const page = await getSolSignatures({
				address: source,
				network: SolanaNetworks.mainnet,
				tokensList: [],
				limit: 10,
				cursor
			});

			const records = await resolveSolSignatures({
				address: wallet,
				network: SolanaNetworks.mainnet,
				tokens,
				signatures: page.signatures
			});

			const transactions = records.map(({ transaction }) => transaction);

			return isNullish(page.cursor)
				? transactions
				: [
						...transactions,
						...(await loadSourceTransactions({ wallet, source, tokens, cursor: page.cursor }))
					];
		};

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			vi.spyOn(solProgramToken, 'findAssociatedTokenPda').mockImplementation(({ owner, mint }) => {
				const { ataAddress } =
					fixtureSolAtaAddresses.find(
						({ address, token }) => address === owner && token.address === mint
					) ?? {};

				return Promise.resolve([solAddress(ataAddress ?? ''), 123 as ProgramDerivedAddressBump]);
			});
		});

		it.each(fixtureSolAddresses)(
			'should match the total SOL balance of an account (for example, %s)',
			async (address) => {
				const loadSignatures = async (lastSignature?: string): Promise<SolSignature[]> => {
					const wallet = solAddress(address);

					const beforeSignature = nonNullish(lastSignature) ? signature(lastSignature) : undefined;

					const signatures: SolSignature[] = await fetchSignatures({
						wallet,
						network: SolanaNetworks.mainnet,
						before: beforeSignature,
						limit: 10
					});

					if (signatures.length === 0) {
						return signatures;
					}

					const nextSignatures: SolSignature[] = await loadSignatures(last(signatures)?.signature);

					return [...signatures, ...nextSignatures];
				};

				const transactions = await loadSourceTransactions({
					wallet: address,
					source: address,
					tokens: []
				});

				const signatures = await loadSignatures();

				const totalFee = await signatures.reduce<Promise<bigint>>(async (acc, signature) => {
					const accTotalFee = await acc;

					const transactionDetail: SolRpcTransaction | null =
						await fetchTransactionDetailForSignature({
							signature,
							network: SolanaNetworks.mainnet
						});

					if (isNullish(transactionDetail)) {
						return acc;
					}

					const {
						transaction: {
							message: { accountKeys }
						},
						meta
					} = transactionDetail;

					const { fee } = meta ?? {};
					const { pubkey: feePayer } = extractFeePayer([...(accountKeys ?? [])]) ?? {};

					return accTotalFee + (feePayer === address ? (fee ?? ZERO) : ZERO);
				}, Promise.resolve(ZERO));

				// A record carries one `value`, the primary asset it moved, which for a swap is a token
				// rather than SOL. `netChanges` is the per-asset net the record is built from, so it is
				// what a balance reconciles against.
				const transactionSolBalance = transactions.reduce<bigint>(
					(acc, { netChanges }) =>
						acc + ((netChanges ?? []).find(isSolNetBalanceChangeSol)?.delta ?? ZERO),
					ZERO
				);

				const { sol: fetchedSolBalance } = await loadSolNetworkBalances({
					address,
					network: SolanaNetworks.mainnet,
					tokens: walletTokens(address)
				});

				expect(transactionSolBalance - totalFee).toBe(fetchedSolBalance);
			},
			600000
		);

		it.each(fixtureSolAtaAddresses)(
			'should match the total SPL balance of an account (for example, ATA address $ataAddress for token $token.symbol)',
			async ({ address, ataAddress, token }) => {
				const { address: tokenAddress } = token;

				const transactions = await loadSourceTransactions({
					wallet: address,
					source: ataAddress,
					tokens: [token]
				});

				const transactionBalance = transactions.reduce<bigint>(
					(acc, { netChanges }) =>
						acc +
						((netChanges ?? []).find(({ tokenAddress: mint }) => mint === tokenAddress)?.delta ??
							ZERO),
					ZERO
				);

				const { spl } = await loadSolNetworkBalances({
					address,
					network: SolanaNetworks.mainnet,
					tokens: walletTokens(address)
				});

				expect(transactionBalance).toBe(spl[tokenAddress]);
			},
			600000
		);
	});

	describe('fetchSignatures across the wallet and its token accounts', () => {
		const [walletAddress] = fixtureSolAddresses;

		const walletAtas = fixtureSolAtaAddresses.filter(({ address }) => address === walletAddress);

		const sourceAddresses = [walletAddress, ...walletAtas.map(({ ataAddress }) => ataAddress)];

		// A single address is walked by feeding the last signature of a page back as `before`, so
		// this is the reference history of one source.
		const loadFullHistory = async ({
			address,
			before
		}: {
			address: string;
			before?: Signature;
		}): Promise<SolSignature[]> => {
			const signatures = await fetchSignatures({
				wallet: solAddress(address),
				network: SolanaNetworks.mainnet,
				before,
				limit: 10
			});

			if (signatures.length === 0) {
				return signatures;
			}

			return [
				...signatures,
				...(await loadFullHistory({ address, before: last(signatures)?.signature }))
			];
		};

		// Sequential on purpose: recording against a public RPC is throttled.
		const loadAllHistories = async (): Promise<SolSignature[][]> =>
			await sourceAddresses.reduce<Promise<SolSignature[][]>>(
				async (acc, address) => [...(await acc), await loadFullHistory({ address })],
				Promise.resolve([])
			);

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(solProgramToken, 'findAssociatedTokenPda').mockImplementation(({ mint }) => {
				const ata = walletAtas.find(({ token: { address } }) => address === mint);

				if (isNullish(ata)) {
					throw new Error(`No fixture ATA for mint ${mint}`);
				}

				return Promise.resolve([solAddress(ata.ataAddress), 123 as ProgramDerivedAddressBump]);
			});
		});

		it('should answer `before` with a foreign signature by slot', async () => {
			const [walletHistory, ...ataHistories] = await loadAllHistories();

			const walletSignatures = new Set(walletHistory.map(({ signature }) => signature));
			const walletSlots = new Set(walletHistory.map(({ slot }) => slot));

			// A signature the wallet never saw, in a slot the wallet has nothing in, with wallet
			// history behind it: the only ordering the RPC can apply is the slot.
			const foreign = ataHistories
				.flat()
				.find(
					({ signature, slot }) =>
						!walletSignatures.has(signature) &&
						!walletSlots.has(slot) &&
						walletHistory.some(({ slot: walletSlot }) => walletSlot < slot)
				);

			assert(nonNullish(foreign));

			const signatures = await fetchSignatures({
				wallet: solAddress(walletAddress),
				network: SolanaNetworks.mainnet,
				before: foreign.signature,
				limit: 10
			});

			expect(signatures.map(({ signature }) => signature)).toEqual(
				walletHistory
					.filter(({ slot }) => slot < foreign.slot)
					.slice(0, 10)
					.map(({ signature }) => signature)
			);
		}, 600000);

		it('should find the same signature in more than one source', async () => {
			const histories = await loadAllHistories();

			const occurrences = histories
				.flat()
				.reduce<Map<string, number>>(
					(acc, { signature }) => acc.set(signature, (acc.get(signature) ?? 0) + 1),
					new Map()
				);

			const total = histories.reduce((acc, history) => acc + history.length, 0);

			expect([...occurrences.values()].some((count) => count >= 2)).toBeTruthy();

			// Pinned against the recorded fixtures: every signature past the unique count is a
			// transaction the per-token loaders fetch and parse more than once.
			expect({ total, unique: occurrences.size }).toStrictEqual({ total: 210, unique: 169 });
		}, 600000);
	});
});
