import OisyTradeInfoBox from '$lib/components/trading/OisyTradeInfoBox.svelte';
import { OISY_TRADE_LEARN_MORE_URL } from '$lib/constants/oisy-trade.constants';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('OisyTradeInfoBox', () => {
	it('renders the heading, description and the three facts', () => {
		const { getByText } = render(OisyTradeInfoBox);

		expect(getByText(en.trading.info.title)).toBeInTheDocument();
		expect(getByText(en.trading.info.description)).toBeInTheDocument();
		expect(getByText(en.trading.info.fact_1_title)).toBeInTheDocument();
		expect(getByText(en.trading.info.fact_2_title)).toBeInTheDocument();
		expect(getByText(en.trading.info.fact_3_title)).toBeInTheDocument();
	});

	it('links "Visit website" to the OISY Trade docs URL', () => {
		const { getByText } = render(OisyTradeInfoBox);

		expect(getByText(en.trading.info.visit_website).closest('a')).toHaveAttribute(
			'href',
			OISY_TRADE_LEARN_MORE_URL
		);
	});

	it('exposes the "oisy-trade-info" scroll target for the hero Learn more link', () => {
		const { container } = render(OisyTradeInfoBox);

		expect(container.querySelector('#oisy-trade-info')).not.toBeNull();
	});
});
