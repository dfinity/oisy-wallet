import { ZERO } from '$lib/constants/app.constants';
import {
	CONVERT_AMOUNT_DISPLAY_SKELETON,
	SWAP_PROVIDER_STATUS,
	SWAP_SWITCH_TOKENS_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { initSwapQuoteActivityStore } from '$lib/stores/swap-quote-activity.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import type { NearIntentsQuoteResponse } from '$lib/types/near-intents';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import SwapSolForm from '$sol/components/swap/SwapSolForm.svelte';
import { SOL_FEE_CONTEXT_KEY, initFeeContext, initFeeStore } from '$sol/stores/sol-fee.store';
import en from '$tests/mocks/i18n.mock';
import { mockNearIntentsQuoteResponse } from '$tests/mocks/near-intents.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { readable, writable } from 'svelte/store';

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

	const createFeeContext = (fee?: bigint) => {
		const feeStore = initFeeStore();
		feeStore.setFee(fee);

		return initFeeContext({
			feeStore,
			prioritizationFeeStore: initFeeStore(),
			ataFeeStore: initFeeStore(),
			feeSymbolStore: writable('SOL'),
			feeDecimalsStore: writable(9),
			feeTokenIdStore: writable(undefined),
			feeExchangeRateStore: writable(undefined)
		});
	};

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

	it('compares providers before an offer exists without enabling Review', () => {
		const activity = initSwapQuoteActivityStore();
		activity.start({ requestId: 1, background: false });
		const context = new Map(mockContext);
		context.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore(), activity });
		const { getByTestId, getByText } = render(SwapSolForm, {
			props: { ...props, isSwapAmountsLoading: true },
			context
		});

		expect(getByText(en.swap.text.smart_swap)).toBeInTheDocument();
		expect(getByTestId(SWAP_PROVIDER_STATUS)).toHaveTextContent(en.swap.text.finding_best_rate);
		expect(getByText(en.swap.text.review_button).closest('button')).toBeDisabled();
	});

	it('hides the network fee behind a Total fee skeleton while comparing, and brings it back after', async () => {
		const activity = initSwapQuoteActivityStore();
		activity.start({ requestId: 2, background: false });
		const context = new Map(mockContext);
		const { store } = context.get(SWAP_AMOUNTS_CONTEXT_KEY);
		context.set(SWAP_AMOUNTS_CONTEXT_KEY, { store, activity });
		context.set(SOL_FEE_CONTEXT_KEY, createFeeContext(5_000n));
		const { getByTestId, getByText, queryByTestId, queryByText } = render(SwapSolForm, {
			props: { ...props, isSwapAmountsLoading: true },
			context
		});

		expect(getByText(en.fee.text.total_fee)).toBeInTheDocument();
		expect(getByTestId(CONVERT_AMOUNT_DISPLAY_SKELETON)).toBeInTheDocument();
		expect(queryByText(en.fee.text.network_fee)).not.toBeInTheDocument();

		activity.complete({ requestId: 2 });

		await waitFor(() =>
			expect(queryByTestId(CONVERT_AMOUNT_DISPLAY_SKELETON)).not.toBeInTheDocument()
		);

		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();

		// A background refresh keeps the fee in place.
		activity.start({ requestId: 3, background: true });
		await tick();

		expect(queryByTestId(CONVERT_AMOUNT_DISPLAY_SKELETON)).not.toBeInTheDocument();
		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
	});

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

		expect(getByText(en.swap.text.smart_swap)).toBeInTheDocument();
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
});
