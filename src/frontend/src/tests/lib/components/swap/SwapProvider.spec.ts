import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
import { SWAP_PROVIDER_ANIMATION, SWAP_PROVIDER_CELL } from '$lib/constants/test-ids.constants';
import { screensStore } from '$lib/stores/screens.store';
import { initSwapAmountsStore, SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import { initSwapQuoteActivityStore } from '$lib/stores/swap-quote-activity.store';
import { SwapProvider as SwapProviderKey, type SwapMappedResult } from '$lib/types/swap';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockSwapContextEntry } from '$tests/utils/swap.context.test-utils';
import { fireEvent, render } from '@testing-library/svelte';

const offer: SwapMappedResult = {
	provider: SwapProviderKey.ICP_SWAP,
	receiveAmount: 100_000_000n,
	receiveOutMinimum: 99_000_000n,
	swapDetails: { receiveAmount: 100_000_000n }
};

describe('SwapProvider', () => {
	const store = initSwapAmountsStore();
	const activity = initSwapQuoteActivityStore();
	const context = mockContextMap([
		[SWAP_AMOUNTS_CONTEXT_KEY, { store, activity }],
		mockSwapContextEntry({ sourceToken: mockValidIcToken, destinationToken: mockValidIcToken })
	]);
	const props = { slippageValue: '0.5' };

	beforeEach(() => {
		store.reset();
		activity.reset();
		screensStore.set('md');
	});

	it('leaves the Review label and details unchanged during quote activity', async () => {
		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		activity.start({ requestId: 8, background: false });
		const { getByText, queryByText, queryByTestId, getByTestId } = render(SwapProvider, {
			props,
			context
		});

		expect(getByText(en.swap.text.swap_provider)).toBeInTheDocument();
		expect(queryByText(en.swap.text.smart_swap)).not.toBeInTheDocument();
		expect(queryByText(en.swap.text.finding_best_rate)).not.toBeInTheDocument();
		expect(queryByTestId(SWAP_PROVIDER_ANIMATION)).not.toBeInTheDocument();
		expect(queryByTestId(SWAP_PROVIDER_CELL)).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('collapsible-header'));

		expect(getByTestId('collapsible-content')).toHaveClass('expanded');
		expect(getByText(en.swap.text.swap_provider_website)).toBeInTheDocument();
	});

	it('shows Best Rate on Review for a single offer', () => {
		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });
		const { getByText } = render(SwapProvider, { props, context });

		expect(getByText(en.swap.text.best_rate)).toBeInTheDocument();
	});
});
