import { ZERO } from '$lib/constants/app.constants';
import { last } from '$lib/utils/array.utils';
import {
	fetchSignatures,
	fetchTransactionDetailForSignature,
	loadSolLamportsBalance,
	loadTokenBalance
} from '$sol/api/solana.api';
import { getSolSignatures, getSolTransactions } from '$sol/services/sol-signatures.services';
import { extractFeePayer } from '$sol/services/sol-transactions.services';
import { SolanaNetworks } from '$sol/types/network';
import type { SolRpcTransaction, SolSignature, SolTransactionUi } from '$sol/types/sol-transaction';
import { isSolNetBalanceChangeSol } from '$sol/utils/sol-net-changes.utils';
import {
	fixtureSolAddresses,
	fixtureSolAtaAddresses
} from '$tests/fixtures/solana/addresses.fixture';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
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
	describe('getSolTransactions', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();
		});

		it.each(fixtureSolAddresses)(
			'should match the total SOL balance of an account (for example, %s)',
			async (address) => {
				const loadTransactions = async (lastSignature?: string): Promise<SolTransactionUi[]> => {
					const transactions = await getSolTransactions({
						identity: mockIdentity,
						address,
						network: SolanaNetworks.mainnet,
						before: lastSignature,
						limit: 10
					});

					if (transactions.length === 0) {
						return transactions;
					}

					const nextTransactions: SolTransactionUi[] = await loadTransactions(
						last(transactions)?.signature
					);

					return [...transactions, ...nextTransactions];
				};

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

				const transactions = await loadTransactions();

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

				const fetchedSolBalance = await loadSolLamportsBalance({
					address,
					network: SolanaNetworks.mainnet
				});

				expect(transactionSolBalance - totalFee).toBe(fetchedSolBalance);
			},
			600000
		);

		it.each(fixtureSolAtaAddresses)(
			'should match the total SPL balance of an account (for example, ATA address $ataAddress for token $token.symbol)',
			async ({
				address,
				ataAddress,
				token: { address: tokenAddress, owner: tokenOwnerAddress }
			}) => {
				vi.spyOn(solProgramToken, 'findAssociatedTokenPda').mockResolvedValue([
					solAddress(ataAddress),
					123 as ProgramDerivedAddressBump
				]);

				const loadTransactions = async (lastSignature?: string): Promise<SolTransactionUi[]> => {
					const transactions = await getSolTransactions({
						identity: mockIdentity,
						address,
						network: SolanaNetworks.mainnet,
						tokenAddress,
						tokenOwnerAddress,
						before: lastSignature,
						limit: 10
					});

					if (transactions.length === 0) {
						return transactions;
					}

					const nextTransactions: SolTransactionUi[] = await loadTransactions(
						last(transactions)?.signature
					);

					return [...transactions, ...nextTransactions];
				};

				const transactions = await loadTransactions();

				const transactionBalance = transactions.reduce<bigint>(
					(acc, { netChanges }) =>
						acc +
						((netChanges ?? []).find(({ tokenAddress: mint }) => mint === tokenAddress)?.delta ??
							ZERO),
					ZERO
				);

				const fetchedBalance = await loadTokenBalance({
					ataAddress,
					network: SolanaNetworks.mainnet
				});

				expect(transactionBalance).toBe(fetchedBalance);
			},
			600000
		);
	});

	describe('getSolSignatures', () => {
		const [walletAddress] = fixtureSolAddresses;

		const walletAtas = fixtureSolAtaAddresses.filter(({ address }) => address === walletAddress);

		const tokensList = walletAtas.map(({ token: { address, owner } }) => ({ address, owner }));

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

		// The merged page is not sorted, so its last element says nothing about age. The slot does.
		const oldestBySlot = (signatures: SolSignature[]): SolSignature | undefined =>
			signatures.reduce<SolSignature | undefined>(
				(oldest, current) => (isNullish(oldest) || current.slot <= oldest.slot ? current : oldest),
				undefined
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

		// Defect: every source gets the same `before` and `limit` and the union comes back uncut, so
		// the oldest signature of a page skips whatever the denser sources had between it and their
		// own tenth signature.
		it.fails(
			'should cover the full history of the wallet and its ATAs when paging the merged signatures',
			async () => {
				const loadMerged = async (before?: string): Promise<SolSignature[]> => {
					const page = await getSolSignatures({
						address: walletAddress,
						network: SolanaNetworks.mainnet,
						tokensList,
						before,
						limit: 10
					});

					if (page.length === 0) {
						return page;
					}

					return [...page, ...(await loadMerged(oldestBySlot(page)?.signature))];
				};

				const merged = new Set((await loadMerged()).map(({ signature }) => signature));

				const expected = new Set(
					(await loadAllHistories()).flat().map(({ signature }) => signature)
				);

				expect([...expected].filter((signature) => !merged.has(signature))).toEqual([]);
				expect(merged).toEqual(expected);
			},
			600000
		);

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
