import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
import TradingOnboarding from '$lib/components/trading/TradingOnboarding.svelte';
import { OISY_TRADE_LEARN_MORE_URL } from '$lib/constants/oisy-trade.constants';
import { TRADING_ONBOARDING_DEPOSIT_BUTTON } from '$lib/constants/test-ids.constants';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('TradingOnboarding', () => {
	const buildPair = ({ base, quote }: { base: string; quote: string }): TradingPairInfo =>
		({
			base: { metadata: { symbol: base } },
			quote: { metadata: { symbol: quote } }
		}) as unknown as TradingPairInfo;

	beforeEach(() => {
		oisyTradeStore.reset();
	});

	it('should render the onboarding title, description and steps', () => {
		const { getByText } = render(TradingOnboarding, { props: { onDeposit: () => {} } });

		expect(getByText(en.trading.onboarding.title)).toBeInTheDocument();
		expect(getByText(en.trading.onboarding.description)).toBeInTheDocument();
		expect(getByText(en.trading.onboarding.step_deposit)).toBeInTheDocument();
		expect(getByText(en.trading.onboarding.step_order)).toBeInTheDocument();
		expect(getByText(en.trading.onboarding.step_withdraw)).toBeInTheDocument();
	});

	it('should render the supported token symbols from the store', () => {
		oisyTradeStore.set({
			pairs: [buildPair({ base: 'ICP', quote: 'ckBTC' })],
			supportedTokens: undefined,
			balances: undefined
		});

		const { getByText } = render(TradingOnboarding, { props: { onDeposit: () => {} } });

		expect(getByText('ICP')).toBeInTheDocument();
		expect(getByText('ckBTC')).toBeInTheDocument();
	});

	it('should call onDeposit when the deposit button is clicked', async () => {
		const onDeposit = vi.fn();

		const { getByTestId } = render(TradingOnboarding, { props: { onDeposit } });

		await fireEvent.click(getByTestId(TRADING_ONBOARDING_DEPOSIT_BUTTON));

		expect(onDeposit).toHaveBeenCalledOnce();
	});

	it('should render a learn-more link pointing to the trade docs', () => {
		const { getByText } = render(TradingOnboarding, { props: { onDeposit: () => {} } });

		const link = getByText(en.trading.text.learn_more).closest('a');

		expect(link).toHaveAttribute('href', OISY_TRADE_LEARN_MORE_URL);
	});
});
