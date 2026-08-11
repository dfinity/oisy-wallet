import SwapDetailsVelora from '$lib/components/swap/SwapDetailsVelora.svelte';
import { SwapProvider, VeloraSwapTypes } from '$lib/types/swap';
import en from '$tests/mocks/i18n.mock';
import { mockVeloraDeltaPrice, mockVeloraOptimalRate } from '$tests/mocks/velora.mock';
import { render } from '@testing-library/svelte';

describe('SwapDetailsVelora', () => {
	const baseProvider = {
		provider: SwapProvider.VELORA,
		receiveAmount: 1_000_000n
	} as const;

	it('displays the swap details for Delta Swap', () => {
		const provider = {
			...baseProvider,
			type: VeloraSwapTypes.DELTA,
			swapDetails: mockVeloraDeltaPrice
		} as const;

		const { getByText, queryByText } = render(SwapDetailsVelora, {
			props: { provider }
		});

		expect(getByText(en.swap.text.swap_route)).toBeInTheDocument();

		expect(getByText('Delta')).toBeInTheDocument();

		expect(getByText(en.swap.text.network_cost)).toBeInTheDocument();
		expect(getByText(en.swap.text.gasless)).toBeInTheDocument();

		expect(getByText(en.swap.text.swap_fees)).toBeInTheDocument();
		expect(getByText('$0.00')).toBeInTheDocument();

		expect(queryByText('Market')).not.toBeInTheDocument();
	});

	it('Displays the swap details for Market Swap', () => {
		const provider = {
			...baseProvider,
			type: VeloraSwapTypes.MARKET,
			swapDetails: mockVeloraOptimalRate
		} as const;

		const { getByText, queryByText } = render(SwapDetailsVelora, {
			props: { provider }
		});

		expect(getByText(en.swap.text.swap_route)).toBeInTheDocument();

		expect(getByText('Market')).toBeInTheDocument();

		expect(queryByText(en.swap.text.network_cost)).not.toBeInTheDocument();
		expect(queryByText(en.swap.text.gasless)).not.toBeInTheDocument();
		expect(queryByText(en.swap.text.swap_fees)).not.toBeInTheDocument();
		expect(queryByText('$0.00')).not.toBeInTheDocument();
	});
});
