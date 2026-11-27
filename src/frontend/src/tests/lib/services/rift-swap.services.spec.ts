import { sendBtc } from '$btc/services/btc-send.services';
import { BtcBroadcastUnconfirmedError } from '$btc/types/btc-send';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { BNB_MAINNET_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { send as sendEvm } from '$eth/services/send.services';
import type { Erc20Token } from '$eth/types/erc20';
import type * as ethErrorUtils from '$eth/utils/eth-error.utils';
import { isDefinitiveTransactionRefusal } from '$eth/utils/eth-error.utils';
import { BtcBroadcastTransactionCanisterError } from '$lib/canisters/errors';
import { ZERO } from '$lib/constants/app.constants';
import { RIFT_QUOTE_REFRESH_INTERVAL_MS } from '$lib/constants/swap.constants';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { getRiftOrder, postRiftOrder, postRiftQuote } from '$lib/rest/rift.rest';
import {
	createActiveUserTransaction,
	deleteUnbroadcastActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import {
	fetchRiftBtcSwap,
	fetchRiftBtcSwapQuote,
	fetchRiftEvmSwap,
	fetchRiftEvmSwapQuote,
	resetRiftQuoteCache,
	riftBtcSupportedDestinations,
	riftBtcSupportedTokens,
	riftEvmSupportedDestinations
} from '$lib/services/rift-swap.services';
import { enableSwapDestinationToken } from '$lib/services/swap.services';
import { RiftApiError, RiftSwapRefusedError, type RiftSwapRefusal } from '$lib/types/errors';
import type { RiftOrder, RiftQuote } from '$lib/types/rift';
import {
	SwapProvider,
	type BtcQuoteParams,
	type EvmQuoteParams,
	type SwapRiftBtcParams,
	type SwapRiftEvmParams
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { toRiftExternalRefsMap } from '$lib/utils/rift-active-tx.utils';
import { resolveSwapTokenLookup } from '$lib/utils/swap-tokens-filter.utils';
import { mockRiftActiveUserTransaction } from '$tests/mocks/active-user-transactions.mock';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	mockRiftOrder,
	mockRiftOrderRefundAddress,
	mockRiftOrderToAddress,
	mockRiftQuote,
	mockRiftQuoteRequest
} from '$tests/mocks/rift.mock';
import { btcSendViaBackend } from '$tests/utils/btc-env.test-utils';

vi.mock('$lib/rest/rift.rest', () => ({
	postRiftQuote: vi.fn(),
	postRiftOrder: vi.fn(),
	getRiftOrder: vi.fn()
}));

vi.mock('$btc/services/btc-send.services', () => ({
	sendBtc: vi.fn()
}));

vi.mock('$lib/services/active-user-transactions.services', () => ({
	createActiveUserTransaction: vi.fn(),
	deleteUnbroadcastActiveUserTransaction: vi.fn()
}));

vi.mock('$eth/services/send.services', () => ({
	send: vi.fn()
}));

vi.mock('$eth/utils/eth-error.utils', async (importOriginal) => ({
	...(await importOriginal<typeof ethErrorUtils>()),
	isDefinitiveTransactionRefusal: vi.fn()
}));

vi.mock('$lib/services/swap.services', () => ({
	enableSwapDestinationToken: vi.fn()
}));

const USDC_ETHEREUM: Erc20Token = {
	...mockValidErc20Token,
	address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
};

describe('rift-swap.services', () => {
	describe('riftBtcSupportedTokens', () => {
		it('lists native BTC on mainnet only', async () => {
			await expect(riftBtcSupportedTokens()).resolves.toEqual(
				new Set([resolveSwapTokenLookup({ token: BTC_MAINNET_TOKEN })?.identifier])
			);
		});
	});

	describe('riftBtcSupportedDestinations', () => {
		const destinations = (sourceToken: Token) =>
			riftBtcSupportedDestinations({
				sourceToken,
				supportedSourceTokens: undefined,
				findProviderSourceTokens: () => undefined
			});

		it('reaches every EVM token from native BTC on mainnet', () => {
			expect(destinations(BTC_MAINNET_TOKEN)).toEqual({ evm: 'any' });
		});

		it.each([
			{ label: 'BTC on testnet', token: BTC_TESTNET_TOKEN },
			{ label: 'ETH', token: ETHEREUM_TOKEN }
		])('reaches nothing from $label', ({ token }) => {
			expect(destinations(token)).toBeUndefined();
		});
	});

	describe('fetchRiftBtcSwapQuote', () => {
		const params = (overrides: Partial<BtcQuoteParams> = {}): BtcQuoteParams => ({
			sourceToken: BTC_MAINNET_TOKEN,
			destinationToken: USDC_ETHEREUM,
			amount: 200_000n,
			userBtcAddress: mockBtcAddress,
			recipientAddress: mockEthAddress,
			slippage: 0.5,
			...overrides
		});

		const answer = (quote: RiftQuote = mockRiftQuote) =>
			vi.mocked(postRiftQuote).mockResolvedValue(quote);

		beforeEach(() => {
			vi.clearAllMocks();
			resetRiftQuoteCache();

			vi.useFakeTimers();
			// Five minutes before the live quote expires.
			vi.setSystemTime(Date.parse(mockRiftQuote.expires_at) - 5 * 60_000);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("asks for a raw, fast quote under OISY's integrator id and offers its estimate", async () => {
			answer();

			const offer = await fetchRiftBtcSwapQuote(params());

			expect(postRiftQuote).toHaveBeenCalledExactlyOnceWith(mockRiftQuoteRequest);
			expect(offer).toStrictEqual({
				provider: SwapProvider.RIFT,
				receiveAmount: 121_475_958n,
				swapDetails: mockRiftQuote
			});
		});

		// Rift executes at whatever price it finds once the deposit arrives.
		it('offers no minimum, whatever the slippage', async () => {
			answer();

			const offer = await fetchRiftBtcSwapQuote(params({ slippage: 3 }));

			expect(offer).not.toHaveProperty('receiveOutMinimum');
		});

		it('reports that Rift takes part', async () => {
			answer();
			const onProviderParticipating = vi.fn();

			await fetchRiftBtcSwapQuote(params({ onProviderParticipating }));

			expect(onProviderParticipating).toHaveBeenCalledExactlyOnceWith(SwapProvider.RIFT);
		});

		it.each([
			{ label: 'BTC to BTC', overrides: { destinationToken: BTC_MAINNET_TOKEN } },
			{ label: 'a token on BSC', overrides: { destinationToken: BNB_MAINNET_TOKEN } },
			{ label: 'SOL', overrides: { destinationToken: SOLANA_TOKEN } },
			{ label: 'BTC on testnet', overrides: { sourceToken: BTC_TESTNET_TOKEN } },
			{ label: 'an EVM source', overrides: { sourceToken: ETHEREUM_TOKEN } },
			{ label: 'a zero amount', overrides: { amount: ZERO } }
		])('does not ask Rift about $label', async ({ overrides }) => {
			const onProviderParticipating = vi.fn();

			await expect(
				fetchRiftBtcSwapQuote(params({ ...overrides, onProviderParticipating }))
			).resolves.toBeUndefined();

			expect(postRiftQuote).not.toHaveBeenCalled();
			expect(onProviderParticipating).not.toHaveBeenCalled();
		});

		it('offers nothing when Rift has no route', async () => {
			vi.mocked(postRiftQuote).mockRejectedValue(
				new RiftApiError({ status: 422, message: 'no route' })
			);

			await expect(fetchRiftBtcSwapQuote(params())).resolves.toBeUndefined();
		});

		it('offers nothing for a quote that does not answer the request', async () => {
			answer({ ...mockRiftQuote, amount_in: '100000' });

			await expect(fetchRiftBtcSwapQuote(params())).resolves.toBeUndefined();
		});

		describe('cadence', () => {
			it('answers unchanged inputs from the last quote until the refresh interval has passed', async () => {
				answer();

				await fetchRiftBtcSwapQuote(params());
				await vi.advanceTimersByTimeAsync(RIFT_QUOTE_REFRESH_INTERVAL_MS - 1);
				const cached = await fetchRiftBtcSwapQuote(params());

				expect(postRiftQuote).toHaveBeenCalledOnce();
				expect(cached?.receiveAmount).toBe(121_475_958n);

				await vi.advanceTimersByTimeAsync(1);
				await fetchRiftBtcSwapQuote(params());

				expect(postRiftQuote).toHaveBeenCalledTimes(2);
			});

			it('asks again at once when the inputs change', async () => {
				answer();

				await fetchRiftBtcSwapQuote(params());
				await fetchRiftBtcSwapQuote(params({ amount: 300_000n }));

				expect(postRiftQuote).toHaveBeenCalledTimes(2);
				expect(postRiftQuote).toHaveBeenLastCalledWith({
					...mockRiftQuoteRequest,
					amount_in: '300000'
				});
			});

			it('shares a request that has not been answered yet', async () => {
				const { promise, resolve } = Promise.withResolvers<RiftQuote>();
				vi.mocked(postRiftQuote).mockReturnValue(promise);

				const first = fetchRiftBtcSwapQuote(params());
				const second = fetchRiftBtcSwapQuote(params());

				resolve(mockRiftQuote);

				const offers = await Promise.all([first, second]);

				expect(postRiftQuote).toHaveBeenCalledOnce();
				expect(offers.map((offer) => offer?.receiveAmount)).toEqual([121_475_958n, 121_475_958n]);
			});

			it('keeps no offer for the interval too', async () => {
				vi.mocked(postRiftQuote).mockRejectedValue(
					new RiftApiError({ status: 422, message: 'no route' })
				);

				await fetchRiftBtcSwapQuote(params());
				await fetchRiftBtcSwapQuote(params());

				expect(postRiftQuote).toHaveBeenCalledOnce();
			});

			// The cache keeps the answer, and its checks run on every read.
			it('drops a kept quote once it has expired', async () => {
				answer({ ...mockRiftQuote, expires_at: new Date(Date.now() + 10_000).toISOString() });

				await expect(fetchRiftBtcSwapQuote(params())).resolves.toBeDefined();

				await vi.advanceTimersByTimeAsync(10_000);

				await expect(fetchRiftBtcSwapQuote(params())).resolves.toBeUndefined();
				expect(postRiftQuote).toHaveBeenCalledOnce();
			});
		});
	});

	describe('fetchRiftBtcSwap', () => {
		const TXID = 'cd'.repeat(32);

		const params = (overrides: Partial<SwapRiftBtcParams> = {}): SwapRiftBtcParams => ({
			identity: mockIdentity,
			progress: vi.fn(),
			sourceToken: BTC_MAINNET_TOKEN,
			destinationToken: USDC_ETHEREUM,
			swapAmount: 0.002,
			userAddress: mockRiftOrderRefundAddress,
			recipientAddress: mockRiftOrderToAddress,
			network: 'mainnet',
			offer: {
				provider: SwapProvider.RIFT,
				receiveAmount: 121_475_958n,
				swapDetails: mockRiftQuote
			},
			utxosFee: mockUtxosFee,
			...overrides
		});

		const order = (overrides: Partial<RiftOrder> = {}) =>
			vi.mocked(postRiftOrder).mockResolvedValue({ ...mockRiftOrder, ...overrides });

		const recheck = (overrides: Partial<RiftOrder> = {}) =>
			vi.mocked(getRiftOrder).mockResolvedValue({ ...mockRiftOrder, ...overrides });

		// Signs, runs the hook, then broadcasts: refused by `outcome` when given.
		const broadcast = ({ outcome }: { outcome?: unknown } = {}) =>
			vi.mocked(sendBtc).mockImplementation(async ({ beforeBroadcast }) => {
				await beforeBroadcast?.({ txid: TXID });

				if (outcome !== undefined) {
					throw outcome;
				}

				return TXID;
			});

		const rowId = () => vi.mocked(createActiveUserTransaction).mock.lastCall?.[0].id;

		const expectRefused = async ({
			reason,
			overrides
		}: {
			reason: RiftSwapRefusal;
			overrides?: Partial<SwapRiftBtcParams>;
		}) => {
			const swap = fetchRiftBtcSwap(params(overrides));

			await expect(swap).rejects.toBeInstanceOf(RiftSwapRefusedError);
			await expect(swap).rejects.toMatchObject({ reason });
		};

		beforeEach(() => {
			vi.clearAllMocks();
			resetRiftQuoteCache();
			btcSendViaBackend.enabled = true;

			vi.useFakeTimers();
			// Five minutes before the reviewed quote expires.
			vi.setSystemTime(Date.parse(mockRiftQuote.expires_at) - 5 * 60_000);

			order();
			recheck();
			broadcast();
			vi.mocked(createActiveUserTransaction).mockResolvedValue(mockRiftActiveUserTransaction);
		});

		afterEach(() => {
			vi.useRealTimers();
			btcSendViaBackend.enabled = false;
		});

		it("orders the reviewed quote with the user's own addresses, and pays exactly the quoted amount", async () => {
			await fetchRiftBtcSwap(params());

			expect(postRiftOrder).toHaveBeenCalledExactlyOnceWith({
				quote_id: mockRiftQuote.id,
				to_address: mockRiftOrderToAddress,
				refund_address: mockRiftOrderRefundAddress
			});
			expect(sendBtc).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					source: mockRiftOrderRefundAddress,
					destination: mockRiftOrder.deposit_address,
					amount: 0.002,
					utxosFee: mockUtxosFee
				})
			);
		});

		it('creates the row before the broadcast, then reads the order once more, ahead of other requests', async () => {
			await fetchRiftBtcSwap(params());

			const [[{ data, externalRefs }]] = vi.mocked(createActiveUserTransaction).mock.calls;

			expect(data).toEqual({
				Rift: {
					source_token: { BtcNativeMainnet: null },
					dest_token: { Erc20: [USDC_ETHEREUM.address, 1n] },
					amount: 200_000n
				}
			});
			expect(toRiftExternalRefsMap(externalRefs)).toMatchObject({
				rift_order_id: mockRiftOrder.id,
				rift_deposit_address: mockRiftOrder.deposit_address,
				rift_deposit_tx: TXID
			});
			expect(getRiftOrder).toHaveBeenCalledExactlyOnceWith({
				orderId: mockRiftOrder.id,
				urgent: true
			});
			expect(vi.mocked(createActiveUserTransaction).mock.invocationCallOrder[0]).toBeLessThan(
				vi.mocked(getRiftOrder).mock.invocationCallOrder[0]
			);
		});

		it('keeps the destination token visible and reports its progress', async () => {
			const progress = vi.fn();

			await fetchRiftBtcSwap(params({ progress }));

			expect(enableSwapDestinationToken).toHaveBeenCalledExactlyOnceWith({
				destinationToken: USDC_ETHEREUM,
				identity: mockIdentity
			});
			expect(progress.mock.calls.map(([step]) => step)).toEqual([
				ProgressStepsSwap.SIGN_TRANSFER,
				ProgressStepsSwap.SWAP,
				ProgressStepsSwap.UPDATE_UI
			]);
			expect(deleteUnbroadcastActiveUserTransaction).not.toHaveBeenCalled();
		});

		describe('before anything is signed', () => {
			afterEach(() => {
				expect(sendBtc).not.toHaveBeenCalled();
				expect(createActiveUserTransaction).not.toHaveBeenCalled();
			});

			it('stops on a quote that has expired, without ordering it', async () => {
				vi.setSystemTime(Date.parse(mockRiftQuote.expires_at));

				await expectRefused({ reason: 'quoteExpired' });

				expect(postRiftOrder).not.toHaveBeenCalled();
			});

			it.each([
				{ status: 410, reason: 'quoteExpired' as const },
				{ status: 403, reason: 'orderRefused' as const },
				{ status: 409, reason: 'orderRefused' as const },
				{ status: 503, reason: 'orderRefused' as const }
			])('stops when Rift answers the order with $status', async ({ status, reason }) => {
				vi.mocked(postRiftOrder).mockRejectedValue(new RiftApiError({ status, message: 'no' }));

				await expectRefused({ reason });
			});

			it.each([
				{ label: 'another amount', overrides: { amount_in: '200001' } },
				{ label: 'a deposit already seen', overrides: { deposit_tx: 'abc' } },
				{
					label: "the user's own address to deposit to",
					overrides: { deposit_address: mockRiftOrderRefundAddress }
				}
			])('stops on an order with $label', async ({ overrides }) => {
				order(overrides);

				await expectRefused({ reason: 'orderUnverified' });
			});

			it('refuses an amount other than the quoted one, without ordering', async () => {
				await expect(fetchRiftBtcSwap(params({ swapAmount: 0.003 }))).rejects.not.toBeInstanceOf(
					RiftSwapRefusedError
				);

				expect(postRiftOrder).not.toHaveBeenCalled();
			});

			it('refuses to send without the backend path, which the row needs', async () => {
				btcSendViaBackend.enabled = false;

				await expect(fetchRiftBtcSwap(params())).rejects.toThrow();

				expect(postRiftOrder).not.toHaveBeenCalled();
			});
		});

		describe('right before the broadcast', () => {
			it('stops when the order already has a row, and keeps that row', async () => {
				vi.mocked(createActiveUserTransaction).mockRejectedValue({ AlreadyInFlight: null });

				await expectRefused({ reason: 'orderInFlight' });

				expect(getRiftOrder).not.toHaveBeenCalled();
				expect(deleteUnbroadcastActiveUserTransaction).not.toHaveBeenCalled();
			});

			it('deletes a row it may have created when the backend gives no clear answer', async () => {
				vi.mocked(createActiveUserTransaction).mockRejectedValue(new Error('timeout'));

				await expect(fetchRiftBtcSwap(params())).rejects.toThrow('timeout');

				expect(deleteUnbroadcastActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					id: rowId()
				});
			});

			it('deletes its row and stops when the order has seen a deposit since', async () => {
				recheck({ status: 'funded' });

				await expectRefused({ reason: 'orderInFlight' });

				expect(deleteUnbroadcastActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					id: rowId()
				});
			});

			it('deletes its row and stops when the order passed its deadline during signing', async () => {
				recheck({ deposit_deadline: new Date(Date.now() - 1).toISOString() });

				await expectRefused({ reason: 'quoteExpired' });

				expect(deleteUnbroadcastActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					id: rowId()
				});
			});

			it('deletes its row and stops when the order cannot be read again', async () => {
				vi.mocked(getRiftOrder).mockRejectedValue(new RiftApiError({ status: 503, message: 'no' }));

				await expectRefused({ reason: 'orderRefused' });

				expect(deleteUnbroadcastActiveUserTransaction).toHaveBeenCalledOnce();
			});
		});

		describe('after the broadcast', () => {
			it('deletes the row when the backend refused the broadcast outright', async () => {
				broadcast({
					outcome: new BtcBroadcastTransactionCanisterError({ DuplicateInputs: null }, 'refused')
				});

				await expect(fetchRiftBtcSwap(params())).rejects.toThrow('refused');

				expect(deleteUnbroadcastActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					id: rowId()
				});
				expect(enableSwapDestinationToken).not.toHaveBeenCalled();
			});

			it('keeps the row and enables the destination when the broadcast may have gone out', async () => {
				broadcast({ outcome: new BtcBroadcastUnconfirmedError({ cause: new Error('lost') }) });

				await expect(fetchRiftBtcSwap(params())).rejects.toBeInstanceOf(
					BtcBroadcastUnconfirmedError
				);

				expect(deleteUnbroadcastActiveUserTransaction).not.toHaveBeenCalled();
				expect(enableSwapDestinationToken).toHaveBeenCalledOnce();
			});
		});

		describe('the reviewed quote', () => {
			const quoteParams: BtcQuoteParams = {
				sourceToken: BTC_MAINNET_TOKEN,
				destinationToken: USDC_ETHEREUM,
				amount: 200_000n,
				userBtcAddress: mockBtcAddress,
				recipientAddress: mockEthAddress,
				slippage: 0.5
			};

			beforeEach(() => {
				vi.mocked(postRiftQuote).mockResolvedValue(mockRiftQuote);
			});

			// A retry then orders a fresh quote rather than the same order again.
			it('is dropped after a failure', async () => {
				await fetchRiftBtcSwapQuote(quoteParams);

				recheck({ status: 'funded' });

				await expect(fetchRiftBtcSwap(params())).rejects.toThrow();

				await fetchRiftBtcSwapQuote(quoteParams);

				expect(postRiftQuote).toHaveBeenCalledTimes(2);
			});

			// Ordered again, it would return the same order, which the next swap could not pay.
			it('is dropped after a deposit, so a swap with the same inputs gets a fresh one', async () => {
				await fetchRiftBtcSwapQuote(quoteParams);

				await fetchRiftBtcSwap(params());

				await fetchRiftBtcSwapQuote(quoteParams);

				expect(postRiftQuote).toHaveBeenCalledTimes(2);
			});
		});
	});

	describe('from an EVM network', () => {
		const usdc: Erc20Token = { ...USDC_ETHEREUM, decimals: 6 };

		// 100 USDC on Ethereum → BTC, paid out to the user's BTC address and refunded to their EVM one.
		const userEvmAddress = mockRiftOrderToAddress;
		const userBtcAddress = mockRiftOrderRefundAddress;
		const depositAddress = '0x2222222222222222222222222222222222222222';

		const evmQuote: RiftQuote = {
			...mockRiftQuote,
			from: 'evm:1.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
			to: 'bitcoin.btc',
			amount_in: '100000000',
			estimated_amount_out: '150000'
		};

		const evmOrder: RiftOrder = {
			...mockRiftOrder,
			from: evmQuote.from,
			to: evmQuote.to,
			amount_in: evmQuote.amount_in,
			deposit_address: depositAddress,
			to_address: userBtcAddress,
			refund_address: userEvmAddress
		};

		describe('riftEvmSupportedDestinations', () => {
			const destinations = (sourceToken: Token) =>
				riftEvmSupportedDestinations({
					sourceToken,
					supportedSourceTokens: undefined,
					findProviderSourceTokens: () => undefined
				});

			it('reaches native BTC from a token Rift is asked about', () => {
				expect(destinations(usdc)).toEqual({
					btc: new Set([resolveSwapTokenLookup({ token: BTC_MAINNET_TOKEN })?.identifier])
				});
			});

			it.each([
				{ label: 'a token on BSC', token: BNB_MAINNET_TOKEN },
				{ label: 'BTC itself', token: BTC_MAINNET_TOKEN },
				{ label: 'SOL', token: SOLANA_TOKEN }
			])('reaches nothing from $label', ({ token }) => {
				expect(destinations(token)).toBeUndefined();
			});
		});

		describe('fetchRiftEvmSwapQuote', () => {
			const quoteParams = (overrides: Partial<EvmQuoteParams> = {}): EvmQuoteParams => ({
				sourceToken: usdc,
				destinationToken: BTC_MAINNET_TOKEN as Erc20Token,
				amount: 100_000_000n,
				userAddress: userEvmAddress,
				recipientAddress: userBtcAddress,
				slippage: 0.5,
				...overrides
			});

			beforeEach(() => {
				vi.clearAllMocks();
				resetRiftQuoteCache();
				vi.useFakeTimers();
				vi.setSystemTime(Date.parse(evmQuote.expires_at) - 5 * 60_000);
				vi.mocked(postRiftQuote).mockResolvedValue(evmQuote);
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			it('asks for the token to native BTC and offers its estimate', async () => {
				await expect(fetchRiftEvmSwapQuote(quoteParams())).resolves.toStrictEqual({
					provider: SwapProvider.RIFT,
					receiveAmount: 150_000n,
					swapDetails: evmQuote
				});

				expect(postRiftQuote).toHaveBeenCalledExactlyOnceWith({
					...mockRiftQuoteRequest,
					from: evmQuote.from,
					to: 'bitcoin.btc',
					amount_in: '100000000'
				});
			});

			it.each([
				{ label: 'to another EVM token', overrides: { destinationToken: usdc } },
				{
					label: 'from a token on BSC',
					overrides: { sourceToken: BNB_MAINNET_TOKEN as Erc20Token }
				}
			])('does not ask Rift $label', async ({ overrides }) => {
				await expect(fetchRiftEvmSwapQuote(quoteParams(overrides))).resolves.toBeUndefined();

				expect(postRiftQuote).not.toHaveBeenCalled();
			});
		});

		describe('fetchRiftEvmSwap', () => {
			const HASH = `0x${'ef'.repeat(32)}`;

			const params = (overrides: Partial<SwapRiftEvmParams> = {}): SwapRiftEvmParams => ({
				identity: mockIdentity,
				progress: vi.fn(),
				sourceToken: usdc,
				destinationToken: BTC_MAINNET_TOKEN,
				swapAmount: 100,
				sourceNetwork: ETHEREUM_NETWORK,
				userAddress: userEvmAddress,
				recipientAddress: userBtcAddress,
				offer: { provider: SwapProvider.RIFT, receiveAmount: 150_000n, swapDetails: evmQuote },
				gas: 65_000n,
				maxFeePerGas: 20n,
				maxPriorityFeePerGas: 1n,
				...overrides
			});

			// Signs, runs the hook, then broadcasts: refused by `outcome` when given.
			const broadcast = ({ outcome }: { outcome?: unknown } = {}) =>
				vi.mocked(sendEvm).mockImplementation(async ({ beforeBroadcast }) => {
					await beforeBroadcast?.({ hash: HASH, nonce: 7 });

					if (outcome !== undefined) {
						throw outcome;
					}

					return { hash: HASH, nonce: 7 };
				});

			const rowId = () => vi.mocked(createActiveUserTransaction).mock.lastCall?.[0].id;

			beforeEach(() => {
				vi.clearAllMocks();
				resetRiftQuoteCache();
				vi.useFakeTimers();
				vi.setSystemTime(Date.parse(evmQuote.expires_at) - 5 * 60_000);

				vi.mocked(postRiftOrder).mockResolvedValue(evmOrder);
				vi.mocked(getRiftOrder).mockResolvedValue(evmOrder);
				vi.mocked(createActiveUserTransaction).mockResolvedValue(mockRiftActiveUserTransaction);
				vi.mocked(isDefinitiveTransactionRefusal).mockReturnValue(false);
				broadcast();
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			it("orders the quote with the user's BTC payout and EVM refund, and pays exactly the quoted amount", async () => {
				await fetchRiftEvmSwap(params());

				expect(postRiftOrder).toHaveBeenCalledExactlyOnceWith({
					quote_id: evmQuote.id,
					to_address: userBtcAddress,
					refund_address: userEvmAddress
				});
				expect(sendEvm).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						from: userEvmAddress,
						to: depositAddress,
						amount: 100_000_000n,
						token: usdc,
						sourceNetwork: ETHEREUM_NETWORK,
						gas: 65_000n,
						maxFeePerGas: 20n,
						maxPriorityFeePerGas: 1n
					})
				);
			});

			it("creates the row with the deposit's hash, nonce and chain, then reads the order once more", async () => {
				await fetchRiftEvmSwap(params());

				const [[{ externalRefs }]] = vi.mocked(createActiveUserTransaction).mock.calls;

				expect(toRiftExternalRefsMap(externalRefs)).toMatchObject({
					rift_order_id: evmOrder.id,
					rift_deposit_address: depositAddress,
					rift_deposit_tx: HASH,
					rift_deposit_nonce: '7',
					rift_deposit_chain_id: '1'
				});
				expect(getRiftOrder).toHaveBeenCalledExactlyOnceWith({
					orderId: evmOrder.id,
					urgent: true
				});
				expect(enableSwapDestinationToken).not.toHaveBeenCalled();
			});

			it('stops on an order that refunds elsewhere, before anything is signed', async () => {
				vi.mocked(postRiftOrder).mockResolvedValue({
					...evmOrder,
					refund_address: '0x0000000000000000000000000000000000000001'
				});

				await expect(fetchRiftEvmSwap(params())).rejects.toMatchObject({
					reason: 'orderUnverified'
				});

				expect(sendEvm).not.toHaveBeenCalled();
			});

			it('deletes the row when the node refused the deposit outright', async () => {
				const err = new Error('insufficient funds');
				broadcast({ outcome: err });
				vi.mocked(isDefinitiveTransactionRefusal).mockReturnValue(true);

				await expect(fetchRiftEvmSwap(params())).rejects.toThrow(err);

				expect(deleteUnbroadcastActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					id: rowId()
				});
			});

			// Signing again would read the next nonce and could pay twice.
			it('goes on as sent, keeping the row, when the deposit may have been relayed', async () => {
				broadcast({ outcome: new Error('timeout') });

				await expect(fetchRiftEvmSwap(params())).resolves.toBeUndefined();

				expect(deleteUnbroadcastActiveUserTransaction).not.toHaveBeenCalled();
			});

			it('stops with nothing to delete when the order already has a row', async () => {
				vi.mocked(createActiveUserTransaction).mockRejectedValue({ AlreadyInFlight: null });

				await expect(fetchRiftEvmSwap(params())).rejects.toMatchObject({
					reason: 'orderInFlight'
				});

				expect(deleteUnbroadcastActiveUserTransaction).not.toHaveBeenCalled();
			});

			it('refuses an amount other than the quoted one, without ordering', async () => {
				await expect(fetchRiftEvmSwap(params({ swapAmount: 99 }))).rejects.toThrow();

				expect(postRiftOrder).not.toHaveBeenCalled();
			});
		});
	});
});
