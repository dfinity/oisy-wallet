import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import {
	TRACK_COUNT_SWAP_ERROR,
	TRACK_COUNT_SWAP_SUBMITTED
} from '$lib/constants/analytics.constants';
import {
	SWAP_LIFI_INSUFFICIENT_FUNDS_FOR_FEE,
	SWAP_LIFI_UNVERIFIED_ROUTE,
	SWAP_SWITCH_TOKENS_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import * as addrDerived from '$lib/derived/address.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import * as analytics from '$lib/services/analytics.services';
import * as swapServices from '$lib/services/swap.services';
import { balancesStore } from '$lib/stores/balances.store';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, type LifiCarriedFee, type SwapError } from '$lib/stores/swap.store';
import * as toasts from '$lib/stores/toasts.store';
import { LifiSolFeeChangedError } from '$lib/types/errors';
import type { NearIntentsQuoteResponse } from '$lib/types/near-intents';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import SwapSolWizard from '$sol/components/swap/SwapSolWizard.svelte';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockLifiSolUsdcToSol } from '$tests/mocks/lifi-sol-transaction.mock';
import { mockNearIntentsQuoteResponse } from '$tests/mocks/near-intents.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get, readable, writable } from 'svelte/store';

const mockFetchNearIntentsSolSwap = vi.fn();

vi.mock('$lib/services/swap.services', () => ({
	fetchNearIntentsSolSwap: (...args: unknown[]) => mockFetchNearIntentsSolSwap(...args)
}));

const mockFetchLifiSolSwap = vi.fn();

vi.mock('$lib/services/lifi-sol-swap.services', () => ({
	fetchLifiSolSwap: (...args: unknown[]) => mockFetchLifiSolSwap(...args)
}));

const mockLifiSolQuoteCallsUnpinnedProgram = vi.fn();

vi.mock('$lib/services/lifi-sol-transaction.services', () => ({
	lifiSolQuoteCallsUnpinnedProgram: (...args: unknown[]) =>
		mockLifiSolQuoteCallsUnpinnedProgram(...args)
}));

const mockAcceptProviderAgreement = vi.fn();

vi.mock('$lib/services/provider-agreements.services', () => ({
	acceptProviderAgreement: (...args: unknown[]) => mockAcceptProviderAgreement(...args)
}));

vi.mock('$lib/utils/parse.utils', async () => {
	const { ZERO } = await import('$lib/constants/app.constants');
	return {
		parseToken: vi.fn().mockReturnValue(ZERO),
		tryParseToken: vi.fn().mockReturnValue(ZERO)
	};
});

vi.mock('$sol/api/solana.api', async () => {
	const { ZERO } = await import('$lib/constants/app.constants');
	return {
		estimatePriorityFee: vi.fn().mockResolvedValue(ZERO),
		getSolCreateAccountFee: vi.fn().mockResolvedValue(2039280n)
	};
});

