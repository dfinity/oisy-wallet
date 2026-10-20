import SwapDetailsLifi from '$lib/components/swap/SwapDetailsLifi.svelte';
import { initSwapContext, SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { SwapProvider } from '$lib/types/swap';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockLifiBaseUsdcToken, mockLifiQuote } from '$tests/mocks/lifi.mock';
import type { LiFiStep } from '@lifi/sdk';
import { render } from '@testing-library/svelte';

describe('SwapDetailsLifi', () => {
	const mockContext = new Map();

	mockContext.set(SWAP_CONTEXT_KEY, initSwapContext({ destinationToken: mockLifiBaseUsdcToken }));

	const providerWith = (swapDetails: LiFiStep) => ({
		provider: SwapProvider.LIFI as const,
		receiveAmount: 25_003_034n,
		receiveOutMinimum: 24_878_019n,
		swapDetails
	});

	const withEstimate = (estimate: Partial<LiFiStep['estimate']>): LiFiStep => ({
		...mockLifiQuote,
		estimate: { ...mockLifiQuote.estimate, ...estimate }
	});

	const renderDetails = (swapDetails: LiFiStep) =>
		render(SwapDetailsLifi, {
			props: { provider: providerWith(swapDetails) },
			context: mockContext
		});

	it("should show LI.FI's own minimum, not one derived from the slippage", () => {
		const { getByText } = renderDetails(mockLifiQuote);

		expect(getByText(en.swap.text.expected_minimum)).toBeInTheDocument();
		expect(
			getByText(
				`${formatToken({ value: 24_878_019n, unitName: mockLifiBaseUsdcToken.decimals })} ${mockLifiBaseUsdcToken.symbol}`
			)
		).toBeInTheDocument();
	});

	it('should show the route tool without a duration for a same-chain swap', () => {
		const { getByText } = renderDetails(mockLifiQuote);

		expect(getByText(en.swap.text.swap_route)).toBeInTheDocument();
		expect(
			getByText(replacePlaceholders(en.swap.text.lifi_route_via, { $tool: 'Nordstern' }))
		).toBeInTheDocument();
	});

	it('should show the estimated duration in minutes, rounded up', () => {
		const { getByText } = renderDetails(withEstimate({ executionDuration: 150 }));

		expect(
			getByText(
				replacePlaceholders(en.swap.text.lifi_route_via_estimated_time, {
					$tool: 'Nordstern',
					$minutes: '3'
				})
			)
		).toBeInTheDocument();
	});

	it('should show the fees when the quote lists them', () => {
		const fee = {
			name: 'LIFI Fixed Fee',
			description: 'Fixed LI.FI fee',
			percentage: '0.0025',
			token: mockLifiQuote.action.fromToken,
			amount: '25000000000000',
			amountUSD: '0.0625',
			included: true
		};

		const { getByText } = renderDetails(withEstimate({ feeCosts: [fee] }));

		expect(getByText(en.swap.text.swap_fees)).toBeInTheDocument();
		expect(getByText('$0.06')).toBeInTheDocument();
	});

	it('should not show fees when the quote lists none', () => {
		const { queryByText } = renderDetails(mockLifiQuote);

		expect(queryByText(en.swap.text.swap_fees)).not.toBeInTheDocument();
	});
});
