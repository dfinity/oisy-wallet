import { LIFI_BTC_CHANGE_INDEX, LIFI_BTC_SEQUENCE } from '$btc/constants/lifi.constants';
import { sendBtcScriptOutputs, validateBtcSend } from '$btc/services/btc-send.services';
import { prepareBtcSend } from '$btc/services/btc-utxos.service';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import {
	BtcBroadcastUnconfirmedError,
	BtcPrepareSendError,
	BtcSendValidationError,
	BtcValidationError
} from '$btc/types/btc-send';
import type * as lifiEnv from '$env/rest/lifi.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { BtcBroadcastTransactionCanisterError } from '$lib/canisters/errors';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import en from '$lib/i18n/en.json';
import { fetchLifiQuote } from '$lib/rest/lifi.rest';
import {
	createActiveUserTransaction,
	deleteActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import {
	bindLifiBtcPayout,
	hasLifiBtcPayoutBinding,
	lifiBtcAdmittedBridges
} from '$lib/services/lifi-btc-binding.services';
import {
	fetchLifiBtcSwap,
	fetchLifiBtcSwapQuote,
	isLifiBtcOffered,
	lifiBtcSupportedDestinations
} from '$lib/services/lifi-btc-swap.services';
import { fetchLifiSwapQuote } from '$lib/services/lifi-swap.services';
import { enableSwapDestinationToken } from '$lib/services/swap.services';
import { LifiQuoteRejectedError, LifiRouteUnsupportedError } from '$lib/types/errors';
import { LIFI_EXTERNAL_REF_KEYS } from '$lib/types/lifi';
import { SwapProvider, type BtcQuoteParams, type SwapLifiBtcParams } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { toLifiExternalRefsMap } from '$lib/utils/lifi-active-tx.utils';
import { decodeLifiBtcTransaction } from '$lib/utils/lifi-swap.utils';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockLifiBtcFeeAddress, mockLifiBtcLayerswapQuote } from '$tests/mocks/lifi-btc.mock';
import { btcSendViaBackend } from '$tests/utils/btc-env.test-utils';
import { ChainId, HTTPError, SDKError, type QuoteRequestFromAmount } from '@lifi/sdk';

// No bridge is admitted from Bitcoin yet; LayerSwap stands in for the first.
vi.mock('$env/rest/lifi.env', async (importOriginal) => {
	const original = await importOriginal<typeof lifiEnv>();
	const { BTC_MAINNET_NETWORK_ID: btcNetworkId } = await import('$env/networks/networks.btc.env');

	return {
		...original,
		LIFI_ALLOWED_BRIDGES: { ...original.LIFI_ALLOWED_BRIDGES, [btcNetworkId]: ['layerswap'] }
	};
});

vi.mock('$lib/rest/lifi.rest', () => ({
	fetchLifiQuote: vi.fn()
}));

vi.mock('$btc/services/btc-send.services', () => ({
	sendBtcScriptOutputs: vi.fn(),
	validateBtcSend: vi.fn()
}));

vi.mock('$btc/services/btc-utxos.service', () => ({
	prepareBtcSend: vi.fn()
}));

vi.mock('$lib/services/lifi-btc-binding.services', () => ({
	bindLifiBtcPayout: vi.fn(),
	hasLifiBtcPayoutBinding: vi.fn(),
	lifiBtcAdmittedBridges: vi.fn()
}));