describe('SwapSolWizard', () => {
	const mockSourceToken = { ...mockValidSplToken, enabled: true };
	const mockDestToken = { ...mockValidSplToken, symbol: 'USDC', enabled: true };

	const baseProps = {
		swapAmount: '1',
		receiveAmount: 2,
		slippageValue: '0.5',
		swapProgressStep: ProgressStepsSwap.INITIALIZATION,
		isSwapAmountsLoading: false,
		onShowTokensList: vi.fn(),
		onShowProviderList: vi.fn(),
		onClose: vi.fn(),
		onNext: vi.fn(),
		onBack: vi.fn(),
		onStartTriggerAmount: vi.fn(),
		onStopTriggerAmount: vi.fn()
	};

	const nearIntentsSwapProviders: SwapMappedResult[] = [
		{
			provider: SwapProvider.NEAR_INTENTS,
			receiveAmount: 890000000n,
			swapDetails: mockNearIntentsQuoteResponse as NearIntentsQuoteResponse,
			type: undefined
		}
	];

	const createContext = ({
		swaps,
		selectedProvider
	}: {
		swaps: SwapMappedResult[];
		selectedProvider: SwapMappedResult;
	}) => {
		const mockContext = new Map();

		mockContext.set(SWAP_CONTEXT_KEY, {
			sourceToken: readable(mockSourceToken),
			destinationToken: readable(mockDestToken),
			failedSwapError: writable(undefined),
			amountSetToMax: writable(false),
			lifiMaxFee: writable(undefined),
			sourceTokenExchangeRate: readable(10),
			sourceTokenBalance: readable(undefined),
			destinationTokenBalance: readable(undefined),
			destinationTokenExchangeRate: readable(20),
			isSourceTokenIcrc2: readable(false),
			isSourceTokenPermitSupported: readable(undefined),
			setIsTokenPermitSupported: vi.fn(),
			setSourceToken: () => {},
			setDestinationToken: () => {},
			switchTokens: () => {}
		});

		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwaps({
			swaps,
			amountForSwap: 1,
			selectedProvider
		});

		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });

		return { mockContext, swapAmountsStore };
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockAuthStore();
	});

	const renderWithStep = ({
		step,
		context,
		propsOverride
	}: {
		step: WizardStepsSwap;
		context: Map<unknown, unknown>;
		propsOverride?: Record<string, unknown>;
	}) =>
		render(SwapSolWizard, {
			props: {
				...baseProps,
				currentStep: { name: step, title: 'Swap' },
				...propsOverride
			},
			context
		});

	describe('basic rendering', () => {
		it('renders SwapForm on SWAP step', () => {
			const { mockContext } = createContext({
				swaps: nearIntentsSwapProviders,
				selectedProvider: nearIntentsSwapProviders[0]
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText(en.tokens.text.source_token_title)).toBeInTheDocument();
			expect(getByText(en.tokens.text.destination_token_title)).toBeInTheDocument();
			expect(getByText(en.swap.text.review_button)).toBeInTheDocument();
			expect(getByText(en.core.text.cancel)).toBeInTheDocument();
		});

		it('renders slippage section', () => {
			const { mockContext } = createContext({
				swaps: nearIntentsSwapProviders,
				selectedProvider: nearIntentsSwapProviders[0]
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText(en.swap.text.max_slippage)).toBeInTheDocument();
		});

		it('renders swap provider information', () => {
			const { mockContext } = createContext({
				swaps: nearIntentsSwapProviders,
				selectedProvider: nearIntentsSwapProviders[0]
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText(en.swap.text.smart_swap)).toBeInTheDocument();
		});

		it('renders token input fields', () => {
			const { mockContext } = createContext({
				swaps: nearIntentsSwapProviders,
				selectedProvider: nearIntentsSwapProviders[0]
			});

			const { container } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			const tokenInputs = container.querySelectorAll(
				`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`
			);

			expect(tokenInputs).toHaveLength(2);
		});

		it('renders switch tokens button', () => {
			const { mockContext } = createContext({
				swaps: nearIntentsSwapProviders,
				selectedProvider: nearIntentsSwapProviders[0]
			});

			const { container } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			const switchButton = container.querySelector(`[data-tid="${SWAP_SWITCH_TOKENS_BUTTON}"]`);

			expect(switchButton).toBeInTheDocument();
		});

		it('renders SwapProgress on SWAPPING step', () => {
			const { mockContext } = createContext({
				swaps: nearIntentsSwapProviders,
				selectedProvider: nearIntentsSwapProviders[0]
			});

			const { container } = renderWithStep({
				step: WizardStepsSwap.SWAPPING,
				context: mockContext
			});

			expect(container).toBeInTheDocument();
		});
	});

	describe('fee display on review step', () => {
		it('does not render fee section when fees are not available', () => {
			const { mockContext } = createContext({
				swaps: nearIntentsSwapProviders,
				selectedProvider: nearIntentsSwapProviders[0]
			});

			const { queryByText } = renderWithStep({
				step: WizardStepsSwap.REVIEW,
				context: mockContext
			});

			expect(queryByText(en.fee.text.network_fee)).not.toBeInTheDocument();
			expect(queryByText(en.fee.text.total_fee)).not.toBeInTheDocument();
		});
	});

	describe('swap execution', () => {
		beforeEach(() => {
			vi.useFakeTimers();

			vi.spyOn(addrDerived, 'solAddressMainnet', 'get').mockReturnValue(readable(mockSolAddress));
			vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
			vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
			vi.spyOn(swapServices, 'fetchNearIntentsSolSwap').mockResolvedValue(undefined);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const createExecutionContext = () => {
			const executionSwapAmountsStore = initSwapAmountsStore();
			executionSwapAmountsStore.setSwaps({
				swaps: nearIntentsSwapProviders,
				amountForSwap: 1,
				selectedProvider: nearIntentsSwapProviders[0]
			});

			const ctx = new Map();

			ctx.set(SWAP_CONTEXT_KEY, {
				sourceToken: readable(mockSourceToken),
				destinationToken: readable(mockDestToken),
				failedSwapError: writable(undefined),
				amountSetToMax: writable(false),
				lifiMaxFee: writable(undefined),
				sourceTokenExchangeRate: readable(10),
				sourceTokenBalance: readable(undefined),
				destinationTokenBalance: readable(undefined),
				destinationTokenExchangeRate: readable(20),
				isSourceTokenIcrc2: readable(false),
				isSourceTokenPermitSupported: readable(undefined),
				setSourceToken: () => {},
				setDestinationToken: () => {},
				setIsTokenPermitSupported: () => {},
				switchTokens: () => {}
			});

			ctx.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: executionSwapAmountsStore });

			return ctx;
		};

		const renderExecution = () => {
			const onClose = vi.fn();
			const onBack = vi.fn();
			const onStartTriggerAmount = vi.fn();

			const result = render(SwapSolWizard, {
				props: {
					...baseProps,
					currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' },
					onClose,
					onBack,
					onNext: vi.fn(),
					onStartTriggerAmount,
					onStopTriggerAmount: vi.fn()
				},
				context: createExecutionContext()
			});

			return { ...result, onClose, onBack, onStartTriggerAmount };
		};

		it('calls onClose after successful swap', async () => {
			const { getByText, onClose, onBack } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(swapServices.fetchNearIntentsSolSwap).toHaveBeenCalledOnce();
			expect(onClose).toHaveBeenCalledOnce();
			expect(onBack).not.toHaveBeenCalled();
		});

		it('calls onBack when swap fails', async () => {
			vi.spyOn(swapServices, 'fetchNearIntentsSolSwap').mockRejectedValue(new Error('Swap failed'));

			const { getByText, onClose, onBack } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(onBack).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalled();
		});

		it('calls onStartTriggerAmount when swap fails', async () => {
			vi.spyOn(swapServices, 'fetchNearIntentsSolSwap').mockRejectedValue(new Error('Swap failed'));

			const { getByText, onStartTriggerAmount } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(onStartTriggerAmount).toHaveBeenCalledOnce();
		});

		it('tracks submitted event at initiation (settlement is tracked via the AUT store)', async () => {
			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(analytics.trackEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					name: TRACK_COUNT_SWAP_SUBMITTED
				})
			);
		});

		it('tracks error event when swap fails', async () => {
			vi.spyOn(swapServices, 'fetchNearIntentsSolSwap').mockRejectedValue(new Error('Swap failed'));

			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(analytics.trackEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					name: TRACK_COUNT_SWAP_ERROR
				})
			);
		});
	});

	describe('provider agreement on swap', () => {
		beforeEach(() => {
			vi.useFakeTimers();

			vi.spyOn(addrDerived, 'solAddressMainnet', 'get').mockReturnValue(readable(mockSolAddress));
			vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
			vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
			vi.spyOn(swapServices, 'fetchNearIntentsSolSwap').mockResolvedValue(undefined);
			mockAcceptProviderAgreement.mockResolvedValue(undefined);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const createExecutionContext = () => {
			const executionSwapAmountsStore = initSwapAmountsStore();
			executionSwapAmountsStore.setSwaps({
				swaps: nearIntentsSwapProviders,
				amountForSwap: 1,
				selectedProvider: nearIntentsSwapProviders[0]
			});

			const ctx = new Map();

			ctx.set(SWAP_CONTEXT_KEY, {
				sourceToken: readable(mockSourceToken),
				destinationToken: readable(mockDestToken),
				failedSwapError: writable(undefined),
				amountSetToMax: writable(false),
				lifiMaxFee: writable(undefined),
				sourceTokenExchangeRate: readable(10),
				sourceTokenBalance: readable(undefined),
				destinationTokenBalance: readable(undefined),
				destinationTokenExchangeRate: readable(20),
				isSourceTokenIcrc2: readable(false),
				isSourceTokenPermitSupported: readable(undefined),
				setSourceToken: () => {},
				setDestinationToken: () => {},
				setIsTokenPermitSupported: () => {},
				switchTokens: () => {}
			});

			ctx.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: executionSwapAmountsStore });

			return ctx;
		};

		const renderExecution = () => {
			const onClose = vi.fn();
			const onBack = vi.fn();
			const onStartTriggerAmount = vi.fn();

			const result = render(SwapSolWizard, {
				props: {
					...baseProps,
					currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' },
					onClose,
					onBack,
					onNext: vi.fn(),
					onStartTriggerAmount,
					onStopTriggerAmount: vi.fn()
				},
				context: createExecutionContext()
			});

			return { ...result, onClose, onBack, onStartTriggerAmount };
		};

		it('calls acceptProviderAgreement before swap', async () => {
			const { getByText } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(mockAcceptProviderAgreement).toHaveBeenCalledOnce();
			expect(swapServices.fetchNearIntentsSolSwap).toHaveBeenCalledOnce();
		});

		it('aborts swap and calls onBack when acceptProviderAgreement fails', async () => {
			mockAcceptProviderAgreement.mockRejectedValueOnce(new Error('Agreement save failed'));

			const { getByText, onBack, onStartTriggerAmount } = renderExecution();

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(swapServices.fetchNearIntentsSolSwap).not.toHaveBeenCalled();
			expect(onBack).toHaveBeenCalledOnce();
			expect(onStartTriggerAmount).toHaveBeenCalledOnce();
			expect(toasts.toastsError).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: { text: en.swap.error.cannot_save_provider_agreement }
				})
			);
		});
	});

	describe('a LI.FI offer', () => {
		// 0.002 SOL: LI.FI's ceiling for 20 USDC → SOL, its network fee and the rent it creates.
		const solFeeCeiling = 2_000_000n;

		const { quote, request } = mockLifiSolUsdcToSol;

		const lifiOffer: SwapMappedResult = {
			provider: SwapProvider.LIFI,
			receiveAmount: 191_515_998n,
			receiveOutMinimum: 190_558_418n,
			swapDetails: quote,
			request,
			solFeeCeiling
		};

		let failedSwapError: ReturnType<typeof writable<SwapError | undefined>>;
		let lifiCarriedFee: ReturnType<typeof writable<LifiCarriedFee | undefined>>;

		const createLifiContext = () => {
			failedSwapError = writable(undefined);
			lifiCarriedFee = writable(undefined);

			const swapAmountsStore = initSwapAmountsStore();
			swapAmountsStore.setSwaps({
				swaps: [lifiOffer],
				amountForSwap: 1,
				selectedProvider: lifiOffer
			});

			const ctx = new Map();

			ctx.set(SWAP_CONTEXT_KEY, {
				sourceToken: readable(mockSourceToken),
				destinationToken: readable(mockDestToken),
				failedSwapError,
				lifiCarriedFee,
				amountSetToMax: writable(false),
				lifiMaxFee: writable(undefined),
				sourceTokenExchangeRate: readable(10),
				sourceTokenBalance: readable(undefined),
				destinationTokenBalance: readable(undefined),
				destinationTokenExchangeRate: readable(20),
				isSourceTokenIcrc2: readable(false),
				isSourceTokenPermitSupported: readable(undefined),
				setSourceToken: () => {},
				setDestinationToken: () => {},
				setIsTokenPermitSupported: () => {},
				switchTokens: () => {}
			});

			ctx.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });

			return ctx;
		};

		const renderReview = async () => {
			const onClose = vi.fn();
			const onBack = vi.fn();

			const result = render(SwapSolWizard, {
				props: {
					...baseProps,
					currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' },
					onClose,
					onBack
				},
				context: createLifiContext()
			});

			// The route's check.
			await vi.advanceTimersByTimeAsync(0);

			return { ...result, onClose, onBack };
		};

		const swapButton = (getByText: (text: string) => HTMLElement) =>
			getByText(en.swap.text.swap_button).closest('button');

		const confirm = async (getByText: (text: string) => HTMLElement) => {
			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();
		};

		beforeEach(() => {
			vi.useFakeTimers();

			vi.spyOn(addrDerived, 'solAddressMainnet', 'get').mockReturnValue(readable(mockSolAddress));
			vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
			vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));

			mockFetchLifiSolSwap.mockResolvedValue(undefined);
			mockLifiSolQuoteCallsUnpinnedProgram.mockResolvedValue(false);

			balancesStore.set({ id: SOLANA_TOKEN.id, data: { data: solFeeCeiling, certified: false } });
		});

		afterEach(() => {
			vi.useRealTimers();

			balancesStore.reset(SOLANA_TOKEN.id);
		});

		it("should show LI.FI's ceiling as the total fee", async () => {
			const { getByText } = await renderReview();

			expect(getByText(en.fee.text.total_fee)).toBeInTheDocument();
			expect(getByText(/0\.002/)).toBeInTheDocument();
		});

		it("should check the displayed quote's route for the user", async () => {
			await renderReview();

			expect(mockLifiSolQuoteCallsUnpinnedProgram).toHaveBeenCalledExactlyOnceWith({
				quote,
				userAddress: mockSolAddress
			});
		});

		it('should swap through LI.FI, holding execution to the reviewed ceiling', async () => {
			const { getByText, onClose } = await renderReview();

			await confirm(getByText);

			expect(mockFetchLifiSolSwap).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					sourceToken: mockSourceToken,
					destinationToken: mockDestToken,
					swapAmount: baseProps.swapAmount,
					userAddress: mockSolAddress,
					offer: lifiOffer,
					reviewedCeiling: solFeeCeiling
				})
			);
			expect(mockFetchNearIntentsSolSwap).not.toHaveBeenCalled();
			expect(mockAcceptProviderAgreement).not.toHaveBeenCalled();
			expect(onClose).toHaveBeenCalledOnce();
		});

		it('should hold the confirmation while the route is checked', async () => {
			mockLifiSolQuoteCallsUnpinnedProgram.mockReturnValue(new Promise(() => {}));

			const { getByText } = await renderReview();

			expect(swapButton(getByText)).toBeDisabled();
		});

		it('should refuse a route through a program the binding does not pin', async () => {
			mockLifiSolQuoteCallsUnpinnedProgram.mockResolvedValue(true);

			const { getByText, getByTestId } = await renderReview();

			expect(getByTestId(SWAP_LIFI_UNVERIFIED_ROUTE)).toBeInTheDocument();
			expect(swapButton(getByText)).toBeDisabled();
		});

		// The binding still checks the transaction signed.
		it('should let a route through when its check has no answer', async () => {
			mockLifiSolQuoteCallsUnpinnedProgram.mockResolvedValue(undefined);

			const { getByText, queryByTestId } = await renderReview();

			expect(queryByTestId(SWAP_LIFI_UNVERIFIED_ROUTE)).not.toBeInTheDocument();
			expect(swapButton(getByText)).toBeEnabled();
		});

		it('should refuse a ceiling the SOL balance cannot cover', async () => {
			balancesStore.set({
				id: SOLANA_TOKEN.id,
				data: { data: solFeeCeiling - 1n, certified: false }
			});

			const { getByText, getByTestId } = await renderReview();

			expect(getByTestId(SWAP_LIFI_INSUFFICIENT_FUNDS_FOR_FEE)).toBeInTheDocument();
			expect(swapButton(getByText)).toBeDisabled();
		});

		describe('a ceiling an execution found higher', () => {
			const higherCeiling = solFeeCeiling + 500_000n;

			beforeEach(() => {
				balancesStore.set({
					id: SOLANA_TOKEN.id,
					data: { data: higherCeiling, certified: false }
				});
			});

			it('should be carried back to the review, with the fee-changed copy', async () => {
				mockFetchLifiSolSwap.mockRejectedValue(
					new LifiSolFeeChangedError({ ceiling: higherCeiling })
				);

				const { getByText, onBack } = await renderReview();

				await confirm(getByText);

				expect(get(lifiCarriedFee)).toStrictEqual({
					key: JSON.stringify(request),
					solCeiling: higherCeiling
				});
				expect(get(failedSwapError)).toStrictEqual({
					message: en.swap.error.lifi_fee_changed,
					variant: 'info'
				});
				expect(onBack).toHaveBeenCalledOnce();
			});

			it('should be what the review holds execution to, for the same inputs', async () => {
				const { getByText } = await renderReview();

				lifiCarriedFee.set({ key: JSON.stringify(request), solCeiling: higherCeiling });

				await confirm(getByText);

				expect(mockFetchLifiSolSwap).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ reviewedCeiling: higherCeiling })
				);
			});

			it('should not apply to other inputs', async () => {
				const { getByText } = await renderReview();

				lifiCarriedFee.set({ key: 'other inputs', solCeiling: higherCeiling });

				await confirm(getByText);

				expect(mockFetchLifiSolSwap).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ reviewedCeiling: solFeeCeiling })
				);
			});
		});

		it('should show the slippage copy when LI.FI no longer guarantees the minimum', async () => {
			mockFetchLifiSolSwap.mockRejectedValue(
				new Error('Slippage exceeded. LI.FI no longer has a route for the swap.')
			);

			const { getByText } = await renderReview();

			await confirm(getByText);

			expect(get(failedSwapError)).toEqual(
				expect.objectContaining({
					message: expect.stringContaining(baseProps.slippageValue),
					variant: 'info'
				})
			);
			expect(toasts.toastsError).not.toHaveBeenCalled();
		});

		// LI.FI's error text can carry the user's address or signed transaction.
		it('should report the error by its category only', async () => {
			mockFetchLifiSolSwap.mockRejectedValue(new Error(`refused for ${mockSolAddress}`));

			const { getByText } = await renderReview();

			await confirm(getByText);

			const [{ metadata }] = vi
				.mocked(analytics.trackEvent)
				.mock.calls.map(([event]) => event)
				.filter(({ name }) => name === TRACK_COUNT_SWAP_ERROR);

			expect(metadata).toHaveProperty('result_error_type');
			expect(metadata).not.toHaveProperty('error');
			expect(toasts.toastsError).toHaveBeenCalledOnce();
		});
	});
});
