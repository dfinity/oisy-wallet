import type { TradingPair } from '$declarations/oisy_trade/oisy_trade.did';
import SwapDetailsOisyTrade from '$lib/components/swap/SwapDetailsOisyTrade.svelte';
import { ZERO } from '$lib/constants/app.constants';
import type { OisyTradeSwapDetails } from '$lib/types/oisy-trade-swap';
import { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('SwapDetailsOisyTrade', () => {
	const quoteToken: Token = {
		...mockValidErc20Token,
		id: parseTokenId('ckUSDC'),
		decimals: 6,
		symbol: 'ckUSDC'
	};

	const baseToken: Token = {
		...mockValidErc20Token,
		id: parseTokenId('ICP'),
		decimals: 8,
		symbol: 'ICP'
	};

	const order: OisyTradeSwapDetails['order'] = {
		side: 'sell',
		pair: {} as unknown as TradingPair,
		price: 10_000_000n,
		quantity: 200_000_000n,
		depositAmount: 200_000_000n
	};

	const makeProvider = (swapDetails: Partial<OisyTradeSwapDetails> = {}) => ({
		provider: SwapProvider.OISY_TRADE as const,
		receiveAmount: 20_000_000n,
		swapDetails: {
			fees: [],
			takerFeeBps: 10,
			minNotional: 5_000_000n,
			quoteToken,
			order,
			...swapDetails
		}
	});

	it('renders the taker rate and never the maker rate', () => {
		const { getByText, queryByText } = render(SwapDetailsOisyTrade, {
			props: { provider: makeProvider({ takerFeeBps: 10 }) }
		});

		// A fill-or-kill order can never rest, so the maker row would be a rate the
		// user cannot reach.
		expect(getByText(en.trading.limit_order.fee_taker)).toBeInTheDocument();
		expect(queryByText(en.trading.limit_order.fee_maker_taker)).not.toBeInTheDocument();
		expect(getByText('0.1%')).toBeInTheDocument();
	});

	it('renders the fill-or-kill order type', () => {
		const { getByText } = render(SwapDetailsOisyTrade, {
			props: { provider: makeProvider() }
		});

		expect(getByText(en.trading.limit_order.order_type_fok)).toBeInTheDocument();
	});

	it('renders one row per fee and never sums them, even across two tokens', () => {
		const { getByText, queryByText } = render(SwapDetailsOisyTrade, {
			props: {
				provider: makeProvider({
					fees: [
						{
							labelPath: 'swap.text.oisy_trade_deposit_fee',
							fee: 20_000n,
							token: baseToken
						},
						{
							labelPath: 'swap.text.oisy_trade_taker_fee',
							fee: 20_000n,
							token: quoteToken
						},
						{
							labelPath: 'swap.text.oisy_trade_withdrawal_fee',
							fee: 10_000n,
							token: quoteToken
						}
					]
				})
			}
		});

		expect(getByText(en.swap.text.oisy_trade_deposit_fee)).toBeInTheDocument();
		expect(getByText(en.swap.text.oisy_trade_taker_fee)).toBeInTheDocument();
		expect(getByText(en.swap.text.oisy_trade_withdrawal_fee)).toBeInTheDocument();

		// The two same-token fees stay separate: 0.02 + 0.01 must not appear as 0.03.
		expect(queryByText('0.03 ckUSDC')).not.toBeInTheDocument();
	});

	it('renders a zero fee as free rather than dropping the row', () => {
		const { getByText } = render(SwapDetailsOisyTrade, {
			props: {
				provider: makeProvider({
					fees: [
						{
							labelPath: 'swap.text.oisy_trade_taker_fee',
							fee: ZERO,
							token: quoteToken
						}
					]
				})
			}
		});

		expect(getByText(en.swap.text.oisy_trade_taker_fee)).toBeInTheDocument();
		expect(getByText(en.fee.text.zero_fee)).toBeInTheDocument();
	});

	it('renders the minimum notional in quote-token units', () => {
		const { getByText } = render(SwapDetailsOisyTrade, {
			props: { provider: makeProvider({ minNotional: 5_000_000n }) }
		});

		expect(getByText(en.swap.text.oisy_trade_minimum_notional)).toBeInTheDocument();
		expect(getByText('5 ckUSDC')).toBeInTheDocument();
	});

	it('renders the minimum notional at full precision rather than the default rounding', () => {
		// The floor is what the canister enforces, so the sheet must state it exactly
		// rather than the 4-decimal display default.
		const { getByText, queryByText } = render(SwapDetailsOisyTrade, {
			props: { provider: makeProvider({ minNotional: 5_123_456n }) }
		});

		expect(getByText('5.123456 ckUSDC')).toBeInTheDocument();
		expect(queryByText('5.1235 ckUSDC')).not.toBeInTheDocument();
	});
});
