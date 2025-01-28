import SwapForm from '$lib/components/swap/SwapForm.svelte';
import { SWAP_SWITCH_TOKENS_BUTTON } from '$lib/constants/test-ids.constants';
import { initSwapAmountsStore, SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import { initSwapContext, SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('SwapForm', () => {
	const mockContext = new Map();

	beforeEach(() => {
		mockContext.set(
			SWAP_CONTEXT_KEY,
			initSwapContext({
				sourceToken: mockValidIcToken,
				destinationToken: mockValidIcCkToken
			})
		);
	});

	it('should not disable button if no swapAmount is present', () => {
		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, {
			store: initSwapAmountsStore()
		});

		const { getByTestId } = render(SwapForm, {
			props: {
				swapAmount: undefined,
				receiveAmount: undefined,
				slippageValue: undefined
			},
			context: mockContext
		});

		const button = getByTestId(SWAP_SWITCH_TOKENS_BUTTON);
		expect(button).not.toHaveAttribute('disabled');
	});

	it('should disable switch tokens button when swap amounts are loading', () => {
		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwapAmounts({
			amountForSwap: 1,
			swapAmounts: {
				slippage: 0,
				receiveAmount: 2000000n,
				liquidityProvidersFee: undefined,
				gasFee: undefined
			}
		});

		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, {
			store: swapAmountsStore
		});

		const { getByTestId } = render(SwapForm, {
			props: {
				swapAmount: '2',
				receiveAmount: 2,
				slippageValue: undefined
			},
			context: mockContext
		});

		const button = getByTestId(SWAP_SWITCH_TOKENS_BUTTON);
		expect(button).toHaveAttribute('disabled');
	});

	it('should disable switch tokens button when swap amount exists but receive amount is null', () => {
		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwapAmounts({
			amountForSwap: 1,
			swapAmounts: undefined
		});

		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, {
			store: swapAmountsStore
		});

		const { getByTestId } = render(SwapForm, {
			props: {
				swapAmount: '1',
				receiveAmount: undefined,
				slippageValue: undefined
			},
			context: mockContext
		});

		const button = getByTestId(SWAP_SWITCH_TOKENS_BUTTON);
		expect(button).toHaveAttribute('disabled');
	});

	it('should enable switch tokens button when both amounts are set and not loading', () => {
		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwapAmounts({
			amountForSwap: 1,
			swapAmounts: {
				slippage: 0,
				receiveAmount: 2000000n,
				liquidityProvidersFee: undefined,
				gasFee: undefined
			}
		});

		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, {
			store: swapAmountsStore
		});

		const { getByTestId } = render(SwapForm, {
			props: {
				swapAmount: '1',
				receiveAmount: 2,
				slippageValue: undefined
			},
			context: mockContext
		});

		const button = getByTestId(SWAP_SWITCH_TOKENS_BUTTON);
		expect(button).not.toHaveAttribute('disabled');
	});
});
