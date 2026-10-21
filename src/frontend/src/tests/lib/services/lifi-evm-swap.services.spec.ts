import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK, BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { infuraProviders } from '$eth/providers/infura.providers';
import { approve, erc20ContractAllowance } from '$eth/services/approve.services';
import { getL1DataFee } from '$eth/services/fee.services';
import { swap } from '$eth/services/swap.services';
import { mapEthereumErrorMsg } from '$eth/utils/eth-error.utils';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import en from '$lib/i18n/en.json';
import { fetchLifiQuote } from '$lib/rest/lifi.rest';
import {
	createActiveUserTransaction,
	deleteActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import { assertLifiEvmCalldata } from '$lib/services/lifi-calldata.services';
import {
	fetchLifiEvmSwap,
	lifiApprovalTransactions,
	lifiQuoteFeeCeiling
} from '$lib/services/lifi-evm-swap.services';
import { enableSwapDestinationToken, waitForSwapAllowance } from '$lib/services/swap.services';
import { LifiFeeChangedError, LifiQuoteRejectedError } from '$lib/types/errors';
import { LIFI_EXTERNAL_REF_KEYS } from '$lib/types/lifi';
import { SwapProvider, type SwapLifiEvmParams } from '$lib/types/swap';
import { toLifiExternalRefsMap } from '$lib/utils/lifi-active-tx.utils';
import { lifiUnsignedTxSize } from '$lib/utils/lifi-fee.utils';
import { buildLifiQuoteRequest } from '$lib/utils/lifi-swap.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	mockLifiBaseUsdcToken,
	mockLifiDiamond,
	mockLifiFromAmount,
	mockLifiQuote,
	mockLifiUserAddress
} from '$tests/mocks/lifi.mock';
import { assertNonNullish } from '@dfinity/utils';
import {
	ChainId,
	HTTPError,
	SDKError,
	type CrossStep,
	type GasCost,
	type LiFiStep,
	type ProtocolStep,
	type Step
} from '@lifi/sdk';

vi.mock('$lib/rest/lifi.rest', () => ({
	fetchLifiQuote: vi.fn()
}));

vi.mock('$lib/services/lifi-calldata.services', () => ({
	assertLifiEvmCalldata: vi.fn()
}));

vi.mock('$eth/services/approve.services', () => ({
	approve: vi.fn(),
	erc20ContractAllowance: vi.fn()
}));

vi.mock('$eth/services/swap.services', () => ({
	swap: vi.fn()
}));

vi.mock('$eth/services/fee.services', () => ({
	getL1DataFee: vi.fn()
}));

vi.mock('$eth/providers/infura.providers', () => ({
	infuraProviders: vi.fn()
}));

vi.mock('$lib/services/active-user-transactions.services', () => ({
	createActiveUserTransaction: vi.fn(),
	deleteActiveUserTransaction: vi.fn()
}));

vi.mock('$lib/services/swap.services', () => ({
	enableSwapDestinationToken: vi.fn(),
	waitForSwapAllowance: vi.fn()
}));

vi.mock('$lib/utils/timeout.utils', () => ({
	waitForMilliseconds: vi.fn()
}));

vi.mock('$lib/utils/console.utils', () => ({
	consoleError: vi.fn()
}));

type LifiOffer = SwapLifiEvmParams['offer'];

