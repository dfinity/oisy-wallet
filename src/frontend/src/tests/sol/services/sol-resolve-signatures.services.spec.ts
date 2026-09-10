import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { SPYX_TOKEN } from '$env/tokens/tokens-spl/tokens.spyx.env';
import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import {
	SOLANA_TRANSACTION_DETAIL_CONCURRENCY,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import {
	mapSolSourcesToTokens,
	resolveSolSignatures
} from '$sol/services/sol-resolve-signatures.services';
import * as solTransactionsServices from '$sol/services/sol-transactions.services';
import type { SolAddress } from '$sol/types/address';
import { SolanaNetworks } from '$sol/types/network';
import type { SolSignatureWithSources, SolTransactionUi } from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import { createMockSolTransactionUi } from '$tests/mocks/sol-transactions.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockAtaAddress3,
	mockSolAddress
} from '$tests/mocks/sol.mock';
import * as solProgramToken from '@solana-program/token';
import { address, type Address } from '@solana/kit';
import type { MockInstance } from 'vitest';

vi.mock('@solana-program/token', () => ({
	findAssociatedTokenPda: vi.fn()
}));

describe('sol-resolve-signatures.services', () => {
	const network = SolanaNetworks.mainnet;

	const tokens = [BONK_TOKEN, USDC_TOKEN, SPYX_TOKEN];

	const ataAddresses: Record<SplTokenAddress, SolAddress> = {
		[BONK_TOKEN.address]: mockAtaAddress,
		[USDC_TOKEN.address]: mockAtaAddress2,
		[SPYX_TOKEN.address]: mockAtaAddress3
	};

	const walletSource = mockSolAddress;
	const bonkSource = ataAddresses[BONK_TOKEN.address];
	const usdcSource = ataAddresses[USDC_TOKEN.address];
	const spyxSource = ataAddresses[SPYX_TOKEN.address];

	let spyFindAssociatedTokenPda: MockInstance;
	let spyFetchSolTransactionsForSignature: MockInstance;

	const withSources = (sources: SolAddress[]): SolSignatureWithSources => ({
		...mockSolSignatureResponse(),
		sources
	});

	const recordFor = ({ signature }: SolSignatureWithSources): SolTransactionUi => ({
		...createMockSolTransactionUi(signature),
		id: signature,
		signature
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();

		spyFindAssociatedTokenPda = vi.spyOn(solProgramToken, 'findAssociatedTokenPda');
		spyFindAssociatedTokenPda.mockImplementation(({ mint }: { mint: Address }) =>
			Promise.resolve([address(ataAddresses[mint.toString()])])
		);

		spyFetchSolTransactionsForSignature = vi.spyOn(
			solTransactionsServices,
			'fetchSolTransactionsForSignature'
		);
		spyFetchSolTransactionsForSignature.mockImplementation(
			({ signature }: { signature: SolSignatureWithSources }) =>
				Promise.resolve([recordFor(signature)])
		);
	});

	describe('mapSolSourcesToTokens', () => {
		it('should map the wallet to native SOL and each associated token account to its mint', async () => {
			const result = await mapSolSourcesToTokens({ address: mockSolAddress, tokens });

			expect(result).toStrictEqual(
				new Map<SolAddress, SplTokenAddress | null>([
					[walletSource, null],
					[bonkSource, BONK_TOKEN.address],
					[usdcSource, USDC_TOKEN.address],
					[spyxSource, SPYX_TOKEN.address]
				])
			);
		});

		it('should derive each account with the program of its token, Token-2022 included', async () => {
			await mapSolSourcesToTokens({ address: mockSolAddress, tokens });

			expect(spyFindAssociatedTokenPda).toHaveBeenCalledTimes(tokens.length);

			expect(spyFindAssociatedTokenPda).toHaveBeenCalledWith({
				owner: address(mockSolAddress),
				tokenProgram: address(TOKEN_PROGRAM_ADDRESS),
				mint: address(BONK_TOKEN.address)
			});

			expect(spyFindAssociatedTokenPda).toHaveBeenCalledWith({
				owner: address(mockSolAddress),
				tokenProgram: address(TOKEN_2022_PROGRAM_ADDRESS),
				mint: address(SPYX_TOKEN.address)
			});
		});

		it('should map only the wallet when there are no tokens', async () => {
			await expect(mapSolSourcesToTokens({ address: mockSolAddress, tokens: [] })).resolves.toStrictEqual(
				new Map([[walletSource, null]])
			);

			expect(spyFindAssociatedTokenPda).not.toHaveBeenCalled();
		});
	});

	describe('resolveSolSignatures', () => {
		const resolve = (params: {
			signatures: SolSignatureWithSources[];
			known?: ReadonlySet<string>;
		}) => resolveSolSignatures({ address: mockSolAddress, network, tokens, ...params });

		it('should fetch and derive a signature returned by several sources once', async () => {
			const swap = withSources([walletSource, bonkSource, usdcSource]);

			const result = await resolve({ signatures: [swap] });

			expect(spyFetchSolTransactionsForSignature).toHaveBeenCalledExactlyOnceWith({
				signature: swap,
				network,
				address: mockSolAddress,
				ownedTokenAccounts: [bonkSource, usdcSource, spyxSource]
			});

			expect(result).toStrictEqual([
				{ transaction: recordFor(swap), sources: [walletSource, bonkSource, usdcSource] }
			]);
		});

		it('should fetch a signature listed twice once, with the sources of both entries', async () => {
			const first = withSources([walletSource]);
			const again = { ...first, sources: [bonkSource] };

			const result = await resolve({ signatures: [first, again] });

			expect(spyFetchSolTransactionsForSignature).toHaveBeenCalledOnce();

			expect(result).toStrictEqual([
				{ transaction: recordFor(first), sources: [walletSource, bonkSource] }
			]);
		});

		it('should never fetch a signature already known', async () => {
			const held = withSources([walletSource]);
			const fresh = withSources([usdcSource]);

			const result = await resolve({ signatures: [held, fresh], known: new Set([held.signature]) });

			expect(spyFetchSolTransactionsForSignature).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ signature: fresh })
			);

			expect(result).toStrictEqual([{ transaction: recordFor(fresh), sources: [usdcSource] }]);
		});

		it('should not derive any account when every signature is known', async () => {
			const held = withSources([walletSource]);

			await expect(
				resolve({ signatures: [held], known: new Set([held.signature]) })
			).resolves.toStrictEqual([]);

			expect(spyFetchSolTransactionsForSignature).not.toHaveBeenCalled();
			expect(spyFindAssociatedTokenPda).not.toHaveBeenCalled();
		});

		it('should return nothing for an empty page', async () => {
			await expect(resolve({ signatures: [] })).resolves.toStrictEqual([]);

			expect(spyFetchSolTransactionsForSignature).not.toHaveBeenCalled();
		});

		it("should keep the page's order and pass each signature's sources through unchanged", async () => {
			const signatures = [
				withSources([walletSource]),
				withSources([bonkSource, walletSource]),
				withSources([spyxSource]),
				withSources([usdcSource, bonkSource])
			];

			// The newest signature is the slowest to resolve: the result must not follow completion.
			spyFetchSolTransactionsForSignature.mockImplementation(
				async ({ signature }: { signature: SolSignatureWithSources }) => {
					await new Promise((resolve) =>
						queueMicrotask(() => resolve(undefined))
					);

					if (signature.signature === signatures[0].signature) {
						await Promise.resolve();
						await Promise.resolve();
					}

					return [recordFor(signature)];
				}
			);

			const result = await resolve({ signatures });

			expect(result).toStrictEqual(
				signatures.map((signature) => ({
					transaction: recordFor(signature),
					sources: signature.sources
				}))
			);
		});

		it('should leave out a signature whose derivation yields nothing', async () => {
			const falsePositive = withSources([bonkSource]);
			const transfer = withSources([walletSource]);

			spyFetchSolTransactionsForSignature.mockImplementation(
				({ signature }: { signature: SolSignatureWithSources }) =>
					Promise.resolve(
						signature.signature === falsePositive.signature ? [] : [recordFor(signature)]
					)
			);

			const result = await resolve({ signatures: [falsePositive, transfer] });

			expect(spyFetchSolTransactionsForSignature).toHaveBeenCalledTimes(2);

			expect(result).toStrictEqual([{ transaction: recordFor(transfer), sources: [walletSource] }]);
		});

		it('should resolve the signatures concurrently, never more than the bound at once', async () => {
			const signatures = Array.from({ length: SOLANA_TRANSACTION_DETAIL_CONCURRENCY * 3 + 1 }, () =>
				withSources([walletSource])
			);

			let inFlight = 0;
			let maxInFlight = 0;

			const pending: (() => void)[] = [];

			spyFetchSolTransactionsForSignature.mockImplementation(
				async ({ signature }: { signature: SolSignatureWithSources }) => {
					inFlight++;
					maxInFlight = Math.max(maxInFlight, inFlight);

					await new Promise<void>((resolve) => pending.push(resolve));

					inFlight--;

					return [recordFor(signature)];
				}
			);

			const result = resolve({ signatures });

			// Release the fetches one at a time until the whole page has resolved.
			for (let i = 0; i < signatures.length; i++) {
				await vi.waitFor(() => expect(pending.length).toBeGreaterThan(0));

				pending.shift()?.();
			}

			await expect(result).resolves.toHaveLength(signatures.length);

			expect(maxInFlight).toBe(SOLANA_TRANSACTION_DETAIL_CONCURRENCY);
			expect(spyFetchSolTransactionsForSignature).toHaveBeenCalledTimes(signatures.length);
		});

		it('should reject when a fetch fails rather than return a partial page', async () => {
			const signatures = Array.from({ length: SOLANA_TRANSACTION_DETAIL_CONCURRENCY * 2 }, () =>
				withSources([walletSource])
			);

			const mockError = new Error('Mock Error');

			// Two fetches in flight fail: the second must not surface as an unhandled rejection.
			spyFetchSolTransactionsForSignature.mockImplementation(
				({ signature }: { signature: SolSignatureWithSources }) =>
					[signatures[0].signature, signatures[1].signature].includes(signature.signature)
						? Promise.reject(mockError)
						: Promise.resolve([recordFor(signature)])
			);

			await expect(resolve({ signatures })).rejects.toThrowError(mockError);

			// No fetch is started once the page has failed.
			expect(spyFetchSolTransactionsForSignature.mock.calls.length).toBeLessThan(
				signatures.length
			);
		});
	});
});
