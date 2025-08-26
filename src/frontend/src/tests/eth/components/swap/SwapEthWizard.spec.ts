import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SwapEthWizard from '$eth/components/swap/SwapEthWizard.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { WizardStepsSwap } from '$lib/enums/wizard-steps';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { render } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

vi.mock('$lib/utils/parse.utils', () => ({
	parseToken: vi.fn()
}));

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

const mockToken = { ...mockValidErc20Token, enabled: true };
const mockDestToken = { ...ETHEREUM_TOKEN, enabled: true };

const BASE_PROPS = {
	swapAmount: '1',
	receiveAmount: 2,
	slippageValue: '0.5',
	swapProgressStep: ProgressStepsSwap.INITIALIZATION,
	isSwapAmountsLoading: false,
	onShowTokensList: () => {},
	onClose: () => {},
	onNext: () => {},
	onBack: () => {}
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
		setSourceToken: () => {},
		setDestinationToken: () => {},
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
		ETH_FEE_CONTEXT_KEY,
		initEthFeeContext({
			feeStore: initEthFeeStore(),
			feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
			feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
			feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
		})
	);

	beforeEach(() => {
		mockAuthStore();
	});

	const renderWithStep = (step: WizardStepsSwap) =>
		render(SwapEthWizard, {
			props: {
				...BASE_PROPS,
				currentStep: { name: step, title: 'Swap' }
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
});
