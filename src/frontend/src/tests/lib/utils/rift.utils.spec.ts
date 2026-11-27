import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { AAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc4626/tokens.aautopilot_usdc.env';
import { ARBITRUM_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { BNB_MAINNET_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import { POL_MAINNET_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens.pol.env';
import { ROBINHOOD_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens.eth.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { Erc20Token } from '$eth/types/erc20';
import { RiftSwapRefusedError } from '$lib/types/errors';
import type { RiftOrder, RiftQuote } from '$lib/types/rift';
import {
	isRiftBtcSource,
	isRiftOrderAwaitingDeposit,
	isRiftOrderForReview,
	isRiftQuoteForRequest,
	isSameRiftAssetId,
	riftRouteVenues,
	riftSwapRefusedMessage,
	toRiftAssetId
} from '$lib/utils/rift.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import {
	mockRiftOrder,
	mockRiftOrderRefundAddress,
	mockRiftOrderToAddress,
	mockRiftQuote,
	mockRiftQuoteRequest
} from '$tests/mocks/rift.mock';

const USDC_ETHEREUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const erc20 = (overrides: Partial<Erc20Token>): Erc20Token => ({
	...mockValidErc20Token,
	address: USDC_ETHEREUM,
	...overrides
});

describe('rift.utils', () => {
	describe('toRiftAssetId', () => {
		it('names native BTC on mainnet', () => {
			expect(toRiftAssetId(BTC_MAINNET_TOKEN)).toBe('bitcoin.btc');
		});

		// Pinned from live `format: "raw"` quotes, 2026-11-26.
		it.each([
			{ label: 'Ethereum', token: ETHEREUM_TOKEN, expected: 'evm:1.eth' },
			{ label: 'Arbitrum', token: ARBITRUM_ETH_TOKEN, expected: 'evm:42161.eth' },
			{ label: 'Base', token: BASE_ETH_TOKEN, expected: 'evm:8453.eth' },
			{ label: 'Polygon', token: POL_MAINNET_TOKEN, expected: 'evm:137.pol' },
			{ label: 'Robinhood Chain', token: ROBINHOOD_ETH_TOKEN, expected: 'evm:4663.eth' }
		])('names the native coin of $label', ({ token, expected }) => {
			expect(toRiftAssetId(token)).toBe(expected);
		});

		it('names an ERC-20 by its lowercased contract address', () => {
			expect(toRiftAssetId(erc20({}))).toBe('evm:1.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
		});

		it('names an ERC-4626 vault share by its own contract address, not its asset', () => {
			expect(toRiftAssetId(AAUTOPILOT_USDC_TOKEN)).toBe(
				'evm:42161.0x407d3d942d0911a2fea7e22417f81e27c02d6c6f'
			);
		});

		it('names no asset for an ERC-4626 vault share on a network Rift does not list', () => {
			expect(
				toRiftAssetId({ ...AAUTOPILOT_USDC_TOKEN, network: BSC_MAINNET_NETWORK })
			).toBeUndefined();
		});

		it.each([
			{ label: 'Arbitrum', network: ARBITRUM_MAINNET_NETWORK, chain: 'evm:42161' },
			{ label: 'Polygon', network: POLYGON_MAINNET_NETWORK, chain: 'evm:137' },
			{ label: 'Robinhood Chain', network: ROBINHOOD_MAINNET_NETWORK, chain: 'evm:4663' }
		])('names an ERC-20 on $label with its chain id', ({ network, chain }) => {
			expect(toRiftAssetId(erc20({ network }))).toBe(
				`${chain}.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`
			);
		});

		it.each([
			{ label: 'BTC on testnet', token: BTC_TESTNET_TOKEN },
			{ label: 'ETH on Sepolia', token: SEPOLIA_TOKEN },
			{ label: 'an ERC-20 on Sepolia', token: erc20({ network: SEPOLIA_NETWORK }) },
			{ label: 'BNB, on a network Rift does not list', token: BNB_MAINNET_TOKEN },
			{ label: 'an ERC-20 on BSC', token: erc20({ network: BSC_MAINNET_NETWORK }) },
			{ label: 'SOL', token: SOLANA_TOKEN },
			{ label: 'ICP', token: ICP_TOKEN }
		])('names no asset for $label', ({ token }) => {
			expect(toRiftAssetId(token)).toBeUndefined();
		});
	});

	describe('isRiftBtcSource', () => {
		it.each([
			{ label: 'native BTC on mainnet', token: BTC_MAINNET_TOKEN, expected: true },
			{ label: 'native BTC on testnet', token: BTC_TESTNET_TOKEN, expected: false },
			{ label: 'ETH', token: ETHEREUM_TOKEN, expected: false }
		])('is $expected for $label', ({ token, expected }) => {
			expect(isRiftBtcSource(token)).toBe(expected);
		});
	});

	describe('isRiftQuoteForRequest', () => {
		// A minute before the live quote expires.
		const now = Date.parse(mockRiftQuote.expires_at) - 60_000;

		const [venueToInk, venueToEthereum] = mockRiftQuote.route;

		const withDeliveryFee = (integratorFee: string): RiftQuote['route'] =>
			mockRiftQuote.route.map((step) =>
				step.type === 'delivery' ? { ...step, integrator_fee: integratorFee } : step
			);

		it('accepts the quote that answers the request', () => {
			expect(
				isRiftQuoteForRequest({ quote: mockRiftQuote, request: mockRiftQuoteRequest, now })
			).toBeTruthy();
		});

		it('accepts an echo of the request in another case', () => {
			expect(
				isRiftQuoteForRequest({
					quote: { ...mockRiftQuote, to: mockRiftQuote.to.toUpperCase() },
					request: mockRiftQuoteRequest,
					now
				})
			).toBeTruthy();
		});

		it.each([
			{ label: 'another source asset', quote: { from: 'evm:1.eth' } },
			{ label: 'another destination asset', quote: { to: 'evm:8453.eth' } },
			{ label: 'another amount', quote: { amount_in: '200001' } },
			{ label: 'a zero estimate', quote: { estimated_amount_out: '0' } },
			{ label: 'an integrator fee rate', quote: { integrator_fee_bps: 25 } },
			{ label: 'an integrator fee on delivery', quote: { route: withDeliveryFee('1') } },
			{ label: 'no delivery step', quote: { route: [venueToInk, venueToEthereum] } },
			{
				label: 'a second delivery step with an integrator fee',
				// The live route ends with its delivery step.
				quote: { route: [...mockRiftQuote.route, ...withDeliveryFee('1').slice(-1)] }
			},
			{
				label: 'a second delivery step',
				quote: { route: [...mockRiftQuote.route, ...mockRiftQuote.route.slice(-1)] }
			}
		])('drops a quote with $label', ({ quote }) => {
			expect(
				isRiftQuoteForRequest({
					quote: { ...mockRiftQuote, ...quote },
					request: mockRiftQuoteRequest,
					now
				})
			).toBeFalsy();
		});

		it('accepts a zero integrator fee rate', () => {
			expect(
				isRiftQuoteForRequest({
					quote: { ...mockRiftQuote, integrator_fee_bps: 0 },
					request: mockRiftQuoteRequest,
					now
				})
			).toBeTruthy();
		});

		it('drops a quote once it has expired', () => {
			expect(
				isRiftQuoteForRequest({
					quote: mockRiftQuote,
					request: mockRiftQuoteRequest,
					now: Date.parse(mockRiftQuote.expires_at)
				})
			).toBeFalsy();
		});
	});

	describe('riftRouteVenues', () => {
		it('lists the venues in route order, without the delivery step', () => {
			expect(riftRouteVenues(mockRiftQuote)).toEqual(['rift_otc', 'velora']);
		});
	});

	describe('isRiftOrderAwaitingDeposit', () => {
		it.each([
			{ label: 'an order awaiting its deposit', order: {}, expected: true },
			{ label: 'a funded order', order: { status: 'funded' as const }, expected: false },
			{
				label: 'an order that has seen a deposit',
				order: { deposit_tx: 'abc' },
				expected: false
			}
		])('is $expected for $label', ({ order, expected }) => {
			expect(isRiftOrderAwaitingDeposit({ ...mockRiftOrder, ...order })).toBe(expected);
		});
	});

	describe('isRiftOrderForReview', () => {
		// A day before the order's deposit deadline.
		const now = Date.parse(mockRiftOrder.deposit_deadline) - 86_400_000;

		const isForReview = (order: Partial<RiftOrder> = {}) =>
			isRiftOrderForReview({
				order: { ...mockRiftOrder, ...order },
				quote: mockRiftQuote,
				toAddress: mockRiftOrderToAddress,
				refundAddress: mockRiftOrderRefundAddress,
				now
			});

		it('accepts the order created for the review', () => {
			expect(isForReview()).toBeTruthy();
		});

		it('compares the EVM payout address and the ids without case', () => {
			expect(
				isForReview({
					to_address: mockRiftOrderToAddress.toUpperCase().replace('0X', '0x'),
					quote_id: mockRiftOrder.quote_id.toUpperCase()
				})
			).toBeTruthy();
		});

		it.each([
			{ label: 'another quote', order: { quote_id: '01a2175a-1c83-75c3-a6d7-cf88de8274d5' } },
			{ label: 'another source asset', order: { from: 'evm:1.eth' } },
			{ label: 'another destination asset', order: { to: 'evm:8453.eth' } },
			{ label: 'another amount', order: { amount_in: '200001' } },
			{
				label: 'another payout address',
				order: { to_address: '0x0000000000000000000000000000000000000001' }
			},
			{
				label: 'another refund address',
				order: { refund_address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }
			},
			{ label: 'no refund address', order: { refund_address: null } },
			{ label: 'a status past awaiting the deposit', order: { status: 'funded' as const } },
			{ label: 'a deposit already seen', order: { deposit_tx: 'abc' } },
			{ label: 'a deposit address that is not Bitcoin', order: { deposit_address: 'nope' } },
			{
				label: 'a testnet deposit address',
				order: { deposit_address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx' }
			},
			{
				label: "the user's own refund address as the deposit address",
				order: { deposit_address: mockRiftOrderRefundAddress }
			},
			{
				label: 'a deadline that has passed',
				order: { deposit_deadline: new Date(now).toISOString() }
			}
		])('refuses an order with $label', ({ order }) => {
			expect(isForReview(order)).toBeFalsy();
		});
	});

	// From an EVM network: the deposit address is an EVM one, the refund EVM and the payout BTC.
	describe('isRiftOrderForReview from an EVM network', () => {
		const now = Date.parse(mockRiftOrder.deposit_deadline) - 86_400_000;
		const userEvmAddress = mockRiftOrderToAddress;
		const userBtcAddress = mockRiftOrderRefundAddress;
		const quote = {
			...mockRiftQuote,
			from: 'evm:1.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
			to: 'bitcoin.btc'
		};
		const order: RiftOrder = {
			...mockRiftOrder,
			from: quote.from,
			to: quote.to,
			deposit_address: '0x2222222222222222222222222222222222222222',
			to_address: userBtcAddress,
			refund_address: userEvmAddress
		};

		const isForReview = (overrides: Partial<RiftOrder> = {}) =>
			isRiftOrderForReview({
				order: { ...order, ...overrides },
				quote,
				toAddress: userBtcAddress,
				refundAddress: userEvmAddress,
				now
			});

		it('accepts the order, comparing the EVM refund address without case', () => {
			expect(isForReview()).toBeTruthy();
			expect(
				isForReview({ refund_address: userEvmAddress.toUpperCase().replace('0X', '0x') })
			).toBeTruthy();
		});

		it.each([
			{ label: 'a Bitcoin deposit address', overrides: { deposit_address: userBtcAddress } },
			{ label: "the user's own EVM address", overrides: { deposit_address: userEvmAddress } },
			{
				label: 'a BTC payout address in another case',
				overrides: { to_address: userBtcAddress.toUpperCase() }
			}
		])('refuses $label', ({ overrides }) => {
			expect(isForReview(overrides)).toBeFalsy();
		});
	});

	describe('riftSwapRefusedMessage', () => {
		it.each([
			{ reason: 'quoteExpired' as const, expected: en.swap.error.rift_quote_expired },
			{ reason: 'orderRefused' as const, expected: en.swap.error.rift_order_refused },
			{ reason: 'orderUnverified' as const, expected: en.swap.error.rift_order_unverified },
			{ reason: 'orderInFlight' as const, expected: en.swap.error.rift_order_in_flight }
		])('tells the user why for $reason', ({ reason, expected }) => {
			expect(riftSwapRefusedMessage({ err: new RiftSwapRefusedError(reason), i18n: en })).toBe(
				expected
			);
		});

		it('says nothing of any other failure', () => {
			expect(riftSwapRefusedMessage({ err: new Error('boom'), i18n: en })).toBeUndefined();
		});
	});

	describe('isSameRiftAssetId', () => {
		it('compares without case', () => {
			expect(
				isSameRiftAssetId({
					a: 'evm:1.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
					b: `evm:1.${USDC_ETHEREUM}`
				})
			).toBeTruthy();
		});

		it('tells different assets apart', () => {
			expect(isSameRiftAssetId({ a: 'evm:1.eth', b: 'evm:8453.eth' })).toBeFalsy();
		});
	});
});
