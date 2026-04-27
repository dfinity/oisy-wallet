import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import SwapDetailsNearIntents from '$lib/components/swap/SwapDetailsNearIntents.svelte';
import * as userProviderAgreementsDerived from '$lib/derived/user-provider-agreements.derived';
import { initSwapContext, SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import type { NearIntentsQuoteResponse } from '$lib/types/near-intents';
import { SwapProvider } from '$lib/types/swap';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockNearIntentsQuoteResponse } from '$tests/mocks/near-intents.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('SwapDetailsNearIntents', () => {
	const mockContext = new Map();

	mockContext.set(
		SWAP_CONTEXT_KEY,
		initSwapContext({
			destinationToken: ICP_TOKEN
		})
	);

	const baseProvider = {
		provider: SwapProvider.NEAR_INTENTS as const,
		receiveAmount: 900_000n,
		receiveOutMinimum: 891_000n,
		swapDetails: mockNearIntentsQuoteResponse
	};

	it('renders expected minimum correctly', () => {
		const { getByText } = render(SwapDetailsNearIntents, {
			props: {
				provider: baseProvider,
				slippageValue: 5
			},
			context: mockContext
		});

		expect(getByText(en.swap.text.expected_minimum)).toBeInTheDocument();
	});

	it('renders estimated time when timeEstimate is set', () => {
		const { getByText } = render(SwapDetailsNearIntents, {
			props: {
				provider: baseProvider,
				slippageValue: 5
			},
			context: mockContext
		});

		expect(getByText(en.swap.text.swap_route)).toBeInTheDocument();
		expect(
			getByText(replacePlaceholders(en.swap.text.near_intents_estimated_time, { $minutes: '2' }))
		).toBeInTheDocument();
	});

	it('does not render expected minimum when slippage is undefined', () => {
		const { queryByText } = render(SwapDetailsNearIntents, {
			props: {
				provider: baseProvider,
				slippageValue: undefined
			},
			context: mockContext
		});

		expect(queryByText(en.swap.text.expected_minimum)).not.toBeInTheDocument();
	});

	it('does not render estimated time when timeEstimate is 0', () => {
		const providerNoTime = {
			...baseProvider,
			swapDetails: {
				...mockNearIntentsQuoteResponse,
				quote: { ...mockNearIntentsQuoteResponse.quote, timeEstimate: 0 }
			} as NearIntentsQuoteResponse
		};

		const { queryByText } = render(SwapDetailsNearIntents, {
			props: {
				provider: providerNoTime,
				slippageValue: 5
			},
			context: mockContext
		});

		expect(queryByText('NEAR Intents')).not.toBeInTheDocument();
	});

	it('renders ToS inside collapsible when user has acknowledged', () => {
		vi.spyOn(
			userProviderAgreementsDerived,
			'hasAcknowledgedNearIntentsSwap',
			'get'
		).mockReturnValue(readable(true));

		const { container } = render(SwapDetailsNearIntents, {
			props: {
				provider: baseProvider,
				slippageValue: 5
			},
			context: mockContext
		});

		expect(container.textContent).toContain('Terms of Service');
	});

	it('does not render ToS inside collapsible when user has not acknowledged', () => {
		vi.spyOn(
			userProviderAgreementsDerived,
			'hasAcknowledgedNearIntentsSwap',
			'get'
		).mockReturnValue(readable(false));

		const { container } = render(SwapDetailsNearIntents, {
			props: {
				provider: baseProvider,
				slippageValue: 5
			},
			context: mockContext
		});

		expect(container.textContent).not.toContain('Terms of Service');
	});
});
