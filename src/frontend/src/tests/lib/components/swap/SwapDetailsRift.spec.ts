import SwapDetailsRift from '$lib/components/swap/SwapDetailsRift.svelte';
import { initSwapContext, SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import type { RiftQuote } from '$lib/types/rift';
import { SwapProvider } from '$lib/types/swap';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockRiftQuote } from '$tests/mocks/rift.mock';
import { render } from '@testing-library/svelte';

describe('SwapDetailsRift', () => {
	const usdc = {
		...mockValidErc20Token,
		symbol: 'USDC',
		decimals: 6,
		address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
		enabled: true
	};

	const renderDetails = (swapDetails: RiftQuote = mockRiftQuote) => {
		const context = new Map();
		context.set(SWAP_CONTEXT_KEY, initSwapContext({ destinationToken: usdc }));

		return render(SwapDetailsRift, {
			props: {
				provider: {
					provider: SwapProvider.RIFT,
					receiveAmount: BigInt(swapDetails.estimated_amount_out),
					swapDetails
				}
			},
			context
		});
	};

	it('shows the receive amount as an estimate, and no minimum', () => {
		const { getByText, queryByText } = renderDetails();

		expect(getByText(en.swap.text.you_receive_estimate)).toBeInTheDocument();
		expect(
			getByText(`${formatToken({ value: 121_475_958n, unitName: usdc.decimals })} USDC`)
		).toBeInTheDocument();
		expect(queryByText(en.swap.text.expected_minimum)).not.toBeInTheDocument();
	});

	it("shows the route's venues in order", () => {
		const { getByText } = renderDetails();

		expect(getByText(en.swap.text.swap_route)).toBeInTheDocument();
		expect(
			getByText(replacePlaceholders(en.swap.text.rift_route_via, { $venues: 'rift_otc → velora' }))
		).toBeInTheDocument();
	});

	it('leaves the route out when the quote names no venue', () => {
		const { queryByText } = renderDetails({
			...mockRiftQuote,
			route: mockRiftQuote.route.filter(({ type }) => type === 'delivery')
		});

		expect(queryByText(en.swap.text.swap_route)).not.toBeInTheDocument();
	});

	it('shows the delivery cost Rift takes out of the estimate', () => {
		const { getByText, container } = renderDetails();

		expect(getByText(en.swap.text.included_network_fees)).toBeInTheDocument();
		expect(container).toHaveTextContent('0.036528 USDC');
	});

	it('discloses that Rift guarantees no minimum', () => {
		const { getByText } = renderDetails();

		expect(getByText(en.swap.text.rift_estimate_warning)).toBeInTheDocument();
	});
});
