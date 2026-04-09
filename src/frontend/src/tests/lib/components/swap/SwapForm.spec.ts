import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import type { IcToken } from '$icp/types/ic-token';
import SwapForm from '$lib/components/swap/SwapForm.svelte';
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
import type { OptionAmount } from '$lib/types/send';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
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

			const { getByTestId } = render(SwapForm, {
				props: {
					...props,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			const button = getByTestId(SWAP_SWITCH_TOKENS_BUTTON);
			if (expected) {
				expect(button).toHaveAttribute('disabled');
			} else {
				expect(button).not.toHaveAttribute('disabled');
			}
		});

		it('should call switchTokens when button is clicked', async () => {
			const swapAmountsStore = setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();

			const resetSpy = vi.spyOn(swapAmountsStore, 'reset');

			const { getByTestId } = render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: 2,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			const button = getByTestId(SWAP_SWITCH_TOKENS_BUTTON);
			await fireEvent.click(button);

			expect(resetSpy).toHaveBeenCalled();
		});
	});

	describe('onTokensSwitch amount handling', () => {
		const token8Dec = {
			...mockValidIcToken,
			enabled: true,
			decimals: 8,
			id: parseTokenId('Token8Dec')
		} as IcToken;

		const token18Dec = {
			...mockValidIcToken,
			enabled: true,
			decimals: 18,
			id: parseTokenId('Token18Dec')
		} as IcToken;

		const setupContextWithTokens = ({
			source,
			destination
		}: {
			source: IcToken;
			destination: IcToken;
		}) => {
			const originalContext = initSwapContext({
				sourceToken: source,
				destinationToken: destination
			});

			mockContext.set(SWAP_CONTEXT_KEY, {
				...originalContext,
				sourceTokenExchangeRate: readable(1),
				destinationTokenExchangeRate: readable(1)
			});
		};

		const renderAndSwitch = async ({
			source,
			destination,
			storeReceiveAmount
		}: {
			source: IcToken;
			destination: IcToken;
			storeReceiveAmount: bigint;
		}) => {
			setupContextWithTokens({ source, destination });
			const swapAmountsStore = setupSwapAmountsStore({
				amountForSwap: 1,
				swaps: mockSwapProviders,
				selectedProvider: {
					...mockSwapProviders[0],
					receiveAmount: storeReceiveAmount
				}
			});
			setupIcTokenFeeStore();

			let swapAmount: OptionAmount = '1';

			const { getByTestId } = render(SwapForm, {
				props: {
					get swapAmount() {
						return swapAmount;
					},
					set swapAmount(v: OptionAmount) {
						swapAmount = v;
					},
					receiveAmount: undefined,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					fee: 1000n,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			const button = getByTestId(SWAP_SWITCH_TOKENS_BUTTON);
			await fireEvent.click(button);

			return { swapAmount, swapAmountsStore };
		};

		it('should preserve amount when source and destination have same decimals', async () => {
			const { swapAmount } = await renderAndSwitch({
				source: token8Dec,
				destination: { ...token8Dec, id: parseTokenId('Token8DecB') } as IcToken,
				storeReceiveAmount: 112345678n
			});

			expect(swapAmount).toBe(1.12345678);
		});

		it('should handle switch with whole number amount', async () => {
			const { swapAmount } = await renderAndSwitch({
				source: token8Dec,
				destination: token18Dec,
				storeReceiveAmount: 100000000000000000000n
			});

			expect(swapAmount).toBe(100);
		});

		it('should handle switch with zero amount', async () => {
			const { swapAmount } = await renderAndSwitch({
				source: token8Dec,
				destination: token18Dec,
				storeReceiveAmount: 0n
			});

			expect(swapAmount).toBe(0);
		});

		it('should handle switch with very small amount', async () => {
			const { swapAmount } = await renderAndSwitch({
				source: token18Dec,
				destination: token8Dec,
				storeReceiveAmount: 1n
			});

			expect(swapAmount).toBe(0.00000001);
		});

		it('should normalize amount through parseToken round-trip on switch', async () => {
			const { swapAmount } = await renderAndSwitch({
				source: token8Dec,
				destination: token18Dec,
				storeReceiveAmount: 1500000000000000000n
			});

			expect(swapAmount).toBe(1.5);
		});
	});

	describe('display values', () => {
		beforeEach(() => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();
		});

		const renderSwapForm = () =>
			render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: 2,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
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

	describe('swap not offered error', () => {
		it('should show error when swap is not offered', () => {
			setupSwapAmountsStore({
				amountForSwap: 1,
				swaps: [],
				selectedProvider: undefined
			});
			setupIcTokenFeeStore();

			const { container } = render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: undefined,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			expect(container.querySelector('.text-error-primary')).toBeInTheDocument();
		});

		it('should not show error when swap amount is 0', () => {
			setupSwapAmountsStore({
				amountForSwap: 0,
				swaps: [],
				selectedProvider: undefined
			});
			setupIcTokenFeeStore();

			const { container } = render(SwapForm, {
				props: {
					swapAmount: '0',
					receiveAmount: undefined,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			expect(container.querySelector('.text-error')).not.toBeInTheDocument();
		});

		it('should not show error when loading', () => {
			setupSwapAmountsStore({
				amountForSwap: 1,
				swaps: [],
				selectedProvider: undefined
			});
			setupIcTokenFeeStore();

			const { container } = render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: undefined,
					slippageValue: undefined,
					isSwapAmountsLoading: true,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			expect(container.querySelector('.text-error')).not.toBeInTheDocument();
		});
	});

	describe('receiveAmount effect', () => {
		it('should update receiveAmount when selectedProvider changes', async () => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();

			let receiveAmount: number | undefined;

			render(SwapForm, {
				props: {
					swapAmount: '1',
					get receiveAmount() {
						return receiveAmount;
					},
					set receiveAmount(value) {
						receiveAmount = value;
					},
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					fee: 1000n,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			await waitFor(() => {
				expect(receiveAmount).toBeDefined();
			});
		});
	});

	describe('loading states', () => {
		it('should show skeleton when fee is not loaded', () => {
			setupSwapAmountsStore(mockSwapAmounts);
			setupIcTokenFeeStore();

			const { container } = render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: 2,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					fee: undefined,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			expect(container.querySelector('.w-14, .w-16')).toBeInTheDocument();
		});

		it('should show loading state for destination amount when swapAmountsLoading is true', () => {
			setupSwapAmountsStore({
				amountForSwap: 2,
				swaps: mockSwapProviders,
				selectedProvider: mockSwapProviders[0]
			});
			setupIcTokenFeeStore();

			const { getAllByTestId } = render(SwapForm, {
				props: {
					swapAmount: '1',
					receiveAmount: 2,
					slippageValue: undefined,
					isSwapAmountsLoading: false,
					fee: 1000n,
					onCustomValidate: vi.fn(),
					onShowTokensList: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn()
				},
				context: mockContext
			});

			const inputs = getAllByTestId(TOKEN_INPUT_CURRENCY_TOKEN);

			expect(inputs[1]).toHaveValue('0');
		});
	});
});