describe('lifi-evm-swap.services', () => {
	const maxFeePerGas = 10_000_000n;
	const maxPriorityFeePerGas = 1_000_000n;
	const l1Fee = 1_000n;
	const estimatedGas = 300_000n;
	// OISY's estimate, plus the 20 % buffer.
	const swapGas = 360_000n;
	const hash = `0x${'ab'.repeat(32)}`;
	const nonce = 7;

	const toRequest = (params: Parameters<typeof buildLifiQuoteRequest>[0]) => {
		const request = buildLifiQuoteRequest(params);

		assertNonNullish(request);

		return request;
	};

	const offerOf = ({ quote, request }: Pick<LifiOffer, 'request'> & { quote: LiFiStep }) =>
		({
			provider: SwapProvider.LIFI,
			receiveAmount: BigInt(quote.estimate.toAmount),
			receiveOutMinimum: BigInt(quote.estimate.toAmountMin),
			swapDetails: quote,
			request
		}) satisfies LifiOffer;

	// 0.01 ETH → USDC on Base.
	const nativeRequest = toRequest({
		sourceToken: BASE_ETH_TOKEN,
		destinationToken: mockLifiBaseUsdcToken,
		amount: mockLifiFromAmount,
		userAddress: mockLifiUserAddress,
		slippage: 1.5
	});

	// 50 USDC → ETH on Base, pulled through the allowance: the transaction carries no value.
	const erc20Request = toRequest({
		sourceToken: mockLifiBaseUsdcToken,
		destinationToken: BASE_ETH_TOKEN,
		amount: 50_000_000n,
		userAddress: mockLifiUserAddress,
		slippage: 1.5
	});

	const erc20Quote: LiFiStep = {
		...mockLifiQuote,
		action: {
			...mockLifiQuote.action,
			fromAmount: '50000000',
			fromToken: mockLifiQuote.action.toToken,
			toToken: mockLifiQuote.action.fromToken
		},
		transactionRequest: { ...mockLifiQuote.transactionRequest, value: '0x0' }
	};

	const withMinimum = ({ quote, toAmountMin }: { quote: LiFiStep; toAmountMin: string }) => ({
		...quote,
		estimate: { ...quote.estimate, toAmountMin }
	});

	const baseParams = {
		identity: mockIdentity,
		sourceNetwork: BASE_NETWORK,
		userAddress: mockLifiUserAddress,
		gas: 65_000n,
		maxFeePerGas,
		maxPriorityFeePerGas,
		reviewedFeeCeiling: swapGas * maxFeePerGas + l1Fee,
		// The swap transaction's ceiling and one approval.
		reviewedFee: swapGas * maxFeePerGas + l1Fee + 65_000n * maxFeePerGas,
		userTokenAddresses: [mockLifiBaseUsdcToken.address]
	};

	const nativeParams = (): SwapLifiEvmParams => ({
		...baseParams,
		progress: vi.fn(),
		sourceToken: BASE_ETH_TOKEN as unknown as SwapLifiEvmParams['sourceToken'],
		destinationToken: mockLifiBaseUsdcToken,
		swapAmount: '0.01',
		offer: offerOf({ quote: mockLifiQuote, request: nativeRequest })
	});

	const erc20Params = (): SwapLifiEvmParams => ({
		...baseParams,
		progress: vi.fn(),
		sourceToken: mockLifiBaseUsdcToken,
		destinationToken: BASE_ETH_TOKEN,
		swapAmount: '50',
		offer: offerOf({ quote: erc20Quote, request: erc20Request })
	});

	const httpFailure = (status: number) =>
		new SDKError(new HTTPError(new Response('{}', { status }), 'https://li.quest/v1/quote', {}));

	// The node's answer to the broadcast, as ethers nests it.
	const broadcastRefused = (message: string) =>
		Object.assign(new Error(message), {
			code: 'UNKNOWN_ERROR',
			error: { code: -32000, message },
			payload: { id: 1, jsonrpc: '2.0', method: 'eth_sendRawTransaction' }
		});

	// What the row was created with.
	const createdRow = () => {
		const [call] = vi.mocked(createActiveUserTransaction).mock.calls;

		assertNonNullish(call);

		return call[0];
	};

	const estimateGas = vi.fn();
	const balance = vi.fn();

	// `swap` signs, then runs `beforeBroadcast`, then broadcasts: `broadcast` stands for the last.
	let broadcast: () => Promise<void>;

	beforeEach(() => {
		vi.clearAllMocks();

		broadcast = () => Promise.resolve();

		vi.mocked(fetchLifiQuote).mockResolvedValue(mockLifiQuote);
		vi.mocked(assertLifiEvmCalldata).mockResolvedValue();
		vi.mocked(getL1DataFee).mockResolvedValue(l1Fee);
		vi.mocked(createActiveUserTransaction).mockResolvedValue();
		vi.mocked(deleteActiveUserTransaction).mockResolvedValue();

		estimateGas.mockResolvedValue(estimatedGas);
		balance.mockResolvedValue(10n ** 18n);
		vi.mocked(infuraProviders).mockReturnValue({
			estimateGas,
			balance
		} as unknown as ReturnType<typeof infuraProviders>);

		vi.mocked(swap).mockImplementation(async ({ beforeBroadcast }) => {
			await beforeBroadcast?.({ hash, nonce });
			await broadcast();

			return { hash, nonce };
		});
	});

	describe('fetchLifiEvmSwap', () => {
		describe('a native source', () => {
			it('should re-quote once, simulated, and sign it with the gas OISY estimated', async () => {
				await fetchLifiEvmSwap(nativeParams());

				expect(approve).not.toHaveBeenCalled();
				expect(fetchLifiQuote).toHaveBeenCalledExactlyOnceWith({
					...nativeRequest,
					skipSimulation: false
				});
				expect(assertLifiEvmCalldata).toHaveBeenCalledExactlyOnceWith({
					quote: mockLifiQuote,
					request: { ...nativeRequest, skipSimulation: false },
					sourceNetworkId: BASE_NETWORK_ID,
					displayedToAmountMin: 24_878_019n,
					userTokenAddresses: [mockLifiBaseUsdcToken.address]
				});
				expect(estimateGas).toHaveBeenCalledExactlyOnceWith({
					from: mockLifiUserAddress,
					to: mockLifiDiamond,
					data: mockLifiQuote.transactionRequest?.data,
					value: mockLifiFromAmount
				});
				expect(swap).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						to: mockLifiDiamond,
						amount: mockLifiFromAmount,
						maxFeePerGas,
						maxPriorityFeePerGas,
						transaction: {
							from: mockLifiUserAddress,
							to: mockLifiDiamond,
							data: mockLifiQuote.transactionRequest?.data,
							value: `${mockLifiFromAmount}`,
							gas: `${swapGas}`,
							chainId: 8453
						}
					})
				);
			});

			it("should price the L1 data fee on the transaction's own size", async () => {
				await fetchLifiEvmSwap(nativeParams());

				const data = mockLifiQuote.transactionRequest?.data;

				assertNonNullish(data);

				expect(getL1DataFee).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						chainId: BASE_NETWORK.chainId,
						unsignedTxSize: lifiUnsignedTxSize({
							chainId: BASE_NETWORK.chainId,
							to: mockLifiDiamond,
							data,
							value: mockLifiFromAmount,
							gas: swapGas,
							maxFeePerGas,
							maxPriorityFeePerGas
						})
					})
				);
			});

			it('should create the row with the signed hash and nonce, then enable the destination', async () => {
				const params = nativeParams();

				await fetchLifiEvmSwap(params);

				const { data, externalRefs } = createdRow();

				expect(data).toStrictEqual({
					Lifi: {
						source_token: { EvmNative: 8453n },
						dest_token: { Erc20: [mockLifiBaseUsdcToken.address, 8453n] },
						amount: mockLifiFromAmount
					}
				});
				expect(toLifiExternalRefsMap(externalRefs)).toEqual(
					expect.objectContaining({
						[LIFI_EXTERNAL_REF_KEYS.TX_HASH]: hash,
						[LIFI_EXTERNAL_REF_KEYS.TX_NONCE]: `${nonce}`,
						[LIFI_EXTERNAL_REF_KEYS.TOOL]: mockLifiQuote.tool,
						[LIFI_EXTERNAL_REF_KEYS.AMOUNT]: '0.01'
					})
				);
				expect(params.progress).toHaveBeenLastCalledWith(ProgressStepsSwap.UPDATE_UI);
				expect(enableSwapDestinationToken).toHaveBeenCalledExactlyOnceWith({
					destinationToken: mockLifiBaseUsdcToken,
					identity: mockIdentity
				});
			});
		});

		describe('an ERC-20 source', () => {
			beforeEach(() => {
				vi.mocked(fetchLifiQuote).mockResolvedValue(erc20Quote);
			});

			it('should check the price, approve the pinned Diamond and await the allowance first', async () => {
				await fetchLifiEvmSwap(erc20Params());

				expect(fetchLifiQuote).toHaveBeenNthCalledWith(1, {
					...erc20Request,
					skipSimulation: true
				});
				expect(fetchLifiQuote).toHaveBeenNthCalledWith(2, {
					...erc20Request,
					skipSimulation: false
				});
				expect(approve).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						token: mockLifiBaseUsdcToken,
						to: mockLifiDiamond,
						amount: 50_000_000n,
						shouldSwapWithApproval: true
					})
				);
				expect(waitForSwapAllowance).toHaveBeenCalledExactlyOnceWith({
					token: mockLifiBaseUsdcToken,
					owner: mockLifiUserAddress,
					spender: mockLifiDiamond,
					networkId: BASE_NETWORK_ID,
					amount: 50_000_000n
				});
				// What the pending activity shows: the Diamond's calldata is no transfer to read it from.
				expect(swap).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ token: mockLifiBaseUsdcToken, amount: 50_000_000n })
				);

				const [priceCheck, simulated] = vi.mocked(fetchLifiQuote).mock.invocationCallOrder;
				const [approval] = vi.mocked(approve).mock.invocationCallOrder;

				expect(priceCheck).toBeLessThan(approval ?? 0);
				expect(approval).toBeLessThan(simulated ?? 0);
			});

			it.each([
				{
					case: 'its minimum fell',
					mock: () =>
						vi
							.mocked(fetchLifiQuote)
							.mockResolvedValue(withMinimum({ quote: erc20Quote, toAmountMin: '24878018' }))
				},
				{
					case: 'no route comes back',
					mock: () => vi.mocked(fetchLifiQuote).mockRejectedValue(httpFailure(404))
				}
			])('should abort as a slippage error before approving when $case', async ({ mock }) => {
				mock();

				await expect(fetchLifiEvmSwap(erc20Params())).rejects.toThrow(/^Slippage exceeded\./);

				expect(approve).not.toHaveBeenCalled();
			});

			it('should abort as a slippage error when the minimum fell while approving', async () => {
				vi.mocked(fetchLifiQuote)
					.mockResolvedValueOnce(erc20Quote)
					.mockResolvedValueOnce(withMinimum({ quote: erc20Quote, toAmountMin: '24878018' }));

				await expect(fetchLifiEvmSwap(erc20Params())).rejects.toThrow(/^Slippage exceeded\./);

				expect(approve).toHaveBeenCalledOnce();
				expect(swap).not.toHaveBeenCalled();
			});

			it('should pass any other quote failure through as it is', async () => {
				const failure = httpFailure(500);

				vi.mocked(fetchLifiQuote).mockRejectedValue(failure);

				await expect(fetchLifiEvmSwap(erc20Params())).rejects.toBe(failure);
			});

			// The balance check before signing comes after the approval is paid.
			it('should abort with the insufficient-funds error before approving when the balance cannot cover the reviewed fee', async () => {
				balance.mockResolvedValue(erc20Params().reviewedFee - 1n);

				const err = await fetchLifiEvmSwap(erc20Params()).catch((err: unknown) => err);

				expect(mapEthereumErrorMsg(err)).toBe(en.send.error.ethereum_insufficient_funds);
				expect(fetchLifiQuote).not.toHaveBeenCalled();
				expect(approve).not.toHaveBeenCalled();
			});

			it('should approve and swap when the balance covers the reviewed fee exactly', async () => {
				balance.mockResolvedValue(erc20Params().reviewedFee);

				await fetchLifiEvmSwap(erc20Params());

				expect(approve).toHaveBeenCalledOnce();
				expect(swap).toHaveBeenCalledOnce();
			});
		});

		describe('before signing', () => {
			it('should refuse a quote the trust checks refuse', async () => {
				vi.mocked(fetchLifiQuote).mockResolvedValue({
					...mockLifiQuote,
					transactionRequest: { ...mockLifiQuote.transactionRequest, to: mockLifiUserAddress }
				});

				await expect(fetchLifiEvmSwap(nativeParams())).rejects.toThrow(LifiQuoteRejectedError);

				expect(assertLifiEvmCalldata).not.toHaveBeenCalled();
				expect(swap).not.toHaveBeenCalled();
			});

			it('should abort when the calldata binding refuses', async () => {
				vi.mocked(assertLifiEvmCalldata).mockRejectedValue(new LifiQuoteRejectedError('refused'));

				await expect(fetchLifiEvmSwap(nativeParams())).rejects.toThrow(LifiQuoteRejectedError);

				expect(estimateGas).not.toHaveBeenCalled();
				expect(swap).not.toHaveBeenCalled();
			});

			// A failing estimate is a route that would revert.
			it('should abort when the gas cannot be estimated', async () => {
				estimateGas.mockRejectedValue(new Error('execution reverted'));

				await expect(fetchLifiEvmSwap(nativeParams())).rejects.toThrow('execution reverted');

				expect(swap).not.toHaveBeenCalled();
			});

			it('should not sign a fee above the one reviewed, carrying its own back to the review', async () => {
				const failure = fetchLifiEvmSwap({
					...nativeParams(),
					reviewedFeeCeiling: swapGas * maxFeePerGas + l1Fee - 1n
				});

				await expect(failure).rejects.toThrow(LifiFeeChangedError);
				await expect(failure).rejects.toMatchObject({
					feeCeiling: swapGas * maxFeePerGas + l1Fee
				});

				expect(swap).not.toHaveBeenCalled();
			});

			it('should abort with the insufficient-funds error when the balance cannot cover it all', async () => {
				balance.mockResolvedValue(mockLifiFromAmount + swapGas * maxFeePerGas + l1Fee - 1n);

				const err = await fetchLifiEvmSwap(nativeParams()).catch((err: unknown) => err);

				expect(mapEthereumErrorMsg(err)).toBe(en.send.error.ethereum_insufficient_funds);
				expect(swap).not.toHaveBeenCalled();
			});

			it('should refuse an amount other than the one quoted', async () => {
				await expect(fetchLifiEvmSwap({ ...nativeParams(), swapAmount: '0.02' })).rejects.toThrow(
					en.swap.error.unexpected
				);

				expect(fetchLifiQuote).not.toHaveBeenCalled();
			});
		});

		describe('the row', () => {
			it('should not broadcast when the row cannot be created, deleting it in case it was', async () => {
				const broadcastSpy = vi.fn();
				broadcast = broadcastSpy;

				vi.mocked(createActiveUserTransaction).mockRejectedValue(new Error('canister error'));

				await expect(fetchLifiEvmSwap(nativeParams())).rejects.toThrow('canister error');

				const { id } = createdRow();

				expect(deleteActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					id
				});
				expect(broadcastSpy).not.toHaveBeenCalled();
				expect(enableSwapDestinationToken).not.toHaveBeenCalled();
			});

			it('should delete the row when the node refuses the transaction outright', async () => {
				const refusal = broadcastRefused('insufficient funds for gas * price + value');

				broadcast = () => Promise.reject(refusal);

				await expect(fetchLifiEvmSwap(nativeParams())).rejects.toBe(refusal);

				const { id } = createdRow();

				expect(deleteActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					id
				});
			});

			it.each([
				{ case: 'already in the mempool', err: broadcastRefused('already known') },
				{ case: 'whose nonce is spent', err: broadcastRefused('nonce too low') },
				{
					case: 'whose answer was lost',
					err: Object.assign(new Error('timeout'), { code: 'TIMEOUT' })
				}
			])(
				'should go on as sent with a transaction $case, never to be signed twice',
				async ({ err }) => {
					const params = nativeParams();

					broadcast = () => Promise.reject(err);

					await expect(fetchLifiEvmSwap(params)).resolves.toBeUndefined();

					expect(deleteActiveUserTransaction).not.toHaveBeenCalled();
					expect(params.progress).toHaveBeenLastCalledWith(ProgressStepsSwap.UPDATE_UI);
					expect(enableSwapDestinationToken).toHaveBeenCalledOnce();
				}
			);

			it('should retry a delete that fails, then leave the row to the poller', async () => {
				const refusal = broadcastRefused('intrinsic gas too low');

				broadcast = () => Promise.reject(refusal);
				vi.mocked(deleteActiveUserTransaction).mockRejectedValue(new Error('canister error'));

				await expect(fetchLifiEvmSwap(nativeParams())).rejects.toBe(refusal);

				expect(deleteActiveUserTransaction).toHaveBeenCalledTimes(3);
			});
		});

		describe('a cross-chain route', () => {
			const arbitrumUsdc = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

			const destinationToken = {
				...mockLifiBaseUsdcToken,
				id: parseTokenId('LifiArbitrumUsdc'),
				network: ARBITRUM_MAINNET_NETWORK,
				address: arbitrumUsdc
			};

			// One branch per step type, so that each literal narrows to its own member of `Step`.
			const step = (
				step: Pick<CrossStep, 'type' | 'tool'> | Pick<ProtocolStep, 'type' | 'tool'>
			): Step =>
				step.type === 'cross' ? { ...mockLifiQuote, ...step } : { ...mockLifiQuote, ...step };

			const quote: LiFiStep = {
				...mockLifiQuote,
				tool: 'near',
				action: {
					...mockLifiQuote.action,
					toChainId: ChainId.ARB,
					toToken: { ...mockLifiQuote.action.toToken, chainId: ChainId.ARB, address: arbitrumUsdc }
				},
				includedSteps: [
					step({ type: 'protocol', tool: 'feeCollection' }),
					step({ type: 'cross', tool: 'near' })
				]
			};

			// Execution re-quotes the same kind of route the user reviewed.
			it('should re-quote through the bridge the reviewed route took', async () => {
				const request = toRequest({
					sourceToken: BASE_ETH_TOKEN,
					destinationToken,
					amount: mockLifiFromAmount,
					userAddress: mockLifiUserAddress,
					slippage: 1.5
				});

				expect(request.allowBridges).toEqual(['across', 'near']);

				vi.mocked(fetchLifiQuote).mockResolvedValue(quote);

				await fetchLifiEvmSwap({
					...nativeParams(),
					destinationToken,
					offer: offerOf({ quote, request })
				});

				expect(fetchLifiQuote).toHaveBeenCalledExactlyOnceWith({
					...request,
					allowBridges: ['near'],
					skipSimulation: false
				});
			});
		});
	});

	describe('lifiQuoteFeeCeiling', () => {
		const sendCost = (estimate: string): GasCost => ({
			type: 'SEND',
			estimate,
			price: '1',
			limit: '0',
			amount: '0',
			amountUSD: '0',
			token: mockLifiQuote.action.fromToken
		});

		it("should price LI.FI's gas estimate, buffered, at OISY's fees, plus the L1 data fee", async () => {
			await expect(
				lifiQuoteFeeCeiling({
					quote: {
						...mockLifiQuote,
						estimate: { ...mockLifiQuote.estimate, gasCosts: [sendCost('300000')] }
					},
					sourceNetwork: BASE_NETWORK,
					maxFeePerGas,
					maxPriorityFeePerGas
				})
			).resolves.toBe(swapGas * maxFeePerGas + l1Fee);
		});

		it('should be undefined for a quote without a gas estimate', async () => {
			await expect(
				lifiQuoteFeeCeiling({
					quote: mockLifiQuote,
					sourceNetwork: BASE_NETWORK,
					maxFeePerGas,
					maxPriorityFeePerGas
				})
			).resolves.toBeUndefined();

			expect(getL1DataFee).not.toHaveBeenCalled();
		});
	});

	describe('lifiApprovalTransactions', () => {
		const params = {
			sourceToken: mockLifiBaseUsdcToken,
			userAddress: mockLifiUserAddress,
			amount: 50_000_000n,
			sourceNetwork: BASE_NETWORK
		};

		it('should count none for a native source, without reading an allowance', async () => {
			await expect(
				lifiApprovalTransactions({
					...params,
					sourceToken: BASE_ETH_TOKEN as unknown as SwapLifiEvmParams['sourceToken']
				})
			).resolves.toBe(0);

			expect(erc20ContractAllowance).not.toHaveBeenCalled();
		});

		it('should count from the allowance to the pinned Diamond, as `approve()` does', async () => {
			vi.mocked(erc20ContractAllowance).mockResolvedValue(1n);

			await expect(lifiApprovalTransactions(params)).resolves.toBe(2);

			expect(erc20ContractAllowance).toHaveBeenCalledExactlyOnceWith({
				token: mockLifiBaseUsdcToken,
				owner: mockLifiUserAddress,
				spender: mockLifiDiamond,
				networkId: BASE_NETWORK_ID
			});
		});

		it('should budget the most when the allowance cannot be read', async () => {
			vi.mocked(erc20ContractAllowance).mockRejectedValue(new Error('rpc error'));

			await expect(lifiApprovalTransactions(params)).resolves.toBe(2);
		});
	});
});
