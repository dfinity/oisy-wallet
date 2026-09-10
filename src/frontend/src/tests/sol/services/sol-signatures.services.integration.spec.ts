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
import type { SolSignaturesCursor, SolSignaturesPage } from '$sol/types/sol-api';
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
import { signature, address as solAddress, type ProgramDerivedAddressBump } from '@solana/kit';

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
});
