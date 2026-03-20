import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SwapEthWizard from '$eth/components/swap/SwapEthWizard.svelte';
import type { EthFeeStore, FeeStoreData } from '$eth/stores/eth-fee.store';
import * as feeStoreMod from '$eth/stores/eth-fee.store';
import * as addrDerived from '$lib/derived/address.derived';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import * as analytics from '$lib/services/analytics.services';
import * as swapServices from '$lib/services/swap.services';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import * as toasts from '$lib/stores/toasts.store';
import {
	SwapProvider,
	VeloraSwapTypes,
	type SwapMappedResult,
	type VeloraSwapDetails
} from '$lib/types/swap';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
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

const mockToken = { ...mockValidErc20Token, enabled: true };
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
	onBack: vi.fn()
};

describe('SwapEthWizard', () => {
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
		isSourceTokenPermitSupported: readable(false),
		setSourceToken: () => {},
		setDestinationToken: () => {},
		setIsTokenPermitSupported: () => {},
		switchTokens: () => {}
	});

	const swapAmountsStore = initSwapAmountsStore();
	swapAmountsStore.setSwaps({
		swaps: mockSwapProviders,
		amountForSwap: 1,
		selectedProvider: mockSwapProviders[0]
	});

	mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });

	mockContext.set(
		feeStoreMod.ETH_FEE_CONTEXT_KEY,
		feeStoreMod.initEthFeeContext({
			feeStore: feeStoreMod.initEthFeeStore(),
			feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
			feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
			feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
		})
	);

	beforeEach(() => {
		vi.clearAllMocks();
		mockAuthStore();
	});

	const renderWithStep = (step: WizardStepsSwap) =>
		render(SwapEthWizard, {
			props: {
				...BASE_PROPS,
				currentStep: { name: step, title: 'Swap' },
				onStartTriggerAmount: vi.fn(),
				onStopTriggerAmount: vi.fn()
			},
			context: mockContext
		});

	it('renders SwapEthForm on SWAP step', () => {
		const { getByText } = renderWithStep(WizardStepsSwap.SWAP);

		expect(getByText('You pay')).toBeInTheDocument();
		expect(getByText('You receive')).toBeInTheDocument();
		expect(getByText('Review swap')).toBeInTheDocument();
		expect(getByText('Cancel')).toBeInTheDocument();
	});

	it('renders slippage section', () => {
		const { getByText } = renderWithStep(WizardStepsSwap.SWAP);

		expect(getByText('Max slippage')).toBeInTheDocument();
	});

	it('renders swap provider information', () => {
		const { getByText } = renderWithStep(WizardStepsSwap.SWAP);

		expect(getByText('Swap provider')).toBeInTheDocument();
	});

	it('renders fee information', () => {
		const { getByText } = renderWithStep(WizardStepsSwap.SWAP);

		expect(getByText('Total fee')).toBeInTheDocument();
	});

	it('renders token input fields', () => {
		const { container } = renderWithStep(WizardStepsSwap.SWAP);

		const tokenInputs = container.querySelectorAll('input[data-tid="token-input-currency-token"]');

		expect(tokenInputs).toHaveLength(2);
	});

	it('renders switch tokens button', () => {
		const { container } = renderWithStep(WizardStepsSwap.SWAP);

		const switchButton = container.querySelector('[data-tid="swap-switch-tokens-button"]');

		expect(switchButton).toBeInTheDocument();
	});

	it('renders SwapProgress on SWAPPING step', () => {
		const { container } = renderWithStep(WizardStepsSwap.SWAPPING);

		expect(container).toBeInTheDocument();
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

		const renderExecution = () => {
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
				context: createExecutionContext()
			});

			return { ...result, onClose, onBack, onStartTriggerAmount };
		};

		it('calls onClose after successful swap', async () => {
			const { getByText, onClose, onBack } = renderExecution();

			await fireEvent.click(getByText('Swap now'));
			await vi.runOnlyPendingTimersAsync();

			expect(swapServices.fetchVeloraMarketSwap).toHaveBeenCalledOnce();
			expect(onClose).toHaveBeenCalledOnce();
			expect(onBack).not.toHaveBeenCalled();
		});

		it('calls onBack when swap fails', async () => {
			vi.spyOn(swapServices, 'fetchVeloraMarketSwap').mockRejectedValue(new Error('Swap failed'));

			const { getByText, onClose, onBack } = renderExecution();

			await fireEvent.click(getByText('Swap now'));
			await vi.runOnlyPendingTimersAsync();

			expect(onBack).toHaveBeenCalledOnce();
			expect(onClose).not.toHaveBeenCalled();
			expect(toasts.toastsError).toHaveBeenCalled();
		});
	});
});
