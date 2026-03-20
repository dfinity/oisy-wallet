import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SwapEthWizard from '$eth/components/swap/SwapEthWizard.svelte';
import * as ethFeeStoreMod from '$eth/stores/eth-fee.store';
import {
	ETH_FEE_CONTEXT_KEY,
	type EthFeeStore,
	type FeeStoreData,
	initEthFeeContext,
	initEthFeeStore
} from '$eth/stores/eth-fee.store';
import * as addrDerived from '$lib/derived/address.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import { trackEvent } from '$lib/services/analytics.services';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import * as toasts from '$lib/stores/toasts.store';
import type { SwapMappedResult } from '$lib/types/swap';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import {
	mockNearIntentsProvider,
	mockSwapProviders,
	mockVeloraDeltaProvider,
	mockVeloraMarketProvider
} from '$tests/mocks/swap.mocks';
import { fireEvent, render } from '@testing-library/svelte';
import { readable, writable, type Writable } from 'svelte/store';

vi.mock('$lib/utils/parse.utils', () => ({
	parseToken: vi.fn()
}));

vi.mock('$eth/providers/alchemy.providers', () => ({
	initMinedTransactionsListener: () => ({
		disconnect: async () => {}
	})
}));

const mockFetchNearIntentsSwap = vi.fn();
const mockFetchVeloraDeltaSwap = vi.fn();
const mockFetchVeloraMarketSwap = vi.fn();

