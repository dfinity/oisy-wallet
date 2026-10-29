import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import {
	MAX_BUTTON,
	SWAP_SWITCH_TOKENS_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import type { NearIntentsQuoteResponse } from '$lib/types/near-intents';
import type { OptionAmount } from '$lib/types/send';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { formatToken } from '$lib/utils/format.utils';
import SwapSolForm from '$sol/components/swap/SwapSolForm.svelte';
import { SOL_FEE_CONTEXT_KEY, initFeeContext, initFeeStore } from '$sol/stores/sol-fee.store';
import en from '$tests/mocks/i18n.mock';
import { mockNearIntentsQuoteResponse } from '$tests/mocks/near-intents.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import SwapSolFormLifiTest from '$tests/sol/components/swap/SwapSolFormLifiTest.svelte';
import { fireEvent, render } from '@testing-library/svelte';
import { get, readable, writable } from 'svelte/store';

vi.mock('$lib/utils/parse.utils', () => ({
	parseToken: vi.fn().mockReturnValue(ZERO),
	tryParseToken: vi.fn().mockReturnValue(ZERO)
}));

describe('SwapSolForm', () => {
	const mockSourceToken = { ...mockValidSplToken, enabled: true };
	const mockDestToken = { ...mockValidSplToken, symbol: 'USDC', enabled: true };

	const nearIntentsSwapProviders: SwapMappedResult[] = [
		{
			provider: SwapProvider.NEAR_INTENTS,
			receiveAmount: 890000000n,
			swapDetails: mockNearIntentsQuoteResponse as NearIntentsQuoteResponse,
			type: undefined
		}
	];

	const mockContext = new Map();

	const createFeeContext = () =>
		initFeeContext({
			feeStore: initFeeStore(),
			prioritizationFeeStore: initFeeStore(),
			ataFeeStore: initFeeStore(),
			feeSymbolStore: writable('SOL'),
			feeDecimalsStore: writable(9),
			feeTokenIdStore: writable(undefined),
			feeExchangeRateStore: writable(undefined)
		});

	beforeEach(() => {
		const originalSwapContext = initSwapContext({
			sourceToken: mockSourceToken,
			destinationToken: mockDestToken
		});

		const mockSwapContext = {
			...originalSwapContext,
			sourceTokenExchangeRate: readable(10),
			destinationTokenExchangeRate: readable(2)
		};

		mockContext.set(SWAP_CONTEXT_KEY, mockSwapContext);

		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwaps({
			swaps: nearIntentsSwapProviders,
			amountForSwap: 1,
			selectedProvider: nearIntentsSwapProviders[0]
		});
		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });
		mockContext.set(SOL_FEE_CONTEXT_KEY, createFeeContext());
	});

	afterEach(() => {
		mockContext.clear();
	});

	const props = {
		swapAmount: '1',
		receiveAmount: 2,
		slippageValue: '0.5',
		isSwapAmountsLoading: false,
		onShowTokensList: vi.fn(),
		onShowProviderList: vi.fn(),
		onClose: vi.fn(),
		onNext: vi.fn()
	};

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;
	const switchButtonSelector = `button[data-tid="${SWAP_SWITCH_TOKENS_BUTTON}"]`;

	it('should render the component', () => {
		const { container } = render(SwapSolForm, {
			props,
			context: mockContext
		});

		expect(container).toBeInTheDocument();
	});

	it('should render all fields', () => {
		const { container, getByTestId } = render(SwapSolForm, {
			props,
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);

		expect(amount).not.toBeNull();

		expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeInTheDocument();

		const switchButton: HTMLButtonElement | null = container.querySelector(switchButtonSelector);

		expect(switchButton).not.toBeNull();
	});

	it('should render token input fields', () => {
		const { container } = render(SwapSolForm, {
			props,
			context: mockContext
		});

		const tokenInputs = container.querySelectorAll(amountSelector);

		expect(tokenInputs).toHaveLength(2);
	});

	it('should render swap details when tokens are selected', () => {
		const { container } = render(SwapSolForm, {
			props,
			context: mockContext
		});

		expect(container.querySelector('hr')).toBeInTheDocument();
	});

	it('should not render swap details when no destination token', () => {
		const contextWithoutDestination = new Map();
		const swapContextWithoutDestination = initSwapContext({
			sourceToken: mockSourceToken,
			destinationToken: undefined
		});

		contextWithoutDestination.set(SWAP_CONTEXT_KEY, swapContextWithoutDestination);
		contextWithoutDestination.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() });
		contextWithoutDestination.set(SOL_FEE_CONTEXT_KEY, createFeeContext());

		const { container } = render(SwapSolForm, {
			props,
			context: contextWithoutDestination
		});

		expect(container.querySelector('hr')).not.toBeInTheDocument();
	});

	it('should not render swap details when no source token', () => {
		const contextWithoutSource = new Map();
		const swapContextWithoutSource = initSwapContext({
			sourceToken: undefined,
			destinationToken: mockDestToken
		});

		contextWithoutSource.set(SWAP_CONTEXT_KEY, swapContextWithoutSource);
		contextWithoutSource.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() });
		contextWithoutSource.set(SOL_FEE_CONTEXT_KEY, createFeeContext());

		const { container } = render(SwapSolForm, {
			props,
			context: contextWithoutSource
		});

		expect(container.querySelector('hr')).not.toBeInTheDocument();
	});

	it('should handle loading state', () => {
		const { container } = render(SwapSolForm, {
			props: {
				...props,
				isSwapAmountsLoading: true
			},
			context: mockContext
		});

		expect(container).toBeInTheDocument();
	});

	it('should render action buttons', () => {
		const { getByText } = render(SwapSolForm, {
			props,
			context: mockContext
		});

		expect(getByText(en.core.text.cancel)).toBeInTheDocument();
		expect(getByText(en.swap.text.review_button)).toBeInTheDocument();
	});

	it('should render slippage section', () => {
		const { getByText } = render(SwapSolForm, {
			props,
			context: mockContext
		});

		expect(getByText(en.swap.text.max_slippage)).toBeInTheDocument();
	});

	it('should render swap provider information', () => {
		const { getByText } = render(SwapSolForm, {
			props,
			context: mockContext
		});

		expect(getByText(en.swap.text.swap_provider)).toBeInTheDocument();
	});

	it('should render exchange value displays', () => {
		const { container } = render(SwapSolForm, {
			props,
			context: mockContext
		});

		const exchangeValues = container.querySelectorAll('[data-tid="swap-amount-exchange-value"]');

		expect(exchangeValues).toHaveLength(2);
	});

	it('should render token selection buttons', () => {
		const { container } = render(SwapSolForm, {
			props,
			context: mockContext
		});

		const tokenButtons = container.querySelectorAll('button svg');

		expect(tokenButtons.length).toBeGreaterThanOrEqual(2);
	});

	describe('a LI.FI offer', () => {
		// 0.002 SOL: the network fee and the rent of the accounts LI.FI's transaction creates.
		const lifiFee = 2_000_000n;

		const reviewButton = (getByText: (text: string) => HTMLElement) =>
			getByText(en.swap.text.review_button).closest('button');

		const withSolBalance = (balance: bigint) =>
			balancesStore.set({ id: SOLANA_TOKEN.id, data: { data: balance, certified: false } });

		afterEach(() => {
			balancesStore.reset(SOLANA_TOKEN.id);
		});

		it("should show LI.FI's ceiling as the total fee, rather than the fee context's", () => {
			const { getByText } = render(SwapSolForm, {
				props: { ...props, isLifi: true, lifiFee },
				context: mockContext
			});

			expect(getByText(en.fee.text.total_fee)).toBeInTheDocument();
			expect(getByText(/0\.002/)).toBeInTheDocument();
		});

		it('should hold the review while the ceiling is unknown', () => {
			withSolBalance(lifiFee);

			const { getByText } = render(SwapSolForm, {
				props: { ...props, isLifi: true, lifiFee: undefined },
				context: mockContext
			});

			expect(reviewButton(getByText)).toBeDisabled();
		});

		it('should let the review through when the SOL balance covers the ceiling', () => {
			withSolBalance(lifiFee);

			const { getByText } = render(SwapSolForm, {
				props: { ...props, isLifi: true, lifiFee },
				context: mockContext
			});

			expect(reviewButton(getByText)).toBeEnabled();
		});

		it('should refuse a SOL balance below the ceiling of an SPL swap', () => {
			withSolBalance(lifiFee - 1n);

			const { getByText } = render(SwapSolForm, {
				props: { ...props, isLifi: true, lifiFee },
				context: mockContext
			});

			expect(reviewButton(getByText)).toBeDisabled();
		});

		// The ceiling comes with each quote, and each quote with the amount "Max" sets.
		describe('"Max" from SOL', () => {
			const balance = 1_000_000_000n;

			const maxFor = (fee: bigint) =>
				formatToken({
					value: balance - fee,
					unitName: SOLANA_TOKEN.decimals,
					displayDecimals: SOLANA_TOKEN.decimals
				});

			const fee = writable<bigint | undefined>(lifiFee);
			const amount = writable<OptionAmount>();

			const amountOf = (container: HTMLElement) =>
				(container.querySelector(amountSelector) as HTMLInputElement).value;

			const setFee = async (value: bigint) => {
				fee.set(value);
				await vi.advanceTimersByTimeAsync(500);
			};

			beforeEach(() => {
				vi.useFakeTimers();

				mockContext.set(SWAP_CONTEXT_KEY, {
					...initSwapContext({
						sourceToken: SOLANA_TOKEN,
						destinationToken: mockDestToken
					}),
					sourceTokenExchangeRate: readable(10),
					destinationTokenExchangeRate: readable(2)
				});

				withSolBalance(balance);
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			const renderWithMax = async () => {
				fee.set(lifiFee);
				amount.set(undefined);

				const { swapAmount: _, ...rest } = props;

				const result = render(SwapSolFormLifiTest, {
					props: { ...rest, lifiFee: fee, amount },
					context: mockContext
				});

				await fireEvent.click(result.getByTestId(MAX_BUTTON));
				await vi.advanceTimersByTimeAsync(500);

				return result;
			};

			it("should leave room for LI.FI's ceiling", async () => {
				const { container } = await renderWithMax();

				expect(amountOf(container)).toBe(maxFor(lifiFee));
			});

			it('should step down to a higher ceiling and hold there when the ceiling falls back', async () => {
				const { container } = await renderWithMax();

				await setFee(lifiFee + 1_000n);

				expect(amountOf(container)).toBe(maxFor(lifiFee + 1_000n));

				await setFee(lifiFee - 1_000n);

				expect(amountOf(container)).toBe(maxFor(lifiFee + 1_000n));
				expect(get(amount)).toBe(maxFor(lifiFee + 1_000n));
			});
		});
	});
});
