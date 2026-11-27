import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import SwapDetailsRift from '$lib/components/swap/SwapDetailsRift.svelte';
import { initSwapContext, SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import type { RiftQuote } from '$lib/types/rift';
import { SwapProvider } from '$lib/types/swap';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockRiftQuote } from '$tests/mocks/rift.mock';
import { fireEvent, render } from '@testing-library/svelte';

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
		context.set(
			SWAP_CONTEXT_KEY,
			initSwapContext({ sourceToken: BTC_MAINNET_TOKEN, destinationToken: usdc })
		);

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

	it('shows the receive amount as an estimate at the offers list precision, and no minimum', () => {
		const { getByText, container } = renderDetails();

		expect(getByText(en.swap.text.you_receive_estimate)).toBeInTheDocument();
		expect(container).toHaveTextContent('121.475958 USDC');
		expect(getByText(en.swap.text.expected_minimum)).toBeInTheDocument();
		expect(getByText(en.swap.text.no_minimum)).toBeInTheDocument();
		expect(getByText(en.swap.text.rift_estimate_warning)).toBeInTheDocument();
	});

	it('shows the expanded token path with venues in quote order', () => {
		const { getByText, getByTitle, getByRole, getAllByRole } = renderDetails();
		const route = getByRole('button', { name: en.swap.text.swap_route });

		expect(route).toHaveAttribute('aria-expanded', 'true');
		expect(getByTitle('BTC on Bitcoin')).toHaveTextContent('BTC');
		expect(getByTitle('kBTC on Ink')).toHaveTextContent('kBTC');
		expect(getByTitle('USDC on Ethereum')).toHaveTextContent('USDC');
		expect(getByText('Rift OTC')).toBeVisible();
		expect(getByText('Velora')).toBeVisible();
		expect(getAllByRole('listitem').map(({ textContent }) => textContent?.trim())).toEqual([
			'BTC on Bitcoin to kBTC on Ink via Rift OTC',
			'kBTC on Ink to USDC on Ethereum via Velora'
		]);
	});

	it('collapses to the number of venue hops', async () => {
		const { getByText, getByRole } = renderDetails();
		const route = getByRole('button', { name: en.swap.text.swap_route });

		await fireEvent.click(route);

		expect(route).toHaveAttribute('aria-expanded', 'false');
		expect(
			getByText(replacePlaceholders(en.swap.text.rift_route_hops, { $count: '2' }))
		).toBeVisible();

		await fireEvent.click(route);

		expect(route).toHaveAttribute('aria-expanded', 'true');
	});

	it('preserves the raw identity of an unknown asset and venue', () => {
		const unknownAsset = 'evm:57073.0x0000000000000000000000000000000000001234';
		const route = mockRiftQuote.route.map((step) => {
			if (step.type === 'delivery') {
				return step;
			}

			return step.venue === 'rift_otc'
				? { ...step, to: unknownAsset, venue: 'new_venue' }
				: { ...step, from: unknownAsset };
		});
		const { getByText, getByTitle } = renderDetails({ ...mockRiftQuote, route });

		expect(getByTitle(unknownAsset)).toHaveTextContent('evm:...1234');
		expect(getByText('new_venue')).toBeInTheDocument();
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

	it('shows an 18-decimal delivery cost with at most 8 decimals', () => {
		const eth = { ...usdc, symbol: 'ETH', decimals: 18 };
		const context = new Map();
		context.set(
			SWAP_CONTEXT_KEY,
			initSwapContext({ sourceToken: BTC_MAINNET_TOKEN, destinationToken: eth })
		);

		const { container } = render(SwapDetailsRift, {
			props: {
				provider: {
					provider: SwapProvider.RIFT,
					receiveAmount: 1_000_000_000_000_000_000n,
					swapDetails: { ...mockRiftQuote, estimated_execution_cost: '579859545132401' }
				}
			},
			context
		});

		expect(container).not.toHaveTextContent('0.000579859545132401');
		expect(container).toHaveTextContent(
			`${formatToken({ value: 579_859_545_132_401n, unitName: 18, displayDecimals: 8 })} ETH`
		);
	});
});