vi.mock('$lib/services/lifi-swap.services', () => ({
	fetchLifiSwapQuote: vi.fn()
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

describe('lifi-btc-swap.services', () => {
	const quote = mockLifiBtcLayerswapQuote;
	const { action } = quote;
	const userAddress = action.fromAddress ?? '';
	const amount = BigInt(action.fromAmount);
	const txid = 'ab'.repeat(32);

	const request: QuoteRequestFromAmount = {
		fromChain: ChainId.BTC,
		toChain: action.toChainId,
		fromToken: 'bitcoin',
		toToken: action.toToken.address,
		fromAddress: userAddress,
		toAddress: action.toAddress,
		fromAmount: action.fromAmount,
		slippage: 0.005,
		allowBridges: ['layerswap']
	};

	const params: SwapLifiBtcParams = {
		identity: mockIdentity,
		progress: vi.fn(),
		sourceToken: BTC_MAINNET_TOKEN,
		destinationToken: ETHEREUM_TOKEN,
		swapAmount: '0.01',
		userAddress,
		network: 'mainnet',
		offer: {
			provider: SwapProvider.LIFI,
			receiveAmount: BigInt(quote.estimate.toAmount),
			receiveOutMinimum: BigInt(quote.estimate.toAmountMin),
			swapDetails: quote,
			request
		},
		utxosFee: mockUtxosFee
	};

	const { deposit, memo, fee } = decodeLifiBtcTransaction({ quote, amount, userAddress });

	// Signs, creates the row before the broadcast, then broadcasts, or fails the way it is told.
	const sendSigned = (broadcastError?: unknown) =>
		vi.mocked(sendBtcScriptOutputs).mockImplementation(async ({ beforeBroadcast }) => {
			await beforeBroadcast?.({ txid });

			if (broadcastError !== undefined) {
				throw broadcastError;
			}

			return txid;
		});

	const createdRowId = () => vi.mocked(createActiveUserTransaction).mock.calls[0]?.[0].id;

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(fetchLifiQuote).mockResolvedValue(quote);
		vi.mocked(validateBtcSend).mockResolvedValue(undefined);
		vi.mocked(createActiveUserTransaction).mockResolvedValue(undefined);
		vi.mocked(deleteActiveUserTransaction).mockResolvedValue(undefined);
		vi.mocked(bindLifiBtcPayout).mockResolvedValue(undefined);
		vi.mocked(hasLifiBtcPayoutBinding).mockReturnValue(true);
		sendSigned();
	});

	it("should bind the re-quoted deposit's payout before checking its fee", async () => {
		await fetchLifiBtcSwap(params);

		expect(bindLifiBtcPayout).toHaveBeenCalledExactlyOnceWith({
			quote,
			deposit,
			memo,
			request,
			displayedToAmountMin: BigInt(quote.estimate.toAmountMin)
		});
		expect(vi.mocked(bindLifiBtcPayout).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(validateBtcSend).mock.invocationCallOrder[0]
		);
	});

	// LI.FI's re-quote at confirm finds the address's UTXOs missing (1003, 404) or too small (1004, 422)
	// since the review: the balance, not the slippage, as the SDK throws it.
	it.each([
		{ case: 'no UTXOs', status: 404, code: 1003 },
		{ case: 'UTXOs too small', status: 422, code: 1004 }
	])(
		'should refuse as an insufficient balance, signing nothing, when LI.FI finds $case',
		async ({ status, code }) => {
			vi.mocked(fetchLifiQuote).mockRejectedValue(
				new SDKError(
					Object.assign(
						new HTTPError(new Response('{}', { status }), 'https://li.quest/v1/quote', {}),
						{ responseBody: { code, message: '' } }
					)
				)
			);

			await expect(fetchLifiBtcSwap(params)).rejects.toThrow(
				new BtcValidationError(BtcSendValidationError.InsufficientBalance)
			);

			expect(bindLifiBtcPayout).not.toHaveBeenCalled();
			expect(sendBtcScriptOutputs).not.toHaveBeenCalled();
			expect(createActiveUserTransaction).not.toHaveBeenCalled();
		}
	);

	it("should sign nothing when the bridge's record does not pay what was reviewed", async () => {
		const unbound = new LifiRouteUnsupportedError('no payout binding');
		vi.mocked(bindLifiBtcPayout).mockRejectedValue(unbound);

		await expect(fetchLifiBtcSwap(params)).rejects.toBe(unbound);

		expect(validateBtcSend).not.toHaveBeenCalled();
		expect(sendBtcScriptOutputs).not.toHaveBeenCalled();
	});

	it("should rebuild the re-quoted outputs around the reviewed selection, with LI.FI's order and sequence", async () => {
		await fetchLifiBtcSwap(params);

		expect(fetchLifiQuote).toHaveBeenCalledExactlyOnceWith(request);
		expect(validateBtcSend).toHaveBeenCalledExactlyOnceWith({
			utxosFee: mockUtxosFee,
			source: userAddress,
			// LayerSwap's P2TR deposit, its 18-byte memo and LI.FI's P2WPKH fee output.
			outputVSizes: [43, 29, 31],
			amount: params.swapAmount,
			network: 'mainnet',
			identity: mockIdentity
		});
		expect(sendBtcScriptOutputs).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				identity: mockIdentity,
				network: 'mainnet',
				utxosFee: mockUtxosFee,
				source: userAddress,
				layout: {
					outputs: [deposit, memo, fee],
					changeIndex: LIFI_BTC_CHANGE_INDEX,
					sequence: LIFI_BTC_SEQUENCE
				}
			})
		);
		expect(params.progress).toHaveBeenNthCalledWith(1, ProgressStepsSwap.SWAP);
		expect(params.progress).toHaveBeenNthCalledWith(2, ProgressStepsSwap.UPDATE_UI);
		expect(enableSwapDestinationToken).toHaveBeenCalledExactlyOnceWith({
			destinationToken: ETHEREUM_TOKEN,
			identity: mockIdentity
		});
	});

	it('should create the row with the txid before the broadcast, polled by the txid alone', async () => {
		await fetchLifiBtcSwap(params);

		expect(createActiveUserTransaction).toHaveBeenCalledOnce();

		const [[{ data, externalRefs }]] = vi.mocked(createActiveUserTransaction).mock.calls;
		const refs = toLifiExternalRefsMap(externalRefs);

		expect(data).toStrictEqual({
			Lifi: { source_token: { BtcNativeMainnet: null }, dest_token: { EvmNative: 1n }, amount }
		});
		expect(refs[LIFI_EXTERNAL_REF_KEYS.TX_HASH]).toBe(txid);
		expect(refs[LIFI_EXTERNAL_REF_KEYS.TOOL]).toBe('layerswap');
		expect(refs).not.toHaveProperty(LIFI_EXTERNAL_REF_KEYS.TX_NONCE);
		expect(refs).not.toHaveProperty(LIFI_EXTERNAL_REF_KEYS.BLOCKHASH);
	});

	it.each([
		{
			case: 'another amount',
			offer: { ...params.offer, request: { ...request, fromAmount: '1' } }
		},
		{
			case: 'another address',
			offer: { ...params.offer, request: { ...request, fromAddress: mockLifiBtcFeeAddress } }
		}
	])('should refuse an offer requested for $case, before re-quoting', async ({ offer }) => {
		await expect(fetchLifiBtcSwap({ ...params, offer })).rejects.toThrow(en.swap.error.unexpected);

		expect(fetchLifiQuote).not.toHaveBeenCalled();
		expect(sendBtcScriptOutputs).not.toHaveBeenCalled();
	});

	it('should sign nothing when the re-quote fails the trust checks', async () => {
		vi.mocked(fetchLifiQuote).mockResolvedValue({
			...quote,
			transactionRequest: { ...quote.transactionRequest, to: mockLifiBtcFeeAddress }
		});

		await expect(fetchLifiBtcSwap(params)).rejects.toThrow(LifiQuoteRejectedError);

		expect(validateBtcSend).not.toHaveBeenCalled();
		expect(sendBtcScriptOutputs).not.toHaveBeenCalled();
	});

	it('should sign nothing when the reviewed fee no longer prices the re-quoted layout', async () => {
		const invalidFee = new BtcValidationError(BtcSendValidationError.InvalidFeeCalculation);
		vi.mocked(validateBtcSend).mockRejectedValue(invalidFee);

		await expect(fetchLifiBtcSwap(params)).rejects.toBe(invalidFee);

		expect(sendBtcScriptOutputs).not.toHaveBeenCalled();
		expect(createActiveUserTransaction).not.toHaveBeenCalled();
	});

	it('should delete the row when the backend refused the broadcast outright', async () => {
		const refusal = new BtcBroadcastTransactionCanisterError(
			{ FeeTooLow: null },
			'btc_broadcast_transaction: FeeTooLow'
		);
		sendSigned(refusal);

		await expect(fetchLifiBtcSwap(params)).rejects.toBe(refusal);

		expect(deleteActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			id: createdRowId()
		});
		expect(enableSwapDestinationToken).not.toHaveBeenCalled();
	});

	it.each([
		{
			case: 'no typed answer',
			err: new BtcBroadcastUnconfirmedError({ cause: new Error('timeout') })
		},
		{
			case: 'an unknown outcome',
			err: new BtcBroadcastTransactionCanisterError(
				{ BroadcastOutcomeUnknown: { msg: 'trap' } },
				'btc_broadcast_transaction: BroadcastOutcomeUnknown'
			)
		}
	])(
		'should keep the row and enable the destination after $case, and still fail',
		async ({ err }) => {
			sendSigned(err);

			await expect(fetchLifiBtcSwap(params)).rejects.toBe(err);

			expect(deleteActiveUserTransaction).not.toHaveBeenCalled();
			expect(enableSwapDestinationToken).toHaveBeenCalledOnce();
		}
	);

	it('should broadcast nothing when its row cannot be created', async () => {
		const err = new Error('backend down');
		vi.mocked(createActiveUserTransaction).mockRejectedValue(err);

		await expect(fetchLifiBtcSwap(params)).rejects.toBe(err);

		// The creation's own cleanup, since its answer alone may have been lost.
		expect(deleteActiveUserTransaction).toHaveBeenCalledOnce();
		expect(enableSwapDestinationToken).not.toHaveBeenCalled();
	});

	describe('fetchLifiBtcSwapQuote', () => {
		const quoteParams: BtcQuoteParams = {
			sourceToken: BTC_MAINNET_TOKEN,
			destinationToken: ETHEREUM_TOKEN,
			amount,
			userBtcAddress: userAddress,
			recipientAddress: action.toAddress,
			slippage: 0.5
		};

		// LayerSwap's P2TR deposit, its 18-byte memo and LI.FI's P2WPKH fee output.
		const outputVSizes = [43, 29, 31];

		beforeEach(() => {
			vi.mocked(fetchLifiSwapQuote).mockResolvedValue(params.offer);
			vi.mocked(prepareBtcSend).mockReturnValue(mockUtxosFee);

			allUtxosStore.setAllUtxos({ allUtxos: mockUtxosFee.utxos });
			feeRatePercentilesStore.setFeeRateFromPercentiles({ feeRateFromPercentiles: 1_000n });
		});

		afterEach(() => {
			allUtxosStore.reset();
			feeRatePercentilesStore.reset();
		});

		it("should offer LI.FI's quote with its own selection, priced for its outputs", async () => {
			const result = await fetchLifiBtcSwapQuote(quoteParams);

			const { userBtcAddress: _, ...rest } = quoteParams;

			expect(fetchLifiSwapQuote).toHaveBeenCalledExactlyOnceWith({ ...rest, userAddress });
			expect(prepareBtcSend).toHaveBeenCalledExactlyOnceWith({
				amount: params.swapAmount,
				source: userAddress,
				outputVSizes,
				allUtxos: mockUtxosFee.utxos,
				feeRateMiliSatoshisPerVByte: 1_000n
			});
			expect(result).toStrictEqual({
				...params.offer,
				btcSelection: { utxosFee: mockUtxosFee, outputVSizes }
			});
		});

		it('should offer nothing through a bridge without a payout binding', async () => {
			vi.mocked(hasLifiBtcPayoutBinding).mockReturnValue(false);

			await expect(fetchLifiBtcSwapQuote(quoteParams)).resolves.toBeUndefined();

			expect(hasLifiBtcPayoutBinding).toHaveBeenCalledExactlyOnceWith({ tool: 'layerswap' });
			expect(prepareBtcSend).not.toHaveBeenCalled();
		});

		it.each([
			{
				case: 'cannot fund it',
				utxosFee: { ...mockUtxosFee, error: BtcPrepareSendError.InsufficientBalanceForFee }
			},
			{ case: 'selects nothing', utxosFee: { ...mockUtxosFee, utxos: [] } }
		])('should offer nothing when its selection $case', async ({ utxosFee }) => {
			vi.mocked(prepareBtcSend).mockReturnValue(utxosFee);

			await expect(fetchLifiBtcSwapQuote(quoteParams)).resolves.toBeUndefined();
		});

		it('should offer nothing before the UTXOs and the fee rate are loaded', async () => {
			allUtxosStore.reset();

			await expect(fetchLifiBtcSwapQuote(quoteParams)).resolves.toBeUndefined();

			expect(prepareBtcSend).not.toHaveBeenCalled();
		});

		it('should offer nothing when LI.FI has no offer', async () => {
			vi.mocked(fetchLifiSwapQuote).mockResolvedValue(undefined);

			await expect(fetchLifiBtcSwapQuote(quoteParams)).resolves.toBeUndefined();

			expect(hasLifiBtcPayoutBinding).not.toHaveBeenCalled();
		});
	});

	describe('isLifiBtcOffered and lifiBtcSupportedDestinations', () => {
		const destinations = (sourceToken: Token) =>
			lifiBtcSupportedDestinations({
				sourceToken,
				supportedSourceTokens: undefined,
				findProviderSourceTokens: () => undefined
			});

		beforeEach(() => {
			btcSendViaBackend.enabled = true;
			vi.mocked(lifiBtcAdmittedBridges).mockReturnValue(['layerswap']);
		});

		afterEach(() => {
			btcSendViaBackend.enabled = false;
		});

		it('should offer every EVM and Solana destination for native BTC once a bridge is admitted', () => {
			expect(isLifiBtcOffered(BTC_MAINNET_TOKEN)).toBeTruthy();
			expect(destinations(BTC_MAINNET_TOKEN)).toStrictEqual({ evm: 'any', sol: 'any' });
		});

		// Otherwise the destination picker would show pairs that can never get an offer.
		it('should offer nothing while no bridge is admitted', () => {
			vi.mocked(lifiBtcAdmittedBridges).mockReturnValue([]);

			expect(isLifiBtcOffered(BTC_MAINNET_TOKEN)).toBeFalsy();
			expect(destinations(BTC_MAINNET_TOKEN)).toBeUndefined();
		});

		it.each([
			{
				case: 'native BTC sent through the signer',
				sourceToken: BTC_MAINNET_TOKEN,
				viaBackend: false
			},
			{ case: 'testnet BTC', sourceToken: BTC_TESTNET_TOKEN, viaBackend: true },
			{ case: 'an EVM token', sourceToken: ETHEREUM_TOKEN, viaBackend: true }
		])('should offer nothing for $case', ({ sourceToken, viaBackend }) => {
			btcSendViaBackend.enabled = viaBackend;

			expect(isLifiBtcOffered(sourceToken)).toBeFalsy();
			expect(destinations(sourceToken)).toBeUndefined();
		});
	});
});
