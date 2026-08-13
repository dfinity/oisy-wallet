import TradingProviderTag from '$lib/components/trading/TradingProviderTag.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('TradingProviderTag', () => {
	it('should render the provider name', () => {
		const { getByText } = render(TradingProviderTag);

		expect(getByText(en.trading.text.provider_name)).toBeInTheDocument();
	});
});
