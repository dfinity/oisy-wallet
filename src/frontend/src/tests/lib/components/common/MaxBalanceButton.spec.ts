import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
import { MAX_BUTTON } from '$lib/constants/test-ids.constants';
import { render } from '@testing-library/svelte';

describe('MaxBalanceButton', () => {
	// BTC has 8 decimals: 200_000_000 sat = 2 BTC, 100_000_000 sat = 1 BTC.
	const baseProps = {
		amount: undefined,
		balance: 200_000_000n,
		token: BTC_MAINNET_TOKEN
	};

	it('shows the affordable balance when no cap is set', () => {
		const { getByTestId } = render(MaxBalanceButton, { props: baseProps });

		expect(getByTestId(MAX_BUTTON)).toHaveTextContent('2 BTC');
	});

	it('clamps the max to maxAmount when the balance is higher', () => {
		const { getByTestId } = render(MaxBalanceButton, {
			props: { ...baseProps, maxAmount: 100_000_000n }
		});

		expect(getByTestId(MAX_BUTTON)).toHaveTextContent('1 BTC');
	});

	it('uses the affordable balance when it is below the cap', () => {
		const { getByTestId } = render(MaxBalanceButton, {
			props: { ...baseProps, maxAmount: 500_000_000n }
		});

		expect(getByTestId(MAX_BUTTON)).toHaveTextContent('2 BTC');
	});
});