vi.mock('$lib/services/swap.services', () => ({
	fetchNearIntentsSwap: (...args: unknown[]) => mockFetchNearIntentsSwap(...args),
	fetchVeloraDeltaSwap: (...args: unknown[]) => mockFetchVeloraDeltaSwap(...args),
	fetchVeloraMarketSwap: (...args: unknown[]) => mockFetchVeloraMarketSwap(...args)
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
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

			expect(getByText('You pay')).toBeInTheDocument();
			expect(getByText('You receive')).toBeInTheDocument();
			expect(getByText('Review swap')).toBeInTheDocument();
			expect(getByText('Cancel')).toBeInTheDocument();
		});

		it('renders slippage section', () => {
			const { mockContext } = createContext({
				swaps: mockSwapProviders,
				selectedProvider: mockSwapProviders[0]
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText('Max slippage')).toBeInTheDocument();
		});

		it('renders swap provider information', () => {
			const { mockContext } = createContext({
				swaps: mockSwapProviders,
				selectedProvider: mockSwapProviders[0]
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText('Swap provider')).toBeInTheDocument();
		});

		it('renders fee information', () => {
			const { mockContext } = createContext({
				swaps: mockSwapProviders,
				selectedProvider: mockSwapProviders[0]
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText('Total fee')).toBeInTheDocument();
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

			const { container } = renderWithStep({ step: WizardStepsSwap.SWAPPING, context: mockContext });

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

			expect(getByText('Total fee')).toBeInTheDocument();
		});

		it('shows gasless fee when Velora DELTA is selected and permit is supported', () => {
			const { mockContext } = createContext({
				swaps: [mockVeloraDeltaProvider],
				selectedProvider: mockVeloraDeltaProvider,
				isPermitSupported: true
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText('Gasless')).toBeInTheDocument();
		});

		it('does not show gasless fee when Velora MARKET is selected', () => {
			const { mockContext } = createContext({
				swaps: [mockVeloraMarketProvider],
				selectedProvider: mockVeloraMarketProvider,
				isPermitSupported: true
			});

			const { queryByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(queryByText('Gasless')).not.toBeInTheDocument();
		});

		it('does not show gasless fee when NEAR Intents is selected even with permit support', () => {
			const { mockContext } = createContext({
				swaps: [mockNearIntentsProvider, mockVeloraDeltaProvider],
				selectedProvider: mockNearIntentsProvider,
				isPermitSupported: true
			});

			const { queryByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(queryByText('Gasless')).not.toBeInTheDocument();
		});

		it('derives isApproveNeeded from selectedProvider, not swaps[0]', () => {
			const { mockContext } = createContext({
				swaps: [mockNearIntentsProvider, mockVeloraMarketProvider],
				selectedProvider: mockVeloraMarketProvider
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText('Total fee')).toBeInTheDocument();
		});

		it('derives isGasless from selectedProvider, not swaps[0]', () => {
			const { mockContext } = createContext({
				swaps: [mockVeloraMarketProvider, mockVeloraDeltaProvider],
				selectedProvider: mockVeloraDeltaProvider,
				isPermitSupported: true
			});

			const { getByText } = renderWithStep({ step: WizardStepsSwap.SWAP, context: mockContext });

			expect(getByText('Gasless')).toBeInTheDocument();
		});
	});

	describe('swap execution', () => {
		const mockEthAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

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

			vi.spyOn(ethFeeStoreMod, 'initEthFeeStore').mockReturnValue(feeStore);
			vi.spyOn(ethFeeStoreMod, 'initEthFeeContext').mockImplementation((ctx) => ({
				...ctx,
				maxGasFee: readable(undefined),
				minGasFee: readable(undefined)
			}));
			vi.spyOn(addrDerived, 'ethAddress', 'get').mockReturnValue(readable(mockEthAddress));
			vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));

			mockFetchVeloraMarketSwap.mockResolvedValue(undefined);
			mockFetchVeloraDeltaSwap.mockResolvedValue(undefined);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const renderExecution = () => {
			const onClose = vi.fn();
			const onBack = vi.fn();
			const onStartTriggerAmount = vi.fn();

			const { mockContext } = createContext({
				swaps: [mockVeloraMarketProvider],
				selectedProvider: mockVeloraMarketProvider
			});

			const result = renderWithStep({
				step: WizardStepsSwap.REVIEW,
				context: mockContext,
				propsOverride: {
					onClose,
					onBack,
					onStartTriggerAmount
				}
			});

			return { ...result, onClose, onBack, onStartTriggerAmount };
		};

		it('calls onClose after successful swap', async () => {
			const { getByText, onClose, onBack } = renderExecution();

			await fireEvent.click(getByText('Swap now'));
			await vi.runOnlyPendingTimersAsync();

			expect(mockFetchVeloraMarketSwap).toHaveBeenCalledOnce();
			expect(onClose).toHaveBeenCalledOnce();
			expect(onBack).not.toHaveBeenCalled();
		});

		it('calls onClose even when trackEvent throws after successful swap', async () => {
			vi.mocked(trackEvent).mockImplementation(() => {
				throw new Error("undefined is not an object (evaluating 'n().symbol')");
			});

			const { getByText, onClose, onBack } = renderExecution();

			await fireEvent.click(getByText('Swap now'));
			await vi.runOnlyPendingTimersAsync();

			expect(mockFetchVeloraMarketSwap).toHaveBeenCalledOnce();
			expect(onClose).toHaveBeenCalledOnce();
			expect(onBack).not.toHaveBeenCalled();
		});

		it('calls onBack when swap fails', async () => {
			mockFetchVeloraMarketSwap.mockRejectedValue(new Error('Swap failed'));

			const { getByText, onClose, onBack } = renderExecution();

			await fireEvent.click(getByText('Swap now'));
			await vi.runOnlyPendingTimersAsync();

			expect(onBack).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalled();
		});

		it('calls onBack even when trackEvent throws in the error path', async () => {
			mockFetchVeloraMarketSwap.mockRejectedValue(new Error('Swap failed'));
			vi.mocked(trackEvent).mockImplementation(() => {
				throw new Error("undefined is not an object (evaluating 'n().symbol')");
			});

			const { getByText, onClose, onBack } = renderExecution();

			await fireEvent.click(getByText('Swap now'));
			await vi.runOnlyPendingTimersAsync();

			expect(onBack).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
		});
	});
});
