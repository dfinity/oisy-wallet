import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import NewSwapForm from '$lib/components/swap/NewSwapForm.svelte';
import {
	SWAP_SWITCH_TOKENS_BUTTON,
	TOKEN_INPUT_AMOUNT_EXCHANGE_BUTTON,
	TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import {
	SWAP_AMOUNTS_CONTEXT_KEY,
	initSwapAmountsStore,
	type SwapAmountsStoreData
} from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('SwapForm', () => {
	const mockContext = new Map();

	const mockSwapAmounts: SwapAmountsStoreData = {
		amountForSwap: 1,
		swaps: mockSwapProviders,
		selectedProvider: mockSwapProviders[0]
	};

	beforeEach(() => {
		const mockToken = { ...mockValidIcToken, enabled: true };

		const originalContext = initSwapContext({
			sourceToken: mockToken,
			destinationToken: mockToken
		});

		const mockSwapContext = {
			...originalContext,
			sourceTokenExchangeRate: readable(10),
			destinationTokenExchangeRate: readable(2)
		};

		mockContext.set(SWAP_CONTEXT_KEY, mockSwapContext);
	});

	const setupSwapAmountsStore = (swapAmounts?: SwapAmountsStoreData) => {
		const swapAmountsStore = initSwapAmountsStore();
		if (swapAmounts) {
			swapAmountsStore.setSwaps(swapAmounts);
		}
		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });
		return swapAmountsStore;
	};

	const setupIcTokenFeeStore = () => {
		icTokenFeeStore.setIcTokenFee({
			tokenSymbol: mockValidIcToken.symbol,
			fee: 1000n
		});
		mockContext.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });
	};

	describe('switch tokens button', () => {
		it.each([
			{
				description: 'no swapAmount present',
				swapAmounts: undefined,
				props: { swapAmount: undefined, receiveAmount: undefined },
				expected: false
			},
			{
				description: 'swap amounts are loading',
				swapAmounts: mockSwapAmounts,
				props: { swapAmount: '2', receiveAmount: 2 },
				expected: true
			},
			{
				description: 'swap amount exists but receive amount is null',
				swapAmounts: { amountForSwap: 1, swaps: [], selectedProvider: undefined },
				props: { swapAmount: '1', receiveAmount: undefined },
				expected: true
			},
			{
				description: 'both amounts are set and not loading',
				swapAmounts: mockSwapAmounts,
				props: { swapAmount: '1', receiveAmount: 2 },
				expected: false
			}
		])('should handle button state when $description', ({ swapAmounts, props, expected }) => {
			setupSwapAmountsStore(swapAmounts as SwapAmountsStoreData);
			setupIcTokenFeeStore();

			const { getByTestId } = render(NewSwapForm, {
				props: { ...props, slippageValue: undefined, isSwapAmountsLoading: false },
				context: mockContext
			});

			const button = getByTestId(SWAP_SWITCH_TOKENS_BUTTON);
			if (expected) {
				expect(button).toHaveAttribute('disabled');
			} else {
				expect(button).not.toHaveAttribute('disabled');
			}
		});
	});

	describe('display values', () => {
		beforeEach(() => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();
		});

		const renderSwapForm = () =>
			render(NewSwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: 2,
					slippageValue: undefined,
					isSwapAmountsLoading: false
				},
				context: mockContext
			});

		it('should display initial token and USD values correctly', () => {
			const { getAllByTestId } = renderSwapForm();
			const [sourceTokenExchangeValue, destinationTokenExchangeValue] = getAllByTestId(
				TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE
			);
			const [sourceInput, destinationInput] = getAllByTestId(TOKEN_INPUT_CURRENCY_TOKEN);

			expect(sourceTokenExchangeValue).toHaveTextContent('$10.00');
			expect(destinationTokenExchangeValue).toHaveTextContent('$20.00');
			expect(sourceInput).toHaveValue('1');
			expect(destinationInput).toHaveValue('10');
		});

		it.each([
			{ description: 'source', buttonIndex: 0 },
			{ description: 'destination', buttonIndex: 1 }
		])(
			'should switch between USD and token values when clicking $description exchange',
			async ({ buttonIndex }) => {
				const { getAllByTestId } = renderSwapForm();
				const buttons = getAllByTestId(TOKEN_INPUT_AMOUNT_EXCHANGE_BUTTON);
				const [sourceTokenExchangeValue, destinationTokenExchangeValue] = getAllByTestId(
					TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE
				);
				const [sourceInput, destinationInput] = getAllByTestId(TOKEN_INPUT_CURRENCY_TOKEN);

				const button = buttons[buttonIndex];

				await fireEvent.click(button);

				expect(sourceTokenExchangeValue).toHaveTextContent(`1 ${mockValidIcToken.symbol}`);
				expect(destinationTokenExchangeValue).toHaveTextContent(`10 ${mockValidIcCkToken.symbol}`);
				expect(sourceInput).toHaveValue('1');
				expect(destinationInput).toHaveValue('10');

				await fireEvent.click(button);

				expect(sourceTokenExchangeValue).toHaveTextContent('$10.00');
				expect(destinationTokenExchangeValue).toHaveTextContent('$20.00');
				expect(sourceInput).toHaveValue('1');
				expect(destinationInput).toHaveValue('10');
			}
		);
	});
});
