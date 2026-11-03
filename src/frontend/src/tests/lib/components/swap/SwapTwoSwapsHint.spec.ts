import { NVDA_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens-erc20/tokens.nvda.env';
import { USDG_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens-erc20/tokens.usdg.env';
import SwapTwoSwapsHint from '$lib/components/swap/SwapTwoSwapsHint.svelte';
import { SWAP_TWO_SWAPS_HINT, SWAP_TWO_SWAPS_HINT_BUTTON } from '$lib/constants/test-ids.constants';
import { trackSwapTwoSwapsHint } from '$lib/services/swap-two-swaps-hint-analytics.services';
import {
	SWAP_AMOUNTS_CONTEXT_KEY,
	initSwapAmountsStore,
	type SwapAmountsStore
} from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext, type SwapContext } from '$lib/stores/swap.store';
import { SwapProvider } from '$lib/types/swap';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockLifiBaseUsdcToken } from '$tests/mocks/lifi.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$lib/services/swap-two-swaps-hint-analytics.services', () => ({
	trackSwapTwoSwapsHint: vi.fn()
}));

describe('SwapTwoSwapsHint', () => {
	const sourceToken = mockLifiBaseUsdcToken;
	const destinationToken = NVDA_TOKEN;
	const intermediateToken = USDG_TOKEN;

	const props = { intermediateToken, provider: SwapProvider.LIFI };

	const tokens = { sourceToken, destinationToken, intermediateToken };

	let swapContext: SwapContext;
	let swapAmountsStore: SwapAmountsStore;
	let context: Map<symbol, unknown>;

	beforeEach(() => {
		vi.clearAllMocks();

		swapContext = initSwapContext({ sourceToken, destinationToken });

		swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwaps({
			swaps: [],
			amountForSwap: 1,
			quoteError: { type: 'two-swaps', intermediateToken, provider: SwapProvider.LIFI }
		});

		context = new Map<symbol, unknown>([
			[SWAP_CONTEXT_KEY, swapContext],
			[SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore }]
		]);
	});

	it('should name the two separate swaps', () => {
		const { getByTestId } = render(SwapTwoSwapsHint, { props, context });

		expect(getByTestId(SWAP_TWO_SWAPS_HINT)).toHaveTextContent(
			replacePlaceholders(replaceOisyPlaceholders(en.swap.text.two_swaps_info), {
				$sourceSymbol: 'USDC',
				$destinationSymbol: 'NVDA',
				$intermediateSymbol: 'USDG'
			})
		);
		expect(getByTestId(SWAP_TWO_SWAPS_HINT_BUTTON)).toHaveTextContent(
			replacePlaceholders(en.swap.text.two_swaps_first_button, { $intermediateSymbol: 'USDG' })
		);
	});

	it('should name no amount', () => {
		const { getByTestId } = render(SwapTwoSwapsHint, { props, context });

		expect(getByTestId(SWAP_TWO_SWAPS_HINT).textContent).not.toMatch(/\d/);
	});

	it('should set up the first swap: the same source, to the in-between token', async () => {
		const { getByTestId } = render(SwapTwoSwapsHint, { props, context });

		await fireEvent.click(getByTestId(SWAP_TWO_SWAPS_HINT_BUTTON));

		expect(get(swapContext.sourceToken)).toBe(sourceToken);
		expect(get(swapContext.destinationToken)).toBe(intermediateToken);
		// The offers for the old pair are gone before the new one is quoted.
		expect(get(swapAmountsStore)).toBeNull();
	});

	it('should track that it showed once, however often it shows again', async () => {
		const { rerender, unmount } = render(SwapTwoSwapsHint, { props, context });

		await rerender({ ...props });

		unmount();

		render(SwapTwoSwapsHint, { props, context });

		expect(trackSwapTwoSwapsHint).toHaveBeenCalledExactlyOnceWith({
			action: 'show',
			provider: SwapProvider.LIFI,
			...tokens
		});
	});

	it('should track it again for another in-between token', () => {
		const { unmount } = render(SwapTwoSwapsHint, { props, context });

		unmount();

		render(SwapTwoSwapsHint, { props: { ...props, intermediateToken: NVDA_TOKEN }, context });

		expect(trackSwapTwoSwapsHint).toHaveBeenCalledTimes(2);
		expect(trackSwapTwoSwapsHint).toHaveBeenLastCalledWith({
			action: 'show',
			provider: SwapProvider.LIFI,
			sourceToken,
			destinationToken,
			intermediateToken: NVDA_TOKEN
		});
	});

	it('should track it again for another amount', () => {
		const { unmount } = render(SwapTwoSwapsHint, { props, context });

		unmount();

		swapAmountsStore.setSwaps({
			swaps: [],
			amountForSwap: 2,
			quoteError: { type: 'two-swaps', intermediateToken, provider: SwapProvider.LIFI }
		});

		render(SwapTwoSwapsHint, { props, context });

		expect(trackSwapTwoSwapsHint).toHaveBeenCalledTimes(2);
	});

	it('should track a press of its button', async () => {
		const { getByTestId } = render(SwapTwoSwapsHint, { props, context });

		await fireEvent.click(getByTestId(SWAP_TWO_SWAPS_HINT_BUTTON));

		expect(trackSwapTwoSwapsHint).toHaveBeenCalledWith({
			action: 'click',
			provider: SwapProvider.LIFI,
			...tokens
		});
	});
});
