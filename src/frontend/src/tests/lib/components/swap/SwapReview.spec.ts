import SwapReview from '$lib/components/swap/SwapReview.svelte';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, type SwapContext, type SwapError } from '$lib/stores/swap.store';
import { SwapErrorCodes } from '$lib/types/swap';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { fireEvent, render } from '@testing-library/svelte';
import { readable, writable, type Writable } from 'svelte/store';

describe('SwapReview', () => {
	const mockSourceToken = { ...mockValidIcToken, enabled: true };
	const mockDestToken = { ...mockValidIcCkToken, enabled: true };

	const mockSwapFees = createMockSnippet('swap-fees-snippet');

	const createSwapContext = (
		params: {
			sourceTokenExchangeRate?: number;
			destinationTokenExchangeRate?: number;
			failedSwapError?: SwapError;
		} = {}
	): { context: Map<symbol, unknown>; failedSwapErrorStore: Writable<SwapError | undefined> } => {
		const sourceTokenExchangeRate =
			'sourceTokenExchangeRate' in params ? params.sourceTokenExchangeRate : 10;
		const destinationTokenExchangeRate =
			'destinationTokenExchangeRate' in params ? params.destinationTokenExchangeRate : 20;

		const failedSwapErrorStore = writable<SwapError | undefined>(params.failedSwapError);

		const swapContext: Partial<SwapContext> = {
			sourceToken: readable(mockSourceToken),
			destinationToken: readable(mockDestToken),
			sourceTokenExchangeRate: readable(sourceTokenExchangeRate),
			destinationTokenExchangeRate: readable(destinationTokenExchangeRate),
			failedSwapError: failedSwapErrorStore
		};

		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwaps({
			swaps: mockSwapProviders,
			amountForSwap: 1,
			selectedProvider: mockSwapProviders[0]
		});

		const context = new Map<symbol, unknown>([
			[SWAP_CONTEXT_KEY, swapContext],
			[SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore }]
		]);

		return { context, failedSwapErrorStore };
	};

	const baseProps = {
		swapAmount: '1' as const,
		receiveAmount: 2,
		slippageValue: '0.5' as const,
		onBack: vi.fn(),
		onClose: vi.fn(),
		onSwap: vi.fn().mockResolvedValue(undefined),
		swapFees: mockSwapFees,
		isSwapAmountsLoading: false
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('basic rendering', () => {
		it('should render source and destination token review sections', () => {
			const { context } = createSwapContext();

			const { getByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(getByText(en.tokens.text.source_token_title)).toBeInTheDocument();
			expect(getByText(en.tokens.text.destination_token_title)).toBeInTheDocument();
		});

		it('should render max slippage label and value', () => {
			const { context } = createSwapContext();

			const { getByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(getByText(en.swap.text.max_slippage)).toBeInTheDocument();
			expect(getByText('0.5%')).toBeInTheDocument();
		});

		it('should render value difference label when exchange rates are provided', () => {
			const { context } = createSwapContext();

			const { getByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(getByText(en.swap.text.value_difference)).toBeInTheDocument();
		});

		it('should not render value difference label when exchange rates are missing', () => {
			const { context } = createSwapContext({
				sourceTokenExchangeRate: undefined,
				destinationTokenExchangeRate: undefined
			});

			const { queryByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(queryByText(en.swap.text.value_difference)).not.toBeInTheDocument();
		});

		it('should not render value difference when only source exchange rate is missing', () => {
			const { context } = createSwapContext({
				sourceTokenExchangeRate: undefined,
				destinationTokenExchangeRate: 20
			});

			const { queryByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(queryByText(en.swap.text.value_difference)).not.toBeInTheDocument();
		});

		it('should render swap fees snippet', () => {
			const { context } = createSwapContext();

			const { getByTestId } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(getByTestId('swap-fees-snippet')).toBeInTheDocument();
		});

		it('should render swap button with correct label', () => {
			const { context } = createSwapContext();

			const { getByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(getByText(en.swap.text.swap_button)).toBeInTheDocument();
		});

		it('should render back button', () => {
			const { context } = createSwapContext();

			const { getByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(getByText(en.core.text.back)).toBeInTheDocument();
		});
	});

	describe('button interactions', () => {
		it('should call onBack and reset failedSwapError when clicking back', async () => {
			const { context, failedSwapErrorStore } = createSwapContext({
				failedSwapError: {
					variant: 'error',
					message: 'Some error'
				}
			});

			const { getByTestId } = render(SwapReview, {
				props: baseProps,
				context
			});

			await fireEvent.click(getByTestId('button-back'));

			expect(baseProps.onBack).toHaveBeenCalledOnce();

			let errorValue: SwapError | undefined;
			failedSwapErrorStore.subscribe((v) => (errorValue = v))();
			expect(errorValue).toBeUndefined();
		});

		it('should call onSwap when clicking swap button', async () => {
			const { context } = createSwapContext();

			const { getByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			await fireEvent.click(getByText(en.swap.text.swap_button));

			expect(baseProps.onSwap).toHaveBeenCalledOnce();
		});
	});

	describe('swap button disabled state', () => {
		it('should disable swap button when isSwapAmountsLoading is true', () => {
			const { context } = createSwapContext();

			const { getByText } = render(SwapReview, {
				props: { ...baseProps, isSwapAmountsLoading: true },
				context
			});

			const swapButton = getByText(en.swap.text.swap_button).closest('button');

			expect(swapButton).toBeDisabled();
		});

		it('should enable swap button when isSwapAmountsLoading is false and no value difference error', () => {
			const { context } = createSwapContext();

			const { getByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			const swapButton = getByText(en.swap.text.swap_button).closest('button');

			expect(swapButton).toBeEnabled();
		});
	});

	describe('value difference error', () => {
		const renderWithHighValueDifference = () => {
			const { context } = createSwapContext({
				sourceTokenExchangeRate: 10,
				destinationTokenExchangeRate: 20
			});

			return render(SwapReview, {
				props: {
					...baseProps,
					swapAmount: '1',
					receiveAmount: 0.1
				},
				context
			});
		};

		it('should show confirmation checkbox when value difference is below error threshold', () => {
			const { getByRole } = renderWithHighValueDifference();

			expect(getByRole('checkbox')).toBeInTheDocument();
		});

		it('should show confirmation message when value difference is below error threshold', () => {
			const { getByText } = renderWithHighValueDifference();

			expect(
				getByText(en.swap.text.value_difference_error_confirmation)
			).toBeInTheDocument();
		});

		it('should disable swap button when value difference error is not confirmed', () => {
			const { getByText } = renderWithHighValueDifference();

			const swapButton = getByText(en.swap.text.swap_button).closest('button');

			expect(swapButton).toBeDisabled();
		});

		it('should enable swap button after confirming value difference checkbox', async () => {
			const { getByText, getByRole } = renderWithHighValueDifference();

			const swapButton = getByText(en.swap.text.swap_button).closest('button');

			expect(swapButton).toBeDisabled();

			await fireEvent.click(getByRole('checkbox'));

			expect(swapButton).toBeEnabled();
		});

		it('should not show confirmation checkbox when value difference is acceptable', () => {
			const { context } = createSwapContext({
				sourceTokenExchangeRate: 10,
				destinationTokenExchangeRate: 10
			});

			const { queryByRole } = render(SwapReview, {
				props: {
					...baseProps,
					swapAmount: '1',
					receiveAmount: 1
				},
				context
			});

			expect(queryByRole('checkbox')).not.toBeInTheDocument();
		});
	});

	describe('failed swap error', () => {
		it('should show error message when failedSwapError has a message', () => {
			const errorMessage = 'Something went wrong';
			const { context } = createSwapContext({
				failedSwapError: {
					variant: 'error',
					message: errorMessage
				}
			});

			const { getByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(getByText(errorMessage)).toBeInTheDocument();
		});

		it('should not show error message box when failedSwapError is undefined', () => {
			const { context } = createSwapContext();

			const { queryByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(
				queryByText(en.swap.error.withdraw_failed_first_part, { exact: false })
			).not.toBeInTheDocument();
		});

		it('should show withdraw failed instructions when errorType is SWAP_FAILED_WITHDRAW_FAILED with empty message', () => {
			const { context } = createSwapContext({
				failedSwapError: {
					variant: 'error',
					message: '',
					errorType: SwapErrorCodes.SWAP_FAILED_WITHDRAW_FAILED,
					url: { url: 'https://icpswap.com', text: 'ICPSwap' }
				}
			});

			const { getByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(getByText(en.transaction.type.withdraw)).toBeInTheDocument();
		});

		it('should show withdraw button label when errorType is set and message is empty', () => {
			const { context } = createSwapContext({
				failedSwapError: {
					variant: 'error',
					message: '',
					errorType: SwapErrorCodes.SWAP_SUCCESS_WITHDRAW_FAILED,
					url: { url: 'https://icpswap.com', text: 'ICPSwap' }
				}
			});

			const { getByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(getByText(en.transaction.type.withdraw)).toBeInTheDocument();
		});

		it('should show swap button label when no failedSwapError', () => {
			const { context } = createSwapContext();

			const { getByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(getByText(en.swap.text.swap_button)).toBeInTheDocument();
		});
	});

	describe('manual withdraw success', () => {
		it('should show close button when manual withdraw succeeded', () => {
			const { context } = createSwapContext({
				failedSwapError: {
					variant: 'info',
					message: en.swap.error.swap_sucess_manually_withdraw_success,
					errorType: SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS
				}
			});

			const { getByText, queryByText, queryByTestId } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(getByText(en.core.text.close)).toBeInTheDocument();
			expect(queryByText(en.swap.text.swap_button)).not.toBeInTheDocument();
			expect(queryByTestId('button-back')).not.toBeInTheDocument();
		});

		it('should call onClose and reset failedSwapError when clicking close', async () => {
			const { context, failedSwapErrorStore } = createSwapContext({
				failedSwapError: {
					variant: 'info',
					message: en.swap.error.swap_sucess_manually_withdraw_success,
					errorType: SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS
				}
			});

			const { getByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			await fireEvent.click(getByText(en.core.text.close));

			expect(baseProps.onClose).toHaveBeenCalledOnce();

			let errorValue: SwapError | undefined;
			failedSwapErrorStore.subscribe((v) => (errorValue = v))();
			expect(errorValue).toBeUndefined();
		});

		it('should show back and swap buttons when failedSwapError is not manual withdraw success', () => {
			const { context } = createSwapContext({
				failedSwapError: {
					variant: 'error',
					message: 'Some error'
				}
			});

			const { getByText, getByTestId, queryByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(getByTestId('button-back')).toBeInTheDocument();
			expect(getByText(en.swap.text.swap_button)).toBeInTheDocument();
			expect(queryByText(en.core.text.close)).not.toBeInTheDocument();
		});
	});

	describe('external links in error messages', () => {
		it('should render external link to ICPSwap when withdraw failed', () => {
			const icpSwapUrl = 'https://icpswap.com/withdraw';
			const { context } = createSwapContext({
				failedSwapError: {
					variant: 'error',
					message: '',
					errorType: SwapErrorCodes.SWAP_FAILED_WITHDRAW_FAILED,
					url: { url: icpSwapUrl, text: 'ICPSwap' }
				}
			});

			const { getByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			const link = getByText('ICPSwap');

			expect(link).toBeInTheDocument();
			expect(link.closest('a')).toHaveAttribute('href', icpSwapUrl);
		});

		it('should render instructions link for withdraw failed', () => {
			const { context } = createSwapContext({
				failedSwapError: {
					variant: 'error',
					message: '',
					errorType: SwapErrorCodes.SWAP_FAILED_WITHDRAW_FAILED,
					url: { url: 'https://icpswap.com', text: 'ICPSwap' }
				}
			});

			const { getByText } = render(SwapReview, {
				props: baseProps,
				context
			});

			expect(
				getByText(en.swap.error.swap_failed_instruction_link, { exact: false })
			).toBeInTheDocument();
		});
	});
});
