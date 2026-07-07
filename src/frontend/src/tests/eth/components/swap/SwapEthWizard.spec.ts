import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SwapEthWizard from '$eth/components/swap/SwapEthWizard.svelte';
import * as feeStoreMod from '$eth/stores/eth-fee.store';
import {
	ETH_FEE_CONTEXT_KEY,
	initEthFeeContext,
	initEthFeeStore,
	type EthFeeStore,
	type FeeStoreData
} from '$eth/stores/eth-fee.store';
import { ZERO } from '$lib/constants/app.constants';
import * as addrDerived from '$lib/derived/address.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import * as analytics from '$lib/services/analytics.services';
import * as swapServices from '$lib/services/swap.services';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, type SwapError } from '$lib/stores/swap.store';
import * as toasts from '$lib/stores/toasts.store';
import {
	SwapProvider,
	VeloraSwapTypes,
	type SwapMappedResult,
	type VeloraSwapDetails
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import {
	mockNearIntentsProvider,
	mockOneSecProvider,
	mockSwapProviders,
	mockVeloraDeltaProvider,
	mockVeloraMarketProvider
} from '$tests/mocks/swap.mocks';
import { fireEvent, render } from '@testing-library/svelte';
import { get, readable, writable, type Writable } from 'svelte/store';

const mockParseToken = vi.hoisted(() => vi.fn());

vi.mock('$lib/utils/parse.utils', () => ({
	parseToken: mockParseToken,
	tryParseToken: mockParseToken
}));

mockParseToken.mockReturnValue(ZERO);

vi.mock('$eth/providers/alchemy.providers', () => ({
	initMinedTransactionsListener: () => ({
		disconnect: async () => {}
	})
}));

const mockFetchNearIntentsEvmSwap = vi.fn();
const mockFetchVeloraDeltaSwap = vi.fn();
const mockFetchVeloraMarketSwap = vi.fn();
const mockFetchOneSecEvmToIcpSwap = vi.fn();

vi.mock('$lib/services/swap.services', () => ({
	fetchNearIntentsEvmSwap: (...args: unknown[]) => mockFetchNearIntentsEvmSwap(...args),
	fetchVeloraDeltaSwap: (...args: unknown[]) => mockFetchVeloraDeltaSwap(...args),
	fetchVeloraMarketSwap: (...args: unknown[]) => mockFetchVeloraMarketSwap(...args),
	fetchOneSecEvmToIcpSwap: (...args: unknown[]) => mockFetchOneSecEvmToIcpSwap(...args)
}));

const mockAcceptProviderAgreement = vi.fn();

vi.mock('$lib/services/provider-agreements.services', () => ({
	acceptProviderAgreement: (...args: unknown[]) => mockAcceptProviderAgreement(...args)
}));

vi.mock('$env/rest/near-intents.env', () => ({
	NEAR_INTENTS_SWAP_ENABLED: true
}));

const mockToken = { ...mockValidErc20Token, network: ETHEREUM_NETWORK, enabled: true };
const mockDestToken = { ...ETHEREUM_TOKEN, enabled: true };

const BASE_PROPS = {
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

describe('SwapEthWizard', () => {
	const createContext = ({
		swaps,
		selectedProvider,
		isPermitSupported
	}: {
		swaps: SwapMappedResult[];
		selectedProvider: SwapMappedResult;
		isPermitSupported?: boolean;
	}) => {
		const mockContext = new Map([]);

		mockContext.set(SWAP_CONTEXT_KEY, {
			sourceToken: readable(mockToken),
			destinationToken: readable(mockDestToken),
			failedSwapError: writable(undefined),
			sourceTokenExchangeRate: readable(10),
			sourceTokenBalance: readable(undefined),
			destinationTokenBalance: readable(undefined),
			destinationTokenExchangeRate: readable(20),
			isSourceTokenIcrc2: readable(false),
			isSourceTokenPermitSupported: readable(isPermitSupported ?? undefined),
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

		mockContext.set(
			ETH_FEE_CONTEXT_KEY,
			initEthFeeContext({
				feeStore: initEthFeeStore(),
				feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
				feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
			})
		);

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
		render(SwapEthWizard, {
			props: {
				...BASE_PROPS,
				currentStep: { name: step, title: 'Swap' },
				...propsOverride
			},
			context
		});

	describe('basic rendering', () => {
		it('renders SwapEthForm on SWAP step', () => {
			const { mockContext } = createContext({
				swaps: mockSwapProviders,
				selectedProvider: mockSwapProviders[0]
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText(en.tokens.text.source_token_title)).toBeInTheDocument();
			expect(getByText(en.tokens.text.destination_token_title)).toBeInTheDocument();
			expect(getByText(en.swap.text.review_button)).toBeInTheDocument();
			expect(getByText(en.core.text.cancel)).toBeInTheDocument();
		});

		it('renders slippage section', () => {
			const { mockContext } = createContext({
				swaps: mockSwapProviders,
				selectedProvider: mockSwapProviders[0]
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText(en.swap.text.max_slippage)).toBeInTheDocument();
		});

		it('renders swap provider information', () => {
			const { mockContext } = createContext({
				swaps: mockSwapProviders,
				selectedProvider: mockSwapProviders[0]
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText(en.swap.text.swap_provider)).toBeInTheDocument();
		});

		it('renders fee information', () => {
			const { mockContext } = createContext({
				swaps: mockSwapProviders,
				selectedProvider: mockSwapProviders[0]
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText(en.fee.text.total_fee)).toBeInTheDocument();
		});

		it('renders token input fields', () => {
			const { mockContext } = createContext({
				swaps: mockSwapProviders,
				selectedProvider: mockSwapProviders[0]
			});

			const { container } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			const tokenInputs = container.querySelectorAll(
				'input[data-tid="token-input-currency-token"]'
			);

			expect(tokenInputs).toHaveLength(2);
		});

		it('renders switch tokens button', () => {
			const { mockContext } = createContext({
				swaps: mockSwapProviders,
				selectedProvider: mockSwapProviders[0]
			});

			const { container } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			const switchButton = container.querySelector('[data-tid="swap-switch-tokens-button"]');

			expect(switchButton).toBeInTheDocument();
		});

		it('renders SwapProgress on SWAPPING step', () => {
			const { mockContext } = createContext({
				swaps: mockSwapProviders,
				selectedProvider: mockSwapProviders[0]
			});

			const { container } = renderWithStep({
				step: WizardStepsSwap.SWAPPING,
				context: mockContext
			});

			expect(container).toBeInTheDocument();
		});
	});

	describe('provider-specific rendering', () => {
		it('shows approval fee when Velora MARKET is selected with non-default token', () => {
			const { mockContext } = createContext({
				swaps: [mockVeloraMarketProvider],
				selectedProvider: mockVeloraMarketProvider
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText(en.fee.text.total_fee)).toBeInTheDocument();
		});

		it('shows gasless fee when Velora DELTA is selected and permit is supported', () => {
			const { mockContext } = createContext({
				swaps: [mockVeloraDeltaProvider],
				selectedProvider: mockVeloraDeltaProvider,
				isPermitSupported: true
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText(en.swap.text.gasless)).toBeInTheDocument();
		});

		it('does not show gasless fee when Velora MARKET is selected', () => {
			const { mockContext } = createContext({
				swaps: [mockVeloraMarketProvider],
				selectedProvider: mockVeloraMarketProvider,
				isPermitSupported: true
			});

			const { queryByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(queryByText(en.swap.text.gasless)).not.toBeInTheDocument();
		});

		it('does not show gasless fee when NEAR Intents is selected even with permit support', () => {
			const { mockContext } = createContext({
				swaps: [mockNearIntentsProvider, mockVeloraDeltaProvider],
				selectedProvider: mockNearIntentsProvider,
				isPermitSupported: true
			});

			const { queryByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(queryByText(en.swap.text.gasless)).not.toBeInTheDocument();
		});

		it('derives isApproveNeeded from selectedProvider, not swaps[0]', () => {
			const { mockContext } = createContext({
				swaps: [mockNearIntentsProvider, mockVeloraMarketProvider],
				selectedProvider: mockVeloraMarketProvider
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText(en.fee.text.total_fee)).toBeInTheDocument();
		});

		it('derives isGasless from selectedProvider, not swaps[0]', () => {
			const { mockContext } = createContext({
				swaps: [mockVeloraMarketProvider, mockVeloraDeltaProvider],
				selectedProvider: mockVeloraDeltaProvider,
				isPermitSupported: true
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText(en.swap.text.gasless)).toBeInTheDocument();
		});
	});

	describe('swap execution', () => {
		const mockEthAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

		const veloraSwapProviders: SwapMappedResult[] = [
			{
				provider: SwapProvider.VELORA,
				receiveAmount: 1000000000n,
				type: VeloraSwapTypes.MARKET,
				swapDetails: {} as VeloraSwapDetails
			}
		];

		let feeState: Writable<FeeStoreData>;
		let feeStore: EthFeeStore;

		beforeEach(() => {
			vi.useFakeTimers();

			feeState = writable({
				gas: 100n,
				maxFeePerGas: 2_000_000n,
				maxPriorityFeePerGas: 1_000_000n
			});
			feeStore = {
				subscribe: feeState.subscribe,
				setFee: vi.fn((partial) => {
					feeState.update((cur) => ({ ...cur, ...partial }));
				})
			};

			vi.spyOn(feeStoreMod, 'initEthFeeStore').mockReturnValue(feeStore);
			vi.spyOn(feeStoreMod, 'initEthFeeContext').mockImplementation((ctx) => ({
				...ctx,
				maxGasFee: readable(undefined),
				minGasFee: readable(undefined)
			}));
			vi.spyOn(addrDerived, 'ethAddress', 'get').mockReturnValue(readable(mockEthAddress));
			vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
			vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
			vi.spyOn(swapServices, 'fetchVeloraMarketSwap').mockResolvedValue(undefined);
			vi.spyOn(swapServices, 'fetchVeloraDeltaSwap').mockResolvedValue(undefined);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const createExecutionContext = () => {
			const executionSwapAmountsStore = initSwapAmountsStore();
			executionSwapAmountsStore.setSwaps({
				swaps: veloraSwapProviders,
				amountForSwap: 1,
				selectedProvider: veloraSwapProviders[0]
			});

			const failedSwapError = writable<SwapError | undefined>(undefined);

			const ctx = new Map();

			ctx.set(SWAP_CONTEXT_KEY, {
				sourceToken: readable(mockToken),
				destinationToken: readable(mockDestToken),
				failedSwapError,
				sourceTokenExchangeRate: readable(10),
				sourceTokenBalance: readable(undefined),
				destinationTokenBalance: readable(undefined),
				destinationTokenExchangeRate: readable(20),
				isSourceTokenIcrc2: readable(false),
				isSourceTokenPermitSupported: readable(false),
				setSourceToken: () => {},
				setDestinationToken: () => {},
				setIsTokenPermitSupported: () => {},
				switchTokens: () => {}
			});

			ctx.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: executionSwapAmountsStore });

			ctx.set(
				feeStoreMod.ETH_FEE_CONTEXT_KEY,
				feeStoreMod.initEthFeeContext({
					feeStore,
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
				})
			);

			return { ctx, failedSwapError };
		};

		const renderExecution = () => {
			const onClose = vi.fn();
			const onBack = vi.fn();
			const onStartTriggerAmount = vi.fn();

			const { ctx, failedSwapError } = createExecutionContext();

			const result = render(SwapEthWizard, {
				props: {
					...BASE_PROPS,
					currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' },
					onClose,
					onBack,
					onNext: vi.fn(),
					onStartTriggerAmount,
					onStopTriggerAmount: vi.fn()
				},
				context: ctx
			});

			return { ...result, onClose, onBack, onStartTriggerAmount, failedSwapError };
		};

		it('calls onClose after successful swap', async () => {
			const { getByRole, getByText, onClose, onBack, queryByRole } = renderExecution();

			const valueDifferenceCheckbox = queryByRole('checkbox');
			if (valueDifferenceCheckbox) {
				await fireEvent.click(getByRole('checkbox'));
			}

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(swapServices.fetchVeloraMarketSwap).toHaveBeenCalledOnce();
			expect(onClose).toHaveBeenCalledOnce();
			expect(onBack).not.toHaveBeenCalled();
		});

		it('surfaces the failure on the review page when the swap fails', async () => {
			vi.spyOn(swapServices, 'fetchVeloraMarketSwap').mockRejectedValue(new Error('Swap failed'));

			const { getByRole, getByText, onClose, onBack, queryByRole, failedSwapError } =
				renderExecution();

			const valueDifferenceCheckbox = queryByRole('checkbox');
			if (valueDifferenceCheckbox) {
				await fireEvent.click(getByRole('checkbox'));
			}

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(onBack).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
			expect(toasts.toastsError).not.toHaveBeenCalledWith(
				expect.objectContaining({ msg: { text: en.swap.error.unexpected } })
			);
			expect(get(failedSwapError)).toEqual({
				message: en.swap.error.failed_unexpectedly,
				variant: 'error'
			});
		});

		it('shows a slippage message instead of the generic toast when the swap fails with slippage exceeded', async () => {
			vi.spyOn(swapServices, 'fetchVeloraMarketSwap').mockRejectedValue(
				new Error('Slippage exceeded. Try again with a higher tolerance.')
			);

			const { getByRole, getByText, queryByRole, failedSwapError } = renderExecution();

			const valueDifferenceCheckbox = queryByRole('checkbox');
			if (valueDifferenceCheckbox) {
				await fireEvent.click(getByRole('checkbox'));
			}

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(toasts.toastsError).not.toHaveBeenCalledWith(
				expect.objectContaining({ msg: { text: en.swap.error.unexpected } })
			);

			const error = get(failedSwapError);

			expect(error?.variant).toBe('info');
			expect(error?.message).toContain('0.5');
		});

		it('requires confirmation before enabling swap for high negative value difference', async () => {
			const onClose = vi.fn();
			const onBack = vi.fn();

			const { getByRole, getByText } = render(SwapEthWizard, {
				props: {
					...BASE_PROPS,
					receiveAmount: 0.1,
					currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' },
					onClose,
					onBack,
					onNext: vi.fn(),
					onStartTriggerAmount: vi.fn(),
					onStopTriggerAmount: vi.fn()
				},
				context: createExecutionContext().ctx
			});

			const swapButton = getByText(en.swap.text.swap_button).closest('button');

			expect(swapButton).toBeDisabled();

			await fireEvent.click(getByRole('checkbox'));

			expect(swapButton).toBeEnabled();
		});
	});

	describe('Near Intents swap with provider agreement', () => {
		const mockEthAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

		const nearIntentsSwapProviders: SwapMappedResult[] = [mockNearIntentsProvider];

		let feeState: Writable<FeeStoreData>;
		let feeStore: EthFeeStore;

		beforeEach(() => {
			vi.useFakeTimers();

			feeState = writable({
				gas: 100n,
				maxFeePerGas: 2_000_000n,
				maxPriorityFeePerGas: 1_000_000n
			});
			feeStore = {
				subscribe: feeState.subscribe,
				setFee: vi.fn((partial) => {
					feeState.update((cur) => ({ ...cur, ...partial }));
				})
			};

			vi.spyOn(feeStoreMod, 'initEthFeeStore').mockReturnValue(feeStore);
			vi.spyOn(feeStoreMod, 'initEthFeeContext').mockImplementation((ctx) => ({
				...ctx,
				maxGasFee: readable(undefined),
				minGasFee: readable(undefined)
			}));
			vi.spyOn(addrDerived, 'ethAddress', 'get').mockReturnValue(readable(mockEthAddress));
			vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
			vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
			mockAcceptProviderAgreement.mockResolvedValue(undefined);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const createNearIntentsExecutionContext = () => {
			const executionSwapAmountsStore = initSwapAmountsStore();
			executionSwapAmountsStore.setSwaps({
				swaps: nearIntentsSwapProviders,
				amountForSwap: 1,
				selectedProvider: nearIntentsSwapProviders[0]
			});

			const ctx = new Map();

			ctx.set(SWAP_CONTEXT_KEY, {
				sourceToken: readable(mockToken),
				destinationToken: readable(mockDestToken),
				failedSwapError: writable(undefined),
				sourceTokenExchangeRate: readable(10),
				sourceTokenBalance: readable(undefined),
				destinationTokenBalance: readable(undefined),
				destinationTokenExchangeRate: readable(20),
				isSourceTokenIcrc2: readable(false),
				isSourceTokenPermitSupported: readable(false),
				setSourceToken: () => {},
				setDestinationToken: () => {},
				setIsTokenPermitSupported: () => {},
				switchTokens: () => {}
			});

			ctx.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: executionSwapAmountsStore });

			ctx.set(
				feeStoreMod.ETH_FEE_CONTEXT_KEY,
				feeStoreMod.initEthFeeContext({
					feeStore,
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
				})
			);

			return ctx;
		};

		const renderNearIntentsExecution = () => {
			const onClose = vi.fn();
			const onBack = vi.fn();
			const onStartTriggerAmount = vi.fn();

			const result = render(SwapEthWizard, {
				props: {
					...BASE_PROPS,
					currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' },
					onClose,
					onBack,
					onNext: vi.fn(),
					onStartTriggerAmount,
					onStopTriggerAmount: vi.fn()
				},
				context: createNearIntentsExecutionContext()
			});

			return { ...result, onClose, onBack, onStartTriggerAmount };
		};

		it('calls acceptProviderAgreement before Near Intents swap', async () => {
			const { getByText, queryByRole } = renderNearIntentsExecution();

			const valueDifferenceCheckbox = queryByRole('checkbox');
			if (valueDifferenceCheckbox) {
				await fireEvent.click(valueDifferenceCheckbox);
			}

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(mockAcceptProviderAgreement).toHaveBeenCalledOnce();
			expect(mockFetchNearIntentsEvmSwap).toHaveBeenCalledOnce();
		});

		it('aborts swap and calls onBack when acceptProviderAgreement fails', async () => {
			mockAcceptProviderAgreement.mockRejectedValueOnce(new Error('Agreement save failed'));

			const { getByText, onBack, onStartTriggerAmount, queryByRole } = renderNearIntentsExecution();

			const valueDifferenceCheckbox = queryByRole('checkbox');
			if (valueDifferenceCheckbox) {
				await fireEvent.click(valueDifferenceCheckbox);
			}

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(mockFetchNearIntentsEvmSwap).not.toHaveBeenCalled();
			expect(onBack).toHaveBeenCalledOnce();
			expect(onStartTriggerAmount).toHaveBeenCalledOnce();
			expect(toasts.toastsError).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: { text: en.swap.error.cannot_save_provider_agreement }
				})
			);
		});

		it('does not call acceptProviderAgreement for non-Near Intents swap', async () => {
			const veloraSwapProviders: SwapMappedResult[] = [
				{
					provider: SwapProvider.VELORA,
					receiveAmount: 1000000000n,
					type: VeloraSwapTypes.MARKET,
					swapDetails: {} as VeloraSwapDetails
				}
			];

			const executionSwapAmountsStore = initSwapAmountsStore();
			executionSwapAmountsStore.setSwaps({
				swaps: veloraSwapProviders,
				amountForSwap: 1,
				selectedProvider: veloraSwapProviders[0]
			});

			const ctx = new Map();

			ctx.set(SWAP_CONTEXT_KEY, {
				sourceToken: readable(mockToken),
				destinationToken: readable(mockDestToken),
				failedSwapError: writable(undefined),
				sourceTokenExchangeRate: readable(10),
				sourceTokenBalance: readable(undefined),
				destinationTokenBalance: readable(undefined),
				destinationTokenExchangeRate: readable(20),
				isSourceTokenIcrc2: readable(false),
				isSourceTokenPermitSupported: readable(false),
				setSourceToken: () => {},
				setDestinationToken: () => {},
				setIsTokenPermitSupported: () => {},
				switchTokens: () => {}
			});

			ctx.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: executionSwapAmountsStore });

			ctx.set(
				feeStoreMod.ETH_FEE_CONTEXT_KEY,
				feeStoreMod.initEthFeeContext({
					feeStore,
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
				})
			);

			vi.spyOn(swapServices, 'fetchVeloraMarketSwap').mockResolvedValue(undefined);

			const { getByText, queryByRole } = render(SwapEthWizard, {
				props: {
					...BASE_PROPS,
					currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' }
				},
				context: ctx
			});

			const valueDifferenceCheckbox = queryByRole('checkbox');
			if (valueDifferenceCheckbox) {
				await fireEvent.click(valueDifferenceCheckbox);
			}

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(mockAcceptProviderAgreement).not.toHaveBeenCalled();
		});
	});

	describe('OneSec EVM→ICP swap', () => {
		const mockEthAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
		const mockIcDestToken = { ...mockValidIcToken, enabled: true };

		const oneSecSwapProviders: SwapMappedResult[] = [mockOneSecProvider];

		let feeState: Writable<FeeStoreData>;
		let feeStore: EthFeeStore;

		beforeEach(() => {
			vi.useFakeTimers();

			feeState = writable({
				gas: 100n,
				maxFeePerGas: 2_000_000n,
				maxPriorityFeePerGas: 1_000_000n
			});
			feeStore = {
				subscribe: feeState.subscribe,
				setFee: vi.fn((partial) => {
					feeState.update((cur) => ({ ...cur, ...partial }));
				})
			};

			vi.spyOn(feeStoreMod, 'initEthFeeStore').mockReturnValue(feeStore);
			vi.spyOn(feeStoreMod, 'initEthFeeContext').mockImplementation((ctx) => ({
				...ctx,
				maxGasFee: readable(undefined),
				minGasFee: readable(undefined)
			}));
			vi.spyOn(addrDerived, 'ethAddress', 'get').mockReturnValue(readable(mockEthAddress));
			vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
			vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
			mockFetchOneSecEvmToIcpSwap.mockResolvedValue(undefined);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const createOneSecExecutionContext = (destinationToken: Token = mockIcDestToken) => {
			const executionSwapAmountsStore = initSwapAmountsStore();
			executionSwapAmountsStore.setSwaps({
				swaps: oneSecSwapProviders,
				amountForSwap: 1,
				selectedProvider: oneSecSwapProviders[0]
			});

			const ctx = new Map();

			ctx.set(SWAP_CONTEXT_KEY, {
				sourceToken: readable(mockToken),
				destinationToken: readable(destinationToken),
				failedSwapError: writable(undefined),
				sourceTokenExchangeRate: readable(10),
				sourceTokenBalance: readable(undefined),
				destinationTokenBalance: readable(undefined),
				destinationTokenExchangeRate: readable(20),
				isSourceTokenIcrc2: readable(false),
				isSourceTokenPermitSupported: readable(false),
				setSourceToken: () => {},
				setDestinationToken: () => {},
				setIsTokenPermitSupported: () => {},
				switchTokens: () => {}
			});

			ctx.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: executionSwapAmountsStore });

			ctx.set(
				feeStoreMod.ETH_FEE_CONTEXT_KEY,
				feeStoreMod.initEthFeeContext({
					feeStore,
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
				})
			);

			return ctx;
		};

		it('calls fetchOneSecEvmToIcpSwap and closes on success', async () => {
			const onClose = vi.fn();
			const onBack = vi.fn();

			const { getByText, queryByRole } = render(SwapEthWizard, {
				props: {
					...BASE_PROPS,
					currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' },
					onClose,
					onBack,
					onNext: vi.fn(),
					onStartTriggerAmount: vi.fn(),
					onStopTriggerAmount: vi.fn()
				},
				context: createOneSecExecutionContext()
			});

			const valueDifferenceCheckbox = queryByRole('checkbox');
			if (valueDifferenceCheckbox) {
				await fireEvent.click(valueDifferenceCheckbox);
			}

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(mockFetchOneSecEvmToIcpSwap).toHaveBeenCalledOnce();
			expect(onClose).toHaveBeenCalledOnce();
			expect(onBack).not.toHaveBeenCalled();
		});

		it('calls onBack when fetchOneSecEvmToIcpSwap fails', async () => {
			mockFetchOneSecEvmToIcpSwap.mockRejectedValueOnce(new Error('Bridge failed'));

			const onClose = vi.fn();
			const onBack = vi.fn();

			const { getByText, queryByRole } = render(SwapEthWizard, {
				props: {
					...BASE_PROPS,
					currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' },
					onClose,
					onBack,
					onNext: vi.fn(),
					onStartTriggerAmount: vi.fn(),
					onStopTriggerAmount: vi.fn()
				},
				context: createOneSecExecutionContext()
			});

			const valueDifferenceCheckbox = queryByRole('checkbox');
			if (valueDifferenceCheckbox) {
				await fireEvent.click(valueDifferenceCheckbox);
			}

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(onBack).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalled();
		});

		it('shows error and calls onBack when destination is not an ICP token', async () => {
			const onBack = vi.fn();
			const onStartTriggerAmount = vi.fn();

			const { getByText, queryByRole } = render(SwapEthWizard, {
				props: {
					...BASE_PROPS,
					currentStep: { name: WizardStepsSwap.REVIEW, title: 'Swap' },
					onBack,
					onNext: vi.fn(),
					onStartTriggerAmount,
					onStopTriggerAmount: vi.fn()
				},
				context: createOneSecExecutionContext(mockDestToken)
			});

			const valueDifferenceCheckbox = queryByRole('checkbox');
			if (valueDifferenceCheckbox) {
				await fireEvent.click(valueDifferenceCheckbox);
			}

			await fireEvent.click(getByText(en.swap.text.swap_button));
			await vi.runOnlyPendingTimersAsync();

			expect(mockFetchOneSecEvmToIcpSwap).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalled();
			expect(onBack).toHaveBeenCalledOnce();
			expect(onStartTriggerAmount).toHaveBeenCalledOnce();
		});
	});
});
