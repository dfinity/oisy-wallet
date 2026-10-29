import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { SWAP_BROADCAST_ATTEMPTS } from '$lib/constants/swap.constants';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import en from '$lib/i18n/en.json';
import { fetchLifiQuote } from '$lib/rest/lifi.rest';
import {
	createActiveUserTransaction,
	deleteActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import { fetchLifiSolSwap } from '$lib/services/lifi-sol-swap.services';
import { assertLifiSolTransaction } from '$lib/services/lifi-sol-transaction.services';
import { enableSwapDestinationToken } from '$lib/services/swap.services';
import { LifiQuoteRejectedError, LifiSolFeeChangedError } from '$lib/types/errors';
import { LIFI_EXTERNAL_REF_KEYS } from '$lib/types/lifi';
import { SwapProvider, type SwapLifiSolParams } from '$lib/types/swap';
import { consoleError } from '$lib/utils/console.utils';
import { toLifiExternalRefsMap } from '$lib/utils/lifi-active-tx.utils';
import { sendSignedTransaction } from '$sol/services/sol-send.services';
import { signTransaction } from '$sol/utils/sol-sign.utils';
import { decodeTransactionMessage } from '$sol/utils/sol-transactions.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockLifiSolSolToUsdc, mockLifiSolUser } from '$tests/mocks/lifi-sol-transaction.mock';
import { mockLifiQuote } from '$tests/mocks/lifi.mock';
import { mockPreflightContext } from '$tests/mocks/sol-error.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { assertNonNullish } from '@dfinity/utils';
import { HTTPError, SDKError, type LiFiStep } from '@lifi/sdk';
import {
	address,
	getBase58Decoder,
	getCompiledTransactionMessageDecoder,
	SOLANA_ERROR__INSTRUCTION_ERROR__INSUFFICIENT_FUNDS,
	SOLANA_ERROR__JSON_RPC__INVALID_PARAMS,
	SOLANA_ERROR__JSON_RPC__SERVER_ERROR_NODE_UNHEALTHY,
	SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
	SOLANA_ERROR__TRANSACTION_ERROR__ALREADY_PROCESSED,
	SolanaError,
	type SignatureBytes,
	type SignatureDictionary
} from '@solana/kit';

vi.mock('$lib/rest/lifi.rest', () => ({
	fetchLifiQuote: vi.fn()
}));

vi.mock('$lib/services/lifi-sol-transaction.services', () => ({
	assertLifiSolTransaction: vi.fn()
}));

vi.mock('$sol/utils/sol-sign.utils', () => ({
	signTransaction: vi.fn()
}));

vi.mock('$sol/services/sol-send.services', () => ({
	sendSignedTransaction: vi.fn()
}));

vi.mock('$sol/providers/sol-rpc.providers', () => ({
	solanaHttpRpc: vi.fn().mockReturnValue({})
}));

vi.mock('$lib/services/active-user-transactions.services', () => ({
	createActiveUserTransaction: vi.fn(),
	deleteActiveUserTransaction: vi.fn()
}));

vi.mock('$lib/services/swap.services', () => ({
	enableSwapDestinationToken: vi.fn()
}));

vi.mock('$lib/utils/timeout.utils', () => ({
	waitForMilliseconds: vi.fn()
}));

vi.mock('$lib/utils/console.utils', () => ({
	consoleError: vi.fn()
}));

describe('lifi-sol-swap.services', () => {
	const { request, quote: fixtureQuote, toAmountMin } = mockLifiSolSolToUsdc;
	const data = fixtureQuote.transactionRequest?.data;

	assertNonNullish(data);

	const usdc = { ...mockValidSplToken, address: request.toToken, network: SOLANA_MAINNET_NETWORK };

	// The fixture's transaction, in a quote that echoes the request.
	const quoteWith = (estimate: Partial<LiFiStep['estimate']> = {}): LiFiStep => ({
		...mockLifiQuote,
		tool: 'jupiter',
		action: {
			...mockLifiQuote.action,
			fromChainId: request.fromChain as number,
			toChainId: request.toChain as number,
			fromToken: { ...mockLifiQuote.action.fromToken, address: request.fromToken },
			toToken: { ...mockLifiQuote.action.toToken, address: request.toToken },
			fromAmount: request.fromAmount,
			toAddress: mockLifiSolUser
		},
		estimate: { ...fixtureQuote.estimate, ...estimate },
		includedSteps: [{ ...mockLifiQuote, type: 'swap', tool: 'jupiter' }],
		transactionRequest: { data }
	});

	const quote = quoteWith();
	const simulationSlot = 461_778_178n;
	const reviewedCeiling = 3_350_300n;

	const userSignature = new Uint8Array(64).fill(7) as SignatureBytes;
	const signature = getBase58Decoder().decode(userSignature);

	const { lifetimeToken: blockhash } = getCompiledTransactionMessageDecoder().decode(
		decodeTransactionMessage(data).messageBytes
	);

	const params: SwapLifiSolParams = {
		identity: mockIdentity,
		progress: vi.fn(),
		sourceToken: SOLANA_TOKEN,
		destinationToken: usdc,
		swapAmount: '0.1',
		userAddress: mockLifiSolUser,
		offer: {
			provider: SwapProvider.LIFI,
			receiveAmount: BigInt(fixtureQuote.estimate.toAmount),
			receiveOutMinimum: toAmountMin,
			swapDetails: quote,
			request,
			solFeeCeiling: reviewedCeiling
		},
		reviewedCeiling
	};

	const preflightFailure = (cause: Error) =>
		new SolanaError(
			SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
			mockPreflightContext({ cause })
		);

	const insufficientFunds = () =>
		preflightFailure(
			new SolanaError(SOLANA_ERROR__INSTRUCTION_ERROR__INSUFFICIENT_FUNDS, { index: 0 })
		);

	// Agave checks the node's health before its preflight, and forwards nothing after either.
	const nodeUnhealthy = () =>
		new SolanaError(SOLANA_ERROR__JSON_RPC__SERVER_ERROR_NODE_UNHEALTHY, { numSlotsBehind: 42 });

	const rowRefs = () => {
		const [call] = vi.mocked(createActiveUserTransaction).mock.calls;

		assertNonNullish(call);

		return toLifiExternalRefsMap(call[0].externalRefs);
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(fetchLifiQuote).mockResolvedValue(quote);
		vi.mocked(assertLifiSolTransaction).mockResolvedValue({ simulationSlot });
		vi.mocked(signTransaction).mockResolvedValue({
			[mockLifiSolUser]: userSignature
		} as SignatureDictionary);
		vi.mocked(sendSignedTransaction).mockResolvedValue(undefined);
		vi.mocked(createActiveUserTransaction).mockResolvedValue(undefined);
		vi.mocked(deleteActiveUserTransaction).mockResolvedValue(undefined);
	});

	describe('fetchLifiSolSwap', () => {
		it("should re-quote the offer's own request, simulated, with its exchanges still pinned", async () => {
			await fetchLifiSolSwap(params);

			expect(fetchLifiQuote).toHaveBeenCalledExactlyOnceWith({
				...request,
				skipSimulation: false
			});
		});

		it('should bind the re-quoted transaction to the request, the minimum displayed and the ceiling reviewed', async () => {
			await fetchLifiSolSwap(params);

			expect(assertLifiSolTransaction).toHaveBeenCalledExactlyOnceWith({
				quote,
				request,
				displayedToAmountMin: toAmountMin,
				reviewedCeiling
			});
		});

		it("should sign LI.FI's own message bytes, and send them signed", async () => {
			await fetchLifiSolSwap(params);

			const [[{ transaction, address: signer, network }]] = vi.mocked(signTransaction).mock.calls;

			expect(transaction.messageBytes).toEqual(decodeTransactionMessage(data).messageBytes);
			expect(signer).toBe(mockLifiSolUser);
			expect(network).toBe('mainnet');

			const [[{ signedTransaction }]] = vi.mocked(sendSignedTransaction).mock.calls;

			expect(signedTransaction.messageBytes).toEqual(transaction.messageBytes);
			expect(signedTransaction.signatures[address(mockLifiSolUser)]).toEqual(userSignature);
			expect(signedTransaction.lifetimeConstraint).toEqual(expect.objectContaining({ blockhash }));
		});

		it('should create the row before sending, with the signature, the blockhash and the simulation slot', async () => {
			await fetchLifiSolSwap(params);

			expect(createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					identity: mockIdentity,
					data: {
						Lifi: {
							source_token: { SolNativeMainnet: null },
							dest_token: { SplMainnet: request.toToken },
							amount: BigInt(request.fromAmount)
						}
					}
				})
			);

			expect(rowRefs()).toEqual(
				expect.objectContaining({
					[LIFI_EXTERNAL_REF_KEYS.TX_HASH]: signature,
					[LIFI_EXTERNAL_REF_KEYS.BLOCKHASH]: blockhash,
					[LIFI_EXTERNAL_REF_KEYS.SIMULATION_SLOT]: `${simulationSlot}`,
					[LIFI_EXTERNAL_REF_KEYS.TOOL]: 'jupiter'
				})
			);
			expect(rowRefs()).not.toHaveProperty(LIFI_EXTERNAL_REF_KEYS.TX_NONCE);

			expect(vi.mocked(createActiveUserTransaction).mock.invocationCallOrder[0]).toBeLessThan(
				vi.mocked(sendSignedTransaction).mock.invocationCallOrder[0] ?? 0
			);
		});

		it('should enable the destination token, and report the steps', async () => {
			await fetchLifiSolSwap(params);

			expect(enableSwapDestinationToken).toHaveBeenCalledExactlyOnceWith({
				destinationToken: usdc,
				identity: mockIdentity
			});
			expect(params.progress).toHaveBeenNthCalledWith(1, ProgressStepsSwap.SWAP);
			expect(params.progress).toHaveBeenNthCalledWith(2, ProgressStepsSwap.UPDATE_UI);
		});

		describe('before anything is signed', () => {
			const expectNothingSigned = () => {
				expect(signTransaction).not.toHaveBeenCalled();
				expect(createActiveUserTransaction).not.toHaveBeenCalled();
				expect(sendSignedTransaction).not.toHaveBeenCalled();
			};

			it.each([
				{ case: 'another amount', change: { swapAmount: '0.2' } },
				{ case: 'another user', change: { userAddress: usdc.address } }
			])('should refuse an offer for $case', async ({ change }) => {
				await expect(fetchLifiSolSwap({ ...params, ...change })).rejects.toThrow(
					en.swap.error.unexpected
				);

				expect(fetchLifiQuote).not.toHaveBeenCalled();

				expectNothingSigned();
			});

			it('should abort as slippage when LI.FI now guarantees less than displayed', async () => {
				vi.mocked(fetchLifiQuote).mockResolvedValue(
					quoteWith({ toAmountMin: `${toAmountMin - 1n}` })
				);

				await expect(fetchLifiSolSwap(params)).rejects.toThrow(/^Slippage exceeded\./);

				expectNothingSigned();
			});

			it('should abort as slippage when LI.FI no longer has a route', async () => {
				vi.mocked(fetchLifiQuote).mockRejectedValue(
					new SDKError(new HTTPError(new Response('{}', { status: 404 }), 'https://li.quest', {}))
				);

				await expect(fetchLifiSolSwap(params)).rejects.toThrow(/^Slippage exceeded\./);

				expectNothingSigned();
			});

			it.each([
				{ case: 'refuses the transaction', err: new LifiQuoteRejectedError('refused') },
				{
					case: 'finds its ceiling risen',
					err: new LifiSolFeeChangedError({ ceiling: 4_000_000n })
				}
			])('should abort when the binding $case', async ({ err }) => {
				vi.mocked(assertLifiSolTransaction).mockRejectedValue(err);

				await expect(fetchLifiSolSwap(params)).rejects.toBe(err);

				expectNothingSigned();
			});
		});

		describe('the row', () => {
			it('should not send when the row cannot be created, and delete what may have been committed', async () => {
				const err = new Error('backend unavailable');
				vi.mocked(createActiveUserTransaction).mockRejectedValue(err);

				await expect(fetchLifiSolSwap(params)).rejects.toBe(err);

				expect(sendSignedTransaction).not.toHaveBeenCalled();
				expect(deleteActiveUserTransaction).toHaveBeenCalled();
			});
		});

		describe('the broadcast', () => {
			it('should delete the row and fail when the node refuses the first attempt', async () => {
				const refusal = insufficientFunds();
				vi.mocked(sendSignedTransaction).mockRejectedValue(refusal);

				await expect(fetchLifiSolSwap(params)).rejects.toBe(refusal);

				expect(sendSignedTransaction).toHaveBeenCalledOnce();
				expect(deleteActiveUserTransaction).toHaveBeenCalledOnce();
				expect(enableSwapDestinationToken).not.toHaveBeenCalled();
			});

			it('should count a transaction found already processed as sent', async () => {
				vi.mocked(sendSignedTransaction).mockRejectedValue(
					preflightFailure(new SolanaError(SOLANA_ERROR__TRANSACTION_ERROR__ALREADY_PROCESSED))
				);

				await expect(fetchLifiSolSwap(params)).resolves.toBeUndefined();

				expect(sendSignedTransaction).toHaveBeenCalledOnce();
				expect(deleteActiveUserTransaction).not.toHaveBeenCalled();
				expect(enableSwapDestinationToken).toHaveBeenCalledOnce();
			});

			it('should send the same signed bytes again after a transport failure', async () => {
				vi.mocked(sendSignedTransaction).mockRejectedValueOnce(new Error('fetch failed'));

				await expect(fetchLifiSolSwap(params)).resolves.toBeUndefined();

				const [first, second] = vi.mocked(sendSignedTransaction).mock.calls;

				expect(second?.[0].signedTransaction).toBe(first?.[0].signedTransaction);
				expect(signTransaction).toHaveBeenCalledOnce();
				expect(deleteActiveUserTransaction).not.toHaveBeenCalled();
			});

			// The first attempt may have been relayed, and spent what the refusal says is missing.
			it('should keep the row and count the swap as sent when a later attempt is refused', async () => {
				vi.mocked(sendSignedTransaction)
					.mockRejectedValueOnce(new Error('fetch failed'))
					.mockRejectedValueOnce(insufficientFunds());

				await expect(fetchLifiSolSwap(params)).resolves.toBeUndefined();

				expect(sendSignedTransaction).toHaveBeenCalledTimes(2);
				expect(deleteActiveUserTransaction).not.toHaveBeenCalled();
				expect(consoleError).toHaveBeenCalled();
				expect(enableSwapDestinationToken).toHaveBeenCalledOnce();
			});

			it('should keep the row and count the swap as sent once the attempts run out', async () => {
				vi.mocked(sendSignedTransaction).mockRejectedValue(new Error('fetch failed'));

				await expect(fetchLifiSolSwap(params)).resolves.toBeUndefined();

				expect(sendSignedTransaction).toHaveBeenCalledTimes(SWAP_BROADCAST_ATTEMPTS);
				expect(deleteActiveUserTransaction).not.toHaveBeenCalled();
			});

			it('should delete the row and fail when the node cannot read the transaction', async () => {
				const refusal = new SolanaError(SOLANA_ERROR__JSON_RPC__INVALID_PARAMS, {
					__serverMessage:
						'invalid transaction: Transaction loads an address table account that does not exist'
				});
				vi.mocked(sendSignedTransaction).mockRejectedValue(refusal);

				await expect(fetchLifiSolSwap(params)).rejects.toBe(refusal);

				expect(sendSignedTransaction).toHaveBeenCalledOnce();
				expect(deleteActiveUserTransaction).toHaveBeenCalledOnce();
			});

			describe('a node too far behind', () => {
				it('should send the same signed bytes again, which another node may take', async () => {
					vi.mocked(sendSignedTransaction).mockRejectedValueOnce(nodeUnhealthy());

					await expect(fetchLifiSolSwap(params)).resolves.toBeUndefined();

					const [first, second] = vi.mocked(sendSignedTransaction).mock.calls;

					expect(second?.[0].signedTransaction).toBe(first?.[0].signedTransaction);
					expect(deleteActiveUserTransaction).not.toHaveBeenCalled();
					expect(enableSwapDestinationToken).toHaveBeenCalledOnce();
				});

				// It forwarded nothing, so the refusal that follows still answers every attempt.
				it('should delete the row and fail on a refusal after it', async () => {
					const refusal = insufficientFunds();
					vi.mocked(sendSignedTransaction)
						.mockRejectedValueOnce(nodeUnhealthy())
						.mockRejectedValueOnce(refusal);

					await expect(fetchLifiSolSwap(params)).rejects.toBe(refusal);

					expect(sendSignedTransaction).toHaveBeenCalledTimes(2);
					expect(deleteActiveUserTransaction).toHaveBeenCalledOnce();
					expect(enableSwapDestinationToken).not.toHaveBeenCalled();
				});

				it('should delete the row and fail once the attempts run out', async () => {
					const refusal = nodeUnhealthy();
					vi.mocked(sendSignedTransaction).mockRejectedValue(refusal);

					await expect(fetchLifiSolSwap(params)).rejects.toBe(refusal);

					expect(sendSignedTransaction).toHaveBeenCalledTimes(SWAP_BROADCAST_ATTEMPTS);
					expect(deleteActiveUserTransaction).toHaveBeenCalledOnce();
				});

				it('should keep the row and count the swap as sent after an attempt that may have been relayed', async () => {
					vi.mocked(sendSignedTransaction)
						.mockRejectedValueOnce(new Error('fetch failed'))
						.mockRejectedValueOnce(nodeUnhealthy());

					await expect(fetchLifiSolSwap(params)).resolves.toBeUndefined();

					expect(sendSignedTransaction).toHaveBeenCalledTimes(2);
					expect(deleteActiveUserTransaction).not.toHaveBeenCalled();
					expect(enableSwapDestinationToken).toHaveBeenCalledOnce();
				});
			});
		});
	});
});
