import { LIFI_BTC_CHANGE_INDEX, LIFI_BTC_SEQUENCE } from '$btc/constants/lifi.constants';
import { sendBtcScriptOutputs, validateBtcSend } from '$btc/services/btc-send.services';
import {
	BtcBroadcastUnconfirmedError,
	BtcSendValidationError,
	BtcValidationError
} from '$btc/types/btc-send';
import type * as lifiEnv from '$env/rest/lifi.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { BtcBroadcastTransactionCanisterError } from '$lib/canisters/errors';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import en from '$lib/i18n/en.json';
import { fetchLifiQuote } from '$lib/rest/lifi.rest';
import {
	createActiveUserTransaction,
	deleteActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import { fetchLifiBtcSwap } from '$lib/services/lifi-btc-swap.services';
import { enableSwapDestinationToken } from '$lib/services/swap.services';
import { LifiQuoteRejectedError } from '$lib/types/errors';
import { LIFI_EXTERNAL_REF_KEYS } from '$lib/types/lifi';
import { SwapProvider, type SwapLifiBtcParams } from '$lib/types/swap';
import { toLifiExternalRefsMap } from '$lib/utils/lifi-active-tx.utils';
import { decodeLifiBtcTransaction } from '$lib/utils/lifi-swap.utils';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockLifiBtcFeeAddress, mockLifiBtcLayerswapQuote } from '$tests/mocks/lifi-btc.mock';
import { ChainId, type QuoteRequestFromAmount } from '@lifi/sdk';

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
		sendSigned();
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
});
