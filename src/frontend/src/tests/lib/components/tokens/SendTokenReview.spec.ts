import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
import { render } from '@testing-library/svelte';

describe('SendTokenReview', () => {
	const props = {
		token: BTC_MAINNET_TOKEN,
		sendAmount: 10,
		exchangeRate: 2
	};

	it('renders data correctly', () => {
		const { container } = render(SendTokenReview, {
			props
		});

		expect(container).toHaveTextContent(`${props.sendAmount} ${props.token.symbol}`);

		expect(container).toHaveTextContent(`~$${props.sendAmount * props.exchangeRate}`);
	});
});
