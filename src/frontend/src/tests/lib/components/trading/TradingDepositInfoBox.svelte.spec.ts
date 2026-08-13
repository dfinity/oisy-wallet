import TradingDepositInfoBox from '$lib/components/trading/TradingDepositInfoBox.svelte';
import { OISY_TRADE_LEARN_MORE_URL } from '$lib/constants/oisy-trade.constants';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('TradingDepositInfoBox', () => {
	it('should render the info title and description', () => {
		const { getByText } = render(TradingDepositInfoBox);

		expect(getByText(en.trading.deposit.info_title)).toBeInTheDocument();
		expect(getByText(en.trading.deposit.info_description)).toBeInTheDocument();
	});

	it('should render a learn-more link pointing to the trade docs', () => {
		const { getByText } = render(TradingDepositInfoBox);

		const link = getByText(en.trading.text.learn_more).closest('a');

		expect(link).toHaveAttribute('href', OISY_TRADE_LEARN_MORE_URL);
	});
});
